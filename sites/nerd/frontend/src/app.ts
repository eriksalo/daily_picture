interface DisplayResponse {
  image_url: string;
  frameo_image_url?: string;
  date: string;
  name: string;
  field: string;
  era: string;
  contribution: string;
  fun_facts: string[];
  overlay_fact: string;
  refresh_rate: number;
}

// API Gateway endpoint — update after backend is deployed
const API_BASE = 'https://53izyjjc9h.execute-api.us-east-1.amazonaws.com';
const API_URL = `${API_BASE}/api/display`;
const GENERATE_URL = `${API_BASE}/api/generate`;

async function loadDaily(): Promise<void> {
  const loading = document.getElementById('loading')!;
  const content = document.getElementById('content')!;
  const error = document.getElementById('error')!;

  try {
    const response = await fetch(API_URL, {
      headers: {
        'X-Device-Id': 'web-browser',
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data: DisplayResponse = await response.json();

    const singleImage = document.getElementById('single-image')!;
    const dualImages = document.getElementById('dual-images')!;

    if (data.frameo_image_url) {
      singleImage.hidden = true;
      dualImages.hidden = false;
      (document.getElementById('color-image') as HTMLImageElement).src = data.frameo_image_url;
      (document.getElementById('color-image') as HTMLImageElement).alt = data.name;
      (document.getElementById('eink-image') as HTMLImageElement).src = data.image_url;
      (document.getElementById('eink-image') as HTMLImageElement).alt = `${data.name} (grayscale)`;
    } else {
      const img = document.getElementById('daily-image') as HTMLImageElement;
      img.src = data.image_url;
      img.alt = data.name;
    }

    document.getElementById('name')!.textContent = data.name;
    document.getElementById('name-meta')!.textContent = `${data.field} — ${data.era}`;
    document.getElementById('overlay-fact')!.textContent = data.overlay_fact;
    document.getElementById('contribution')!.textContent = data.contribution;

    const facts = document.getElementById('fun-facts')!;
    facts.innerHTML = '';
    for (const fact of data.fun_facts ?? []) {
      const li = document.createElement('li');
      li.textContent = fact;
      facts.appendChild(li);
    }

    loading.hidden = true;
    content.hidden = false;
  } catch (err) {
    console.error('Failed to load daily nerd:', err);
    loading.hidden = true;
    error.hidden = false;
  }
}

async function generate(): Promise<void> {
  const btn = document.querySelector('.controls .btn:not([disabled])') as HTMLButtonElement;
  const status = document.querySelector('.controls .generate-status') as HTMLElement;
  if (!btn || !status) return;

  btn.disabled = true;
  btn.textContent = 'Generating...';
  status.textContent = 'Picking a person and rendering their portrait. This may take up to 60 seconds.';

  try {
    const response = await fetch(GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // 202 = lambda kicked off async generation, takes ~30-60 s.
    // Reload after 60 s; the lambda will have written the new image to S3.
    if (response.status === 202) {
      let remaining = 60;
      status.textContent = `Generation in progress... reloading in ${remaining}s`;
      const tick = setInterval(() => {
        remaining -= 1;
        status.textContent = `Generation in progress... reloading in ${remaining}s`;
        if (remaining <= 0) {
          clearInterval(tick);
          location.reload();
        }
      }, 1000);
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      status.textContent = `Generation failed: ${data.error ?? data.message ?? response.statusText}`;
      btn.disabled = false;
      btn.textContent = 'Retry';
      return;
    }

    status.textContent = `Generated: ${data.name} (${data.field}). Reloading...`;
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    status.textContent = `Error: ${err}`;
    btn.disabled = false;
    btn.textContent = 'Retry';
  }
}

document.getElementById('generate-btn')?.addEventListener('click', generate);
document.getElementById('generate-btn-error')?.addEventListener('click', generate);

loadDaily();
