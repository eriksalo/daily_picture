// Daily image generation Lambda — Gemini 3 Flash + Nano Banana 2
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { GoogleGenAI } from '@google/genai';
import { Jimp } from 'jimp';
import { getEventSelectionPrompt, getImageGenerationPrompt, getColorImageGenerationPrompt, monthName } from './prompts.js';

const s3 = new S3Client();

export const handler = async (event?: APIGatewayProxyEventV2): Promise<void | APIGatewayProxyResultV2> => {
  const bucketName = process.env.DAILY_PICTURE_IMAGES_BUCKET_NAME!;
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  const isApiCall = event?.requestContext?.http !== undefined;

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]!;
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();

  // Parse style from request body (POST) or default to art_deco
  let style = 'art_deco';
  if (isApiCall && event?.body) {
    try {
      const body = JSON.parse(event.body);
      if (body.style) style = body.style;
    } catch { /* ignore parse errors */ }
  }

  console.log(`Generating daily image for ${dateStr} (style: ${style})`);

  try {
    // Step 1: Ask Gemini 3 Flash to select a historical event
    const eventResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: getEventSelectionPrompt(month, day),
      config: {
        temperature: 0.9,
        maxOutputTokens: 500,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            year: { type: 'INTEGER' },
            title: { type: 'STRING' },
            description: { type: 'STRING' },
            image_prompt: { type: 'STRING' },
          },
          required: ['year', 'title', 'description', 'image_prompt'],
        },
      },
    });

    // Extract text from response parts, skipping any thinking parts
    const outputParts = eventResponse.candidates?.[0]?.content?.parts ?? [];
    console.log('Response parts:', JSON.stringify(outputParts.map((p: any) => ({ hasText: !!p.text, thought: p.thought, len: p.text?.length }))));
    const eventText = outputParts
      .filter((p: any) => p.text && !p.thought)
      .map((p: any) => p.text)
      .join('');
    console.log('Gemini event response:', eventText);

    let historicalEvent: { year: number; title: string; description: string; image_prompt: string };
    try {
      historicalEvent = JSON.parse(eventText);
    } catch (parseErr) {
      console.error('JSON parse failed. Raw text (first 200 chars):', eventText.substring(0, 200));
      console.error('All parts text:', outputParts.map((p: any) => p.text?.substring(0, 100)));
      throw parseErr;
    }


    // Step 2: Generate image with Nano Banana 2 (native 16:9)
    const dateLabel = `${monthName(month)} ${day}`;
    const imagePrompt = getImageGenerationPrompt(historicalEvent.image_prompt, style, dateLabel, historicalEvent.title);
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: imagePrompt,
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '16:9',
        },
      },
    });

    // Extract base64 image from response
    const parts = imageResponse.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
    if (!imagePart?.inlineData?.data) throw new Error('Gemini returned no image data');

    const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
    console.log(`Gemini image: ${imageBuffer.length} bytes (${imagePart.inlineData.mimeType})`);

    // Step 3: Resize to 960x540 (device resolution) using jimp
    const image = await Jimp.read(imageBuffer);
    image.cover({ w: 960, h: 540 });
    const jpegBuffer = await image.getBuffer('image/jpeg', { quality: 85 });
    console.log(`Resized to 960x540 JPEG: ${jpegBuffer.length} bytes`);

    // Upload device image (960x540 JPEG)
    const imageKey = `images/${dateStr}/image.jpg`;
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: imageKey,
      Body: jpegBuffer,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=86400',
    }));
    console.log(`Uploaded: ${imageKey}`);

    // Step 4: Generate color image for Frameo frame (same event, color style)
    let frameoImageKey: string | undefined;
    try {
      const colorPrompt = getColorImageGenerationPrompt(historicalEvent.image_prompt, style, dateLabel, historicalEvent.title, historicalEvent.year);
      const colorResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: colorPrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: '16:9',
          },
        },
      });

      const candidate = colorResponse.candidates?.[0];
      console.log('Color generation response:', JSON.stringify({
        finishReason: candidate?.finishReason,
        safetyRatings: candidate?.safetyRatings,
        partsCount: candidate?.content?.parts?.length,
        partTypes: candidate?.content?.parts?.map((p: any) => p.inlineData ? `image/${p.inlineData.mimeType}` : p.text ? `text(${p.text.length})` : 'unknown'),
      }));

      const colorParts = candidate?.content?.parts ?? [];
      const colorImagePart = colorParts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

      if (colorImagePart?.inlineData?.data) {
        const colorBuffer = Buffer.from(colorImagePart.inlineData.data, 'base64');
        console.log(`Gemini color image: ${colorBuffer.length} bytes`);

        // Step 5: Resize to 1280x800 (Frameo resolution) — 16:9 source cropped to 16:10
        const colorImage = await Jimp.read(colorBuffer);
        colorImage.cover({ w: 1280, h: 800 });
        const frameoBuffer = await colorImage.getBuffer('image/jpeg', { quality: 90 });
        console.log(`Resized to 1280x800 JPEG: ${frameoBuffer.length} bytes`);

        // Step 6: Upload Frameo image
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

    // Upload metadata
    const metadata = {
      date: dateStr,
      year: historicalEvent.year,
      title: historicalEvent.title,
      description: historicalEvent.description,
      style,
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

    console.log(`Done: ${historicalEvent.title} (${historicalEvent.year})`);

    if (isApiCall) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Image generated successfully',
          date: dateStr,
          title: historicalEvent.title,
          year: historicalEvent.year,
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
