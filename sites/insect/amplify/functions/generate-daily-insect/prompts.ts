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
