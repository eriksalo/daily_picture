#include "display_driver.h"
#include <HTTPClient.h>  // Must be before M5Unified for drawJpgUrl
#include <M5Unified.h>
#include <epdiy.h>

void display_init() {
    M5.Display.setEpdMode(epd_mode_t::epd_quality);
    M5.Display.setRotation(0);
    M5.Display.fillScreen(TFT_WHITE);
    M5.Display.setTextColor(TFT_BLACK, TFT_WHITE);
}

void display_show_image_url(const char* url) {
    M5_LOGI("Drawing image from URL: %s", url);

    M5.Display.fillScreen(TFT_WHITE);

    bool ok = M5.Display.drawJpgUrl(url, 0, 0, M5.Display.width(), M5.Display.height());
    if (!ok) {
        M5_LOGE("drawJpgUrl failed");
        display_show_error("Image download failed");
        return;
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
