import { registerRootComponent } from 'expo';

if (__DEV__ && process.env.EXPO_PUBLIC_COSMOS === '1') {
  registerRootComponent(require('./src/cosmos-app').default);
} else {
  require('expo-router/entry');
}
