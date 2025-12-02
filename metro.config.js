const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Use polling to avoid EMFILE errors
config.watchFolders = [__dirname];

// Disable file watching and use polling instead
config.resolver = {
  ...config.resolver,
  // Only resolve from this directory
  nodeModulesPaths: [__dirname + '/node_modules'],
};

// Reduce watch scope
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => middleware,
};

module.exports = config;
