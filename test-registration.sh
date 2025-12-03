#!/bin/bash

# Test script for registration and login on Pixel 9 emulator
# Uses ADB commands to interact with the app

ADB_PATH="$HOME/Library/Android/sdk/platform-tools/adb"
SCREENSHOT_DIR="/tmp/doto_test"

mkdir -p "$SCREENSHOT_DIR"

echo "=== DOTO Registration & Login Test ==="
echo ""

# Function to take screenshot
screenshot() {
    local name=$1
    $ADB_PATH exec-out screencap -p > "$SCREENSHOT_DIR/${name}.png"
    echo "Screenshot saved: $SCREENSHOT_DIR/${name}.png"
    sleep 1
}

# Function to tap coordinates
tap() {
    local x=$1
    local y=$2
    echo "Tapping at ($x, $y)"
    $ADB_PATH shell input tap $x $y
    sleep 1
}

# Function to type text
type_text() {
    local text=$1
    echo "Typing: $text"
    $ADB_PATH shell input text "$text"
    sleep 0.5
}

# Function to press back
press_back() {
    echo "Pressing back button"
    $ADB_PATH shell input keyevent 4
    sleep 1
}

# Get UI dump to find elements
get_ui_dump() {
    $ADB_PATH shell uiautomator dump /data/local/tmp/ui.xml
    $ADB_PATH pull /data/local/tmp/ui.xml /tmp/ui.xml 2>/dev/null
}

echo "Step 1: Taking initial screenshot..."
screenshot "01_initial"

echo ""
echo "Step 2: Navigating to Registration screen..."
# Tap on "Sign Up" link at bottom of login screen
# Based on UI, it's around coordinates (540, 2100) for 1080x2424 screen
tap 540 2100
screenshot "02_registration_screen"

echo ""
echo "Step 3: Getting UI dump to find form fields..."
get_ui_dump

echo ""
echo "Step 4: Filling registration form..."
# Name field - tap and type
echo "  - Entering name..."
tap 540 800
type_text "TestUser"
sleep 1

# Email field
echo "  - Entering email..."
tap 540 950
# Clear existing text first
$ADB_PATH shell input keyevent 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67 67
type_text "testuser$(date +%s)@example.com"
sleep 1

# Password field
echo "  - Entering password..."
tap 540 1100
type_text "Test123456"
sleep 1

# Confirm password field
echo "  - Confirming password..."
tap 540 1250
type_text "Test123456"
sleep 1

screenshot "03_form_filled"

echo ""
echo "Step 5: Submitting registration form..."
# Tap "Create Account" button - typically around y=1400-1500
tap 540 1450
screenshot "04_submit_clicked"

echo ""
echo "Step 6: Waiting for response..."
sleep 5
screenshot "05_after_submit"

echo ""
echo "Step 7: Checking for errors or verification screen..."
get_ui_dump
if grep -q "Verify Your Email\|verification\|code" /tmp/ui.xml; then
    echo "✓ Verification screen appeared - registration initiated successfully!"
else
    if grep -q "error\|Error\|failed\|Failed" /tmp/ui.xml; then
        echo "✗ Error detected - checking logs..."
        echo "Check screenshots in $SCREENSHOT_DIR for details"
    else
        echo "? Unknown state - check screenshots"
    fi
fi

echo ""
echo "=== Test Complete ==="
echo "Screenshots saved in: $SCREENSHOT_DIR"
echo "UI dump saved in: /tmp/ui.xml"

