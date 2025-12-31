# Build Release APK for Galaxy S24

## Method 1: Using Android Studio (Recommended)

### Prerequisites
1. Android Studio installed and opened
2. Galaxy S24 connected via USB with USB debugging enabled
3. Project synced in Android Studio

### Steps

1. **Open Project in Android Studio**
   - Open Android Studio
   - Click "Open" and navigate to: `/Users/corphd/Desktop/Or codes projects/DOTO/android`
   - Wait for Gradle sync to complete

2. **Build JavaScript Bundle** (if not already done)
   ```bash
   cd "/Users/corphd/Desktop/Or codes projects/DOTO"
   npx expo export --platform android --output-dir android/app/src/main/assets/ --clear
   ```

3. **Build Release APK in Android Studio**
   - In Android Studio, go to: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
   - Wait for build to complete (may take 5-10 minutes)
   - When done, click "locate" in the notification, or navigate to:
     `android/app/build/outputs/apk/release/app-release.apk`

4. **Install on Galaxy S24**
   - Make sure your phone is connected via USB
   - Enable USB debugging (Settings → Developer Options → USB Debugging)
   - In terminal, run:
     ```bash
     adb install -r android/app/build/outputs/apk/release/app-release.apk
     ```
   - Or drag and drop the APK file to your phone and install manually

## Method 2: Using Command Line Script

### Quick Build & Install

```bash
cd "/Users/corphd/Desktop/Or codes projects/DOTO"
./build-and-install-apk.sh
```

This script will:
1. Build the JavaScript bundle
2. Build the release APK
3. Install it on your connected Galaxy S24

### Manual Command Line Build

```bash
# Set environment
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"

# Build JS bundle
cd "/Users/corphd/Desktop/Or codes projects/DOTO"
npx expo export --platform android --output-dir android/app/src/main/assets/ --clear

# Build APK
cd android
./gradlew clean assembleRelease

# Install on device
adb install -r app/build/outputs/apk/release/app-release.apk
```

## Troubleshooting

### Build Fails with CMake/Native Errors
- Try building in Android Studio GUI instead (handles native builds better)
- Or ensure NDK is installed: Android Studio → SDK Manager → SDK Tools → NDK

### Device Not Detected
```bash
# Check connected devices
adb devices

# If empty, try:
adb kill-server
adb start-server
adb devices
```

### APK Installation Fails
- Make sure USB debugging is enabled
- Try: `adb install -r -d app-release.apk` (with -d flag for downgrade)
- Or transfer APK to phone and install manually

## What's New in This Build

This release includes:
- ✅ Updated badge icons matching web app
- ✅ Badge translations (English & Hebrew)
- ✅ Profile sync between mobile and web
- ✅ Fixed like/vote icon indication
- ✅ All missing translation keys added

## APK Location

After successful build, find your APK at:
```
/Users/corphd/Desktop/Or codes projects/DOTO/android/app/build/outputs/apk/release/app-release.apk
```

