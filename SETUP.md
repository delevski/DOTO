# Quick Setup Guide

## Installation Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **For iOS (Mac only):**
   ```bash
   cd ios && pod install && cd ..
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run the app:**
   - Press `i` to open iOS Simulator
   - Press `a` to open Android Emulator
   - Scan QR code with Expo Go app on your physical device

## Notes

- Make sure you have Node.js installed (v14 or higher)
- For iOS development, you need Xcode installed (Mac only)
- For Android development, you need Android Studio installed
- The app uses Expo, so you can also test on physical devices using the Expo Go app

## Troubleshooting

- If you encounter issues with `react-native-maps`, make sure you've installed pods for iOS
- If navigation doesn't work, ensure all dependencies are installed correctly
- Clear cache: `expo start -c`


