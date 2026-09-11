module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
  moduleNameMapper: {
    "^expo/virtual/env$": "<rootDir>/src/testing/expoEnvMock.js",
    "^expo-secure-store$": "<rootDir>/src/testing/expoSecureStoreMock.js",
  },
};
