# Daily Picture

Generates a daily historical event image using AI (GPT-4 + DALL-E 3) and serves it to remote e-ink displays.

Each day, the system picks a significant event that happened "on this day" in history and generates a black-and-white image depicting "the moment just before" the event occurred, with the date overlaid.

## Architecture

- **Backend**: AWS Amplify Gen 2 (Lambda + S3 + HTTP API)
- **Frontend**: Static site at daily.salo.cloud (Vite)
- **Firmware**: ESP32-S3 e-ink display client (PlatformIO)

### Pull-based flow

1. Scheduled Lambda generates image daily at 06:00 UTC
2. Device wakes from deep sleep, calls `GET /api/display`
3. API returns pre-signed S3 URL + event metadata
4. Device downloads JPEG, renders on e-ink, sleeps 24h

## Supported Displays

| Display | Resolution | Grayscale |
|---------|-----------|-----------|
| M5Stack PaperS3 | 960x540 | 16 levels |

## Development

```bash
# Backend (Amplify sandbox)
npx ampx sandbox

# Frontend
npm run dev

# Firmware
# Open firmware/ in PlatformIO IDE, or:
cd firmware && pio run --target upload
```

## Configuration

Copy `firmware/include/config.h.example` to `firmware/include/config.h` and set your WiFi credentials and API URL.

Set the OpenAI API key as an Amplify secret:
```bash
npx ampx sandbox secret set OPENAI_API_KEY
```
