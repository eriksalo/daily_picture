export interface NerdSelection {
  name: string;
  field: string;
  era: string;
  contribution: string;
  fun_facts: string[];
  overlay_fact: string;
  image_prompt: string;
}

export function getNerdSelectionPrompt(usedNerds: string[]): string {
  const exclusionList = usedNerds.length > 0
    ? `\n\nDO NOT select any of these previously used people:\n${usedNerds.join(', ')}`
    : '';

  return `You are a historian of science and technology. Select ONE historically significant person in computing, technology, mathematics, electronics, or information science for today's featured portrait.

Choose people who are:
- Genuinely influential — their work shaped modern computing, networking, electronics, cryptography, AI, software, hardware, or the internet
- Diverse across eras: ancient/medieval pioneers (al-Khwarizmi, Ada Lovelace, Babbage), early-20th-century giants (Turing, von Neumann, Shannon, Hopper, Hedy Lamarr), Bell-Labs/PARC era (Ritchie, Thompson, Kay, McCarthy, Engelbart, Hamming), modern foundational figures (Berners-Lee, Cerf, Wozniak, Knuth, Liskov, Stallman, Torvalds, Karen Spärck Jones), and underrepresented voices (Katherine Johnson, Annie Easley, Mary Wilkes, Margaret Hamilton, Frances Allen, Radia Perlman, Evelyn Berezin)
- Diverse across fields: programming languages, OS, networking, hardware, cryptography, AI/ML, theory, HCI, graphics, databases, infosec
- Diverse across nationalities, genders, and time periods — do NOT default to only American/British men of the 1970s-80s

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "name": "Grace Hopper",
  "field": "Programming languages / Compilers",
  "era": "1906–1992",
  "contribution": "Pioneered the first compilers and helped create COBOL.",
  "fun_facts": [
    "Coined the term 'debugging' after literally removing a moth from a Harvard Mark II relay in 1947",
    "Rose to the rank of Rear Admiral in the U.S. Navy and served until age 79",
    "Carried a foot-long piece of wire to demonstrate the distance light travels in a nanosecond"
  ],
  "overlay_fact": "Pioneered the first compiler — and coined 'debugging'.",
  "image_prompt": "A portrait of Rear Admiral Grace Hopper in her late career, seated at a Univac-era console with paper tape reels and indicator lights, navy uniform with ribbons, sharp confident expression, mid-20th-century mainframe room with banks of vacuum-tube cabinets in the background, dramatic top-down task lighting"
}

The overlay_fact MUST be a single short sentence under 70 characters — the single most memorable contribution or anecdote.

The era field should be lifespan (or approximate floruit for pre-modern figures), formatted "1906–1992" with an en-dash.

The image_prompt should describe a photorealistic portrait of the actual real person, recognizable, set in an environment that reflects the era and field of their work (a lab, a mainframe room, a workbench, a chalkboard, a teletype, a 1980s Xerox office, etc.). Use proper names for any visible equipment. The portrait should feel like a documentary photograph, not a fantasy illustration. Do not include any text, labels, or dates in the image description.${exclusionList}`;
}

export function getGrayscaleImagePrompt(imagePrompt: string, name: string, overlayFact: string): string {
  return `${imagePrompt}

Style: Photorealistic documentary portrait photography in GRAYSCALE ONLY. Shot with a Canon 85mm f/1.4 lens, mid-century editorial quality (Life magazine, Bell Labs press archive feel), but rendered entirely in black, white, and shades of gray with NO color whatsoever. Shallow depth of field with the subject sharply in focus and the background gently falling off. Dramatic side or top lighting with strong rim light defining the face and hands. Every wrinkle, eyeglass reflection, fabric texture, and instrument detail is razor-sharp. Strong contrast between deep blacks and bright highlights — fine art black-and-white portrait photography. Landscape orientation, 16:9 aspect ratio. The face must clearly resemble the actual historical person.

COMPOSITION RULE — VERY IMPORTANT: Frame the subject in the upper two-thirds of the image. The lower 25% of the image MUST be reserved as a darker, low-detail caption area (a subtle dark gradient fading into the scene). Do NOT place the subject's face or hands in the lower 25% — that strip is reserved for text overlay.

TEXT OVERLAY POSITION — VERY IMPORTANT: Render the text in the BOTTOM 20% of the image, horizontally centered. Specifically:
  - Line 1 (top of the caption block, ~80% from the top of the image): "${name}" in large bold white sans-serif text.
  - Line 2 (directly below Line 1, ~90% from the top of the image): "${overlayFact}" in smaller white sans-serif text.
Use a subtle dark drop shadow for legibility. The text must be perfectly legible and spelled exactly as given.

ABSOLUTE RULES FOR TEXT PLACEMENT — DO NOT VIOLATE:
  - Text must NEVER appear in the center of the image.
  - Text must NEVER appear in the top half of the image.
  - Text must NEVER appear over the subject's face or hands.
  - Text must ONLY appear in the bottom 20% strip, horizontally centered.

CRITICAL: The entire image must be strictly grayscale/monochrome — absolutely NO color, NO sepia, NO tinted tones. Only black, white, and gray.`;
}

export function getColorImagePrompt(imagePrompt: string, name: string, overlayFact: string): string {
  return `${imagePrompt}

Style: Photorealistic documentary portrait photography in full natural color. Shot with a Canon 85mm f/1.4 lens, editorial quality (National Geographic / Wired profile feature). Shallow depth of field with the subject sharply in focus and the background gently falling off. Natural lighting that flatters skin tones and reveals the texture of period-appropriate clothing, instruments, and surroundings. Every wrinkle, eyeglass reflection, fabric texture, and instrument detail is razor-sharp. Colors are rich and true to life, with period-accurate tones (warm tungsten for mid-century lab scenes, cool fluorescent for 1980s computer rooms, daylight for modern settings). Landscape composition, 16:9 aspect ratio. The face must clearly resemble the actual historical person.

COMPOSITION RULE — VERY IMPORTANT: Frame the subject in the upper two-thirds of the image. The lower 25% of the image MUST be reserved as a darker, low-detail caption area (a subtle dark gradient fading into the scene). Do NOT place the subject's face or hands in the lower 25% — that strip is reserved for text overlay.

TEXT OVERLAY POSITION — VERY IMPORTANT: Render the text in the BOTTOM 20% of the image, horizontally centered. Specifically:
  - Line 1 (top of the caption block, ~85% from the top of the image): "${name}" in small bold white sans-serif text — caption-sized, approximately 4% of the image height, NOT a title or headline.
  - Line 2 (directly below Line 1, ~92% from the top of the image): "${overlayFact}" in even smaller white sans-serif text — approximately 3% of the image height.
The text should be a discreet caption, not a dominant title. Use a subtle dark drop shadow for legibility. The text must be perfectly legible and spelled exactly as given.

ABSOLUTE RULES FOR TEXT PLACEMENT — DO NOT VIOLATE:
  - Text must NEVER appear in the center of the image.
  - Text must NEVER appear in the top half of the image.
  - Text must NEVER appear over the subject's face or hands.
  - Text must ONLY appear in the bottom 20% strip, horizontally centered.
  - Text must be SMALL — caption-sized, not headline-sized.`;
}
