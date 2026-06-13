# How to Build the World Chat APK

This guide explains how to compile the World Chat app into an Android APK using Capacitor.

## Prerequisites

1. **Node.js 18+** installed
2. **Android Studio** installed (download from https://developer.android.com/studio)
3. **Java JDK 17** installed
4. **Android SDK** (installed via Android Studio)

## Step-by-Step Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Build the Web App

```bash
npm run build
```

This creates the `dist/` folder with the production build.

### 3. Initialize Capacitor (first time only)

```bash
npx cap init "World Chat" com.worldchat.app --web-dir dist
npx cap add android
```

### 4. Configure Your Backend URL

Before building for mobile, edit `frontend/src/services/api.js`:

```javascript
// Replace 'YOUR-SERVER-URL.com' with your actual deployed backend URL
// Examples:
// - 'https://worldchat-api.herokuapp.com/api'
// - 'https://your-server.com/api'
// - 'http://192.168.1.100:3001/api' (for local network testing)
```

Also update `frontend/capacitor.config.ts`:
```typescript
server: {
  url: 'https://YOUR-SERVER-URL.com', // Your deployed frontend or remove this for bundled app
}
```

### 5. Sync and Build

```bash
# Sync web assets to Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

### 6. Build APK from Android Studio

1. Open Android Studio (it will open automatically with `cap open android`)
2. Wait for Gradle sync to complete
3. Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**
4. The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### 7. Build APK from Command Line (Alternative)

```bash
cd android
./gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### 8. Build Release APK (for Play Store)

```bash
cd android

# Generate a signing key (first time only)
keytool -genkey -v -keystore worldchat-release.keystore -alias worldchat -keyalg RSA -keysize 2048 -validity 10000

# Build release
./gradlew assembleRelease
```

## One-Command Build (after setup)

```bash
cd frontend
npm run apk
```

This runs: `build` → `cap sync` → `gradlew assembleDebug`

## Quick APK for Testing

The fastest way to get a debug APK:

```bash
cd frontend
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Android Permissions

The app requires these permissions (already configured):
- **INTERNET** - For chat and API calls
- **CAMERA** - For video calls
- **RECORD_AUDIO** - For video calls (microphone)
- **READ_EXTERNAL_STORAGE** - For uploading photos/videos
- **WRITE_EXTERNAL_STORAGE** - For saving media

## Troubleshooting

### "Cannot connect to server"
- Make sure your backend is deployed and accessible from the internet
- Update the URL in `src/services/api.js`

### "Camera not working"
- Grant camera permissions in Android settings
- WebRTC requires HTTPS in production

### "Build fails with Gradle error"
- Make sure you have JDK 17 installed
- Update Android Studio to latest version
- Run: `cd android && ./gradlew clean`

## Deploy Backend First

For the APK to work, you need your backend running on a public server:

### Free hosting options:
- **Railway.app** - Easy Node.js deployment
- **Render.com** - Free tier available
- **Fly.io** - Free tier with generous limits
- **DigitalOcean** - $5/month droplet

### Deploy steps:
1. Push backend to a separate repo or use a hosting service
2. Set environment variables (PORT, JWT_SECRET, FRONTEND_URL)
3. Get your public URL (e.g., `https://worldchat-api.onrender.com`)
4. Update `frontend/src/services/api.js` with the URL
5. Rebuild the APK

## File Structure After Setup

```
frontend/
├── android/                 ← Generated Android project
│   ├── app/
│   │   ├── build/
│   │   │   └── outputs/
│   │   │       └── apk/
│   │   │           └── debug/
│   │   │               └── app-debug.apk  ← YOUR APK
│   │   └── src/
│   │       └── main/
│   │           └── AndroidManifest.xml
│   └── gradle/
├── dist/                    ← Built web app
├── capacitor.config.ts
├── package.json
└── src/
```
