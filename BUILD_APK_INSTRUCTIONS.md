# Build Release APK for Galaxy S24

## Current Issue
The build requires **Java 11 or newer**, but your system currently has Java 8.

## Solution Options

### Option 1: Install Java 11+ via Homebrew (Recommended)
```bash
brew install --cask temurin
```

After installation, run:
```bash
./rapk.sh
```

### Option 2: Use Android Studio (Easiest)
Android Studio includes Java 11+ and handles builds automatically:

1. **Install Android Studio** (if not already installed):
   - Download from: https://developer.android.com/studio
   - Install and open Android Studio

2. **Open the project**:
   - File → Open → Navigate to this project's `android` folder
   - Wait for Gradle sync to complete

3. **Build Release APK**:
   - Build → Build Bundle(s) / APK(s) → Build APK(s)
   - Wait for build to complete
   - APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

4. **Install via ADB** (device already connected):
   ```bash
   ./install-apk.sh
   ```

   Or manually:
   ```bash
   adb install -r android/app/build/outputs/apk/release/app-release.apk
   ```

### Option 3: Manual Java Installation
1. Download Java 11+ from: https://adoptium.net/
2. Install the JDK
3. Set JAVA_HOME:
   ```bash
   export JAVA_HOME=$(/usr/libexec/java_home -v 11)
   ```
4. Run: `./rapk.sh`

## Quick Commands

**Check Java version:**
```bash
java -version
```

**Check connected devices:**
```bash
adb devices
```

**Pair device (if not connected):**
```bash
./pair-device.sh
```

**Build and install (after Java 11+ is installed):**
```bash
./rapk.sh
```

## Current Device Status
✅ Your Galaxy S24 is already connected via ADB!

Once Java 11+ is installed, the build will work automatically.


