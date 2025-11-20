import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.firesight.app',
  appName: 'Firesight',
  webDir: 'build',
  server: {
    androidScheme: 'http',
    cleartext: true
  }
};

export default config;
