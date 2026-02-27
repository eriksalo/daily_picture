#include "api_client.h"
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <M5Unified.h>

DisplayData api_fetch_display(const char* base_url, const char* endpoint,
                              int width, int height, int grayscale,
                              const char* device_id, const char* fw_version,
                              float battery_voltage, int wifi_rssi,
                              uint32_t timeout_ms) {
    DisplayData data = {};
    data.valid = false;
    data.refresh_rate = 86400;  // default 24h

    HTTPClient http;
    String url = String(base_url) + String(endpoint);

    M5_LOGI("API request: %s", url.c_str());

    http.begin(url);
    http.setTimeout(timeout_ms);

    // Device identification headers
    http.addHeader("X-Device-Id", device_id);
    http.addHeader("X-Device-Width", String(width));
    http.addHeader("X-Device-Height", String(height));
    http.addHeader("X-Device-Grayscale", String(grayscale));
    http.addHeader("X-Battery-Voltage", String(battery_voltage, 2));
    http.addHeader("X-Firmware-Version", fw_version);
    http.addHeader("X-Wifi-Rssi", String(wifi_rssi));

    int code = http.GET();
    if (code != 200) {
        M5_LOGE("API request failed with code: %d", code);
        http.end();
        return data;
    }

    String body = http.getString();
    http.end();

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, body);
    if (err) {
        M5_LOGE("JSON parse error: %s", err.c_str());
        return data;
    }

    data.image_url = doc["image_url"].as<String>();
    data.event_date = doc["event_date"].as<String>();
    data.event_title = doc["event_title"].as<String>();
    data.event_description = doc["event_description"].as<String>();
    data.refresh_rate = doc["refresh_rate"] | 86400;
    data.valid = data.image_url.length() > 0;

    M5_LOGI("API response: %s - %s (refresh: %lu s)",
            data.event_date.c_str(), data.event_title.c_str(), data.refresh_rate);
    return data;
}
