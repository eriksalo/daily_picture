export function getEventSelectionPrompt(month: number, day: number): string {
  return `You are a historian. Pick ONE significant historical event that happened on ${monthName(month)} ${day}.

Choose events that are visually compelling - battles, discoveries, inventions, space exploration,
natural phenomena, architectural achievements, or dramatic moments in history.

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "year": 1969,
  "title": "Apollo 11 Moon Landing",
  "description": "Neil Armstrong and Buzz Aldrin became the first humans to walk on the Moon.",
  "image_prompt": "A photorealistic black and white scene showing two astronauts in spacesuits standing at the door of a lunar module, about to step onto the Moon's surface, Earth visible in the dark sky above the barren lunar landscape, dramatic lighting from the sun casting long shadows"
}

The image_prompt should describe "the moment just before" the event happened in LANDSCAPE orientation.
It MUST depict the ACTUAL REAL recognizable location/building/person/object with accurate architectural and geographic details.
Use proper names and describe distinctive real features (e.g. "the Reichstag building in Berlin with its distinctive glass dome and neoclassical columns" not "a government building").
It should be visually rich, dramatic, and composed for a wide landscape frame.
Do NOT include any text, labels, or dates in the image description.`;
}

export function getImageGenerationPrompt(imagePrompt: string, style: string = 'art_deco', dateLabel?: string, title?: string): string {
  const styles: Record<string, string> = {
    art_deco: 'Art deco illustration in GRAYSCALE ONLY, bold geometric shapes, strong lines, elegant and dramatic. No color whatsoever — only black, white, and shades of gray.',
    woodcut: 'Woodcut print style in GRAYSCALE ONLY, bold black lines, high contrast, dramatic cross-hatching. No color whatsoever — only black, white, and shades of gray.',
    ink_wash: 'East Asian ink wash painting in GRAYSCALE ONLY, fluid brushstrokes, atmospheric, minimalist. No color whatsoever — only black, white, and shades of gray.',
    noir: 'Film noir style in GRAYSCALE ONLY, extreme high contrast, deep shadows, dramatic chiaroscuro lighting. No color whatsoever — only black, white, and shades of gray.',
    sketch: 'Detailed pencil sketch in GRAYSCALE ONLY, fine cross-hatching, architectural precision, hand-drawn feel. No color whatsoever — only black, white, and shades of gray.',
  };

  const styleDesc = styles[style] ?? styles['art_deco'];

  const textOverlay = dateLabel && title
    ? `\n\nINCLUDE TEXT ON THE IMAGE: At the bottom of the image, place a dark semi-transparent banner. On it, render "${dateLabel}" in small clean white sans-serif text, and below it "${title}" in larger bold white sans-serif text. The text must be perfectly legible and spelled exactly as given.`
    : '';

  return `${imagePrompt}

Style: ${styleDesc} CRITICAL: The entire image must be strictly grayscale/monochrome — absolutely NO color, NO sepia, NO tinted tones. Only black, white, and gray. The depiction must show the ACTUAL recognizable real-world subject — not a generic substitute. Landscape composition.${textOverlay}`;
}


export function monthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return months[month - 1] ?? 'January';
}
