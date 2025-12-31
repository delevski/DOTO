#!/bin/bash

# Fix App Crash - Rebuild with Proper Native Module Linking
# Fixes RNCDatePicker not found error

set -e

echo "=========================================="
echo "  Fix App Crash - Rebuild APK"
echo "  Fixing RNCDatePicker Native Module"
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

# Check and set Java 11+
check_java() {
    # First check Android Studio's Java
    AS_JAVA="/Users/corphd/Library/Caches/Google/AndroidStudio2025.2.1/tmp/patch-update/jre"
    if [ -d "$AS_JAVA" ] && [ -f "$AS_JAVA/bin/java" ]; then
        JAVA_VERSION_CHECK=$("$AS_JAVA/bin/java" -version 2>&1 | head -1 | grep -oE 'version "[0-9]+' | grep -oE '[0-9]+' || echo "0")
        JAVA_MAJOR=$(echo "$JAVA_VERSION_CHECK" | head -1)
        if [ "$JAVA_MAJOR" -ge 11 ]; then
            export JAVA_HOME="$AS_JAVA"
            export PATH="$JAVA_HOME/bin:$PATH"
            echo "✅ Found Java $JAVA_MAJOR at: $JAVA_HOME"
            "$JAVA_HOME/bin/java" -version 2>&1 | head -1
            return 0
        fi
    fi
    
    # Try to find Java 11+ via java_home
    if command -v /usr/libexec/java_home &> /dev/null; then
        # Try Java 11, 17, 21 in order
        for version in 11 17 21; do
            JAVA_HOME_CANDIDATE=$(/usr/libexec/java_home -v $version 2>/dev/null)
            if [ -n "$JAVA_HOME_CANDIDATE" ] && [ -f "$JAVA_HOME_CANDIDATE/bin/java" ]; then
                JAVA_VERSION_CHECK=$("$JAVA_HOME_CANDIDATE/bin/java" -version 2>&1 | head -1 | grep -oE 'version "[0-9]+' | grep -oE '[0-9]+' || echo "0")
                JAVA_MAJOR=$(echo "$JAVA_VERSION_CHECK" | head -1)
                if [ "$JAVA_MAJOR" -ge 11 ]; then
                    export JAVA_HOME="$JAVA_HOME_CANDIDATE"
                    export PATH="$JAVA_HOME/bin:$PATH"
                    echo "✅ Found Java $JAVA_MAJOR at: $JAVA_HOME"
                    "$JAVA_HOME/bin/java" -version 2>&1 | head -1
                    return 0
                fi
            fi
        done
    fi
    
    # Check current java command
    if command -v java &> /dev/null; then
        JAVA_VERSION=$(java -version 2>&1 | head -1 | grep -oE 'version "[0-9]+' | grep -oE '[0-9]+' || echo "8")
        JAVA_MAJOR=$(echo "$JAVA_VERSION" | head -1)
        if [ "$JAVA_MAJOR" -ge 11 ]; then
            export JAVA_HOME=$(/usr/libexec/java_home 2>/dev/null || echo "")
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
    echo "Or set JAVA_HOME to point to Java 11+:"
    echo "  export JAVA_HOME=\$(/usr/libexec/java_home -v 11)"
    exit 1
fi

echo ""

# Step 1: Clean everything
echo "🧹 Step 1: Cleaning ALL builds and caches..."
cd "$ANDROID_DIR"
# Stop all Gradle daemons to ensure they use the correct Java
./gradlew --stop 2>/dev/null || true
sleep 2
# Ensure Gradle uses the correct Java version
export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"
# Set Java home in gradle.properties
grep -q "org.gradle.java.home" gradle.properties && sed -i '' "s|org.gradle.java.home=.*|org.gradle.java.home=$JAVA_HOME|" gradle.properties || echo "org.gradle.java.home=$JAVA_HOME" >> gradle.properties
./gradlew clean -Dorg.gradle.java.home="$JAVA_HOME"
rm -rf app/build/*
rm -rf .gradle
rm -rf build
cd "$SCRIPT_DIR"
rm -rf android/app/src/main/assets/*
echo "✅ Clean complete"
echo ""

# Step 2: Reinstall node modules (ensure native modules are properly installed)
echo "📦 Step 2: Ensuring native modules are properly installed..."
npm install --legacy-peer-deps
echo "✅ Node modules installed"
echo ""

# Step 3: Export JavaScript bundle
echo "📦 Step 3: Exporting latest JavaScript bundle..."
mkdir -p "$ANDROID_DIR/app/src/main/assets"
npx expo export --platform android --output-dir "$ANDROID_DIR/app/src/main/assets" --clear
echo "✅ JavaScript bundle exported"
echo ""

# Step 4: Clean Android build again
echo "🧹 Step 4: Cleaning Android build..."
cd "$ANDROID_DIR"
export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"
./gradlew clean -Dorg.gradle.java.home="$JAVA_HOME"
echo "✅ Clean complete"
echo ""

# Step 5: Build release APK (this will properly link native modules)
echo "🔨 Step 5: Building Release APK with native module linking..."
echo "   (This will take 5-10 minutes)"
echo ""
# Ensure Gradle uses the correct Java
export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"
./gradlew assembleRelease -Dorg.gradle.java.home="$JAVA_HOME"

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

# Step 6: Uninstall old version
echo "🗑️  Step 6: Uninstalling old version..."
adb -s 192.168.1.126:37633 uninstall com.doto.app 2>/dev/null || echo "   (No old version found)"
echo ""

# Step 7: Install new APK
echo "📲 Step 7: Installing fixed APK on Galaxy S24..."
adb -s 192.168.1.126:37633 install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "  ✅ SUCCESS!"
    echo "=========================================="
    echo ""
    echo "🎉 Fixed APK installed!"
    echo ""
    echo "This build includes:"
    echo "   ✅ Properly linked native modules (RNCDatePicker)"
    echo "   ✅ Latest JavaScript bundle"
    echo "   ✅ All latest code changes"
    echo ""
    echo "Launching app..."
    adb -s 192.168.1.126:37633 shell am start -n com.doto.app/.MainActivity
    echo ""
    echo "✅ App launched!"
    echo ""
    echo "The crash should now be fixed!"
else
    echo ""
    echo "❌ Installation failed"
    exit 1
fi


