#!/bin/bash

# Start Expo dev server and connect to Galaxy S24
# Works with already-installed app

set -e

echo "=========================================="
echo "  Start Development Server"
echo "  Galaxy S24"
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
    echo "   Run: ./pair-device.sh"
    exit 1
fi

echo "✅ Galaxy S24 connected: $GALAXY_DEVICE"
echo ""

# Check if app is installed
APP_INSTALLED=$(adb -s $GALAXY_DEVICE shell pm list packages | grep "com.doto.app" | wc -l | tr -d ' ')

if [ "$APP_INSTALLED" -eq 0 ]; then
    echo "⚠️  App not installed. Installing..."
    if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
        adb -s $GALAXY_DEVICE install -r android/app/build/outputs/apk/release/app-release.apk
    else
        echo "❌ APK not found. Please build first."
        exit 1
    fi
fi

echo "✅ App is installed"
echo ""

# Get device IP for Expo
DEVICE_IP=$(echo $GALAXY_DEVICE | cut -d':' -f1)
echo "📱 Device IP: $DEVICE_IP"
echo ""

echo "🚀 Starting Expo dev server..."
echo ""
echo "The app will connect automatically to:"
echo "  • Metro bundler: http://localhost:8081"
echo "  • Expo DevTools: http://localhost:19002"
echo ""
echo "Press 'a' in the Expo terminal to open on Android"
echo "Or the app will auto-connect if already running"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start Expo (will use .env.local automatically)
npm start



