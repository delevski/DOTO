#!/bin/bash

# Install APK on Galaxy S24

APK_PATH="/Users/corphd/Desktop/Or codes projects/DOTO/android/app/build/outputs/apk/release/app-release.apk"

echo "=========================================="
echo "  Installing DOTO APK on Galaxy S24"
echo "=========================================="
echo ""

# Check if APK exists
if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK not found at: $APK_PATH"
    echo "Please build the APK first!"
    exit 1
fi

echo "📱 APK found: $APK_PATH"
echo "📏 Size: $(ls -lh "$APK_PATH" | awk '{print $5}')"
echo ""

# Check for connected devices
echo "🔍 Checking for connected devices..."
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')

if [ "$DEVICES" -eq 0 ]; then
    echo "⚠️  No device detected!"
    echo ""
    echo "Please ensure:"
    echo "  1. Your Galaxy S24 is connected via USB"
    echo "  2. USB Debugging is enabled:"
    echo "     Settings → Developer Options → USB Debugging"
    echo "  3. You've authorized this computer (check phone screen)"
    echo ""
    echo "Then run: adb devices"
    echo ""
    echo "Or install manually:"
    echo "  - Transfer APK to phone"
    echo "  - Open APK file on phone"
    echo "  - Allow installation from unknown sources if prompted"
    echo ""
    echo "APK location: $APK_PATH"
    exit 1
fi

echo "✅ Device detected!"
adb devices
echo ""

# Find Galaxy S24 device
GALAXY_DEVICE=""
for device in $(adb devices | grep "device$" | awk '{print $1}'); do
    MODEL=$(adb -s $device shell getprop ro.product.model 2>/dev/null | tr -d '\r' || echo "")
    if [[ "$MODEL" == "SM-S921B" ]]; then
        GALAXY_DEVICE=$device
        break
    fi
done

if [ -z "$GALAXY_DEVICE" ]; then
    # Fallback to first device if Galaxy S24 not found
    GALAXY_DEVICE=$(adb devices | grep "device$" | head -1 | awk '{print $1}')
fi

echo "📲 Installing APK on Galaxy S24 ($GALAXY_DEVICE)..."
adb -s "$GALAXY_DEVICE" install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! DOTO app installed on your Galaxy S24"
    echo ""
    echo "You can now launch the app from your phone!"
else
    echo ""
    echo "❌ Installation failed. Try manually:"
    echo "  adb install -r \"$APK_PATH\""
fi

