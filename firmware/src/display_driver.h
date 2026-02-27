#pragma once

#include <Arduino.h>

void display_init();
void display_show_image_url(const char* url, int year = 0, const char* title = nullptr);
void display_show_message(const char* line1, const char* line2 = nullptr);
void display_show_error(const char* message);
