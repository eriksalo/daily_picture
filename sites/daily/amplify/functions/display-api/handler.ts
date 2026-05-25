import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client();

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const bucketName = process.env.DAILY_PICTURE_IMAGES_BUCKET_NAME!;

  const deviceId = event.headers?.['x-device-id'] ?? 'unknown';
  const device = event.queryStringParameters?.device;
  const isFrameo = device === 'frameo';
  console.log(`Request from device ${deviceId}${isFrameo ? ' (frameo)' : ''}`);

  // Try today's image first, fall back to yesterday
  const today = new Date().toISOString().split('T')[0]!;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]!;

  let dateStr = today;
  let imageKey = `images/${dateStr}/image.jpg`;

  if (!(await objectExists(bucketName, imageKey))) {
    dateStr = yesterday;
    imageKey = `images/${dateStr}/image.jpg`;

    if (!(await objectExists(bucketName, imageKey))) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({ error: 'No image available' }),
      };
    }
  }

  // For Frameo devices, use color image if available
  const frameoKey = `images/${dateStr}/image-frameo.jpg`;
  if (isFrameo && await objectExists(bucketName, frameoKey)) {
    imageKey = frameoKey;
  }

  // Get metadata
  const metadataKey = `images/${dateStr}/metadata.json`;
  let metadata = { date: dateStr, year: 0, title: '', description: '', style: 'art_deco' };

  try {
    const metadataObj = await s3.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: metadataKey,
    }));
    const metadataStr = await metadataObj.Body?.transformToString();
    if (metadataStr) metadata = JSON.parse(metadataStr);
  } catch {
    console.warn(`Metadata not found for ${dateStr}`);
  }

  // Generate pre-signed URL (valid for 1 hour)
  const imageUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucketName, Key: imageKey }),
    { expiresIn: 3600 },
  );

  // Generate Frameo URL if available (for web frontend to show both)
  let frameoImageUrl: string | undefined;
  if (!isFrameo && await objectExists(bucketName, frameoKey)) {
    frameoImageUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucketName, Key: frameoKey }),
      { expiresIn: 3600 },
    );
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    body: JSON.stringify({
      image_url: imageUrl,
      ...(frameoImageUrl && { frameo_image_url: frameoImageUrl }),
      event_date: metadata.date,
      event_year: metadata.year,
      event_title: metadata.title,
      event_description: metadata.description,
      style: metadata.style,
      refresh_rate: 86400,
    }),
  };
};

async function objectExists(bucket: string, key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}
