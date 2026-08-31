export interface InsectSelection {
  common_name: string;
  scientific_name: string;
  order: string;
  family: string;
  habitat: string;
  fun_facts: string[];
  overlay_fact: string;
  image_prompt: string;
}

export function getInsectSelectionPrompt(usedInsects: string[]): string {
  const exclusionList = usedInsects.length > 0
    ? `\n\nDO NOT select any of these previously used insects:\n${usedInsects.join(', ')}`
    : '';

  return `You are a world-class entomologist and nature photographer. Select ONE fascinating insect or arthropod species for today's featured image.

Choose specimens that are:
- Visually stunning with interesting colors, patterns, or body structures
- Diverse across orders (beetles, butterflies, moths, dragonflies, mantises, wasps, ants, cicadas, stick insects, spiders, scorpions, etc.)
- From different habitats and regions worldwide
- Interesting enough to have compelling fun facts

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "common_name": "Orchid Mantis",
  "scientific_name": "Hymenopus coronatus",
  "order": "Mantodea",
  "family": "Hymenopodidae",
  "habitat": "Tropical rainforests of Southeast Asia",
  "fun_facts": [
    "They mimic orchid flowers so convincingly that pollinating insects are attracted to them",
    "Females are about twice the size of males",
    "They can change color between pink and brown depending on their environment"
  ],
  "overlay_fact": "Mimics orchid flowers to ambush pollinating prey",
  "image_prompt": "An orchid mantis perched on a pink orchid stem, its petal-like legs spread wide, translucent pink and white body blending seamlessly with the flower petals"
}

The overlay_fact MUST be a single short sentence under 60 characters — the most surprising or memorable fact.

The image_prompt should describe a photorealistic macro photography scene showcasing the specimen in its natural habitat or a visually dramatic pose. Focus on details that make this species unique and beautiful.${exclusionList}`;
}

export function getGrayscaleImagePrompt(imagePrompt: string, commonName: string, overlayFact: string): string {
  return `${imagePrompt}

Style: Photorealistic macro photography in GRAYSCALE ONLY. Shot with a Canon 100mm f/2.8L macro lens, National Geographic quality, but rendered entirely in black, white, and shades of gray with NO color whatsoever. Extreme shallow depth of field with creamy bokeh background. Dramatic side lighting with strong rim light highlighting the exoskeleton texture. Every hair, scale, and compound eye facet is razor-sharp. Strong contrast between deep blacks and bright highlights. Landscape orientation, 16:9 aspect ratio.

COMPOSITION RULE — VERY IMPORTANT: Frame the insect in the upper two-thirds of the image. The lower 25% of the image MUST be reserved as a darker, low-detail caption area (a subtle dark gradient fading into the scene). Do NOT place the insect's body, legs, antennae, or any key visual feature in the lower 25% — that strip is reserved for text overlay.

TEXT OVERLAY POSITION — VERY IMPORTANT: Render the text in the BOTTOM 20% of the image, horizontally centered. Specifically:
  - Line 1 (top of the caption block, ~80% from the top of the image): "${commonName}" in large bold white sans-serif text.
  - Line 2 (directly below Line 1, ~90% from the top of the image): "${overlayFact}" in smaller white sans-serif text.
Use a subtle dark drop shadow for legibility. The text must be perfectly legible and spelled exactly as given.

ABSOLUTE RULES FOR TEXT PLACEMENT — DO NOT VIOLATE:
  - Text must NEVER appear in the center of the image.
  - Text must NEVER appear in the top half of the image.
  - Text must NEVER appear over the insect's body.
  - Text must ONLY appear in the bottom 20% strip, horizontally centered.

CRITICAL: The entire image must be strictly grayscale/monochrome — absolutely NO color, NO sepia, NO tinted tones. Only black, white, and gray.`;
}

