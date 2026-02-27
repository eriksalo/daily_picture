import sharp from 'sharp';

interface ImageVariant {
  width: number;
  height: number;
  grayscale: number;
  key: string;
}

interface ProcessedImage {
  buffer: Buffer;
  key: string;
  contentType: string;
}

export function getVariants(dateStr: string): ImageVariant[] {
  return [
    { width: 960, height: 540, grayscale: 16, key: `images/${dateStr}/960x540-gray16.jpg` },
    { width: 1024, height: 1024, grayscale: 256, key: `images/${dateStr}/1024x1024-gray256.jpg` },
  ];
}

export async function processImage(
  sourceBuffer: Buffer,
  dateStr: string,
  eventYear: number,
): Promise<ProcessedImage[]> {
  const variants = getVariants(dateStr);
  const results: ProcessedImage[] = [];

  for (const variant of variants) {
    // Create date overlay SVG
    const overlayText = `${monthDay(dateStr)}, ${eventYear}`;
    const overlayHeight = Math.round(variant.height * 0.08);
    const fontSize = Math.round(overlayHeight * 0.7);
    const padding = Math.round(fontSize * 0.5);

    const svgOverlay = `
      <svg width="${variant.width}" height="${variant.height}">
        <rect x="0" y="${variant.height - overlayHeight - padding}"
              width="${variant.width}" height="${overlayHeight + padding}"
              fill="rgba(0,0,0,0.6)"/>
        <text x="${padding}" y="${variant.height - padding * 0.6}"
              font-family="sans-serif" font-size="${fontSize}"
              font-weight="bold" fill="white">
          ${overlayText}
        </text>
      </svg>`;

    const buffer = await sharp(sourceBuffer)
      .resize(variant.width, variant.height, { fit: 'cover' })
      .grayscale()
      .composite([{ input: Buffer.from(svgOverlay), gravity: 'southeast' }])
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    results.push({
      buffer,
      key: variant.key,
      contentType: 'image/jpeg',
    });
  }

  return results;
}

function monthDay(dateStr: string): string {
  const [, month, day] = dateStr.split('-').map(Number);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[month! - 1]} ${day}`;
}
