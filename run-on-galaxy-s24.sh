#!/bin/bash

# Run DOTO app on physical Galaxy S24
# Supports both installed APK and development mode

set -e

echo "=========================================="
echo "  Run DOTO on Galaxy S24"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

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
    echo "❌ Galaxy S24 not found!"
    echo ""
    echo "Please ensure:"
    echo "  1. Galaxy S24 is connected via USB or WiFi"
    echo "  2. USB Debugging is enabled"
    echo "  3. Run: ./pair-device.sh if needed"
    exit 1
fi

echo "✅ Found Galaxy S24: $GALAXY_DEVICE"
echo ""

# Check if app is installed
APP_INSTALLED=$(adb -s $GALAXY_DEVICE shell pm list packages | grep "com.doto.app" | wc -l | tr -d ' ')

if [ "$APP_INSTALLED" -eq 0 ]; then
    echo "⚠️  App not installed!"
    echo ""
    echo "Installing APK..."
    if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
        adb -s $GALAXY_DEVICE install -r android/app/build/outputs/apk/release/app-release.apk
        echo "✅ App installed!"
    else
        echo "❌ APK not found. Building first..."
        echo "   Run: ./rapk.sh or ./rapk-gradle.sh"
        exit 1
    fi
    echo ""
fi

# Launch the app
echo "🚀 Launching DOTO app on Galaxy S24..."
adb -s $GALAXY_DEVICE shell am start -n com.doto.app/.MainActivity

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ App launched!"
    echo ""
    echo "=========================================="
    echo "  Development Mode Options"
    echo "=========================================="
    echo ""
    echo "To run in development mode with hot reload:"
    echo ""
    echo "  1. Start Expo dev server:"
    echo "     npm start"
    echo ""
    echo "  2. Press 'a' in Expo terminal to open on Android"
    echo ""
    echo "  3. Or run directly:"
    echo "     npm run android"
    echo ""
    echo "This will:"
    echo "  • Connect to your Galaxy S24"
    echo "  • Enable hot reload"
    echo "  • Show changes instantly"
    echo ""
else
    echo ""
    echo "❌ Failed to launch app"
    echo ""
    echo "Try manually:"
    echo "  adb -s $GALAXY_DEVICE shell am start -n com.doto.app/.MainActivity"
fi


