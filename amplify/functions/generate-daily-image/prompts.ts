export function getEventSelectionPrompt(month: number, day: number): string {
  return `You are a historian. Pick ONE significant historical event that happened on ${monthName(month)} ${day}.

Choose events that are visually compelling - battles, discoveries, inventions, space exploration,
natural phenomena, architectural achievements, or dramatic moments in history.

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "year": 1969,
  "title": "Apollo 11 Moon Landing",
  "description": "Neil Armstrong and Buzz Aldrin became the first humans to walk on the Moon.",
  "dalle_prompt": "A photorealistic black and white scene showing two astronauts in spacesuits standing at the door of a lunar module, about to step onto the Moon's surface, Earth visible in the dark sky above the barren lunar landscape, dramatic lighting from the sun casting long shadows"
}

The dalle_prompt should describe "the moment just before" the event happened in LANDSCAPE orientation.
It MUST depict the ACTUAL REAL recognizable location/building/person/object with accurate architectural and geographic details.
Use proper names and describe distinctive real features (e.g. "the Reichstag building in Berlin with its distinctive glass dome and neoclassical columns" not "a government building").
It should be visually rich, dramatic, and composed for a wide landscape frame.
Do NOT include any text, labels, or dates in the image description.`;
}

export function getImageGenerationPrompt(dallePrompt: string, style: string = 'art_deco'): string {
  const styles: Record<string, string> = {
    art_deco: 'Art deco illustration, bold geometric shapes, strong lines, elegant and dramatic.',
    woodcut: 'Woodcut print style, bold black lines, high contrast, dramatic cross-hatching.',
    ink_wash: 'East Asian ink wash painting style, fluid brushstrokes, atmospheric, minimalist.',
    noir: 'Film noir style, extreme high contrast, deep shadows, dramatic chiaroscuro lighting.',
    sketch: 'Detailed pencil sketch, fine cross-hatching, architectural precision, hand-drawn feel.',
  };

  const styleDesc = styles[style] ?? styles['art_deco'];

  return `${dallePrompt}

Style: ${styleDesc} Black and white monochrome only. The depiction must show the ACTUAL recognizable real-world subject — not a generic substitute. Landscape composition.`;
}


function monthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return months[month - 1] ?? 'January';
}
