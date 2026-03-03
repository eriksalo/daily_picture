#!/usr/bin/env bash
# Push today's Frameo image to a Frameo digital photo frame via ADB.
# Usage: ./scripts/push-to-frameo.sh <frame-ip> [api-url]
# Requires: adb, curl, jq
# Suitable for cron: 30 3 * * * /path/to/push-to-frameo.sh 192.168.1.100

set -euo pipefail

FRAME_IP="${1:?Usage: $0 <frame-ip> [api-base-url]}"
API_BASE="${2:-https://wets9esbwj.execute-api.us-east-1.amazonaws.com}"
ADB_PORT=5555
TMPFILE=$(mktemp /tmp/frameo-XXXXXX.jpg)
trap 'rm -f "$TMPFILE"' EXIT

echo "Fetching Frameo image URL..."
RESPONSE=$(curl -sf "${API_BASE}/api/display?device=frameo")
IMAGE_URL=$(echo "$RESPONSE" | jq -r '.image_url')
TITLE=$(echo "$RESPONSE" | jq -r '.event_title // "unknown"')

if [ -z "$IMAGE_URL" ] || [ "$IMAGE_URL" = "null" ]; then
  echo "Error: No image URL in API response" >&2
  exit 1
fi

echo "Downloading: $TITLE"
curl -sf -o "$TMPFILE" "$IMAGE_URL"
echo "Downloaded $(wc -c < "$TMPFILE") bytes"

echo "Connecting to frame at ${FRAME_IP}:${ADB_PORT}..."
adb connect "${FRAME_IP}:${ADB_PORT}"

echo "Pushing image to frame..."
adb -s "${FRAME_IP}:${ADB_PORT}" push "$TMPFILE" "/sdcard/Frameo/daily-picture.jpg"

echo "Triggering media scanner..."
adb -s "${FRAME_IP}:${ADB_PORT}" shell am broadcast \
  -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
  -d "file:///sdcard/Frameo/daily-picture.jpg"

echo "Done! Image pushed to Frameo frame."
