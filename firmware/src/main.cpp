#include <WiFi.h>
#include <HTTPClient.h>  // Must be included before M5Unified for drawJpgUrl support
#include <M5Unified.h>
#include <epdiy.h>       // Required for PaperS3 e-ink driver

#include "config.h"
#include "display_config.h"
#include "wifi_manager.h"
#include "api_client.h"
#include "display_driver.h"
#include "power_manager.h"

void setup() {
    auto cfg = M5.config();
    M5.begin(cfg);

    delay(10000); // Debug: wait for serial monitor
    M5_LOGI("Daily Picture v%s starting...", FIRMWARE_VERSION);
    M5_LOGI("Battery: %.2f V", power_battery_voltage());
    M5_LOGI("API: %s%s", API_BASE_URL, API_ENDPOINT);

    display_init();
    display_show_message("Daily Picture", "Connecting...");

    // Connect to WiFi
    bool connected = false;
    for (int attempt = 0; attempt < WIFI_MAX_RETRIES; attempt++) {
        if (wifi_connect(WIFI_SSID, WIFI_PASSWORD, WIFI_CONNECT_TIMEOUT_MS)) {
            connected = true;
            break;
        }
        M5_LOGW("WiFi attempt %d/%d failed", attempt + 1, WIFI_MAX_RETRIES);
        delay(1000);
    }

    if (!connected) {
        display_show_error("WiFi connection failed");
        delay(5000);
        power_enter_sleep(DEFAULT_SLEEP_SECONDS);
        return;
    }

    // Fetch display data from API
    DisplayData data = {};
    data.valid = false;

    for (int attempt = 0; attempt < API_MAX_RETRIES; attempt++) {
        data = api_fetch_display(
            API_BASE_URL, API_ENDPOINT,
            DISPLAY_WIDTH, DISPLAY_HEIGHT, DISPLAY_GRAYSCALE,
            DEVICE_ID, FIRMWARE_VERSION,
            power_battery_voltage(), wifi_rssi(),
            API_TIMEOUT_MS
        );
        if (data.valid) break;
        M5_LOGW("API attempt %d/%d failed", attempt + 1, API_MAX_RETRIES);
        delay(2000);
    }

    if (!data.valid) {
        display_show_error("API request failed");
        wifi_disconnect();
        delay(5000);
        power_enter_sleep(DEFAULT_SLEEP_SECONDS);
        return;
    }

    // Render image on e-ink display with year overlay
    display_show_image_url(data.image_url.c_str(), data.event_year, data.event_title.c_str());

    // Clean up and sleep
    wifi_disconnect();

    uint64_t sleep_time = 120; // Debug: 2 min sleep instead of 24h
    M5_LOGI("Sleeping for %llu seconds", sleep_time);
    power_enter_sleep(sleep_time);
}

void loop() {
    // Not reached - device deep sleeps and reboots
}
