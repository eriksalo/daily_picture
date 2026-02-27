interface DisplayResponse {
  image_url: string;
  event_date: string;
  event_title: string;
  event_description: string;
  refresh_rate: number;
}

const API_URL = '/api/display';

async function loadDailyImage(): Promise<void> {
  const loading = document.getElementById('loading')!;
  const content = document.getElementById('content')!;
  const error = document.getElementById('error')!;

  try {
    const response = await fetch(API_URL, {
      headers: {
        'X-Device-Width': '1024',
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
    document.getElementById('event-date')!.textContent = data.event_date;
    document.getElementById('event-description')!.textContent = data.event_description;

    loading.hidden = true;
    content.hidden = false;
  } catch (err) {
    console.error('Failed to load daily image:', err);
    loading.hidden = true;
    error.hidden = false;
  }
}

loadDailyImage();
