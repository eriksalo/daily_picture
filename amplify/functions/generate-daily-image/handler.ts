// Daily image generation Lambda — GPT-4 + DALL-E 3
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import OpenAI from 'openai';
import { getEventSelectionPrompt, getImageGenerationPrompt } from './prompts.js';

const s3 = new S3Client();

export const handler = async (event?: APIGatewayProxyEventV2): Promise<void | APIGatewayProxyResultV2> => {
  const bucketName = process.env.DAILY_PICTURE_IMAGES_BUCKET_NAME!;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
    // Step 1: Ask GPT-4 to select a historical event
    const eventResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: getEventSelectionPrompt(month, day) }],
      temperature: 0.9,
      max_tokens: 500,
    });

    const eventText = eventResponse.choices[0]?.message?.content ?? '';
    console.log('GPT-4 response:', eventText);

    const historicalEvent = JSON.parse(eventText) as {
      year: number;
      title: string;
      description: string;
      dalle_prompt: string;
    };

    // Step 2: Generate image with DALL-E 3
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: getImageGenerationPrompt(historicalEvent.dalle_prompt, style),
      n: 1,
      size: '1792x1024',
      quality: 'hd',
      response_format: 'b64_json',
    });

    const b64 = imageResponse.data?.[0]?.b64_json;
    if (!b64) throw new Error('DALL-E returned no image data');

    const imageBuffer = Buffer.from(b64, 'base64');
    console.log(`Image: ${imageBuffer.length} bytes`);

    // Step 3: Upload image for all display sizes (same source, devices scale locally)
    const imageKey = `images/${dateStr}/image.png`;
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: imageKey,
      Body: imageBuffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=86400',
    }));
    console.log(`Uploaded: ${imageKey}`);

    // Upload metadata
    const metadata = {
      date: dateStr,
      year: historicalEvent.year,
      title: historicalEvent.title,
      description: historicalEvent.description,
      style,
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
