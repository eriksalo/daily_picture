interface DisplayResponse {
  image_url: string;
  event_date: string;
  event_year: number;
  event_title: string;
  event_description: string;
  refresh_rate: number;
}

// API Gateway endpoint (separate from Amplify Hosting)
const API_BASE = 'https://wets9esbwj.execute-api.us-east-1.amazonaws.com';
const API_URL = `${API_BASE}/api/display`;
const GENERATE_URL = `${API_BASE}/api/generate`;

let selectedStyle = 'art_deco';

async function loadDailyImage(): Promise<void> {
  const loading = document.getElementById('loading')!;
  const content = document.getElementById('content')!;
  const error = document.getElementById('error')!;

  try {
    const response = await fetch(API_URL, {
      headers: {
        'X-Device-Width': '1792',
        'X-Device-Height': '1024',
        'X-Device-Grayscale': '256',
        'X-Device-Id': 'web-browser',
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data: DisplayResponse = await response.json();

    const img = document.getElementById('daily-image') as HTMLImageElement;
    img.src = data.image_url;
    img.alt = data.event_title;

    document.getElementById('event-title')!.textContent = data.event_title;
    document.getElementById('event-date')!.textContent = data.event_year ? String(data.event_year) : data.event_date;
    document.getElementById('event-description')!.textContent = data.event_description;

    loading.hidden = true;
    content.hidden = false;
  } catch (err) {
    console.error('Failed to load daily image:', err);
    loading.hidden = true;
    error.hidden = false;
  }
}

async function generateImage(): Promise<void> {
  const btn = document.querySelector('.controls .btn:not([disabled])') as HTMLButtonElement;
  const status = document.querySelector('.controls .generate-status') as HTMLElement;

  if (!btn || !status) return;

  btn.disabled = true;
  btn.textContent = 'Generating...';
  status.textContent = `Generating ${selectedStyle.replace('_', ' ')} style... This may take up to 60 seconds.`;

  try {
    const response = await fetch(GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style: selectedStyle }),
    });
    const data = await response.json();

    if (!response.ok) {
      status.textContent = `Generation failed: ${data.error}`;
      btn.disabled = false;
      btn.textContent = 'Retry';
      return;
    }

    status.textContent = `Generated: ${data.title} (${data.year}). Reloading...`;
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    status.textContent = `Error: ${err}`;
    btn.disabled = false;
    btn.textContent = 'Retry';
  }
}

// Wire up style buttons
document.querySelectorAll('.style-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.style-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedStyle = (btn as HTMLElement).dataset.style ?? 'art_deco';
  });
});

// Wire up generate buttons
document.getElementById('generate-btn')?.addEventListener('click', generateImage);
document.getElementById('generate-btn-error')?.addEventListener('click', generateImage);

// Load on page load
loadDailyImage();
