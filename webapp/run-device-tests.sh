#!/bin/bash

# Run Playwright tests on a physical Android device
# Prerequisites:
# - Android device connected via USB or WiFi ADB
# - Chrome installed on the device
# - USB debugging enabled

set -e

echo "======================================"
echo "  Physical Device Test Runner"
echo "======================================"

# Check if ADB is available
if ! command -v adb &> /dev/null; then
    echo "❌ ADB not found. Please install Android SDK Platform Tools."
    exit 1
fi

# Check for connected devices
DEVICE=$(adb devices | grep -v "List" | grep "device" | head -1 | awk '{print $1}')

if [ -z "$DEVICE" ]; then
    echo "❌ No Android device found. Please connect a device with USB debugging enabled."
    exit 1
fi

echo "✓ Found device: $DEVICE"

# Get device info
DEVICE_MODEL=$(adb -s $DEVICE shell getprop ro.product.model 2>/dev/null | tr -d '\r' || echo "Unknown")
ANDROID_VERSION=$(adb -s $DEVICE shell getprop ro.build.version.release 2>/dev/null | tr -d '\r' || echo "Unknown")

echo "  Model: $DEVICE_MODEL"
echo "  Android: $ANDROID_VERSION"
echo ""

# Forward Chrome DevTools port
echo "Setting up Chrome remote debugging..."
adb -s $DEVICE forward tcp:9222 localabstract:chrome_devtools_remote 2>/dev/null || true

# Start Chrome on device with debugging enabled
echo "Launching Chrome on device..."
adb -s $DEVICE shell am start -n com.android.chrome/com.google.android.apps.chrome.Main \
    --es "com.google.android.apps.chrome.EXTRA_URL" "about:blank" 2>/dev/null || true

sleep 2

# Check if dev server is running
echo ""
echo "Checking if dev server is running on localhost:5173..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✓ Dev server is running"
else
    echo "⚠ Dev server not detected. Starting it now..."
    echo "  (Run 'npm run dev' in another terminal if this fails)"
    npm run dev &
    DEV_PID=$!
    sleep 5
    
    if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo "❌ Could not start dev server. Please run 'npm run dev' manually."
        kill $DEV_PID 2>/dev/null || true
        exit 1
    fi
    echo "✓ Dev server started"
fi

echo ""
echo "======================================"
echo "  Running Tests on Physical Device"
echo "======================================"
echo ""

# Run tests with device-specific configuration
# Using the CDP endpoint to connect to Chrome on the device
export PWTEST_SKIP_TEST_OUTPUT=1

# Run the physical device tests
npx playwright test physical-device-smoke.spec.js \
    --project=chromium \
    --reporter=list \
    --timeout=120000 \
    2>&1 | while IFS= read -r line; do
    echo "$line"
done

TEST_EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "======================================"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "  ✓ All tests passed!"
else
    echo "  ✗ Some tests failed (exit code: $TEST_EXIT_CODE)"
fi
echo "======================================"

exit $TEST_EXIT_CODE

