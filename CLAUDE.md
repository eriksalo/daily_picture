# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daily Picture generates AI historical event images (GPT-4o + DALL-E 3) and serves them to e-ink displays. Three components: AWS Amplify Gen 2 backend, Vite frontend at daily.salo.cloud, and ESP32-S3 firmware for M5Stack PaperS3 (960x540, 16-level grayscale).

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

**Pull-based flow**: Lambda generates image daily → stores 960x540 JPEG + metadata.json in S3 → device wakes → `GET /api/display` returns pre-signed S3 URL → device downloads JPEG → renders on e-ink → sleeps 24h.

**API Gateway v2 (HTTP API)** — public, no auth:
- `GET /api/display` — returns image URL + event metadata (display-api Lambda)
- `POST /api/generate` — triggers image generation with optional `{"style":"art_deco"}` body (generate-daily-image Lambda)

**Image pipeline**: GPT-4o selects historical event → DALL-E 3 generates 1024x1024 → jimp resizes to 960x540 JPEG → S3. All images strictly grayscale (enforced in prompts).

**S3 layout**: `images/YYYY-MM-DD/image.jpg` + `images/YYYY-MM-DD/metadata.json`

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
- `amplify/functions/generate-daily-image/handler.ts` — Core generation: GPT-4o → DALL-E 3 → jimp → S3
- `amplify/functions/generate-daily-image/prompts.ts` — GPT-4 and DALL-E prompt templates with style system
- `amplify/functions/display-api/handler.ts` — Device API: pre-signed URL + metadata, yesterday fallback
- `amplify/storage/resource.ts` — S3 bucket, access grants (Lambda read/write, guest read)
- `frontend/src/app.ts` — Fetch display data, style selector, generate button
- `firmware/src/main.cpp` — Boot → WiFi → API → display → sleep
- `firmware/include/config.h` — WiFi creds + API URL (gitignored, copy from config.h.example)
- `firmware/include/display_config.h` — Display params, timeouts, sleep duration
