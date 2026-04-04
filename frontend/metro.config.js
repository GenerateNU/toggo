/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.transformer = {
  ...defaultConfig.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

defaultConfig.resolver = {
  ...defaultConfig.resolver,
  assetExts: defaultConfig.resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...defaultConfig.resolver.sourceExts, "svg"],
  nodeModulesPaths: [require("path").resolve(__dirname, "node_modules")],
  resolverMainFields: ["react-native", "browser", "main"],
};

module.exports = defaultConfig;
