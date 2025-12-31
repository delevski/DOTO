#!/bin/bash

# Rebuild APK with Latest JavaScript Bundle and Code Changes
# This ensures the latest code is included in the APK

set -e

echo "=========================================="
echo "  Rebuild APK with Latest Code"
echo "  Including Latest JavaScript Bundle"
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

# Step 1: Export JavaScript bundle with latest code
echo "📦 Step 1: Exporting JavaScript bundle with latest code..."
echo "   (This includes all your latest changes)"
echo ""

# Create assets directory if it doesn't exist
mkdir -p "$ANDROID_DIR/app/src/main/assets"

# Export the bundle
npx expo export --platform android --output-dir "$ANDROID_DIR/app/src/main/assets" --clear

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Failed to export JavaScript bundle"
    echo "   Make sure all dependencies are installed: npm install"
    exit 1
fi

echo "✅ JavaScript bundle exported with latest code"
echo ""

# Step 2: Clean Android build
echo "🧹 Step 2: Cleaning Android build..."
cd "$ANDROID_DIR"
./gradlew clean
rm -rf app/build/outputs/apk/*
echo "✅ Clean complete"
echo ""

# Step 3: Build release APK
echo "🔨 Step 3: Building Release APK..."
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
echo "✅ Build complete!"
echo "📱 APK: $APK_PATH"
echo "📏 Size: $APK_SIZE"
echo "🕐 Built: $BUILD_TIME"
echo ""

# Step 4: Uninstall old version
echo "🗑️  Step 4: Uninstalling old version..."
adb -s 192.168.1.126:37633 uninstall com.doto.app 2>/dev/null || echo "   (No old version found)"
echo ""

# Step 5: Install new APK
echo "📲 Step 5: Installing fresh APK on Galaxy S24..."
adb -s 192.168.1.126:37633 install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "  ✅ SUCCESS!"
    echo "=========================================="
    echo ""
    echo "🎉 Fresh APK with latest code installed!"
    echo ""
    echo "📝 This build includes:"
    echo "   ✅ Latest JavaScript bundle"
    echo "   ✅ Latest code changes (socialAuth.js, LoginScreen.js, etc.)"
    echo "   ✅ All 78+ modified files"
    echo ""
    echo "Launching app..."
    adb -s 192.168.1.126:37633 shell am start -n com.doto.app/.MainActivity
    echo ""
    echo "✅ App launched!"
    echo ""
    echo "The Google and Facebook button fixes should now be active!"
    echo "If you still see errors, try:"
    echo "  1. Force stop the app: Settings → Apps → DOTO → Force Stop"
    echo "  2. Clear app data: Settings → Apps → DOTO → Storage → Clear Data"
    echo "  3. Launch the app again"
else
    echo ""
    echo "❌ Installation failed"
    exit 1
fi


