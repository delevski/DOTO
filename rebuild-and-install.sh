#!/bin/bash

# Rebuild Release APK with Latest Changes and Install on Galaxy S24

set -e

echo "=========================================="
echo "  Rebuild & Install Release APK"
echo "  Galaxy S24"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ANDROID_DIR="$SCRIPT_DIR/android"
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"

# Check device connection
echo "🔍 Checking device connection..."
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')

if [ "$DEVICES" -eq 0 ]; then
    echo "❌ No devices connected!"
    echo "   Run: ./pair-device.sh"
    exit 1
fi

echo "✅ Galaxy S24 connected"
adb devices
echo ""

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | head -1 | grep -oE 'version "[0-9]+' | grep -oE '[0-9]+' || echo "8")
JAVA_MAJOR_VERSION=$(echo "$JAVA_VERSION" | head -1)

if [ "$JAVA_MAJOR_VERSION" -lt 11 ]; then
    echo "❌ Java 11+ required (currently have Java $JAVA_MAJOR_VERSION)"
    echo ""
    echo "Quick fix - Install Java 11+:"
    echo "  brew install --cask temurin"
    echo ""
    echo "After installing, run this script again."
    echo ""
    echo "Installing existing APK in the meantime..."
    if [ -f "$APK_PATH" ]; then
        adb -s 192.168.1.126:37633 install -r "$APK_PATH"
        echo "✅ Existing APK installed (may not have latest changes)"
    fi
    exit 1
fi

echo "✅ Java $JAVA_MAJOR_VERSION detected"
echo ""

# Check for code changes
echo "📝 Checking for code changes..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    CHANGES=$(git status --short | wc -l | tr -d ' ')
    if [ "$CHANGES" -gt 0 ]; then
        echo "✅ Found $CHANGES file(s) with changes"
        echo "   (These will be included in the rebuild)"
        echo ""
    fi
fi

# CRITICAL: Rebuild JavaScript bundle with latest code changes
echo "🔨 Step 1: Rebuilding JavaScript bundle with latest code..."
echo "   (This includes your socialAuth.js fixes)"
npx expo export --platform android --output-dir android/app/src/main/assets/ --clear
echo "✅ JavaScript bundle rebuilt with latest fixes"
echo ""

# Build Release APK
echo "🔨 Step 2: Building Release APK..."
echo ""

cd "$ANDROID_DIR"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Build release APK
echo "🔨 Building release APK (this may take 5-10 minutes)..."
./gradlew assembleRelease

# Check if APK was created
if [ ! -f "$APK_PATH" ]; then
    echo ""
    echo "❌ APK not found after build!"
    exit 1
fi

APK_SIZE=$(ls -lh "$APK_PATH" | awk '{print $5}')
echo ""
echo "✅ Build complete!"
echo "📱 APK: $APK_PATH"
echo "📏 Size: $APK_SIZE"
echo ""

# Install APK
echo "📲 Installing APK on Galaxy S24..."
adb -s 192.168.1.126:37633 install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "  ✅ SUCCESS!"
    echo "=========================================="
    echo ""
    echo "🎉 Rebuilt APK with latest changes installed on Galaxy S24!"
    echo ""
    echo "Launching app..."
    adb -s 192.168.1.126:37633 shell am start -n com.doto.app/.MainActivity
    echo ""
    echo "✅ App launched on your Galaxy S24!"
else
    echo ""
    echo "❌ Installation failed"
    exit 1
fi
