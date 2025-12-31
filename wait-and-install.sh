#!/bin/bash

# Wait for Galaxy S24 to connect and install APK

APK_PATH="/Users/corphd/Desktop/Or codes projects/DOTO/android/app/build/outputs/apk/release/app-release.apk"

echo "=========================================="
echo "  Waiting for Galaxy S24..."
echo "=========================================="
echo ""
echo "Please:"
echo "  1. Connect your Galaxy S24 via USB"
echo "  2. Enable USB Debugging (Settings → Developer Options)"
echo "  3. Authorize this computer when prompted"
echo ""
echo "Waiting for device (will check every 3 seconds)..."
echo "Press Ctrl+C to cancel"
echo ""

# Wait for device
MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')
    
    if [ "$DEVICES" -gt 0 ]; then
        echo ""
        echo "✅ Device detected!"
        adb devices
        echo ""
        echo "📲 Installing APK..."
        adb install -r "$APK_PATH"
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ SUCCESS! DOTO app installed on your Galaxy S24"
            echo ""
            echo "You can now launch the app from your phone!"
            exit 0
        else
            echo ""
            echo "❌ Installation failed. Trying to push to phone storage instead..."
            adb push "$APK_PATH" /sdcard/Download/doto-release.apk
            if [ $? -eq 0 ]; then
                echo ""
                echo "✅ APK copied to phone storage!"
                echo "Please install manually:"
                echo "  1. Open Files app on your phone"
                echo "  2. Go to Downloads"
                echo "  3. Tap doto-release.apk"
                echo "  4. Install"
            fi
            exit 1
        fi
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    if [ $((ATTEMPT % 10)) -eq 0 ]; then
        echo -n "."
    fi
    sleep 3
done

echo ""
echo "⏱️  Timeout: Device not detected after 3 minutes"
echo ""
echo "APK is ready at: $APK_PATH"
echo "You can install manually by transferring the APK to your phone."

