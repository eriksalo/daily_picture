#include "power_manager.h"
#include <M5Unified.h>

float power_battery_voltage() {
    int32_t mv = M5.Power.getBatteryVoltage();
    return mv / 1000.0f;
}

void power_enter_sleep(uint64_t sleep_seconds) {
    M5_LOGI("Entering deep sleep for %llu seconds", sleep_seconds);

    // Power down IMU to reduce sleep current
    M5.Imu.sleep();

    // timerSleep max is 255 minutes due to BM8563 RTC limit
    if (sleep_seconds <= 255ULL * 60) {
        M5.Power.timerSleep((int)sleep_seconds);
    } else {
        M5.Power.deepSleep(sleep_seconds * 1000000ULL, false);
    }

    // Should not reach here, but just in case
    esp_deep_sleep_start();
}
