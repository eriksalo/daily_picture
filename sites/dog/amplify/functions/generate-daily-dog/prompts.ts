export interface DogSelection {
  breed: string;
  breed_group: string;
  origin: string;
  temperament: string;
  fun_facts: string[];
  overlay_fact: string;
  image_prompt: string;
}

export function getDogSelectionPrompt(usedBreeds: string[]): string {
  const exclusionList = usedBreeds.length > 0
    ? `\n\nDO NOT select any of these previously used breeds:\n${usedBreeds.join(', ')}`
    : '';

  return `You are a world-class canine expert and pet photographer. Select ONE dog breed for today's featured image.

Choose breeds that are:
- Visually distinctive with notable physical traits, coats, or expressions
- Diverse across groups (sporting, hound, working, terrier, toy, non-sporting, herding, plus less-common landraces and rare breeds)
- From varied origins worldwide (not always the popular Western breeds)
- Interesting enough to have compelling fun facts

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "breed": "Tibetan Mastiff",
  "breed_group": "Working",
  "origin": "Tibet / Himalayan plateau",
  "temperament": "Aloof, protective, independent, loyal",
  "fun_facts": [
    "Bred for over 2,000 years to guard livestock and monasteries against wolves and snow leopards",
    "Their dense double coat keeps them warm in -40°C Himalayan winters",
    "A red Tibetan Mastiff once sold in China for nearly $2 million"
  ],
  "overlay_fact": "Guarded Himalayan monasteries from snow leopards",
  "image_prompt": "A massive Tibetan Mastiff with a thick russet-and-black mane sitting regally on a snow-dusted Himalayan ridge, prayer flags fluttering in the background, morning light catching its lion-like coat"
}

The overlay_fact MUST be a single short sentence under 60 characters — the most surprising or memorable fact.

The image_prompt should describe a photorealistic photograph showcasing the breed in a setting that reflects its origin or working role. Focus on details that make this breed unique — coat, posture, distinctive features.${exclusionList}`;
}

export function getGrayscaleImagePrompt(imagePrompt: string, breed: string, overlayFact: string): string {
  return `${imagePrompt}

Style: Photorealistic dog photography in GRAYSCALE ONLY. Shot with a Canon 70-200mm f/2.8L lens, National Geographic quality, but rendered entirely in black, white, and shades of gray with NO color whatsoever. Shallow depth of field with creamy bokeh background. Dramatic side lighting with strong rim light highlighting the coat texture and facial features. Every whisker, tuft of fur, and expression detail is razor-sharp. Strong contrast between deep blacks and bright highlights — fine art black-and-white photography. Landscape orientation, 16:9 aspect ratio.

INCLUDE TEXT ON THE IMAGE: In the exact center of the image, render "${breed}" in large bold white sans-serif text, and directly below it "${overlayFact}" in smaller white sans-serif text. Use a subtle dark drop shadow for legibility. The text must be perfectly legible and spelled exactly as given. Do NOT place any text in the corners or along the edges — text must ONLY appear in the center.

CRITICAL: The entire image must be strictly grayscale/monochrome — absolutely NO color, NO sepia, NO tinted tones. Only black, white, and gray.`;
}

export function getColorImagePrompt(imagePrompt: string, breed: string, overlayFact: string): string {
  return `${imagePrompt}

Style: Photorealistic dog photography in full vivid color. Shot with a Canon 70-200mm f/2.8L lens, National Geographic quality. Shallow depth of field with creamy bokeh background. Natural lighting that flatters the coat color and shows fur texture. Every whisker, tuft of fur, and expression detail is razor-sharp. The colors are rich and true to life — natural saturation, no over-processing. Landscape composition, 16:9 aspect ratio.

INCLUDE TEXT ON THE IMAGE: In the exact center of the image, render "${breed}" in large bold white sans-serif text, and directly below it "${overlayFact}" in smaller white sans-serif text. Use a subtle dark drop shadow for legibility. The text must be perfectly legible and spelled exactly as given. Do NOT place any text in the corners or along the edges — text must ONLY appear in the center.`;
}
