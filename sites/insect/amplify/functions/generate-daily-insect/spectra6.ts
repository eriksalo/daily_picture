/**
 * Spectra 6 conversion for the M5Stack Paper Color frame.
 *
 * The panel renders exactly six colours. M5GFX's `Panel_ED2208` driver maps
 * every pixel to its nearest palette entry on the device, so we dither to the
 * *identical* palette values here: the device lookup then becomes an identity
 * map and reproduces our output exactly, with no second dithering pass.
 *
 * Output is PNG, not JPEG. JPEG's chroma subsampling and ringing smear a
 * hard-dithered image into colours that are not on the palette, which the
 * device then re-quantises into mush.
 */
import { Jimp } from 'jimp';

/** Exactly the palette in M5GFX `Panel_ED2208.cpp`. Do not "improve" these. */
export const SPECTRA6_PALETTE: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],        // black
  [255, 255, 255],  // white
  [255, 243, 56],   // yellow
  [191, 0, 0],      // red
  [100, 64, 255],   // blue
  [67, 138, 28],    // green
];

/** Luma weights - the eye is most sensitive to green, least to blue. */
const WR = 0.30, WG = 0.59, WB = 0.11;

export interface Spectra6Options {
  width: number;
  height: number;
  /** >1 pushes colours toward the palette's vivid primaries. */
  saturation: number;
  contrast: number;
  brightness: number;
  /** <1 lifts midtones; e-ink is reflective and reads darker than a screen. */
  gamma: number;
  /** Median pre-pass removes noise that would otherwise dither into speckle. */
  denoise: boolean;
  /** Unsharp amount as a fraction (1.5 = 150%). 0 disables. */
  sharpen: number;
}

/**
 * Defaults validated against real generated images. Moderate rather than
 * aggressive: heavy saturation makes low-detail backgrounds dither into
 * red/green noise, which looks far worse than a slightly flat subject.
 */
export const SPECTRA6_DEFAULTS: Spectra6Options = {
  width: 600,
  height: 338,
  saturation: 1.25,
  contrast: 1.08,
  brightness: 1.06,
  gamma: 0.95,
  denoise: true,
  sharpen: 1.5,
};

const clamp8 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Per-pixel saturation / contrast / brightness / gamma, in place. */
function adjust(data: Buffer, opts: Spectra6Options): void {
  const gammaLut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    gammaLut[i] = clamp8(Math.round(Math.pow(i / 255, opts.gamma) * 255));
  }

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;

    const luma = r * WR + g * WG + b * WB;
    r = luma + (r - luma) * opts.saturation;
    g = luma + (g - luma) * opts.saturation;
    b = luma + (b - luma) * opts.saturation;

    r = (r - 128) * opts.contrast + 128;
    g = (g - 128) * opts.contrast + 128;
    b = (b - 128) * opts.contrast + 128;

    r *= opts.brightness;
    g *= opts.brightness;
    b *= opts.brightness;

    data[i] = gammaLut[clamp8(Math.round(r))]!;
    data[i + 1] = gammaLut[clamp8(Math.round(g))]!;
    data[i + 2] = gammaLut[clamp8(Math.round(b))]!;
  }
}

/** 3x3 median, per channel. Cheap edge-preserving denoise. */
function medianFilter(data: Buffer, w: number, h: number): void {
  const src = new Uint8Array(data.length);
  src.set(data);
  const window = new Array<number>(9);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            window[n++] = src[((y + dy) * w + (x + dx)) * 4 + c]!;
          }
        }
        window.sort((a, b) => a - b);
        data[(y * w + x) * 4 + c] = window[4]!;
      }
    }
  }
}

/** Unsharp mask against a 3x3 gaussian blur, restoring edges after denoise. */
function unsharpMask(data: Buffer, w: number, h: number, amount: number): void {
  const src = new Uint8Array(data.length);
  src.set(data);
  const k = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += src[((y + dy) * w + (x + dx)) * 4 + c]! * k[n++]!;
          }
        }
        const blurred = sum / 16;
        const original = src[(y * w + x) * 4 + c]!;
        data[(y * w + x) * 4 + c] = clamp8(
          Math.round(original + amount * (original - blurred)),
        );
      }
    }
  }
}

