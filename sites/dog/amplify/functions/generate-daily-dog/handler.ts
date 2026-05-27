import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { GoogleGenAI } from '@google/genai';
import { Jimp } from 'jimp';
import {
  getDogSelectionPrompt,
  getGrayscaleImagePrompt,
  getColorImagePrompt,
  type DogSelection,
} from './prompts.js';

const s3 = new S3Client();

const USED_KEY = 'state/used-breeds.json';

async function withRetry<T>(fn: () => Promise<T>, label: string, maxRetries = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message ?? err);
      const status = err?.status ?? err?.code;
      const isTransient =
        /service unavailable|overloaded|temporarily unavailable|deadline exceeded|\bunavailable\b|rate.?limit|\b(429|500|502|503|504)\b/i.test(msg) ||
        [429, 500, 502, 503, 504].includes(Number(status));
      if (!isTransient || attempt === maxRetries) throw err;
      const delayMs = Math.min(1000 * 2 ** attempt, 16000) + Math.floor(Math.random() * 500);
      console.warn(`[retry] ${label} attempt ${attempt + 1}/${maxRetries + 1} failed (${msg.substring(0, 120)}); retrying in ${delayMs}ms`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

async function getUsedBreeds(bucket: string): Promise<string[]> {
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: USED_KEY }));
    const text = await obj.Body?.transformToString();
    const arr = JSON.parse(text ?? '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function recordUsedBreed(bucket: string, breed: string): Promise<void> {
  const used = await getUsedBreeds(bucket);
  if (!used.includes(breed)) used.push(breed);
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: USED_KEY,
    Body: JSON.stringify(used, null, 2),
    ContentType: 'application/json',
  }));
}

export const handler = async (event?: APIGatewayProxyEventV2): Promise<void | APIGatewayProxyResultV2> => {
  const bucketName = process.env.DAILY_DOG_IMAGES_BUCKET_NAME!;
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  const isApiCall = event?.requestContext?.http !== undefined;

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]!;

  console.log(`Generating daily dog for ${dateStr}`);

  try {
    const usedBreeds = await getUsedBreeds(bucketName);
    console.log(`Found ${usedBreeds.length} previously used breeds`);

    const maxRetries = 3;
    let dog: DogSelection | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const selectionResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: getDogSelectionPrompt(usedBreeds),
        config: {
          temperature: 1.0,
          maxOutputTokens: 1000,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              breed: { type: 'STRING' },
              breed_group: { type: 'STRING' },
              origin: { type: 'STRING' },
              temperament: { type: 'STRING' },
              fun_facts: { type: 'ARRAY', items: { type: 'STRING' } },
              overlay_fact: { type: 'STRING' },
              image_prompt: { type: 'STRING' },
            },
            required: ['breed', 'breed_group', 'origin', 'temperament', 'fun_facts', 'overlay_fact', 'image_prompt'],
          },
        },
      }), 'dog selection');

      const outputParts = selectionResponse.candidates?.[0]?.content?.parts ?? [];
      const selectionText = outputParts.filter((p: any) => p.text && !p.thought).map((p: any) => p.text).join('');

      let candidate: DogSelection;
      try {
        candidate = JSON.parse(selectionText);
      } catch (parseErr) {
        console.error(`Attempt ${attempt + 1}: JSON parse failed:`, selectionText.substring(0, 200));
        continue;
      }

      if (usedBreeds.includes(candidate.breed)) {
        console.log(`Attempt ${attempt + 1}: Gemini picked already-used "${candidate.breed}", retrying`);
        continue;
      }

      dog = candidate;
      break;
    }

    if (!dog) {
      throw new Error('Failed to pick a new breed after retries');
    }

    console.log(`Selected: ${dog.breed}`);

    const grayscalePrompt = getGrayscaleImagePrompt(dog.image_prompt, dog.breed, dog.overlay_fact);
    const grayscaleResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: grayscalePrompt,
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: '16:9' },
      },
    }), 'grayscale image');

    const grayParts = grayscaleResponse.candidates?.[0]?.content?.parts ?? [];
    const grayImagePart = grayParts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
    if (!grayImagePart?.inlineData?.data) throw new Error('Gemini returned no grayscale image data');

    const grayBuffer = Buffer.from(grayImagePart.inlineData.data, 'base64');
    const grayImage = await Jimp.read(grayBuffer);
    grayImage.cover({ w: 960, h: 540 });
    const grayJpeg = await grayImage.getBuffer('image/jpeg', { quality: 85 });

    const imageKey = `images/${dateStr}/image.jpg`;
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: imageKey,
      Body: grayJpeg,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=86400',
    }));
    console.log(`Uploaded: ${imageKey}`);

    let frameoImageKey: string | undefined;
    try {
      const colorPrompt = getColorImagePrompt(dog.image_prompt, dog.breed, dog.overlay_fact);
      const colorResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: colorPrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio: '16:9' },
        },
      }), 'color image');

      const colorParts = colorResponse.candidates?.[0]?.content?.parts ?? [];
      const colorImagePart = colorParts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

      if (colorImagePart?.inlineData?.data) {
        const colorBuffer = Buffer.from(colorImagePart.inlineData.data, 'base64');
        const colorImage = await Jimp.read(colorBuffer);
        colorImage.cover({ w: 1280, h: 800 });
        const frameoBuffer = await colorImage.getBuffer('image/jpeg', { quality: 90 });

        frameoImageKey = `images/${dateStr}/image-frameo.jpg`;
        await s3.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: frameoImageKey,
          Body: frameoBuffer,
          ContentType: 'image/jpeg',
          CacheControl: 'public, max-age=86400',
        }));
        console.log(`Uploaded: ${frameoImageKey}`);
      } else {
        console.warn('Gemini returned no color image data — skipping Frameo variant');
      }
    } catch (colorErr) {
      console.error('Color image generation failed (continuing without Frameo variant):', colorErr);
    }

    const metadata = {
      date: dateStr,
      breed: dog.breed,
      breed_group: dog.breed_group,
      origin: dog.origin,
      temperament: dog.temperament,
      fun_facts: dog.fun_facts,
      overlay_fact: dog.overlay_fact,
      frameo_image_key: frameoImageKey,
      generated_at: new Date().toISOString(),
    };

    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: `images/${dateStr}/metadata.json`,
      Body: JSON.stringify(metadata, null, 2),
      ContentType: 'application/json',
      CacheControl: 'public, max-age=86400',
    }));

    await recordUsedBreed(bucketName, dog.breed);
    console.log(`Done: ${dog.breed}`);

    if (isApiCall) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Dog image generated successfully',
          date: dateStr,
          breed: dog.breed,
          breed_group: dog.breed_group,
        }),
      };
    }
  } catch (err) {
    console.error('Generation failed:', err);
    if (isApiCall) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: String(err) }),
      };
    }
    throw err;
  }
};
