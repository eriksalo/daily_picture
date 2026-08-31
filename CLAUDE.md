# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Daily Picture** is a monorepo of sister sites that each generate an AI image once a day and serve it to physical displays. Each site has its own theme, its own Amplify Gen 2 backend, its own frontend, and its own domain.

| Site | Theme | Domain |
|------|-------|--------|
| `sites/daily` | Historical event "the moment just before" — viewer knows what comes next | daily.salo.cloud |
| `sites/insect` | Insect / arthropod of the day | (TBD) |
| `sites/dog` | Dog breed / dog moment of the day | (TBD) |
| `sites/nerd` | Historically significant person in technology | nerd.salo.cloud |

Each site generates image variants per day:
- **Grayscale 960x540** for the M5Stack PaperS3 (e-ink) and Waveshare ESP32-S3 PhotoPainter
- **Color 1280x800** for Frameo digital photo frames
- **Spectra 6 600x338 PNG** for the M5Stack Paper Color e-ink frame (`sites/insect` only so far)

## Related Repos (frame firmware lives separately)

| Repo | Purpose | Tech |
|------|---------|------|
| **daily_picture** (this repo) | Sites: daily / insect / dog / nerd backends + frontends | Amplify Gen 2, Gemini 3, Vite |
| **[daily-picture-frames](https://github.com/eriksalo/daily-picture-frames)** | Hardware: M5Stack PaperS3 firmware, Frameo tooling, planned Waveshare PhotoPainter firmware | PlatformIO, ADB scripts |

**Frame ↔ site pairing**: Each frame chooses a site via config (`SITE=daily|insect|dog|nerd`). Same firmware binary, different runtime config.

**Physical displays**:
- 1× M5Stack PaperS3 (e-ink, grayscale)
- 1× M5Stack Paper Color (e-ink, 6-colour Spectra 6) — paired with `insect`
- 2× Frameo (color LCD)
- 1× Waveshare ESP32-S3 PhotoPainter (planned)

## Repo Layout

```
sites/
  daily/
    amplify/       # backend (CDK + Lambdas)
    frontend/      # Vite app
  insect/
  dog/
  nerd/
packages/
  shared/          # (planned) shared prompt framework, display-api helpers, jimp helpers
amplify.yml        # Amplify Hosting monorepo config (one app per site)
package.json       # root convenience scripts (dev:daily, sandbox:insect, etc.)
```

## Commands

All `dev:*`, `build:*`, `sandbox:*`, `install:*` scripts are at root and target a specific site, e.g.:

```bash
npm run install:daily     # Install deps for daily site (amplify + frontend)
npm run dev:daily         # Vite dev server for daily site
npm run build:daily       # Production build for daily site -> sites/daily/frontend/dist/
npm run sandbox:daily     # Deploy daily backend to personal sandbox
```

Replace `daily` with `insect`, `dog`, or `nerd` for the other sites.

### Direct (per-site) commands
From `sites/<site>/` -- the directory that *contains* `amplify/`, NOT `amplify/`
itself. Run from inside `amplify/` and ampx prints its usage text plus
`[PathNotFoundError] ./amplify does not exist` **and still exits 0**, so a
scripted deploy looks like it succeeded when nothing was deployed.
```bash
npx ampx sandbox                           # Deploy backend to personal sandbox
npx ampx sandbox --once                    # Deploy once without watching
npx ampx sandbox secret set GOOGLE_API_KEY # Set Google AI secret (pipe value via stdin)
```
Prefer the root scripts (`npm run sandbox:once:insect`), which set the working
directory correctly.

### Frameo WiFi Setup
Tooling lives in [daily-picture-frames](https://github.com/eriksalo/daily-picture-frames) under `frameo/scripts/frameo-wifi.ps1`. Connect the frame via USB and run the script from a checkout of that repo.

### Deploy
Push to GitHub triggers Amplify Hosting builds. `amplify.yml` uses the `applications:` monorepo format — each site is a separate Amplify Hosting app in the AWS console (one app per appRoot under `sites/`). Backend deploys via `npm run sandbox:once:<site>` from the repo root (equivalently `npx ampx sandbox --once` from `sites/<site>/`, not from `sites/<site>/amplify/`).

## Architecture (per site)

**Pull-based flow**: Lambda generates images daily at 3AM MST -> stores JPEG variants + metadata.json in S3 -> devices pull via API.

**API Gateway v2 (HTTP API)** — public, no auth:
- `GET /api/display` — returns e-ink image URL + event metadata (display-api Lambda)
- `GET /api/display?device=frameo` — returns Frameo color image URL
- `GET /api/display?device=papercolor` — returns the Spectra 6 PNG for the M5Stack Paper Color (insect site; falls back to the default image if the variant is missing)
- `POST /api/generate` — triggers image generation with optional `{"style":"art_deco"}` body

**Image pipeline**: Gemini 3 Flash Preview selects the day's subject (JSON mode with responseSchema) -> Nano Banana 2 (`gemini-3.1-flash-image-preview`) generates grayscale 16:9 image -> jimp resizes to 960x540 -> then generates color 16:9 -> jimp resizes to 1280x800 -> both to S3. Text overlay (date + title) is baked into the image by the AI model via prompt.

**S3 layout** (each site has its own bucket):
```
images/YYYY-MM-DD/image.jpg              # 960x540 grayscale (e-ink)
images/YYYY-MM-DD/image-frameo.jpg       # 1280x800 color (Frameo)
images/YYYY-MM-DD/image-papercolor.png   # 600x338 Spectra 6 (M5 Paper Color; insect only)
images/YYYY-MM-DD/metadata.json          # includes frameo_image_key, papercolor_image_key
```

**Styles**: art_deco, woodcut, ink_wash, noir, sketch — each with grayscale and color variants, defined in `prompts.ts`.

**Frontend pages**:
- `index.html` — main page showing both image variants, style selector, generate button
- `frame.html` — fullscreen kiosk page for Frameo WebView, auto-refreshes hourly (Chrome 44 / ES5 compatible)

## Spectra 6 variant (M5Stack Paper Color)

`sites/insect/amplify/functions/generate-daily-insect/spectra6.ts` converts a
generated image for the Paper Color frame. Points that are easy to get wrong:

- **It gets its own Gemini render, not a resize of the Frameo image.** The panel
  has a six-colour gamut (black/white/yellow/red/blue/green); a photorealistic
  macro shot dithers into red/green speckle on it. `getSpectra6ImagePrompt()`
  asks for flat screen-print poster art in those six colours instead, which
  survives quantisation nearly intact.
- **The variant carries no baked-in text**, unlike the grayscale and Frameo
  prompts. The firmware draws its own caption band (common name, scientific
  name, battery) in the bottom 62px of the 600x400 panel, so the artwork is the
  top 600x338 only and must be full-bleed. Baked-in text would be cropped
  mid-sentence and then covered by a second caption.
- **We dither to M5GFX's exact palette values** (copied from `Panel_ED2208.cpp`).
  The device maps every pixel to its nearest palette entry, so matching the
  values exactly makes that lookup an identity map instead of a second,
  worse-quality dithering pass.
- **PNG, not JPEG.** JPEG chroma subsampling and ringing smear a hard-dithered
  image back off-palette. Encoder settings matter: `colorType: 2`,
  `filterType: 0`, `deflateStrategy: 0` produce ~50 KB, where jimp's defaults
  produce ~344 KB for identical pixels. Do **not** pass `inputHasAlpha: false` -
  that describes the input bitmap, which is RGBA, and making pngjs read 3 bytes
  per pixel from a 4-byte buffer shifts every channel across the image and
  silently yields off-palette colours.
- Runs in ~400ms for 600x338, well inside the Lambda budget. Failure is caught
  and logged; the day's other variants still publish.

## Key Technical Constraints

- **API Gateway timeout**: 30 seconds max for synchronous calls. Generation Lambda has 120s timeout (invoked async by schedule, sync via POST).
- **Amplify Gen 2 secrets**: `secret('GOOGLE_API_KEY')` sets a placeholder in Lambda env vars. After setting the secret via CLI, you must redeploy (change handler code to force CloudFormation update).
- **Gemini JSON output**: Use `responseMimeType: 'application/json'` with `responseSchema` for structured output. Set `thinkingConfig: { thinkingBudget: 0 }` when JSON output is needed.
- **Gemini image generation**: Nano Banana 2 supports native 16:9 via `imageConfig: { aspectRatio: '16:9' }`. Returns base64 PNG in `response.candidates[0].content.parts[].inlineData`.
- **Lambda font files**: jimp bitmap fonts are NOT available in Lambda (esbuild bundles JS only). Use prompt-based text overlay instead.
- **Frameo WebView**: Chrome 44 on Android 6 — no `fetch`, no ES6 modules. `frame.html` uses `XMLHttpRequest`.
- **Frontend API URL**: Uses absolute API Gateway URL (not relative), because Amplify Hosting returns HTML for unknown paths. URL is hardcoded in each site's `frontend/src/app.ts`.
- **Git Bash path conversion**: AWS CLI paths starting with `/aws` get mangled. Use `python -c` subprocess with `shell=True` and `aws.cmd`.
- **Frameo kiosk**: Frames run `uk.nktnet.webviewkiosk` (WebviewKiosk) as default launcher on Android 6.0.1. To change WiFi, use the `frameo-wifi.ps1` tool from the `daily-picture-frames` repo via USB ADB. ADB over network: port 5555.

## File Layout (per site — example: `sites/daily/`)

- `amplify/backend.ts` — CDK: HTTP API routes, CORS, Lambda integrations
- `amplify/functions/generate-daily-image/handler.ts` — Core generation: Gemini 3 Flash -> Nano Banana 2 -> jimp -> S3 (grayscale + color)
- `amplify/functions/generate-daily-image/prompts.ts` — Subject selection + image prompt templates with grayscale/color style system
- `amplify/functions/generate-daily-image/resource.ts` — Lambda config: schedule (10:00 UTC), 120s timeout, 1024MB, GOOGLE_API_KEY secret
- `amplify/functions/display-api/handler.ts` — Device API: pre-signed URL + metadata, `?device=frameo` routing, yesterday fallback
- `amplify/storage/resource.ts` — S3 bucket, access grants (Lambda read/write, guest read)
- `frontend/src/app.ts` — Fetch display data, style selector, generate button
- `frontend/src/frame.html` — Fullscreen kiosk page for Frameo frames (Chrome 44 compatible)
- `frontend/src/index.html` — Main page with dual image display
