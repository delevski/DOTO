# DOTO Mobile App

A React Native mobile application for the DOTO (Do One Thing Others) community platform.

## 📱 Features

- **Authentication**: Email/password login with 6-digit verification code
- **Feed**: Browse nearby tasks, your posts, and your claims
- **Post Creation**: Create new help requests with photos and location
- **Claiming System**: Request to help on tasks and manage approvals
- **Real-time Messaging**: Direct chat between users
- **Profile Management**: View stats, edit profile, and settings

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for builds): `npm install -g eas-cli`
- Xcode (for iOS development on Mac)
- Android Studio (for Android development)

### Installation

1. **Install dependencies:**
   ```bash
   cd DOTO
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   # or
   expo start
   ```

3. **Run on device/simulator:**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on your phone

## 📂 Project Structure

```
src/
├── context/
│   └── AuthContext.js       # Authentication state management
├── lib/
│   └── instant.js           # InstantDB configuration
├── navigation/
│   └── AppNavigator.js      # Navigation setup with tabs
├── screens/
│   ├── LoginScreen.js       # Login with verification
│   ├── RegisterScreen.js    # User registration
│   ├── ForgotPasswordScreen.js
│   ├── FeedScreen.js        # Main feed with posts
│   ├── PostDetailsScreen.js # Single post view
│   ├── CreatePostScreen.js  # Create new post
│   ├── MessagesScreen.js    # Conversations list
│   ├── ChatScreen.js        # Individual chat
│   └── ProfileScreen.js     # User profile
├── styles/
│   └── theme.js             # Colors, typography, spacing
└── utils/
    ├── messaging.js         # Chat utilities
    ├── password.js          # Auth helpers
    └── translations.js      # i18n (English/Hebrew)
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Optional: Google OAuth
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# Optional: Facebook OAuth
EXPO_PUBLIC_FACEBOOK_APP_ID=your-facebook-app-id
```

### InstantDB

The app uses InstantDB for real-time data. The App ID is configured in `src/lib/instant.js`.

## 🏗️ Building for Production

### Setup EAS Build

1. **Login to Expo:**
   ```bash
   eas login
   ```

2. **Configure your project:**
   ```bash
   eas build:configure
   ```

3. **Update `app.json`:**
   - Replace `com.doto.app` with your bundle identifier
   - Update owner and project IDs

### Build Commands

```bash
# Development build (with dev client)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (internal testing)
eas build --profile preview --platform android  # Creates APK

# Production build
eas build --profile production --platform ios
eas build --profile production --platform android
```

## 📤 Publishing to App Stores

### Google Play Store

1. **Create developer account** ($25 one-time fee)
2. **Generate service account key** for automated submissions
3. **Run:**
   ```bash
   eas submit --platform android
   ```

### Apple App Store

1. **Join Apple Developer Program** ($99/year)
2. **Configure App Store Connect**
3. **Run:**
   ```bash
   eas submit --platform ios
   ```

## 🎨 Design System

### Colors
- Primary: `#DC2626` (Red-600)
- Gradient: `#DC2626` → `#F43F5E` (Rose-500)
- Background: `#F9FAFB` (Gray-50)
- Card: `#FFFFFF`

### Typography
- H1: 32px, 800 weight
- H2: 24px, 700 weight
- Body: 16px, 400 weight
- Small: 14px, 400 weight

### Spacing Scale
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

## 🔒 Permissions

The app requests the following permissions:

**iOS:**
- Camera (for taking photos)
- Photo Library (for selecting photos)
- Location (for nearby tasks)

**Android:**
- CAMERA
- READ_EXTERNAL_STORAGE
- WRITE_EXTERNAL_STORAGE
- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- INTERNET

## 📊 Database Schema

The app shares the same InstantDB database as the web app:

- **users**: User profiles and authentication
- **posts**: Task/help requests
- **comments**: Post comments
- **conversations**: Chat threads
- **messages**: Individual chat messages

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler stuck:**
   ```bash
   expo start --clear
   ```

2. **iOS build fails:**
   - Ensure Xcode is updated
   - Run `pod install` in ios folder

3. **Android emulator not detected:**
   - Ensure Android Studio's platform-tools is in PATH
   - Check ANDROID_HOME environment variable

### Debug Mode

To enable React Native debugger:
- Shake device or press `d` in terminal
- Select "Debug Remote JS"

## 📝 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

---

Built with ❤️ using React Native + Expo + InstantDB

