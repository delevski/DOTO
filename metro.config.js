const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Use polling to avoid EMFILE errors
config.watchFolders = [__dirname];

// Disable file watching and use polling instead
config.resolver = {
  ...config.resolver,
  // Only resolve from this directory
  nodeModulesPaths: [__dirname + '/node_modules'],
  // Add platform-specific resolution for web
  platforms: ['ios', 'android', 'native', 'web'],
  // Resolve React Native modules to web-compatible versions
  resolveRequest: (context, moduleName, platform) => {
    // For web platform, provide stubs/mocks for React Native modules
    if (platform === 'web') {
      // Stub PaperUIManager (doesn't exist for web)
      if (moduleName.includes('PaperUIManager')) {
        return {
          filePath: path.resolve(__dirname, 'web-stubs/PaperUIManager.js'),
          type: 'sourceFile',
        };
      }
      // Resolve Platform to react-native-web's Platform
      if (moduleName.includes('react-native/Libraries/Utilities/Platform') || 
          moduleName.endsWith('/Utilities/Platform')) {
        return {
          filePath: path.resolve(__dirname, 'web-stubs/Platform.js'),
          type: 'sourceFile',
        };
      }
    }
    // Default resolution
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Reduce watch scope
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => middleware,
};

module.exports = config;
