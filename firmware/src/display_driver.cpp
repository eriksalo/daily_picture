#include "display_driver.h"
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <M5Unified.h>
#include <epdiy.h>

void display_init() {
    M5.Display.setEpdMode(epd_mode_t::epd_quality);
    M5.Display.setRotation(1); // Landscape: 960x540
    M5.Display.fillScreen(TFT_WHITE);
    M5.Display.setTextColor(TFT_BLACK, TFT_WHITE);
}

void display_show_image_url(const char* url, int year, const char* title) {
    M5_LOGI("Downloading image (%d chars URL)", strlen(url));

    // Download image data manually for better error handling
    HTTPClient http;
    WiFiClientSecure client;
    client.setInsecure(); // Skip cert verification for S3 pre-signed URLs

    http.begin(client, url);
    http.setTimeout(30000);
    int code = http.GET();

    if (code != 200) {
        M5_LOGE("Image HTTP %d", code);
        http.end();
        display_show_error("Image HTTP error");
        return;
    }

    int len = http.getSize();
    M5_LOGI("Image size: %d bytes", len);

    // Read into PSRAM buffer
    uint8_t* buf = (uint8_t*)ps_malloc(len > 0 ? len : 4 * 1024 * 1024);
    if (!buf) {
        M5_LOGE("Failed to allocate %d bytes", len);
        http.end();
        display_show_error("Out of memory");
        return;
    }

    Stream* stream = http.getStreamPtr();
    int total = 0;
    uint32_t timeout = millis() + 30000;
    while (http.connected() && (len < 0 || total < len) && millis() < timeout) {
        int avail = stream->available();
        if (avail > 0) {
            int read = stream->readBytes(buf + total, avail);
            total += read;
        } else {
            delay(10);
        }
    }
    http.end();

    M5_LOGI("Downloaded %d bytes, rendering...", total);

    int dw = M5.Display.width();   // 960
    int dh = M5.Display.height();  // 540

    M5.Display.fillScreen(TFT_WHITE);

    // Scale 1024x1024 image to fill display width (960px), crop bottom
    float scale = (float)dw / 1024.0f;  // 960/1024 ≈ 0.9375
    bool ok = M5.Display.drawPng(buf, total, 0, 0, dw, dh, 0, 0, scale, scale);
    free(buf);

    if (!ok) {
        M5_LOGE("drawPng decode failed");
        display_show_error("PNG decode failed");
        return;
    }

    // Year overlay — large white text with black outline at bottom-left of image
    if (year > 0) {
        char yearStr[8];
        snprintf(yearStr, sizeof(yearStr), "%d", year);

        int textSize = 5;
        M5.Display.setTextSize(textSize);

        // Position: bottom-left with padding
        int tx = 16;
        int ty = dh - 16 - (textSize * 8); // 8px per text size unit

        // Draw black outline (offset in 4 directions)
        M5.Display.setTextColor(TFT_BLACK);
        for (int dx = -2; dx <= 2; dx++) {
            for (int dy = -2; dy <= 2; dy++) {
                if (dx != 0 || dy != 0) {
                    M5.Display.drawString(yearStr, tx + dx, ty + dy);
                }
            }
        }

        // Draw white text on top
        M5.Display.setTextColor(TFT_WHITE);
        M5.Display.drawString(yearStr, tx, ty);
    }

    M5.Display.display();
    M5_LOGI("Image rendered successfully");
}

void display_show_message(const char* line1, const char* line2) {
    M5.Display.fillScreen(TFT_WHITE);
    M5.Display.setTextSize(3);

    int y = M5.Display.height() / 2 - 20;
    M5.Display.drawCenterString(line1, M5.Display.width() / 2, y);

    if (line2) {
        M5.Display.setTextSize(2);
        M5.Display.drawCenterString(line2, M5.Display.width() / 2, y + 40);
    }

    M5.Display.display();
}

void display_show_error(const char* message) {
    M5.Display.fillScreen(TFT_WHITE);
    M5.Display.setTextSize(2);
    M5.Display.drawCenterString("Error", M5.Display.width() / 2,
                                 M5.Display.height() / 2 - 30);
    M5.Display.setTextSize(1);
    M5.Display.drawCenterString(message, M5.Display.width() / 2,
                                 M5.Display.height() / 2 + 10);
    M5.Display.display();
}
