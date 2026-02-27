import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import OpenAI from 'openai';
import { getEventSelectionPrompt, getImageGenerationPrompt } from './prompts.js';
import { processImage } from './image-processor.js';

const s3 = new S3Client();

export const handler = async (): Promise<void> => {
  const bucketName = process.env.DAILY_PICTURE_IMAGES_BUCKET_NAME!;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]!;
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();

  console.log(`Generating daily image for ${dateStr}`);

  // Step 1: Ask GPT-4 to select a historical event
  const eventResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: getEventSelectionPrompt(month, day) }],
    temperature: 0.9,
    max_tokens: 500,
  });

  const eventText = eventResponse.choices[0]?.message?.content ?? '';
  console.log('GPT-4 response:', eventText);

  const event = JSON.parse(eventText) as {
    year: number;
    title: string;
    description: string;
    dalle_prompt: string;
  };

  // Step 2: Generate image with DALL-E 3
  const imageResponse = await openai.images.generate({
    model: 'dall-e-3',
    prompt: getImageGenerationPrompt(event.dalle_prompt),
    n: 1,
    size: '1024x1024',
    quality: 'hd',
    response_format: 'b64_json',
  });

  const b64 = imageResponse.data?.[0]?.b64_json;
  if (!b64) throw new Error('DALL-E returned no image data');

  const sourceBuffer = Buffer.from(b64, 'base64');
  console.log(`Source image: ${sourceBuffer.length} bytes`);

  // Step 3: Process into display variants with date overlay
  const variants = await processImage(sourceBuffer, dateStr, event.year);

  // Step 4: Upload all variants + metadata to S3
  for (const variant of variants) {
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: variant.key,
      Body: variant.buffer,
      ContentType: variant.contentType,
      CacheControl: 'public, max-age=86400',
    }));
    console.log(`Uploaded: ${variant.key} (${variant.buffer.length} bytes)`);
  }

  // Upload metadata
  const metadata = {
    date: dateStr,
    year: event.year,
    title: event.title,
    description: event.description,
    generated_at: new Date().toISOString(),
  };

  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: `images/${dateStr}/metadata.json`,
    Body: JSON.stringify(metadata, null, 2),
    ContentType: 'application/json',
    CacheControl: 'public, max-age=86400',
  }));

  console.log(`Daily image generation complete for ${dateStr}: ${event.title} (${event.year})`);
};
