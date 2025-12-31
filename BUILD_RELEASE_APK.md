# Building Release APK for Galaxy S24

This guide will help you build a release APK with the latest changes and install it on your Galaxy S24 (G-24).

## Prerequisites

1. **Android Studio** installed and configured
2. **Android SDK** installed (via Android Studio)
3. **USB Debugging** enabled on your Galaxy S24:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times to enable Developer Options
   - Go to Settings → Developer Options
   - Enable "USB Debugging"
4. **USB Cable** to connect your phone to your Mac

## Method 1: Using Android Studio (Recommended)

### Step 1: Open Project in Android Studio

1. Open **Android Studio**
2. Click **File → Open**
3. Navigate to your project: `/Users/corphd/Desktop/Or codes projects/DOTO/android`
4. Click **OK** and wait for Gradle sync to complete

### Step 2: Connect Your Galaxy S24

1. Connect your Galaxy S24 to your Mac via USB
2. On your phone, when prompted, tap **"Allow USB Debugging"** and check **"Always allow from this computer"**
3. In Android Studio, you should see your device in the device dropdown (top toolbar)

### Step 3: Build Release APK

1. In Android Studio, go to **Build → Generate Signed Bundle / APK**
2. Select **APK** and click **Next**
3. For now, we'll use the debug keystore (already configured):
   - **Key store path**: `android/app/debug.keystore`
   - **Key store password**: `android`
   - **Key alias**: `androiddebugkey`
   - **Key password**: `android`
4. Click **Next**
5. Select **release** build variant
6. Click **Finish**
7. Wait for the build to complete (this may take 5-10 minutes)

### Step 4: Install APK

**Option A: Via Android Studio**
1. After build completes, Android Studio will show a notification
2. Click **locate** to find the APK
3. The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

**Option B: Via ADB (Command Line)**
```bash
cd "/Users/corphd/Desktop/Or codes projects/DOTO"
adb devices  # Verify your device is connected
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

**Option C: Manual Transfer**
1. Copy the APK to your phone (via USB, email, or cloud storage)
2. On your phone, open the APK file
3. If prompted, enable "Install from Unknown Sources"
4. Tap **Install**

## Method 2: Using Command Line Script

1. Make the script executable:
```bash
chmod +x build-release-apk.sh
```

2. Run the script:
```bash
./build-release-apk.sh
```

The script will:
- Clean previous builds
- Build the release APK
- Automatically detect your connected device
- Offer to install the APK directly

## Method 3: Using Gradle Directly

```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

Then install via ADB:
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## Troubleshooting

### "Device not found" or ADB issues

1. **Check USB connection:**
   ```bash
   adb devices
   ```
   Should show your device. If not:
   - Unplug and replug USB cable
   - On phone: Revoke USB debugging authorizations in Developer Options, then reconnect

2. **Check USB mode:**
   - On your phone, when connected, select **"File Transfer"** or **"MTP"** mode (not "Charging only")

3. **Restart ADB:**
   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

### Build Errors

1. **Clean and rebuild:**
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   ```

2. **Check Android SDK:**
   - Open Android Studio → SDK Manager
   - Ensure Android SDK Platform 34+ is installed
   - Ensure Android SDK Build-Tools is installed

3. **Invalidate caches in Android Studio:**
   - File → Invalidate Caches → Invalidate and Restart

### Installation Errors

1. **"App not installed" error:**
   - Uninstall any previous version of DOTO from your phone first
   - Then install the new APK

2. **"Unknown sources" error:**
   - Go to Settings → Apps → Special Access → Install Unknown Apps
   - Enable for your file manager or browser

## Verifying Installation

After installation:
1. Open the DOTO app on your Galaxy S24
2. Check that the new features are present:
   - Notifications screen
   - Notification badge in Feed
   - Language switching improvements
3. Test language switching (English ↔ Hebrew) to verify fixes

## APK Location

The release APK will be located at:
```
/Users/corphd/Desktop/Or codes projects/DOTO/android/app/build/outputs/apk/release/app-release.apk
```

## Notes

- The current build uses the debug keystore for signing (fine for testing)
- For production, you'll need to create a proper release keystore
- The APK size should be around 30-50 MB
- First launch may take longer as the app initializes

## Quick Commands Reference

```bash
# Check connected devices
adb devices

# Install APK
adb install -r android/app/build/outputs/apk/release/app-release.apk

# Uninstall app (if needed)
adb uninstall com.doto.app

# View logs
adb logcat | grep -i doto

# Reboot device
adb reboot
```

