#!/bin/bash

# Rebuild Fresh APK with Latest Code Changes
# Cleans everything and rebuilds from scratch

set -e

echo "=========================================="
echo "  Rebuild Fresh APK with Latest Code"
echo "  Galaxy S24"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ANDROID_DIR="$SCRIPT_DIR/android"
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"

# Check device
echo "🔍 Checking device..."
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')
if [ "$DEVICES" -eq 0 ]; then
    echo "❌ No devices connected!"
    exit 1
fi
echo "✅ Galaxy S24 connected"
echo ""

# Check Java
check_java() {
    if command -v java &> /dev/null; then
        JAVA_VERSION=$(java -version 2>&1 | head -1 | grep -oE 'version "[0-9]+' | grep -oE '[0-9]+' || echo "8")
        JAVA_MAJOR=$(echo "$JAVA_VERSION" | head -1)
        
        if [ "$JAVA_MAJOR" -lt 11 ]; then
            if command -v /usr/libexec/java_home &> /dev/null; then
                JAVA_11_HOME=$(/usr/libexec/java_home -v 11 2>/dev/null || /usr/libexec/java_home -v 17 2>/dev/null || /usr/libexec/java_home -v 21 2>/dev/null)
                if [ -n "$JAVA_11_HOME" ]; then
                    export JAVA_HOME="$JAVA_11_HOME"
                    export PATH="$JAVA_HOME/bin:$PATH"
                    echo "✅ Using Java from: $JAVA_HOME"
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
    echo "  brew install --cask temurin"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Java version OK"
echo ""

# Show code changes
echo "📝 Latest code changes that will be included:"
if git rev-parse --git-dir > /dev/null 2>&1; then
    CHANGES=$(git status --short | wc -l | tr -d ' ')
    if [ "$CHANGES" -gt 0 ]; then
        echo "   Found $CHANGES modified files including:"
        git status --short | grep -E "socialAuth|LoginScreen" | head -5 | sed 's/^/   - /'
        echo ""
    fi
fi

# Clean everything
echo "🧹 Cleaning ALL previous builds..."
cd "$ANDROID_DIR"
./gradlew clean
rm -rf app/build/outputs/apk/*
rm -rf app/build/intermediates/*
echo "✅ Clean complete"
echo ""

# Build fresh APK
echo "🔨 Building FRESH Release APK with latest code..."
echo "   (This will take 5-10 minutes)"
echo ""
./gradlew assembleRelease

# Verify APK was created
if [ ! -f "$APK_PATH" ]; then
    echo ""
    echo "❌ APK not found after build!"
    exit 1
fi

APK_SIZE=$(ls -lh "$APK_PATH" | awk '{print $5}')
BUILD_TIME=$(date "+%Y-%m-%d %H:%M:%S")
echo ""
echo "✅ Fresh build complete!"
echo "📱 APK: $APK_PATH"
echo "📏 Size: $APK_SIZE"
echo "🕐 Built: $BUILD_TIME"
echo ""

# Uninstall old version first
echo "🗑️  Uninstalling old version..."
adb -s 192.168.1.126:37633 uninstall com.doto.app 2>/dev/null || echo "   (No old version to uninstall)"
echo ""

# Install new APK
echo "📲 Installing FRESH APK on Galaxy S24..."
adb -s 192.168.1.126:37633 install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "  ✅ SUCCESS!"
    echo "=========================================="
    echo ""
    echo "🎉 Fresh APK with latest code installed!"
    echo ""
    echo "Launching app..."
    adb -s 192.168.1.126:37633 shell am start -n com.doto.app/.MainActivity
    echo ""
    echo "✅ App launched with latest code!"
    echo ""
    echo "The Google and Facebook button fixes should now be active!"
else
    echo ""
    echo "❌ Installation failed"
    exit 1
fi



