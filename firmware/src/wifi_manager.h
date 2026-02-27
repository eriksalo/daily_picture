#pragma once

#include <WiFi.h>

bool wifi_connect(const char* ssid, const char* password, uint32_t timeout_ms);
void wifi_disconnect();
int wifi_rssi();
