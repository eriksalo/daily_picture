# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daily Picture generates AI historical event images (Gemini 3 Flash + Nano Banana 2) and serves them to displays. Four components: AWS Amplify Gen 2 backend, Vite frontend at daily.salo.cloud, ESP32-S3 firmware for M5Stack PaperS3 (960x540, 16-level grayscale), and Frameo digital photo frame support (1280x800, color).

## Commands

### Backend (Amplify Gen 2)
```bash
npx ampx sandbox                          # Deploy backend to personal sandbox
npx ampx sandbox --once                   # Deploy once without watching
npx ampx sandbox secret set OPENAI_API_KEY # Set OpenAI secret (pipe value via stdin, no trailing newline)
```

### Frontend
```bash
npm run dev       # Vite dev server on port 3000 (from root)
npm run build     # Production build → frontend/dist/
```

### Firmware
```bash
cd firmware
~/.platformio/penv/Scripts/pio.exe run -e m5stack-papers3              # Compile
~/.platformio/penv/Scripts/pio.exe run -e m5stack-papers3 -t upload    # Flash to COM10
~/.platformio/penv/Scripts/pio.exe device monitor -p COM10 -b 115200  # Serial monitor
```
Note: `pio` is not on PATH; use the full path above. The PaperS3 drops COM10 during deep sleep. To flash: hold BOOT button, press Reset, release BOOT (bootloader mode).

### Deploy
Push to GitHub triggers Amplify Hosting (frontend only via `amplify.yml`). Backend deploys via `npx ampx sandbox --once` from local machine.

## Architecture

**Pull-based flow**: Lambda generates images daily → stores JPEG variants + metadata.json in S3 → devices pull via API.

**API Gateway v2 (HTTP API)** — public, no auth:
- `GET /api/display` — returns e-ink image URL + event metadata (display-api Lambda)
- `GET /api/display?device=frameo` — returns Frameo color image URL
- `POST /api/generate` — triggers image generation with optional `{"style":"art_deco"}` body (generate-daily-image Lambda)

**Image pipeline**: Gemini 3 Flash selects historical event → Nano Banana 2 generates grayscale 16:9 → jimp resizes to 960x540 → then generates color 16:9 → jimp resizes to 1280x800 → both to S3.

**S3 layout**:
```
images/YYYY-MM-DD/image.jpg          # 960x540 grayscale (e-ink)
images/YYYY-MM-DD/image-frameo.jpg   # 1280x800 color (Frameo)
images/YYYY-MM-DD/metadata.json      # includes frameo_image_key
```

**Frameo push**: `scripts/push-to-frameo.sh <frame-ip>` — uses ADB over local network to push image to frame. Requires `adb`, `curl`, `jq`. No internet-only option exists for Frameo frames.

**Styles**: art_deco, woodcut, ink_wash, noir, sketch — defined in `amplify/functions/generate-daily-image/prompts.ts`

## Key Technical Constraints

- **ESP32 memory**: PNG decode of images >1024x1024 fails (exceeds 8MB PSRAM). Server must resize to 960x540 JPEG.
- **API Gateway timeout**: 30 seconds max. DALL-E `standard` quality (not `hd`) to stay under limit.
- **Amplify Gen 2 secrets**: `secret('OPENAI_API_KEY')` sets a placeholder in Lambda env vars. After setting the secret via CLI, you must redeploy (change handler code to force CloudFormation update).
- **PaperS3 firmware**: `#include <HTTPClient.h>` MUST come before `#include <M5Unified.h>` for drawJpgUrl support. `#include <epdiy.h>` is required to prevent crash loops.
- **Git Bash path conversion**: AWS CLI paths starting with `/aws` get mangled. Use `python -c` subprocess with `shell=True` and `aws.cmd` to call AWS CLI with `/aws/...` paths.
- **Frontend API URL**: Uses absolute API Gateway URL (not relative), because Amplify Hosting returns HTML for unknown paths. URL is hardcoded in `frontend/src/app.ts`.
- **DALL-E 3 sizes**: Only 1024x1024, 1024x1792, 1792x1024. Custom sizes require server-side resize.

## File Layout

- `amplify/backend.ts` — CDK: HTTP API routes, CORS, Lambda integrations
- `amplify/functions/generate-daily-image/handler.ts` — Core generation: Gemini → Nano Banana 2 → jimp → S3 (grayscale + color)
- `amplify/functions/generate-daily-image/prompts.ts` — Gemini prompt templates with grayscale + color style systems
- `amplify/functions/display-api/handler.ts` — Device API: pre-signed URL + metadata, yesterday fallback
- `amplify/storage/resource.ts` — S3 bucket, access grants (Lambda read/write, guest read)
- `frontend/src/app.ts` — Fetch display data, style selector, generate button
- `firmware/src/main.cpp` — Boot → WiFi → API → display → sleep
- `firmware/include/config.h` — WiFi creds + API URL (gitignored, copy from config.h.example)
- `firmware/include/display_config.h` — Display params, timeouts, sleep duration
- `scripts/push-to-frameo.sh` — ADB-based push script for Frameo frames
