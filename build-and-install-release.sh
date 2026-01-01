#!/bin/bash

# Build Release APK with Latest Code Changes
# Install on Galaxy S24 via Android Studio or ADB

set -e

echo "=========================================="
echo "  Build Release APK - Latest Changes"
echo "  Samsung Galaxy S24"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ANDROID_DIR="$SCRIPT_DIR/android"

# Check for code changes
echo "📝 Checking for code changes..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    CHANGES=$(git status --short | wc -l | tr -d ' ')
    if [ "$CHANGES" -gt 0 ]; then
        echo "✅ Found $CHANGES file(s) with changes"
        git status --short | head -10
        echo ""
    else
        echo "ℹ️  No uncommitted changes detected"
        echo ""
    fi
else
    echo "ℹ️  Not a git repository (or git not available)"
    echo ""
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
    echo "Once Android Studio opens and Gradle sync completes:"
    echo ""
    echo "1️⃣  Build Release APK:"
    echo "   • Menu: Build → Build Bundle(s) / APK(s) → Build APK(s)"
    echo "   • Or: Build → Generate Signed Bundle / APK → APK → Next"
    echo "   • Select 'release' build variant"
    echo "   • Click Finish"
    echo "   • Wait for build to complete (5-10 minutes)"
    echo ""
    echo "2️⃣  Install on Galaxy S24:"
    echo ""
    echo "   Option A: Via Android Studio (if device detected)"
    echo "   • Check device dropdown in toolbar (should show Galaxy S24)"
    echo "   • Click green 'Run' button (▶️)"
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
    echo "💡 Tip: After building, install immediately with:"
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
    echo "   ./build-and-install-release.sh"
    echo ""
    echo "=========================================="
    echo "  Alternative: Build via Gradle + ADB"
    echo "=========================================="
    echo ""
    echo "You can build using Gradle (same as Android Studio) and install via ADB:"
    echo ""
    echo "Prerequisites:"
    echo "  • Install Java 11+: brew install --cask temurin"
    echo ""
    echo "Then run:"
    echo "  ./rapk-gradle.sh"
    echo ""
    echo "This will:"
    echo "  • Build release APK with latest changes"
    echo "  • Install automatically on Galaxy S24 via ADB"
    echo ""
    
    if [ "$DEVICES" -gt 0 ]; then
        echo "Your Galaxy S24 is connected, so installation will be automatic!"
        echo ""
        read -p "Build using Gradle now? (y/n) " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo "🔨 Building with Gradle..."
            ./rapk-gradle.sh
            exit $?
        fi
    fi
    
    exit 0
fi



