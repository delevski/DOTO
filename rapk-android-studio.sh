#!/bin/bash

# Build Release APK using Android Studio workflow
# Opens Android Studio and provides build/install instructions
# Falls back to Gradle + ADB if Android Studio not available

set -e

echo "=========================================="
echo "  Build Release APK - Android Studio"
echo "  Samsung Galaxy S24"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ANDROID_DIR="$SCRIPT_DIR/android"

# Check for Android Studio
ANDROID_STUDIO_PATH=""
if [ -d "/Applications/Android Studio.app" ]; then
    ANDROID_STUDIO_PATH="/Applications/Android Studio.app"
elif [ -d "$HOME/Applications/Android Studio.app" ]; then
    ANDROID_STUDIO_PATH="$HOME/Applications/Android Studio.app"
fi

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
    echo "  1. Run: ./pair-device.sh"
    echo "  2. Or connect via USB and enable USB Debugging"
    echo ""
    exit 1
fi

echo "✅ Galaxy S24 connected via ADB"
adb devices
echo ""

# If Android Studio is found, open it
if [ -n "$ANDROID_STUDIO_PATH" ]; then
    echo "✅ Android Studio found!"
    echo ""
    echo "📱 Opening project in Android Studio..."
    echo ""
    
    # Open Android Studio with the android project
    open -a "Android Studio" "$ANDROID_DIR"
    
    echo "⏳ Waiting for Android Studio to open..."
    sleep 3
    
    echo ""
    echo "=========================================="
    echo "  Build Instructions for Android Studio"
    echo "=========================================="
    echo ""
    echo "Once Android Studio opens:"
    echo ""
    echo "1️⃣  Wait for Gradle sync to complete"
    echo "   (Check bottom status bar for 'Gradle sync finished')"
    echo ""
    echo "2️⃣  Build Release APK:"
    echo "   • Click: Build → Build Bundle(s) / APK(s) → Build APK(s)"
    echo "   • Or use menu: Build → Generate Signed Bundle / APK"
    echo "   • Wait for build to complete (check Build output at bottom)"
    echo ""
    echo "3️⃣  Install APK on Galaxy S24:"
    echo "   • Android Studio should detect your device automatically"
    echo "   • Click the 'Run' button (green play icon) or"
    echo "   • Use: Run → Run 'app'"
    echo ""
    echo "   If Android Studio doesn't detect the device:"
    echo "   • Run this script again with --adb-install flag, or"
    echo "   • Run: ./install-apk.sh"
    echo ""
    echo "📱 APK will be located at:"
    echo "   $ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
    echo ""
    
    # Check if user wants to proceed with ADB installation after build
    if [ "$1" != "--adb-install" ]; then
        echo "💡 Tip: After building in Android Studio, you can install via ADB by running:"
        echo "   ./rapk-android-studio.sh --adb-install"
        echo ""
    fi
    
else
    echo "⚠️  Android Studio not found!"
    echo ""
    echo "Options:"
    echo ""
    echo "Option 1: Install Android Studio (Recommended)"
    echo "  1. Download from: https://developer.android.com/studio"
    echo "  2. Install and open Android Studio"
    echo "  3. Run this script again"
    echo ""
    echo "Option 2: Build using Gradle (same as Android Studio)"
    echo "  This will build using the same Gradle system Android Studio uses"
    echo ""
    echo "⚠️  Note: Requires Java 11+ (currently have Java 8)"
    echo ""
    echo "See: ANDROID_STUDIO_BUILD_GUIDE.md for detailed instructions"
    echo ""
    read -p "Build using Gradle now? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🔨 Building Release APK using Gradle..."
        echo ""
        
        # Check Java version
        if ! command -v java &> /dev/null || ! java -version 2>&1 | grep -q "version \"1[1-9]\|version \"[2-9]"; then
            echo "❌ Java 11+ required for Gradle build"
            echo ""
            echo "Please install Java 11+:"
            echo "  brew install --cask temurin"
            echo ""
            echo "Or install Android Studio (includes Java)"
            exit 1
        fi
        
        cd "$ANDROID_DIR"
        ./gradlew clean
        ./gradlew assembleRelease
        
        APK_PATH="app/build/outputs/apk/release/app-release.apk"
        if [ -f "$APK_PATH" ]; then
            echo ""
            echo "✅ Build complete!"
            echo "📱 APK: $ANDROID_DIR/$APK_PATH"
            echo ""
            echo "📲 Installing on Galaxy S24..."
            adb install -r "$APK_PATH"
            
            if [ $? -eq 0 ]; then
                echo ""
                echo "✅ SUCCESS! APK installed on Galaxy S24"
            else
                echo ""
                echo "❌ Installation failed. Try manually:"
                echo "   adb install -r \"$APK_PATH\""
            fi
        else
            echo "❌ APK not found after build"
            exit 1
        fi
    else
        echo ""
        echo "Please install Android Studio to continue."
        exit 0
    fi
fi

# If --adb-install flag is provided, install via ADB
if [ "$1" == "--adb-install" ]; then
    APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
    
    if [ ! -f "$APK_PATH" ]; then
        echo ""
        echo "❌ APK not found at: $APK_PATH"
        echo "   Please build the APK first in Android Studio"
        exit 1
    fi
    
    echo ""
    echo "📲 Installing APK via ADB..."
    adb install -r "$APK_PATH"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ SUCCESS! APK installed on Galaxy S24"
    else
        echo ""
        echo "❌ Installation failed"
        exit 1
    fi
fi

