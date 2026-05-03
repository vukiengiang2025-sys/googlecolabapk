import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eliteos.app',
  appName: 'Elite OS',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
