const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = withNativeWind(getDefaultConfig(__dirname), { input: './src/global.css' });

// Workspace packages carry their own copies of these, which splits hook and query context from the app's.
const singletons = ['react', '@tanstack/react-query'];
const previousResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = previousResolveRequest ?? context.resolveRequest;
  const pinned = singletons.some((name) => moduleName === name || moduleName.startsWith(`${name}/`));
  return resolve(
    pinned ? { ...context, originModulePath: path.join(__dirname, 'index.ts') } : context,
    moduleName,
    platform,
  );
};

module.exports = config;
