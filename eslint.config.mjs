import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/build/**",
      "**/dist/**",
      "**/coverage/**",
      "apps/mobile/android/**",
    ],
  },
  {
    files: ["**/*.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        __dirname: "readonly",
        module: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["apps/mobile/src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}"],
    rules: {
      // The old Android system dialog doesn't match the app; every pop-up goes through appAlert.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: ["Alert"],
              message: "Use appAlert from src/components/AppDialog instead of the system Alert.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
