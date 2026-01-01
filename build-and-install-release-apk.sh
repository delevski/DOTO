#!/bin/bash

# Build Release APK and Install on Samsung Galaxy S24
# Uses Android Studio if available, otherwise Gradle + ADB

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ANDROID_DIR="$SCRIPT_DIR/android"
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"

echo "=========================================="
echo "  Build & Install Release APK"
echo "  Samsung Galaxy S24"
echo "=========================================="
echo ""

# Check device connection
echo "🔍 Checking device connection..."
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')
UNAUTHORIZED=$(adb devices | grep "unauthorized" | wc -l | tr -d ' ')

if [ "$UNAUTHORIZED" -gt 0 ]; then
    echo "⚠️  Device detected but not authorized!"
    echo "   Please authorize USB debugging on your Galaxy S24"
    exit 1
fi

if [ "$DEVICES" -eq 0 ]; then
    echo "⚠️  No devices connected!"
    echo ""
    echo "Please connect your Galaxy S24:"
    echo "  1. Connect via USB or enable wireless debugging"
    echo "  2. Enable USB Debugging: Settings → Developer Options → USB Debugging"
    echo "  3. Authorize this computer (check phone screen)"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Device detected!"
adb devices
echo ""

# Check for Android Studio
ANDROID_STUDIO_PATH=""
if [ -d "/Applications/Android Studio.app" ]; then
    ANDROID_STUDIO_PATH="/Applications/Android Studio.app"
elif [ -d "$HOME/Applications/Android Studio.app" ]; then
    ANDROID_STUDIO_PATH="$HOME/Applications/Android Studio.app"
fi

# Method 1: Build using Android Studio
if [ -n "$ANDROID_STUDIO_PATH" ]; then
    echo "✅ Android Studio found!"
    echo ""
    echo "📱 Opening project in Android Studio..."
    echo ""
    
    # Open Android Studio with the android project
    open -a "Android Studio" "$ANDROID_DIR"
    
    echo "⏳ Android Studio is opening..."
    sleep 3
    
    echo ""
    echo "=========================================="
    echo "  Build Instructions for Android Studio"
    echo "=========================================="
    echo ""
    echo "Once Android Studio opens:"
    echo ""
    echo "1️⃣  Wait for Gradle sync to complete"
    echo "   (Check bottom status bar: 'Gradle sync finished')"
    echo ""
    echo "2️⃣  Build Release APK:"
    echo "   • Menu: Build → Build Bundle(s) / APK(s) → Build APK(s)"
    echo "   • Wait for build to complete (check Build output at bottom)"
    echo ""
    echo "3️⃣  Install APK on Galaxy S24:"
    echo ""
    echo "   Option A: Via Android Studio (if device detected)"
    echo "   • Click the green 'Run' button (▶️) in toolbar"
    echo "   • Or: Run → Run 'app'"
    echo ""
    echo "   Option B: Via ADB (after build completes)"
    echo "   • Run: ./install-apk.sh"
    echo "   • Or manually: adb install -r \"$APK_PATH\""
    echo ""
    echo "📱 APK Location:"
    echo "   $APK_PATH"
    echo ""
    echo "💡 After building, run this script again with --install flag to install:"
    echo "   ./build-and-install-release-apk.sh --install"
    echo ""
    exit 0
fi

# Method 2: Build using Gradle (same as Android Studio)
echo "⚠️  Android Studio not found. Building using Gradle..."
echo ""

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | head -1 | grep -oE 'version "[0-9]+' | grep -oE '[0-9]+' || echo "8")
JAVA_MAJOR_VERSION=$(echo "$JAVA_VERSION" | head -1)

if [ "$JAVA_MAJOR_VERSION" -lt 11 ]; then
    echo "❌ Java 11+ required (currently have Java $JAVA_MAJOR_VERSION)"
    echo ""
    echo "Please install Java 11+ using one of these methods:"
    echo ""
    echo "Option 1: Install via Homebrew (recommended)"
    echo "  brew install --cask temurin"
    echo ""
    echo "Option 2: Install Android Studio (includes Java)"
    echo "  Download from: https://developer.android.com/studio"
    echo ""
    echo "After installing, run this script again."
    exit 1
fi

echo "✅ Java $JAVA_MAJOR_VERSION detected"
echo ""

# Build Release APK
echo "🔨 Building Release APK..."
echo ""

cd "$ANDROID_DIR"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Build release APK
echo "🔨 Building release APK (this may take a few minutes)..."
./gradlew assembleRelease

# Check if APK was created
if [ ! -f "$APK_PATH" ]; then
    echo ""
    echo "❌ APK not found after build!"
    echo "   Expected location: $APK_PATH"
    exit 1
fi

APK_SIZE=$(ls -lh "$APK_PATH" | awk '{print $5}')
echo ""
echo "✅ Build complete!"
echo "📱 APK: $APK_PATH"
echo "📏 Size: $APK_SIZE"
echo ""

# Install APK
if [ "$1" != "--no-install" ]; then
    echo "📲 Installing APK on Galaxy S24..."
    adb install -r "$APK_PATH"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ SUCCESS! APK installed on Galaxy S24"
        echo ""
        echo "You can now launch the DOTO app from your phone!"
    else
        echo ""
        echo "❌ Installation failed. Try manually:"
        echo "   adb install -r \"$APK_PATH\""
        exit 1
    fi
else
    echo "⏭️  Skipping installation (--no-install flag)"
    echo ""
    echo "To install later, run:"
    echo "   adb install -r \"$APK_PATH\""
    echo "   Or: ./install-apk.sh"
fi



