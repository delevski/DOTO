# Build Release APK with Android Studio - Complete Guide

## ✅ Current Status
- **Code Changes**: 70 files with changes detected ✅
- **Device**: Galaxy S24 connected via ADB ✅
- **Android Studio**: Not installed (needs installation)

## Step-by-Step: Build & Install with Android Studio

### Step 1: Install Android Studio

1. **Download Android Studio**:
   - Visit: https://developer.android.com/studio
   - Download for macOS
   - Run the installer

2. **First Launch**:
   - Open Android Studio
   - Complete setup wizard
   - Install Android SDK components when prompted
   - Android Studio includes Java 11+ automatically

### Step 2: Open Project in Android Studio

1. **Launch Android Studio**

2. **Open the Project**:
   - Click: **File → Open**
   - Navigate to: `/Users/corphd/Desktop/Or codes projects/DOTO/android`
   - Click **Open**

3. **Wait for Gradle Sync**:
   - Android Studio will automatically sync Gradle
   - Check bottom status bar: "Gradle sync finished"
   - This may take 5-10 minutes on first open

### Step 3: Build Release APK

1. **Build the APK**:
   - Click: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - Wait for build to complete (5-10 minutes)
   - You'll see notification: "APK(s) generated successfully"

2. **APK Location**:
   - Click "locate" in notification, or
   - Navigate to: `android/app/build/outputs/apk/release/app-release.apk`

### Step 4: Install on Galaxy S24

**Option A: Install via Android Studio** (if device detected)

1. **Check Device Detection**:
   - Look at top toolbar for device selector dropdown
   - Your Galaxy S24 should appear if connected

2. **Run the App**:
   - Click green **Run** button (▶️), or
   - Press `Ctrl+R` (or `Cmd+R` on Mac), or
   - Menu: **Run → Run 'app'**
   - Android Studio will install and launch the app

**Option B: Install via ADB** (recommended - device already connected)

Since your Galaxy S24 is already connected via ADB:

```bash
cd "/Users/corphd/Desktop/Or codes projects/DOTO"
./install-apk.sh
```

Or manually:
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## Quick Script Workflow

After installing Android Studio:

```bash
./rapk.sh
```

This will:
1. ✅ Check for latest code changes (70 files detected)
2. ✅ Verify Galaxy S24 connection
3. ✅ Open project in Android Studio
4. ✅ Provide build instructions
5. ✅ Offer ADB installation after build

## What Gets Built

The build will include all your latest code changes:
- ✅ Modified files (LoginScreen.js, socialAuth.js, etc.)
- ✅ Translation updates (en.json, he.json)
- ✅ Navigation changes (AppNavigator.js)
- ✅ All other modified files

## Troubleshooting

### Android Studio doesn't detect Galaxy S24

Your device is already connected via ADB, so:

1. **Check Android Studio Device List**:
   - View → Tool Windows → Device Manager
   - Your Galaxy S24 should appear

2. **If not detected**:
   - Use ADB installation method (Option B above)
   - Or restart ADB: `./reset-adb.sh`

### Build fails

1. Check Build output window for errors
2. Ensure all dependencies: `npm install`
3. Try: **File → Invalidate Caches / Restart**

### Gradle sync fails

1. Check internet connection
2. Try: **File → Sync Project with Gradle Files**
3. Check: **File → Settings → Build → Gradle**

## Alternative: Command Line Build

If you prefer command line (uses same Gradle system):

1. Install Java 11+:
   ```bash
   brew install --cask temurin
   ```

2. Build and install:
   ```bash
   ./rapk-gradle.sh
   ```

This uses the exact same Gradle build system Android Studio uses.

## Next Steps

1. **Install Android Studio**: https://developer.android.com/studio
2. **Run**: `./rapk.sh`
3. **Follow build instructions** in Android Studio
4. **Install**: Use `./install-apk.sh` or Android Studio Run button

Your Galaxy S24 is ready and waiting! 🚀



