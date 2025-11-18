import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.2a58af1ad9ef47b4936eda4cb53c5833',
  appName: 'Loja de Apps',
  webDir: 'dist',
  server: {
    url: 'https://2a58af1a-d9ef-47b4-936e-da4cb53c5833.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
