# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Daily Picture** generates an AI image of a historical event every day and serves it to physical displays. Each image depicts "the moment just before" a significant event that happened on this day in history — the viewer knows what comes next, but it hasn't happened yet.

Two image variants are generated daily:
- **Grayscale 960x540** for M5Stack PaperS3 e-ink display
- **Color 1280x800** for Frameo digital photo frame

This repo contains the **backend** (AWS Amplify Gen 2) and **frontend** (Vite at daily.salo.cloud).

## Related Repos

This is one of four repos in the Daily Picture ecosystem:

| Repo | Purpose | Tech |
|------|---------|------|
| **[daily_picture](https://github.com/eriksalo/daily_picture)** (this repo) | Backend + frontend for daily historical event images | Amplify Gen 2, Gemini 3, Vite |
| **[daily-picture-m5paper](https://github.com/eriksalo/daily-picture-m5paper)** | ESP32-S3 firmware for M5Stack PaperS3 e-ink display | PlatformIO, M5Unified, epdiy |
| **[daily-picture-frameo](https://github.com/eriksalo/daily-picture-frameo)** | Frameo frame client: ADB push script + kiosk HTML | Bash, plain HTML/JS |
| **[daily-bug-frameo](https://github.com/eriksalo/daily-bug-frameo)** | Daily insect images for a second Frameo frame | Amplify Gen 2, Gemini 3, DynamoDB |

**Physical displays**: One M5Stack PaperS3 (e-ink, grayscale), two Frameo frames (color LCD — one for historical events via daily-picture-frameo, one for insects via daily-bug-frameo).

## Commands

### Frameo WiFi Setup
```powershell
.\scripts\frameo-wifi.ps1              # Open WiFi settings on frame via USB ADB
.\scripts\frameo-wifi.ps1 -Restore     # Restore kiosk mode
```
Requires ADB (`winget install Google.PlatformTools`). Connect Frameo via USB.

### Backend (Amplify Gen 2)
```bash
npx ampx sandbox                          # Deploy backend to personal sandbox
npx ampx sandbox --once                   # Deploy once without watching
npx ampx sandbox secret set GOOGLE_API_KEY # Set Google AI secret (pipe value via stdin, no trailing newline)
```

### Frontend
```bash
npm run dev       # Vite dev server on port 3000 (from root)
npm run build     # Production build -> frontend/dist/
```

### Deploy
Push to GitHub triggers Amplify Hosting (frontend only via `amplify.yml`). Backend deploys via `npx ampx sandbox --once` from local machine.

## Architecture

**Pull-based flow**: Lambda generates images daily at 3AM MST -> stores JPEG variants + metadata.json in S3 -> devices pull via API.

**API Gateway v2 (HTTP API)** — public, no auth:
- `GET /api/display` — returns e-ink image URL + event metadata (display-api Lambda)
- `GET /api/display?device=frameo` — returns Frameo color image URL
- `POST /api/generate` — triggers image generation with optional `{"style":"art_deco"}` body

**Image pipeline**: Gemini 3 Flash Preview selects historical event (JSON mode with responseSchema) -> Nano Banana 2 (`gemini-3.1-flash-image-preview`) generates grayscale 16:9 image -> jimp resizes to 960x540 -> then generates color 16:9 -> jimp resizes to 1280x800 -> both to S3. Text overlay (date + title) is baked into the image by the AI model via prompt.

**S3 layout**:
```
images/YYYY-MM-DD/image.jpg          # 960x540 grayscale (e-ink)
images/YYYY-MM-DD/image-frameo.jpg   # 1280x800 color (Frameo)
images/YYYY-MM-DD/metadata.json      # includes frameo_image_key
```

**Styles**: art_deco, woodcut, ink_wash, noir, sketch — each with grayscale and color variants, defined in `prompts.ts`.

**Frontend pages**:
- `index.html` — main page showing both image variants, style selector, generate button
- `frame.html` — fullscreen kiosk page for Frameo WebView, auto-refreshes hourly (Chrome 44 / ES5 compatible)

## Key Technical Constraints

- **API Gateway timeout**: 30 seconds max for synchronous calls. Generation Lambda has 120s timeout (invoked async by schedule, sync via POST).
- **Amplify Gen 2 secrets**: `secret('GOOGLE_API_KEY')` sets a placeholder in Lambda env vars. After setting the secret via CLI, you must redeploy (change handler code to force CloudFormation update).
- **Gemini JSON output**: Use `responseMimeType: 'application/json'` with `responseSchema` for structured output. Set `thinkingConfig: { thinkingBudget: 0 }` when JSON output is needed.
- **Gemini image generation**: Nano Banana 2 supports native 16:9 via `imageConfig: { aspectRatio: '16:9' }`. Returns base64 PNG in `response.candidates[0].content.parts[].inlineData`.
- **Lambda font files**: jimp bitmap fonts are NOT available in Lambda (esbuild bundles JS only). Use prompt-based text overlay instead.
- **Frameo WebView**: Chrome 44 on Android 6 — no `fetch`, no ES6 modules. `frame.html` uses `XMLHttpRequest`.
- **Frontend API URL**: Uses absolute API Gateway URL (not relative), because Amplify Hosting returns HTML for unknown paths. URL is hardcoded in `frontend/src/app.ts`.
- **Git Bash path conversion**: AWS CLI paths starting with `/aws` get mangled. Use `python -c` subprocess with `shell=True` and `aws.cmd`.
- **Frameo kiosk**: Frames run `uk.nktnet.webviewkiosk` (WebviewKiosk) as default launcher on Android 6.0.1. To change WiFi, use `scripts/frameo-wifi.sh` via USB ADB. ADB over network: port 5555.

## File Layout

- `amplify/backend.ts` — CDK: HTTP API routes, CORS, Lambda integrations
- `amplify/functions/generate-daily-image/handler.ts` — Core generation: Gemini 3 Flash -> Nano Banana 2 -> jimp -> S3 (grayscale + color)
- `amplify/functions/generate-daily-image/prompts.ts` — Event selection + image prompt templates with grayscale/color style system
- `amplify/functions/generate-daily-image/resource.ts` — Lambda config: schedule (10:00 UTC), 120s timeout, 1024MB, GOOGLE_API_KEY secret
- `amplify/functions/display-api/handler.ts` — Device API: pre-signed URL + metadata, `?device=frameo` routing, yesterday fallback
- `amplify/storage/resource.ts` — S3 bucket, access grants (Lambda read/write, guest read)
- `frontend/src/app.ts` — Fetch display data, style selector, generate button
- `frontend/src/frame.html` — Fullscreen kiosk page for Frameo frames (Chrome 44 compatible)
- `frontend/src/index.html` — Main page with dual image display
