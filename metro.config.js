const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Block the original ws package
config.resolver.blockList = [
  /node_modules\/ws\/.*/,
];

// Resolve ws to React Native's WebSocket implementation
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'ws') {
    return {
      filePath: require.resolve('react-native/Libraries/WebSocket/WebSocket'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config; 