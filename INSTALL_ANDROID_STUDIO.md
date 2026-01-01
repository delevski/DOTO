# Install Android Studio - Quick Guide

## Current Status
- ✅ **75 files with changes** detected (will be included in build)
- ✅ **Galaxy S24 connected** via ADB
- ⚠️ **Android Studio**: Not installed
- ⚠️ **Java**: Version 8 (need 11+ for builds)

## Step 1: Install Android Studio

### Download & Install

1. **Download Android Studio**:
   - Visit: https://developer.android.com/studio
   - Click "Download Android Studio"
   - Choose macOS version
   - Download the `.dmg` file (~1GB)

2. **Install**:
   - Open the downloaded `.dmg` file
   - Drag "Android Studio" to Applications folder
   - Launch Android Studio from Applications

3. **First Launch Setup**:
   - Choose "Standard" installation
   - Accept license agreements
   - Android Studio will download:
     - Android SDK
     - Android SDK Platform Tools
     - Java 11+ (bundled JDK)
   - Wait for setup to complete (10-15 minutes)

## Step 2: Build Release APK

After Android Studio is installed:

1. **Run the build script**:
   ```bash
   ./rapk.sh
   ```

2. **Android Studio will open** with your project

3. **Wait for Gradle sync**:
   - Check bottom status bar: "Gradle sync finished"
   - This may take 5-10 minutes on first open

4. **Build Release APK**:
   - Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - Wait for build (5-10 minutes)
   - Notification: "APK(s) generated successfully"

## Step 3: Install on Galaxy S24

**Option A: Via Android Studio** (if device detected)
- Click green **Run** button (▶️)
- Or: **Run → Run 'app'**

**Option B: Via ADB** (recommended - device already connected)
```bash
./install-apk.sh
```

## What Gets Built

Your build will include all 75 files with changes:
- Modified files (LoginScreen.js, socialAuth.js, etc.)
- Translation updates
- Navigation changes
- All other modified files

## After Installation

Once Android Studio is installed, simply run:
```bash
./rapk.sh
```

This will:
1. ✅ Detect latest code changes
2. ✅ Verify Galaxy S24 connection
3. ✅ Open project in Android Studio
4. ✅ Provide build instructions
5. ✅ Offer ADB installation

## Troubleshooting

### Android Studio won't open
- Check Applications folder for Android Studio
- Try: Right-click → Open (first time may require this)

### Gradle sync fails
- Check internet connection
- Try: **File → Invalidate Caches / Restart**

### Build fails
- Check Build output window for errors
- Ensure: **File → Settings → Build → Gradle** is configured

## Quick Reference

- **Build script**: `./rapk.sh`
- **Install APK**: `./install-apk.sh`
- **Device status**: `adb devices`
- **Full guide**: `ANDROID_STUDIO_BUILD_COMPLETE.md`

---

**Next Step**: Install Android Studio from https://developer.android.com/studio



