import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { GoogleGenAI } from '@google/genai';
import { Jimp } from 'jimp';
import {
  getInsectSelectionPrompt,
  getGrayscaleImagePrompt,
  getColorImagePrompt,
  type InsectSelection,
} from './prompts.js';

const s3 = new S3Client();
const lambdaClient = new LambdaClient();

const USED_KEY = 'state/used-insects.json';

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

async function getUsedInsects(bucket: string): Promise<string[]> {
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: USED_KEY }));
    const text = await obj.Body?.transformToString();
    const arr = JSON.parse(text ?? '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function recordUsedInsect(bucket: string, name: string): Promise<void> {
  const used = await getUsedInsects(bucket);
  if (!used.includes(name)) used.push(name);
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: USED_KEY,
    Body: JSON.stringify(used, null, 2),
    ContentType: 'application/json',
  }));
}

export const handler = async (event?: APIGatewayProxyEventV2): Promise<void | APIGatewayProxyResultV2> => {
  const bucketName = process.env.DAILY_INSECT_IMAGES_BUCKET_NAME!;
  const isApiCall = event?.requestContext?.http !== undefined;
  const isAsyncTrigger = (event as any)?._async === true;

  // Fire-and-forget: API Gateway has a 30s integration cap, but generation
  // takes 30-60s. When invoked synchronously via HTTP API, re-invoke self
  // asynchronously and return 202 immediately.
  if (isApiCall && !isAsyncTrigger) {
    await lambdaClient.send(new InvokeCommand({
      FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME!,
      InvocationType: 'Event',
      Payload: Buffer.from(JSON.stringify({ _async: true })),
    }));
    return {
      statusCode: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Generation started; reload in ~60s' }),
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]!;

  console.log(`Generating daily insect for ${dateStr}`);

  try {
    const usedInsects = await getUsedInsects(bucketName);
    console.log(`Found ${usedInsects.length} previously used insects`);

    const maxRetries = 3;
    let insect: InsectSelection | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const selectionResponse = await withRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: getInsectSelectionPrompt(usedInsects),
        config: {
          temperature: 1.0,
          maxOutputTokens: 1000,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              common_name: { type: 'STRING' },
              scientific_name: { type: 'STRING' },
              order: { type: 'STRING' },
              family: { type: 'STRING' },
              habitat: { type: 'STRING' },
              fun_facts: { type: 'ARRAY', items: { type: 'STRING' } },
              overlay_fact: { type: 'STRING' },
              image_prompt: { type: 'STRING' },
            },
            required: ['common_name', 'scientific_name', 'order', 'family', 'habitat', 'fun_facts', 'overlay_fact', 'image_prompt'],
          },
        },
      }), 'insect selection');

      const outputParts = selectionResponse.candidates?.[0]?.content?.parts ?? [];
      const selectionText = outputParts.filter((p: any) => p.text && !p.thought).map((p: any) => p.text).join('');

      let candidate: InsectSelection;
      try {
        candidate = JSON.parse(selectionText);
      } catch (parseErr) {
        console.error(`Attempt ${attempt + 1}: JSON parse failed:`, selectionText.substring(0, 200));
        continue;
      }

      if (usedInsects.includes(candidate.common_name)) {
        console.log(`Attempt ${attempt + 1}: Gemini picked already-used "${candidate.common_name}", retrying`);
        continue;
      }

      insect = candidate;
      break;
    }

    if (!insect) {
      throw new Error('Failed to pick a new insect after retries');
    }

    console.log(`Selected: ${insect.common_name} (${insect.scientific_name})`);

    // Grayscale (e-ink 960x540)
    const grayscalePrompt = getGrayscaleImagePrompt(insect.image_prompt, insect.common_name, insect.overlay_fact);
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

    // Color (Frameo 1280x800)
    let frameoImageKey: string | undefined;
    try {
      const colorPrompt = getColorImagePrompt(insect.image_prompt, insect.common_name, insect.overlay_fact);
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
      common_name: insect.common_name,
      scientific_name: insect.scientific_name,
      order: insect.order,
      family: insect.family,
      habitat: insect.habitat,
      fun_facts: insect.fun_facts,
      overlay_fact: insect.overlay_fact,
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

    await recordUsedInsect(bucketName, insect.common_name);
    console.log(`Done: ${insect.common_name}`);

    if (isApiCall) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Insect image generated successfully',
          date: dateStr,
          common_name: insect.common_name,
          scientific_name: insect.scientific_name,
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
