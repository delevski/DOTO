#!/bin/bash

# Build Release APK using Android Studio workflow
# Includes latest code changes
# Falls back to ADB installation if Android Studio doesn't detect device

set -e

echo "=========================================="
echo "  Build Release APK - Android Studio"
echo "  Latest Code Changes → Galaxy S24"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ANDROID_DIR="$SCRIPT_DIR/android"

# Check for code changes
echo "📝 Checking for latest code changes..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    CHANGES=$(git status --short | wc -l | tr -d ' ')
    if [ "$CHANGES" -gt 0 ]; then
        echo "✅ Found $CHANGES file(s) with changes"
        echo "   (These will be included in the build)"
        git status --short | head -5
        echo ""
    else
        echo "ℹ️  No uncommitted changes"
        echo ""
    fi
fi

# Check device connection first
echo "🔍 Checking device connection..."
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')
UNAUTHORIZED=$(adb devices | grep "unauthorized" | wc -l | tr -d ' ')

if [ "$UNAUTHORIZED" -gt 0 ]; then
    echo "⚠️  Device detected but not authorized!"
    echo "   Please authorize USB debugging on your Galaxy S24"
    exit 1
fi

if [ "$DEVICES" -gt 0 ]; then
    echo "✅ Galaxy S24 connected via ADB"
    adb devices
    echo ""
else
    echo "⚠️  No devices connected!"
    echo "   Run: ./pair-device.sh to connect your Galaxy S24"
    echo ""
fi

# Check for Android Studio
ANDROID_STUDIO_PATH=""
if [ -d "/Applications/Android Studio.app" ]; then
    ANDROID_STUDIO_PATH="/Applications/Android Studio.app"
elif [ -d "$HOME/Applications/Android Studio.app" ]; then
    ANDROID_STUDIO_PATH="$HOME/Applications/Android Studio.app"
fi

if [ -n "$ANDROID_STUDIO_PATH" ]; then
    echo "✅ Android Studio found!"
    echo ""
    
    # Check if JavaScript bundle needs to be exported
    echo "📦 Checking JavaScript bundle..."
    ASSETS_DIR="$ANDROID_DIR/app/src/main/assets"
    if [ ! -d "$ASSETS_DIR" ] || [ -z "$(ls -A $ASSETS_DIR 2>/dev/null)" ]; then
        echo "⚠️  JavaScript bundle not found or outdated"
        echo ""
        echo "Exporting latest JavaScript bundle..."
        echo "   (This ensures your latest code changes are included)"
        echo ""
        mkdir -p "$ASSETS_DIR"
        npx expo export --platform android --output-dir "$ASSETS_DIR" --clear
        echo ""
        echo "✅ JavaScript bundle exported with latest code"
        echo ""
    else
        echo "✅ JavaScript bundle found"
        echo ""
        read -p "Re-export JavaScript bundle to include latest changes? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "📦 Exporting latest JavaScript bundle..."
            npx expo export --platform android --output-dir "$ASSETS_DIR" --clear
            echo "✅ JavaScript bundle exported"
            echo ""
        fi
    fi
    
    echo "📱 Opening project in Android Studio..."
    echo ""
    
    # Open Android Studio with the android project
    open -a "Android Studio" "$ANDROID_DIR"
    
    echo "⏳ Android Studio is opening..."
    sleep 2
    
    echo ""
    echo "=========================================="
    echo "  Build Instructions"
    echo "=========================================="
    echo ""
    echo "Once Android Studio opens:"
    echo ""
    echo "1️⃣  Wait for Gradle sync to complete"
    echo "   (Check bottom status bar: 'Gradle sync finished')"
    echo ""
    echo "2️⃣  Build Release APK:"
    echo "   • Menu: Build → Build Bundle(s) / APK(s) → Build APK(s)"
    echo "   • Or: Build → Generate Signed Bundle / APK → APK → Next → release → Finish"
    echo "   • Wait for build to complete (5-10 minutes)"
    echo ""
    echo "3️⃣  Install on Galaxy S24:"
    echo ""
    echo "   Option A: Via Android Studio (if device detected)"
    echo "   • Click the green 'Run' button (▶️) in toolbar"
    echo "   • Or: Run → Run 'app'"
    echo ""
    echo "   Option B: Via ADB (recommended - device already connected)"
    echo "   • After build completes, run:"
    echo "     ./install-apk.sh"
    echo ""
    echo "   Or manually:"
    echo "     adb install -r android/app/build/outputs/apk/release/app-release.apk"
    echo ""
    echo "📱 APK Location:"
    echo "   $ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
    echo ""
    echo "💡 Tip: After building, you can install immediately with:"
    echo "   ./install-apk.sh"
    echo ""
    
else
    echo "⚠️  Android Studio not installed!"
    echo ""
    echo "=========================================="
    echo "  Install Android Studio"
    echo "=========================================="
    echo ""
    echo "To build with Android Studio:"
    echo ""
    echo "1. Download Android Studio:"
    echo "   https://developer.android.com/studio"
    echo ""
    echo "2. Install and open Android Studio"
    echo ""
    echo "3. Run this script again:"
    echo "   ./rapk.sh"
    echo ""
    echo "=========================================="
    echo "  Alternative: Build via Command Line"
    echo "=========================================="
    echo ""
    echo "You can build using Gradle (same as Android Studio):"
    echo ""
    echo "Prerequisites:"
    echo "  • Install Java 11+: brew install --cask temurin"
    echo ""
    echo "Then run:"
    echo "  ./rapk-gradle.sh"
    echo ""
    echo "This uses the exact same Gradle build system Android Studio uses."
    echo ""
    
    # Check if they want to proceed with Gradle build
    if [ "$DEVICES" -gt 0 ]; then
        echo "Your Galaxy S24 is connected, so installation will be automatic!"
        echo ""
    fi
    
    exit 0
fi
