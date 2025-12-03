#!/bin/bash

# Proper registration test with correct field coordinates
ADB_PATH="$HOME/Library/Android/sdk/platform-tools/adb"
TIMESTAMP=$(date +%s)
TEST_EMAIL="testuser${TIMESTAMP}@example.com"
TEST_PASSWORD="Test123456"

echo "=== DOTO Registration Test ==="
echo "Test Email: $TEST_EMAIL"
echo ""

# Function to clear text field and type
clear_and_type() {
    local x=$1
    local y=$2
    local text=$3
    echo "  Clearing and typing at ($x, $y): $text"
    # Tap to focus
    $ADB_PATH shell input tap $x $y
    sleep 0.5
    # Select all and delete
    $ADB_PATH shell input keyevent 113  # Ctrl+A (select all)
    sleep 0.3
    $ADB_PATH shell input keyevent 67   # Delete
    sleep 0.3
    # Type new text
    $ADB_PATH shell input text "$text"
    sleep 0.5
}

echo "Step 1: Filling Full Name..."
clear_and_type 581 1149 "Test User"

echo ""
echo "Step 2: Filling Email..."
clear_and_type 581 1394 "$TEST_EMAIL"

echo ""
echo "Step 3: Filling Password..."
clear_and_type 541 1639 "$TEST_PASSWORD"

echo ""
echo "Step 4: Confirming Password..."
clear_and_type 581 1883 "$TEST_PASSWORD"

echo ""
echo "Step 5: Taking screenshot before submit..."
$ADB_PATH exec-out screencap -p > /tmp/before_submit.png

echo ""
echo "Step 6: Clicking Create Account button..."
$ADB_PATH shell input tap 541 2087
sleep 3

echo ""
echo "Step 7: Taking screenshot after submit..."
$ADB_PATH exec-out screencap -p > /tmp/after_submit.png

echo ""
echo "Step 8: Checking for errors..."
$ADB_PATH shell uiautomator dump /data/local/tmp/ui_error.xml
$ADB_PATH pull /data/local/tmp/ui_error.xml /tmp/ui_error.xml 2>/dev/null

if grep -qi "error\|Error\|failed\|Failed" /tmp/ui_error.xml; then
    echo "✗ ERROR DETECTED!"
    echo "Error text found in UI dump"
    grep -i "error\|Error\|failed\|Failed" /tmp/ui_error.xml | head -5
else
    if grep -qi "verify\|code\|verification" /tmp/ui_error.xml; then
        echo "✓ Verification screen appeared - registration initiated!"
    else
        echo "? Unknown state - check screenshots"
    fi
fi

echo ""
echo "Step 9: Checking Metro logs..."
echo "Check terminal output for any errors"

echo ""
echo "=== Test Complete ==="
echo "Screenshots:"
echo "  - Before submit: /tmp/before_submit.png"
echo "  - After submit: /tmp/after_submit.png"
echo "UI dump: /tmp/ui_error.xml"

