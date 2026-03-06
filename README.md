# Daily Picture

Generates a daily historical event image using AI (Gemini 3 Flash + Nano Banana 2) and serves it to remote displays.

Each day, the system picks a significant event that happened "on this day" in history and generates an image depicting "the moment just before" the event occurred.

## Architecture

- **Backend**: AWS Amplify Gen 2 (Lambda + S3 + HTTP API)
- **Frontend**: Static site at daily.salo.cloud (Vite)

### Display Clients (separate repos)

- [daily-picture-m5paper](https://github.com/eriksalo/daily-picture-m5paper) — ESP32-S3 firmware for M5Stack PaperS3 (960x540, 16-level grayscale)
- [daily-picture-frameo](https://github.com/eriksalo/daily-picture-frameo) — Frameo digital photo frame support (1280x800, color)

### Pull-based flow

1. Scheduled Lambda generates image daily at 06:00 UTC
2. Device wakes from deep sleep, calls `GET /api/display`
3. API returns pre-signed S3 URL + event metadata
4. Device downloads JPEG, renders on display, sleeps 24h

## Development

```bash
# Backend (Amplify sandbox)
npx ampx sandbox

# Frontend
npm run dev
```

## Configuration

Set the OpenAI API key as an Amplify secret:
```bash
npx ampx sandbox secret set OPENAI_API_KEY
```
