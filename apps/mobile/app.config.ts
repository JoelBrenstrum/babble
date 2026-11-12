import type { ExpoConfig } from 'expo/config';

export type AppVariant = 'development' | 'production';

export function appVariant(value: string | undefined): AppVariant {
  return value === 'production' ? 'production' : 'development';
}

export function variantIdentity(variant: AppVariant) {
  return variant === 'production'
    ? { name: 'babble', bundleIdentifier: 'com.brenstrum.babble', scheme: 'babble' }
    : { name: 'babble dev', bundleIdentifier: 'com.brenstrum.babble.dev', scheme: 'babble-dev' };
}

const { name, bundleIdentifier, scheme } = variantIdentity(appVariant(process.env.APP_VARIANT));

export default (): ExpoConfig => ({
  name,
  slug: 'babble',
  owner: 'joelbrenstrum',
  version: '0.1.0',
  scheme,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier,
    supportsTablet: true,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: bundleIdentifier,
    allowBackup: false,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#56633f',
    },
  },
  plugins: [
    'expo-router',
    'expo-status-bar',
    'expo-font',
    'expo-web-browser',
    '@react-native-community/datetimepicker',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 120,
        backgroundColor: '#f3f0e8',
        dark: { backgroundColor: '#141612' },
      },
    ],
    'expo-secure-store',
    'expo-sharing',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: { projectId: '4776eb3a-388d-4cb9-a75e-23a0149d4feb' },
  },
});
