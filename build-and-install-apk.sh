#!/bin/bash

# Build Release APK and Install on Galaxy S24
# This script builds the APK and installs it on your connected Android device

set -e

echo "=========================================="
echo "  Building Release APK for DOTO"
echo "=========================================="
echo ""

# Set environment variables
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"

PROJECT_DIR="/Users/corphd/Desktop/Or codes projects/DOTO"
cd "$PROJECT_DIR"

echo "📦 Step 1: Building JavaScript bundle..."
npx expo export --platform android --output-dir android/app/src/main/assets/ --clear

echo ""
echo "🔨 Step 2: Building Release APK..."
cd android

# Build release APK (ARM64 only for physical device)
# Skip clean to avoid file lock issues
./gradlew assembleRelease --no-daemon

echo ""
echo "✅ Build complete! Looking for APK..."

# Find the APK
APK_PATH=$(find app/build/outputs/apk/release -name "*.apk" | head -1)

if [ -z "$APK_PATH" ]; then
    echo "❌ Error: APK not found!"
    echo "Please build manually in Android Studio:"
    echo "  1. Open Android Studio"
    echo "  2. Open project: $PROJECT_DIR/android"
    echo "  3. Build > Build Bundle(s) / APK(s) > Build APK(s)"
    echo "  4. Select 'release' variant"
    exit 1
fi

echo "📱 Found APK: $APK_PATH"
echo ""

# Check if device is connected
echo "🔍 Checking for connected devices..."
DEVICES=$(adb devices | grep -v "List" | grep "device" | wc -l | tr -d ' ')

if [ "$DEVICES" -eq 0 ]; then
    echo "⚠️  No device connected!"
    echo ""
    echo "Please:"
    echo "  1. Enable USB debugging on your Galaxy S24"
    echo "  2. Connect your phone via USB"
    echo "  3. Run this script again"
    echo ""
    echo "APK location: $PROJECT_DIR/$APK_PATH"
    exit 1
fi

echo "📲 Installing APK on Galaxy S24..."
adb install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! APK installed on your Galaxy S24"
    echo ""
    echo "You can now launch the DOTO app on your device!"
else
    echo ""
    echo "❌ Installation failed. Try manually:"
    echo "  adb install -r $PROJECT_DIR/$APK_PATH"
fi

