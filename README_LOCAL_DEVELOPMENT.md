# Running DOTO Locally

## Quick Start

### Option 1: Start Both Apps Together (Recommended)

```bash
./start-both.sh
```

This will start both the web app and mobile app simultaneously.

### Option 2: Start Apps Separately

#### Web App
```bash
cd webapp
npm run dev
```
Web app will be available at: **http://localhost:5173**

#### Mobile App (Expo)
```bash
npm start
# or
npm run start:local  # with .env.local file
```

Then:
- Press `a` to open in Android emulator
- Press `i` to open in iOS simulator
- Scan QR code with Expo Go app on your phone

## Access URLs

### Web App
- **Local**: http://localhost:5173
- **Network**: Check terminal output for network URL

### Mobile App (Expo)
- **Metro Bundler**: http://localhost:8081
- **Expo DevTools**: http://localhost:19002
- **QR Code**: Shown in terminal

## Viewing Logs

### Web App Logs
```bash
tail -f /tmp/webapp.log
# or
tail -f /tmp/doto-webapp.log
```

### Mobile App Logs
```bash
tail -f /tmp/mobile-app.log
# or
tail -f /tmp/doto-mobile.log
```

## Stopping Services

### Stop Both Apps
```bash
pkill -f 'vite|expo'
```

### Stop Web App Only
```bash
pkill -f vite
```

### Stop Mobile App Only
```bash
pkill -f expo
```

## Troubleshooting

### Port Already in Use

If you get a "port already in use" error:

**Web App (port 5173):**
```bash
lsof -ti:5173 | xargs kill -9
```

**Mobile App (ports 8081, 19000, 19001):**
```bash
lsof -ti:8081 | xargs kill -9
lsof -ti:19000 | xargs kill -9
lsof -ti:19001 | xargs kill -9
```

### Check What's Running
```bash
# Check web app
lsof -i:5173

# Check mobile app
lsof -i:8081
lsof -i:19000
lsof -i:19001
```

### Clear Expo Cache
```bash
expo start -c
```

### Clear Metro Bundler Cache
```bash
npx react-native start --reset-cache
```

## Environment Variables

### Web App
Create `.env.local` in `webapp/` directory:
```env
VITE_INSTANTDB_APP_ID=your-app-id
```

### Mobile App
Create `.env.local` in root directory:
```env
EXPO_PUBLIC_INSTANTDB_APP_ID=your-app-id
```

## Development Tips

1. **Hot Reload**: Both apps support hot reload - changes will reflect automatically
2. **Network Access**: Use your computer's IP address to access from mobile device on same network
3. **Debugging**: 
   - Web: Use browser DevTools
   - Mobile: Use React Native Debugger or Expo DevTools
4. **Testing**: Run tests while apps are running in separate terminals

## Common Commands

```bash
# Start web app with local env
cd webapp && npm run dev:local

# Start mobile app with local env
npm run start:local

# Start mobile app on Android
npm run android:local

# Start mobile app on iOS
npm run ios:local

# Run tests (web app)
cd webapp && npm test

# Run comprehensive mobile tests
bash test-mobile-comprehensive.sh
```

## File Structure

```
DOTO/
├── webapp/          # Web application
│   ├── src/         # Source code
│   └── package.json
├── src/             # Mobile app source code
├── package.json     # Mobile app package.json
├── start-both.sh    # Script to start both apps
└── .env.local       # Mobile app environment variables
```

