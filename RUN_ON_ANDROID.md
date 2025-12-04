# Running DOTO Mobile App on Android Pixel 9 Emulator

## Quick Start

### Option 1: Using the Script (Recommended)
```bash
./start-android-emulator.sh
```

### Option 2: Manual Start
```bash
# Make sure emulator is running first
expo start --android
```

## Prerequisites

1. **Android Emulator Running**
   - Pixel 9 emulator should be running
   - Check with: `adb devices`

2. **Expo CLI Installed**
   ```bash
   npm install -g expo-cli
   ```

## Step-by-Step Instructions

### 1. Start Pixel 9 Emulator

If not already running:
```bash
# List available emulators
~/Library/Android/sdk/emulator/emulator -list-avds

# Start Pixel 9 emulator
~/Library/Android/sdk/emulator/emulator -avd Pixel_9 -netdelay none -netspeed full
```

### 2. Verify Emulator is Connected

```bash
adb devices
```

You should see:
```
List of devices attached
emulator-5554    device
```

### 3. Start Expo with Android

```bash
cd /Users/corphd/Desktop/Or\ codes\ projects/DOTO
expo start --android
```

### 4. App Will Launch Automatically

- Expo will detect the Android emulator
- Metro bundler will start
- The app will automatically launch on the emulator
- Hot reload will be enabled

## What Happens

1. **Expo starts Metro bundler** (JavaScript bundler)
2. **Connects to Android emulator** automatically
3. **Launches DOTO app** on the emulator
4. **Enables hot reload** - changes reflect immediately

## Access URLs

- **Metro Bundler**: http://localhost:8081
- **Expo DevTools**: http://localhost:19002
- **QR Code**: Shown in terminal (for physical devices)

## Troubleshooting

### Emulator Not Detected

```bash
# Check if emulator is running
adb devices

# Restart ADB server
adb kill-server
adb start-server

# Check emulator again
adb devices
```

### App Not Launching

```bash
# Manually launch the app
adb shell am start -n host.exp.exponent/.experience.HomeActivity

# Or restart Expo
expo start --android --clear
```

### Metro Bundler Issues

```bash
# Clear Metro cache
expo start --android --clear

# Or reset cache completely
npx react-native start --reset-cache
```

### Port Already in Use

```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9

# Kill process on port 19000
lsof -ti:19000 | xargs kill -9
```

### App Crashes on Launch

1. Check logs:
   ```bash
   adb logcat | grep -i "reactnative\|expo"
   ```

2. Clear app data:
   ```bash
   adb shell pm clear host.exp.exponent
   ```

3. Reinstall app:
   ```bash
   expo start --android --clear
   ```

## Development Workflow

1. **Start emulator** (if not running)
2. **Start Expo**: `expo start --android`
3. **Make code changes** in `src/` directory
4. **See changes instantly** on emulator (hot reload)
5. **Press `r` in Expo terminal** to reload manually
6. **Press `m` in Expo terminal** to toggle menu

## Useful Commands

```bash
# Start with Android (auto-launch)
expo start --android

# Start with Android (clear cache)
expo start --android --clear

# Start and open DevTools
expo start --android --devtools

# Take screenshot of emulator
adb exec-out screencap -p > screenshot.png

# View app logs
adb logcat | grep -i "doto\|expo"

# Restart app on emulator
adb shell am force-stop host.exp.exponent
adb shell am start -n host.exp.exponent/.experience.HomeActivity
```

## Environment Variables

Expo automatically reads `.env.local` file if it exists in the project root:

```env
EXPO_PUBLIC_INSTANTDB_APP_ID=your-app-id
```

## Current Status

- ✅ Pixel 9 emulator: Running
- ✅ DOTO app: Installed
- ✅ Ready for development

## Next Steps

1. Open your code editor
2. Make changes to files in `src/`
3. See changes appear on emulator automatically
4. Use Expo DevTools for debugging