export function getColorImagePrompt(imagePrompt: string, commonName: string, overlayFact: string): string {
  return `${imagePrompt}

Style: Photorealistic macro photography in full vivid color. Shot with a Canon 100mm f/2.8L macro lens, National Geographic quality. Extreme shallow depth of field with creamy bokeh background. Natural lighting with subtle rim light highlighting the exoskeleton details. Every hair, scale, and compound eye facet is razor-sharp. The colors are vivid and true to life — saturated but natural. Landscape composition, 16:9 aspect ratio.

COMPOSITION RULE — VERY IMPORTANT: Frame the insect in the upper two-thirds of the image. The lower 25% of the image MUST be reserved as a darker, low-detail caption area (a subtle dark gradient fading into the scene). Do NOT place the insect's body, legs, antennae, or any key visual feature in the lower 25% — that strip is reserved for text overlay.

TEXT OVERLAY POSITION — VERY IMPORTANT: Render the text in the BOTTOM 20% of the image, horizontally centered. Specifically:
  - Line 1 (top of the caption block, ~85% from the top of the image): "${commonName}" in small bold white sans-serif text — caption-sized, approximately 4% of the image height, NOT a title or headline.
  - Line 2 (directly below Line 1, ~92% from the top of the image): "${overlayFact}" in even smaller white sans-serif text — approximately 3% of the image height.
The text should be a discreet caption, not a dominant title. Use a subtle dark drop shadow for legibility. The text must be perfectly legible and spelled exactly as given.

ABSOLUTE RULES FOR TEXT PLACEMENT — DO NOT VIOLATE:
  - Text must NEVER appear in the center of the image.
  - Text must NEVER appear in the top half of the image.
  - Text must NEVER appear over the insect's body.
  - Text must ONLY appear in the bottom 20% strip, horizontally centered.
  - Text must be SMALL — caption-sized, not headline-sized.`;
}

/**
 * Image prompt for the M5Stack Paper Color frame (600x400 Spectra 6 e-ink).
 *
 * This frame can render exactly six colours: black, white, yellow, red, blue,
 * green. A photorealistic macro shot is the worst possible input for it - the
 * bokeh backgrounds and subtle mid-tones dither into red/green speckle. Bold
 * flat colour with hard edges survives the palette almost intact, so this asks
 * for screen-print poster art in the panel's own colours instead.
 *
 * Note this variant carries NO baked-in text: the firmware draws its own
 * caption band (common name, scientific name, battery) in the bottom 62px, so
 * the artwork is the top 338px only and must be full-bleed.
 */
export function getSpectra6ImagePrompt(imagePrompt: string, commonName: string): string {
  return `${imagePrompt}

Subject: ${commonName}.

Style: Bold vintage SCREEN-PRINT / RISOGRAPH POSTER illustration. Flat areas of solid colour with crisp hard edges and confident black linework, in the tradition of mid-century natural history plates and silkscreen concert posters. Think printed poster, NOT photograph.

STRICT COLOUR PALETTE - use ONLY these six colours, as flat solid fills:
  - pure black
  - pure white
  - bright saturated yellow
  - deep pure red
  - vivid blue
  - strong leaf green
Every area must be one of those six flat colours. Where you need shading or texture, use visible crosshatching, stippling, or halftone dots in those same flat colours - NEVER smooth gradients, NEVER blended intermediate tones, NEVER pastels, browns, greys, oranges, purples, or teals.

COMPOSITION:
  - The specimen fills the frame boldly and is the unmistakable focus, rendered large and graphic with strong black outlines.
  - Simple flat background: a single solid colour, or a simple bold graphic shape (a circle, a band, a leaf silhouette) in one other palette colour. High contrast against the subject.
  - No depth of field, no bokeh, no photographic blur, no soft focus, no realistic lighting or shadows.
  - Landscape orientation, 16:9 aspect ratio, edge-to-edge artwork.

ABSOLUTELY NO TEXT: do not render any words, letters, numbers, captions, titles, labels, signatures, or watermarks anywhere in the image. The frame adds its own caption separately. The image must be pure artwork.`;
}
