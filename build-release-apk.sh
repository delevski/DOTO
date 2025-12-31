#!/bin/bash

# Build Release APK for DOTO App
# This script builds a release APK and optionally installs it on connected device

set -e

echo "🚀 Building DOTO Release APK..."
echo ""

# Navigate to project root
cd "$(dirname "$0")"

# Check if Android SDK is available
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  ANDROID_HOME not set. Trying to find Android SDK..."
    if [ -d "$HOME/Library/Android/sdk" ]; then
        export ANDROID_HOME="$HOME/Library/Android/sdk"
        export PATH="$PATH:$ANDROID_HOME/platform-tools"
        echo "✅ Found Android SDK at $ANDROID_HOME"
    else
        echo "❌ Android SDK not found. Please set ANDROID_HOME or install Android Studio."
        exit 1
    fi
fi

# Navigate to android directory
cd android

echo "📦 Cleaning previous builds..."
./gradlew clean

echo ""
echo "🔨 Building Release APK..."
./gradlew assembleRelease

echo ""
echo "✅ Build complete!"
echo ""

# Find the APK file
APK_PATH="app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo "📱 APK Location: $(pwd)/$APK_PATH"
    echo "📊 APK Size: $APK_SIZE"
    echo ""
    
    # Check if device is connected
    if command -v adb &> /dev/null; then
        DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')
        
        if [ "$DEVICES" -gt 0 ]; then
            echo "📱 Found $DEVICES connected device(s)"
            echo ""
            read -p "Do you want to install the APK on your device? (y/n) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "📲 Installing APK on device..."
                adb install -r "$APK_PATH"
                echo ""
                echo "✅ Installation complete!"
                echo ""
                echo "🎉 You can now open DOTO on your device!"
            fi
        else
            echo "⚠️  No devices connected via ADB"
            echo "   To install manually:"
            echo "   1. Transfer the APK to your device"
            echo "   2. Enable 'Install from Unknown Sources' in Settings"
            echo "   3. Open the APK file on your device"
        fi
    else
        echo "⚠️  ADB not found in PATH"
        echo "   APK is ready at: $(pwd)/$APK_PATH"
        echo "   Transfer it to your device and install manually"
    fi
else
    echo "❌ APK not found at expected location: $APK_PATH"
    exit 1
fi

