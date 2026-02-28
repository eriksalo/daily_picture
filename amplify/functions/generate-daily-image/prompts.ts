export function getEventSelectionPrompt(month: number, day: number): string {
  return `You are a historian. Pick ONE significant historical event that happened on ${monthName(month)} ${day}.

Choose events that are visually compelling - battles, discoveries, inventions, space exploration,
natural phenomena, architectural achievements, or dramatic moments in history.

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "year": 1969,
  "title": "Apollo 11 Moon Landing",
  "description": "Neil Armstrong and Buzz Aldrin became the first humans to walk on the Moon.",
  "image_prompt": "A photorealistic black and white scene inside the Apollo 11 Lunar Module Eagle, Neil Armstrong in his spacesuit reaching toward the hatch handle, Buzz Aldrin behind him checking instruments, the Moon's surface visible through the small triangular window but no one has stepped outside yet, Earth glowing in the black sky, tense anticipation before the first step"
}

The image_prompt MUST depict THE MOMENT JUST BEFORE the event happens — NOT the event itself.
Show the tension, anticipation, and calm before the storm. The event has NOT yet occurred.
Examples: for a moon landing, show the astronaut reaching for the hatch (not stepping on the surface); for an assassination, show the crowd gathering moments before (not the shot); for a volcano eruption, show the rumbling mountain with birds fleeing (not the eruption itself).
The scene should feel pregnant with what is about to happen — the viewer knows what comes next but it hasn't happened yet.
Use LANDSCAPE orientation.
It MUST depict the ACTUAL REAL recognizable location/building/person/object with accurate architectural and geographic details.
Use proper names and describe distinctive real features (e.g. "the Reichstag building in Berlin with its distinctive glass dome and neoclassical columns" not "a government building").
It should be visually rich, dramatic, and composed for a wide landscape frame.
Do NOT include any text, labels, or dates in the image description.`;
}

export function getImageGenerationPrompt(imagePrompt: string, style: string = 'art_deco', dateLabel?: string, title?: string, year?: number): string {
  const styles: Record<string, string> = {
    art_deco: 'Art deco illustration in GRAYSCALE ONLY, bold geometric shapes, strong lines, elegant and dramatic. No color whatsoever — only black, white, and shades of gray.',
    woodcut: 'Woodcut print style in GRAYSCALE ONLY, bold black lines, high contrast, dramatic cross-hatching. No color whatsoever — only black, white, and shades of gray.',
    ink_wash: 'East Asian ink wash painting in GRAYSCALE ONLY, fluid brushstrokes, atmospheric, minimalist. No color whatsoever — only black, white, and shades of gray.',
    noir: 'Film noir style in GRAYSCALE ONLY, extreme high contrast, deep shadows, dramatic chiaroscuro lighting. No color whatsoever — only black, white, and shades of gray.',
    sketch: 'Detailed pencil sketch in GRAYSCALE ONLY, fine cross-hatching, architectural precision, hand-drawn feel. No color whatsoever — only black, white, and shades of gray.',
  };

  const styleDesc = styles[style] ?? styles['art_deco'];

  const dateLine = dateLabel && year ? `${dateLabel}, ${year}` : dateLabel ?? '';
  const textOverlay = dateLine && title
    ? `\n\nINCLUDE TEXT ON THE IMAGE: At the bottom of the image, place a dark semi-transparent banner. On it, render "${dateLine}" in small clean white sans-serif text, and below it "${title}" in larger bold white sans-serif text. The text must be perfectly legible and spelled exactly as given.`
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
