module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
  moduleNameMapper: {
    "^expo/virtual/env$": "<rootDir>/src/testing/expoEnvMock.js",
    "^expo-secure-store$": "<rootDir>/src/testing/expoSecureStoreMock.js",
    "^@react-native-google-signin/google-signin$": "<rootDir>/src/testing/googleSigninMock.js",
    "^@expo/vector-icons$": "<rootDir>/src/testing/vectorIconsMock.js",
    "^react-native$": "<rootDir>/src/testing/reactNativeMock.js",
  },
};
