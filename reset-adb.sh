#!/bin/bash

# Reset ADB connection

echo "🔄 Resetting ADB connection..."
adb kill-server
sleep 1
adb start-server
sleep 1

echo ""
echo "📱 Checking for devices..."
adb devices

echo ""
echo "If no devices appear, run: ./pair-device.sh"


