const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add resolver configuration for better compatibility
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, "cjs"],
};

module.exports = config;
