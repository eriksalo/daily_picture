#pragma once

// M5Stack PaperS3 display parameters
#define DISPLAY_WIDTH      960
#define DISPLAY_HEIGHT     540
#define DISPLAY_GRAYSCALE  16

// Device identification
#define DEVICE_ID          "papers3-001"
#define FIRMWARE_VERSION   "0.1.0"

// Sleep duration (seconds) - default 24 hours
#define DEFAULT_SLEEP_SECONDS  86400

// WiFi timeout (milliseconds)
#define WIFI_CONNECT_TIMEOUT_MS  15000

// API request timeout (milliseconds)
#define API_TIMEOUT_MS  10000

// Image download timeout (milliseconds)
#define IMAGE_TIMEOUT_MS  30000

// Max WiFi retry attempts before sleeping
#define WIFI_MAX_RETRIES  3

// Max API retry attempts before sleeping
#define API_MAX_RETRIES  3
