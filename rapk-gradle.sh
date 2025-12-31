#!/bin/bash

# Build Release APK using Gradle (same as Android Studio)
# Installs via ADB on Galaxy S24

set -e

echo "=========================================="
echo "  Build Release APK - Gradle"
echo "  (Same build system as Android Studio)"
echo "  Samsung Galaxy S24"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check Java version (need Java 11+)
check_java_version() {
    if command -v java &> /dev/null; then
        JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | sed '/^1\./s///' | cut -d'.' -f1)
        if [ -z "$JAVA_VERSION" ] || [ "$JAVA_VERSION" -lt 11 ]; then
            return 1
        fi
        return 0
    fi
    return 1
}

# Try to find Java 11+
find_java_home() {
    # Check Android Studio's bundled JDK
    if [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
        export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
        export PATH="$JAVA_HOME/bin:$PATH"
        return 0
    fi
    
    # Check for Java 11+ via /usr/libexec/java_home
    if command -v /usr/libexec/java_home &> /dev/null; then
        JAVA_11_HOME=$(/usr/libexec/java_home -v 11 2>/dev/null || /usr/libexec/java_home -v 17 2>/dev/null || /usr/libexec/java_home -v 21 2>/dev/null)
        if [ -n "$JAVA_11_HOME" ]; then
            export JAVA_HOME="$JAVA_11_HOME"
            export PATH="$JAVA_HOME/bin:$PATH"
            return 0
        fi
    fi
    
    return 1
}

if ! check_java_version; then
    echo "⚠️  Java 11+ required (found Java 8 or older)"
    echo ""
    
    if find_java_home && check_java_version; then
        echo "✅ Using Java from: $JAVA_HOME"
        java -version
        echo ""
    else
        echo "❌ Java 11+ not found!"
        echo ""
        echo "Please install Java 11 or newer:"
        echo ""
        echo "Option 1: Install via Homebrew (recommended)"
        echo "  brew install --cask temurin"
        echo ""
        echo "Option 2: Install Android Studio (includes JDK)"
        echo "  Download from: https://developer.android.com/studio"
        echo "  Then run: ./rapk.sh"
        echo ""
        exit 1
    fi
else
    echo "✅ Java version OK: $(java -version 2>&1 | head -n 1)"
    echo ""
fi

# Check if Android SDK is available
if [ -z "$ANDROID_HOME" ]; then
    if [ -d "$HOME/Library/Android/sdk" ]; then
        export ANDROID_HOME="$HOME/Library/Android/sdk"
        export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools"
        echo "✅ Found Android SDK at $ANDROID_HOME"
    elif [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
        export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools"
        echo "✅ Found Android SDK at $ANDROID_HOME"
    else
        echo "❌ Android SDK not found."
        echo "   Please install Android Studio or set ANDROID_HOME"
        exit 1
    fi
fi

# Check for ADB
if ! command -v adb &> /dev/null; then
    if [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
        export PATH="$PATH:$ANDROID_HOME/platform-tools"
    else
        echo "❌ ADB not found. Please install Android SDK Platform Tools."
        exit 1
    fi
fi

echo "✅ ADB found: $(which adb)"
echo ""

# Check device connection
echo "🔍 Checking for connected devices..."
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')
UNAUTHORIZED=$(adb devices | grep "unauthorized" | wc -l | tr -d ' ')

if [ "$UNAUTHORIZED" -gt 0 ]; then
    echo "⚠️  Device detected but not authorized!"
    echo "   Please authorize USB debugging on your Galaxy S24"
    exit 1
fi

if [ "$DEVICES" -eq 0 ]; then
    echo "⚠️  No devices connected!"
    echo "   Run: ./pair-device.sh to connect your Galaxy S24"
    echo ""
    echo "Build will continue, but installation will be skipped."
    echo "Install manually later with: ./install-apk.sh"
    echo ""
    SKIP_INSTALL=true
else
    echo "✅ Galaxy S24 connected via ADB"
    adb devices
    echo ""
    SKIP_INSTALL=false
fi

# Navigate to android directory
cd android

# Clean previous builds
echo "🧹 Cleaning previous builds..."
./gradlew clean > /dev/null 2>&1 || echo "⚠️  Clean may have warnings (continuing...)"

echo ""
echo "🔨 Building Release APK..."
echo "   (This uses the same Gradle build system as Android Studio)"
echo ""

# Build release APK
./gradlew assembleRelease

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Build failed!"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check for build errors above"
    echo "  2. Ensure all dependencies are installed: npm install"
    echo "  3. Try opening in Android Studio: ./rapk.sh"
    exit 1
fi

echo ""
echo "✅ Build complete!"
echo ""

# Find the APK file
APK_PATH="app/build/outputs/apk/release/app-release.apk"
FULL_APK_PATH="$(pwd)/$APK_PATH"

if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK not found at: $APK_PATH"
    exit 1
fi

APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
echo "📱 APK Location: $FULL_APK_PATH"
echo "📊 APK Size: $APK_SIZE"
echo ""

# Install APK if device is connected
if [ "$SKIP_INSTALL" = false ]; then
    echo "📲 Installing APK on Galaxy S24..."
    adb install -r "$APK_PATH"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "=========================================="
        echo "  ✅ SUCCESS!"
        echo "=========================================="
        echo ""
        echo "🎉 DOTO app has been installed on your Galaxy S24!"
        echo ""
        echo "You can now:"
        echo "  - Launch the app from your phone"
        echo "  - View logs: adb logcat | grep DOTO"
        echo "  - Uninstall: adb uninstall com.doto.app"
        echo ""
    else
        echo ""
        echo "❌ Installation failed!"
        echo ""
        echo "Try manually:"
        echo "  adb install -r \"$FULL_APK_PATH\""
        exit 1
    fi
else
    echo "📱 APK ready for installation!"
    echo ""
    echo "To install later:"
    echo "  ./install-apk.sh"
    echo ""
    echo "Or manually:"
    echo "  adb install -r \"$FULL_APK_PATH\""
fi


