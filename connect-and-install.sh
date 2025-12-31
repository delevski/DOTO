#!/bin/bash

# Connect wirelessly and install APK

APK_PATH="/Users/corphd/Desktop/Or codes projects/DOTO/android/app/build/outputs/apk/release/app-release.apk"
IP="192.168.1.100"

echo "=========================================="
echo "  Connect & Install DOTO APK"
echo "=========================================="
echo ""

# Check if port provided as argument
if [ -z "$1" ]; then
    echo "Usage: $0 <CONNECTION_PORT>"
    echo ""
    echo "Example: $0 35044"
    echo ""
    echo "To find the connection port:"
    echo "  1. On your Galaxy S24: Settings → Developer Options → Wireless debugging"
    echo "  2. Look for 'IP address & port' (not pairing port)"
    echo "  3. Use that port number"
    exit 1
fi

PORT=$1

echo "📱 Connecting to $IP:$PORT..."
adb connect $IP:$PORT

sleep 2

echo ""
echo "🔍 Checking connection..."
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')

if [ "$DEVICES" -eq 0 ]; then
    echo "❌ Connection failed!"
    echo ""
    echo "Please check:"
    echo "  1. Wireless debugging is still enabled"
    echo "  2. You're using the correct connection port (not pairing port)"
    echo "  3. Phone and computer are on the same WiFi network"
    exit 1
fi

echo "✅ Device connected!"
adb devices
echo ""

echo "📲 Installing APK..."
adb install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! DOTO app installed on your Galaxy S24"
    echo ""
    echo "You can now launch the app from your phone!"
else
    echo ""
    echo "❌ Installation failed"
    exit 1
fi

