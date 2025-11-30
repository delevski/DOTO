# DOTO - Location-Based Help App

A React Native mobile application for connecting people who need help with "angels" who can provide assistance. Built with Expo and React Navigation.

## Features

- **Authentication**: Login, Registration, and Password Recovery
- **Map View**: Interactive map showing available posts and users
- **Post Creation**: Create help requests with location, details, and timing
- **Post Claiming**: View and claim available help requests
- **User Profile**: View ratings, badges, and manage account
- **Search**: Search for locations and posts

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac) or Android Emulator

### Installation

1. Install dependencies:
```bash
npm install
```

2. For iOS (Mac only):
```bash
cd ios && pod install && cd ..
```

3. Start the development server:
```bash
npm start
```

4. Run on your preferred platform:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your device

## Project Structure

```
DOTO/
├── App.js                 # Main app entry point
├── src/
│   ├── navigation/        # Navigation configuration
│   ├── screens/           # Screen components
│   ├── components/        # Reusable components
│   └── styles/           # Theme and styling
└── package.json
```

## Screens

- **LoginScreen**: User authentication
- **RegisterScreen**: New user registration
- **ForgotPasswordScreen**: Password recovery
- **MapScreen**: Main map view with posts
- **PostCreateScreen**: Create new help request
- **PostClaimScreen**: View and claim posts
- **ProfileScreen**: User profile and settings
- **SearchScreen**: Search locations and posts

## Technologies Used

- React Native
- Expo
- React Navigation
- React Native Maps
- Expo Location
- Expo Linear Gradient
- Expo Vector Icons

## Design

The app features a dark theme with red accent colors, matching the original DUTO design. All screens are optimized for mobile devices with smooth navigation and intuitive user interface.

## License

Private project


