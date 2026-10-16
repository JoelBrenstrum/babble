const path = require('node:path');

module.exports = {
  preset: 'jest-expo',
  // The first render in a suite loads the whole icon and RN module graph, which is slow on loaded CI runners.
  testTimeout: 20_000,
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    // Jest resolves the "react-native" export condition to an ESM-only build; the CommonJS build works the same in tests.
    '^@react-native-async-storage/async-storage$': '@react-native-async-storage/async-storage/jest/async-storage-mock',
    // Workspace packages resolve their own copies of react and react-query, which breaks hooks and context.
    '^react$': require.resolve('react'),
    '^react/(.*)$': path.join(path.dirname(require.resolve('react/package.json')), '$1'),
    '^@tanstack/react-query$': require.resolve('@tanstack/react-query'),
    '^lucide-react-native$': path.join(path.dirname(require.resolve('lucide-react-native')), 'lucide-react-native.js'),
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|nativewind|react-native-css-interop|lucide-react-native|@babble/.*))',
  ],
};
