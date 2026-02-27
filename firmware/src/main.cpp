#include <WiFi.h>
#include <HTTPClient.h>  // Must be included before M5Unified for drawJpgUrl support
#include <M5Unified.h>
#include <epdiy.h>       // Required for PaperS3 e-ink driver
#include <time.h>

#include "config.h"
#include "display_config.h"
#include "wifi_manager.h"
#include "api_client.h"
#include "display_driver.h"
#include "power_manager.h"

// Wake target: 4:00 AM MST = 11:00 UTC
#define WAKE_HOUR_UTC 11
#define WAKE_MIN_UTC  0

// Calculate seconds until next wake time using NTP
uint64_t seconds_until_wake() {
    configTzTime("MST7MDT", "pool.ntp.org", "time.nist.gov");

    struct tm timeinfo;
    if (!getLocalTime(&timeinfo, 10000)) {
        M5_LOGW("NTP sync failed, using default 24h sleep");
        return DEFAULT_SLEEP_SECONDS;
    }

    // Work in UTC for wake target
    time_t now;
    time(&now);
    struct tm utc;
    gmtime_r(&now, &utc);

    // Calculate next 11:00 UTC
    struct tm wake = utc;
    wake.tm_hour = WAKE_HOUR_UTC;
    wake.tm_min = WAKE_MIN_UTC;
    wake.tm_sec = 0;

    time_t wake_time = mktime(&wake);
    // mktime interprets as local, so convert back
    // Simpler: just calculate seconds directly
    int now_secs = utc.tm_hour * 3600 + utc.tm_min * 60 + utc.tm_sec;
    int wake_secs = WAKE_HOUR_UTC * 3600 + WAKE_MIN_UTC * 60;

    int diff = wake_secs - now_secs;
    if (diff <= 300) {  // If wake time is <5 min away or past, sleep until tomorrow
        diff += 86400;
    }

    M5_LOGI("Current UTC: %02d:%02d:%02d, wake at %02d:%02d UTC, sleeping %d seconds",
            utc.tm_hour, utc.tm_min, utc.tm_sec, WAKE_HOUR_UTC, WAKE_MIN_UTC, diff);

    return (uint64_t)diff;
}

void setup() {
    auto cfg = M5.config();
    M5.begin(cfg);

    M5_LOGI("Daily Picture v%s starting...", FIRMWARE_VERSION);
    M5_LOGI("Battery: %.2f V", power_battery_voltage());

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

    // Calculate sleep until 4:00 AM MST (11:00 UTC)
    uint64_t sleep_time = seconds_until_wake();

    // Clean up and sleep
    wifi_disconnect();
    M5_LOGI("Sleeping for %llu seconds (~%.1f hours)", sleep_time, sleep_time / 3600.0);
    power_enter_sleep(sleep_time);
}

void loop() {
    // Not reached - device deep sleeps and reboots
}