function nearestPaletteIndex(r: number, g: number, b: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < SPECTRA6_PALETTE.length; i++) {
    const [pr, pg, pb] = SPECTRA6_PALETTE[i]!;
    const dr = r - pr, dg = g - pg, db = b - pb;
    const dist = dr * dr * WR + dg * dg * WG + db * db * WB;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/** Floyd-Steinberg error diffusion onto the Spectra 6 palette, in place. */
function floydSteinberg(data: Buffer, w: number, h: number): void {
  // Float working copy so diffused error is not truncated at each step.
  const buf = new Float32Array(w * h * 3);
  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    buf[p * 3] = data[i]!;
    buf[p * 3 + 1] = data[i + 1]!;
    buf[p * 3 + 2] = data[i + 2]!;
  }

  const diffuse = (p: number, er: number, eg: number, eb: number, f: number): void => {
    buf[p * 3] = buf[p * 3]! + er * f;
    buf[p * 3 + 1] = buf[p * 3 + 1]! + eg * f;
    buf[p * 3 + 2] = buf[p * 3 + 2]! + eb * f;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const r = buf[p * 3]!, g = buf[p * 3 + 1]!, b = buf[p * 3 + 2]!;
      const [nr, ng, nb] = SPECTRA6_PALETTE[nearestPaletteIndex(r, g, b)]!;

      buf[p * 3] = nr;
      buf[p * 3 + 1] = ng;
      buf[p * 3 + 2] = nb;

      const er = r - nr, eg = g - ng, eb = b - nb;
      if (x + 1 < w) diffuse(p + 1, er, eg, eb, 7 / 16);
      if (y + 1 < h) {
        if (x > 0) diffuse(p + w - 1, er, eg, eb, 3 / 16);
        diffuse(p + w, er, eg, eb, 5 / 16);
        if (x + 1 < w) diffuse(p + w + 1, er, eg, eb, 1 / 16);
      }
    }
  }

  for (let p = 0, i = 0; p < w * h; p++, i += 4) {
    data[i] = buf[p * 3]!;
    data[i + 1] = buf[p * 3 + 1]!;
    data[i + 2] = buf[p * 3 + 2]!;
    data[i + 3] = 255;
  }
}

/**
 * Convert a generated image into a Paper Color frame: cover-cropped and
 * resized to the panel's image area, tuned for a reflective 6-colour display,
 * and dithered to the exact panel palette. Returns PNG bytes.
 */
export async function toSpectra6Png(
  input: Buffer,
  overrides: Partial<Spectra6Options> = {},
): Promise<Buffer> {
  const opts: Spectra6Options = { ...SPECTRA6_DEFAULTS, ...overrides };

  const image = await Jimp.read(input);
  image.cover({ w: opts.width, h: opts.height });

  const { data, width, height } = image.bitmap;

  adjust(data, opts);
  if (opts.denoise) medianFilter(data, width, height);
  if (opts.sharpen > 0) unsharpMask(data, width, height, opts.sharpen);
  floydSteinberg(data, width, height);

  // Encoder settings matter a lot here, and jimp's defaults are pessimal for
  // dithered data. Download time is battery on this frame.
  //   colorType 2       - store RGB; our alpha is a constant 255.
  //   filterType 0      - no per-row filtering; prediction only hurts on dither.
  //   deflateStrategy 0 - jimp defaults to 3 (Z_RLE), which is far worse here.
  // Do NOT set `inputHasAlpha: false`: that describes the *input* bitmap, which
  // is RGBA. Claiming otherwise makes pngjs read 3 bytes per pixel from a
  // 4-byte-per-pixel buffer, shifting every channel progressively across the
  // image and silently producing off-palette colours.
  return image.getBuffer('image/png', {
    colorType: 2,
    filterType: 0,
    deflateLevel: 9,
    deflateStrategy: 0,
  });
}
