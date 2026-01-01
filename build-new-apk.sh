#!/bin/bash

# Build New Release APK with Latest Changes and Install on Galaxy S24

set -e

echo "=========================================="
echo "  Build New Release APK"
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
check_java() {
    if command -v java &> /dev/null; then
        JAVA_VERSION=$(java -version 2>&1 | head -1 | grep -oE 'version "[0-9]+' | grep -oE '[0-9]+' || echo "8")
        JAVA_MAJOR=$(echo "$JAVA_VERSION" | head -1)
        
        # Try to find Java 11+ via java_home
        if [ "$JAVA_MAJOR" -lt 11 ]; then
            if command -v /usr/libexec/java_home &> /dev/null; then
                JAVA_11_HOME=$(/usr/libexec/java_home -v 11 2>/dev/null || /usr/libexec/java_home -v 17 2>/dev/null || /usr/libexec/java_home -v 21 2>/dev/null)
                if [ -n "$JAVA_11_HOME" ]; then
                    export JAVA_HOME="$JAVA_11_HOME"
                    export PATH="$JAVA_HOME/bin:$PATH"
                    echo "✅ Found Java 11+ at: $JAVA_HOME"
                    java -version
                    return 0
                fi
            fi
            return 1
        else
            return 0
        fi
    fi
    return 1
}

if ! check_java; then
    echo "❌ Java 11+ required (currently have Java 8)"
    echo ""
    echo "Please install Java 11+ first:"
    echo ""
    echo "Option 1: Install via Homebrew"
    echo "  brew install --cask temurin"
    echo ""
    echo "Option 2: Install Android Studio (includes Java)"
    echo "  https://developer.android.com/studio"
    echo ""
    echo "After installing, run this script again."
    exit 1
fi

echo "✅ Java version OK"
echo ""

# Check for code changes
echo "📝 Checking for latest code changes..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    CHANGES=$(git status --short | wc -l | tr -d ' ')
    if [ "$CHANGES" -gt 0 ]; then
        echo "✅ Found $CHANGES file(s) with changes"
        echo "   (These will be included in the build)"
        echo ""
    fi
fi

# Build Release APK
echo "🔨 Building Release APK with latest changes..."
echo "   (This may take 5-10 minutes)"
echo ""

cd "$ANDROID_DIR"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Build release APK
echo "🔨 Building release APK..."
./gradlew assembleRelease

# Check if APK was created
if [ ! -f "$APK_PATH" ]; then
    echo ""
    echo "❌ APK not found after build!"
    exit 1
fi

APK_SIZE=$(ls -lh "$APK_PATH" | awk '{print $5}')
BUILD_TIME=$(date "+%Y-%m-%d %H:%M:%S")
echo ""
echo "✅ Build complete!"
echo "📱 APK: $APK_PATH"
echo "📏 Size: $APK_SIZE"
echo "🕐 Built: $BUILD_TIME"
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
    echo "🎉 New APK with latest changes installed on Galaxy S24!"
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



