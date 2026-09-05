const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { mergeConfig } = require("@react-native/metro-config");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, "node_modules"),
      path.resolve(monorepoRoot, "node_modules"),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
