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

The dalle_prompt should describe "the moment just before" the event happened.
It MUST specify black and white / monochrome style.
It should be visually rich and cinematic.
Do NOT include any text, labels, or dates in the image description.`;
}

export function getImageGenerationPrompt(dallePrompt: string): string {
  return `${dallePrompt}

Style: High contrast black and white photograph, dramatic lighting, cinematic composition.
The image must be entirely in grayscale/monochrome with no color.`;
}

function monthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return months[month - 1] ?? 'January';
}
