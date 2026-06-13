import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.worldchat.app',
  appName: 'World Chat',
  webDir: 'dist',
  server: {
    // Change this to your backend server URL for production
    // For local development, use your computer's IP address
    url: 'http://10.0.2.2:5173', // Android emulator localhost
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
