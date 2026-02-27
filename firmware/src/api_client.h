#pragma once

#include <Arduino.h>

struct DisplayData {
    String image_url;
    String event_date;
    int event_year;
    String event_title;
    String event_description;
    uint32_t refresh_rate;  // seconds
    bool valid;
};

DisplayData api_fetch_display(const char* base_url, const char* endpoint,
                              int width, int height, int grayscale,
                              const char* device_id, const char* fw_version,
                              float battery_voltage, int wifi_rssi,
                              uint32_t timeout_ms);
