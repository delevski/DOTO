# Build Release APK with Android Studio - Galaxy S24

## ✅ Current Status
- **Device**: Galaxy S24 is connected via ADB ✅
- **Android SDK**: Found at `/Users/corphd/Library/Android/sdk` ✅
- **Android Studio**: Not installed (needs installation)

## Step-by-Step Guide

### Step 1: Install Android Studio

1. **Download Android Studio**:
   - Visit: https://developer.android.com/studio
   - Download for macOS
   - Run the installer

2. **First Launch Setup**:
   - Open Android Studio
   - Complete the setup wizard
   - Install Android SDK components when prompted
   - Android Studio includes Java 11+ automatically

### Step 2: Open Project in Android Studio

1. **Open the Project**:
   - Launch Android Studio
   - Click: **File → Open**
   - Navigate to: `/Users/corphd/Desktop/Or codes projects/DOTO/android`
   - Click **Open**

2. **Wait for Gradle Sync**:
   - Android Studio will automatically sync Gradle
   - Check bottom status bar: "Gradle sync finished"
   - This may take a few minutes on first open

### Step 3: Build Release APK

1. **Build the APK**:
   - Click: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - Wait for build to complete
   - You'll see a notification: "APK(s) generated successfully"

2. **Locate the APK**:
   - Click "locate" in the notification, or
   - Navigate to: `android/app/build/outputs/apk/release/app-release.apk`

### Step 4: Install on Galaxy S24

**Option A: Install via Android Studio (if device detected)**

1. **Check Device Detection**:
   - Look at top toolbar for device selector
   - Your Galaxy S24 should appear if connected

2. **Run the App**:
   - Click the green **Run** button (▶️), or
   - Press `Ctrl+R` (or `Cmd+R` on Mac)
   - Android Studio will install and launch the app

**Option B: Install via ADB (if Android Studio doesn't detect device)**

Since your device is already connected via ADB, you can install directly:

```bash
cd "/Users/corphd/Desktop/Or codes projects/DOTO"
./install-apk.sh
```

Or manually:
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## Quick Script

After installing Android Studio, run:
```bash
./rapk-android-studio.sh
```

This will:
1. Open the project in Android Studio
2. Provide build instructions
3. Offer ADB installation if needed

## Troubleshooting

### Android Studio doesn't detect device
- Ensure USB Debugging is enabled on Galaxy S24
- Check: Settings → Developer Options → USB Debugging
- Try: `adb devices` in terminal to verify connection
- Use ADB installation method (Option B above)

### Build fails
- Check for error messages in Build output window
- Ensure all dependencies are installed: `npm install`
- Try: **File → Invalidate Caches / Restart**

### Gradle sync fails
- Check internet connection (Gradle downloads dependencies)
- Try: **File → Sync Project with Gradle Files**
- Check: **File → Settings → Build → Gradle** for correct settings

## Alternative: Build via Command Line

If you prefer command line (uses same Gradle system as Android Studio):

1. Install Java 11+:
   ```bash
   brew install --cask temurin
   ```

2. Build and install:
   ```bash
   ./rapk.sh
   ```

This uses the exact same Gradle build system that Android Studio uses.


