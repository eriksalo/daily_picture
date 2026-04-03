# Daily Picture

Generates a daily historical event image using AI (Google Gemini 3) and serves it to physical displays.

Each day, the system picks a significant event that happened "on this day" in history and generates an image depicting "the moment just before" the event occurred. Two variants: grayscale for e-ink, color for digital photo frames.

## Architecture

- **Backend**: AWS Amplify Gen 2 (Lambda + S3 + HTTP API)
- **Frontend**: Static site at [daily.salo.cloud](https://daily.salo.cloud) (Vite)
- **AI**: Gemini 3 Flash (event selection) + Nano Banana 2 (image generation)

### Display Clients (separate repos)

- [daily-picture-m5paper](https://github.com/eriksalo/daily-picture-m5paper) — ESP32-S3 firmware for M5Stack PaperS3 (960x540, 16-level grayscale e-ink)
- [daily-picture-frameo](https://github.com/eriksalo/daily-picture-frameo) — Frameo digital photo frame support (1280x800, color)

### Related Project

- [daily-bug-frameo](https://github.com/eriksalo/daily-bug-frameo) — Daily AI-generated insect images for a second Frameo frame (1280x800, color, DynamoDB dedup)

### Pull-based flow

1. Scheduled Lambda generates images daily at 3AM MST (10:00 UTC)
2. Device wakes from deep sleep, calls `GET /api/display`
3. API returns pre-signed S3 URL + event metadata
4. Device downloads JPEG, renders on display, sleeps until next day

## Development

```bash
# Backend (Amplify sandbox)
npx ampx sandbox

# Frontend
npm run dev
```

## Configuration

Set the Google AI API key as an Amplify secret:
```bash
npx ampx sandbox secret set GOOGLE_API_KEY
```
