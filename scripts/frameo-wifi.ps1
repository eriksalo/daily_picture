# frameo-wifi.ps1 — Open WiFi settings on a Frameo frame via USB ADB
#
# Usage:
#   .\scripts\frameo-wifi.ps1              # Open WiFi settings, then restore kiosk
#   .\scripts\frameo-wifi.ps1 -Restore     # Just restore the kiosk app
#
# The Frameo runs WebviewKiosk (uk.nktnet.webviewkiosk) as the default launcher,
# locking the UI to a single web page. This script temporarily opens Android WiFi
# settings so you can configure a new network on the frame's touchscreen.

param(
    [switch]$Restore
)

$ErrorActionPreference = "Stop"

$KIOSK_PKG = "uk.nktnet.webviewkiosk"
$KIOSK_ACTIVITY = "$KIOSK_PKG/.MainActivity"

# --- Find ADB ---
function Find-Adb {
    # Check PATH
    $adb = Get-Command adb -ErrorAction SilentlyContinue
    if ($adb) { return $adb.Source }

    # winget install location
    $wingetBase = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages"
    $found = Get-ChildItem -Path $wingetBase -Filter "adb.exe" -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.DirectoryName -like "*platform-tools*" } |
        Select-Object -First 1
    if ($found) { return $found.FullName }

    # Common paths
    $paths = @(
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "$env:ProgramFiles\Android\platform-tools\adb.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

$ADB = Find-Adb
if (-not $ADB) {
    Write-Host "ERROR: adb not found. Install with:" -ForegroundColor Red
    Write-Host "  winget install Google.PlatformTools"
    exit 1
}
Write-Host "Using ADB: $ADB"

# --- Wait for device ---
Write-Host "Waiting for Frameo on USB..."
& $ADB wait-for-usb-device
$device = (& $ADB devices | Where-Object { $_ -match "\bdevice$" } | Select-Object -First 1) -replace "\s+device$", ""
if (-not $device) {
    Write-Host "ERROR: No device found. Is USB debugging enabled?" -ForegroundColor Red
    exit 1
}
Write-Host "Connected: $device"

# --- Restore-only mode ---
if ($Restore) {
    Write-Host "Restoring kiosk..."
    & $ADB shell am start -n $KIOSK_ACTIVITY
    Write-Host "Done."
    exit 0
}

# --- Show current WiFi ---
$wifiInfo = & $ADB shell dumpsys wifi 2>&1 | Select-String "SSID:" | Select-Object -First 1
$currentSsid = if ($wifiInfo -match "SSID: ([^,]+)") { $Matches[1] } else { "unknown" }
Write-Host "Current WiFi: $currentSsid"

# --- Open WiFi settings ---
Write-Host ""
Write-Host "Opening WiFi settings on the frame..."
& $ADB shell am start -a android.settings.WIFI_SETTINGS

Write-Host ""
Write-Host "  ----------------------------------------" -ForegroundColor Cyan
Write-Host "  WiFi settings are open on the frame." -ForegroundColor Cyan
Write-Host "  Tap a network and enter the password." -ForegroundColor Cyan
Write-Host "  ----------------------------------------" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter when done"

# --- Verify connectivity ---
Write-Host "Checking internet..."
$ping = & $ADB shell ping -c 2 -W 3 8.8.8.8 2>&1
if ($ping -match "bytes from") {
    Write-Host "Internet OK!" -ForegroundColor Green
} else {
    Write-Host "WARNING: No internet. Check the WiFi config on the frame." -ForegroundColor Yellow
    Read-Host "Press Enter to continue anyway"
}

# --- Get IP ---
$newSsid = (& $ADB shell dumpsys wifi 2>&1 | Select-String "SSID:" | Select-Object -First 1)
if ($newSsid -match "SSID: ([^,]+)") { $newSsid = $Matches[1] } else { $newSsid = "unknown" }
$ipRoute = & $ADB shell ip route 2>&1
$newIp = if ($ipRoute -match "src ([\d.]+)") { $Matches[1] } else { "unknown" }
Write-Host "WiFi: $newSsid  IP: $newIp"

# --- Restore kiosk ---
Write-Host ""
$restore = Read-Host "Restore kiosk? [Y/n]"
if ($restore -ne "n" -and $restore -ne "N") {
    & $ADB shell am start -n $KIOSK_ACTIVITY
    Write-Host "Kiosk restored. Daily picture should load shortly." -ForegroundColor Green
} else {
    Write-Host "Kiosk not restored. Run: .\scripts\frameo-wifi.ps1 -Restore"
}
