#include "wifi_manager.h"
#include <M5Unified.h>

bool wifi_connect(const char* ssid, const char* password, uint32_t timeout_ms) {
    M5_LOGI("Connecting to WiFi: %s", ssid);

    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);

    uint32_t start = millis();
    while (WiFi.status() != WL_CONNECTED) {
        if (millis() - start > timeout_ms) {
            M5_LOGE("WiFi connection timeout after %lu ms", timeout_ms);
            WiFi.disconnect(true);
            return false;
        }
        delay(250);
    }

    M5_LOGI("WiFi connected. IP: %s, RSSI: %d dBm",
            WiFi.localIP().toString().c_str(), WiFi.RSSI());
    return true;
}

void wifi_disconnect() {
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);
    M5_LOGI("WiFi disconnected");
}

int wifi_rssi() {
    return WiFi.RSSI();
}
