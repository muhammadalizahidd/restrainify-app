# ADR-0003: Adopt Expo Tooling and Align Runtime with Expo SDK 57

## Status

Accepted

## Date

2026-09-05

## Context

ADR-0002 pinned React Native 0.87.1 with AGP 9.0.1, Gradle 9.4.1, Kotlin 2.2.0, and compile/target SDK 37. Two requirements changed the baseline:

1. The project wants Expo tooling (Expo CLI, dev-client launcher, access to Expo SDK libraries) alongside the existing Android Studio workflow, without adopting prebuild/continuous native generation. The hand-maintained `android/` directory with the Kotlin protection runtime must stay the source of truth.
2. `npm audit` reported 8 high-severity findings through React Native 0.87.1's Metro dependency chain (`image-size`, `GHSA-w3rx-r6r6-pgpr`, `GHSA-5p2g-fcmc-qvqq`; see `docs/security/dependency-audit.md`). The published fix path is `react-native@0.86.3`.

Version checks used:

- npm registry: Expo SDK 57 stable (`expo@57.0.20`, `next`/`latest` dist-tags) is tested against React Native 0.86.3, which appears in the Expo SDK 57 bare-minimum template dependencies.
- Expo SDK 57 bare-minimum template pins `react@19.2.3` and `react-native@0.86.3`.
- React Native 0.86.3 peer requirements: `react ^19.2.3`, `@types/react ^19.1.1`.
- React Native 0.86.3's own version catalog (`react-native/gradle/libs.versions.toml`) and reference app pin Gradle 9.3.1, AGP 8.12.0, Kotlin 2.1.20, compile/target SDK 36, build tools 36.0.0, and NDK 27.1.12297006.
- The Expo SDK 57 Gradle tooling (`expo-module-gradle-plugin`) uses `LibraryDefaultConfig.setTargetSdk`, which was removed in AGP 9, so AGP 9.0.1 is not usable with Expo SDK 57.
- React Native 0.86.3's settings plugin fails to compile under Gradle 9.4.1 because the Gradle distribution's embedded Kotlin metadata (2.3.0) predates the plugin's expected metadata version (2.1.0).

## Decision

Downgrade the mobile runtime to React Native 0.86.3 and adopt Expo SDK 57 tooling in the bare workflow:

| Area                  | Previous (ADR-0002)                                                                                 | New                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| React Native          | 0.87.1                                                                                              | 0.86.3                                                                                                 |
| React                 | 19.2.8                                                                                              | 19.2.3                                                                                                 |
| Expo                  | none                                                                                                | expo 57.0.20, expo-dev-client 57.0.18                                                                  |
| Android Gradle Plugin | 9.0.1                                                                                               | 8.12.0                                                                                                 |
| Gradle                | 9.4.1                                                                                               | 9.3.1                                                                                                  |
| Kotlin                | 2.2.0                                                                                               | 2.1.20                                                                                                 |
| compile SDK           | 37                                                                                                  | 36                                                                                                     |
| target SDK            | 37                                                                                                  | 36                                                                                                     |
| min SDK               | 26                                                                                                  | 26 (unchanged)                                                                                         |
| NDK                   | 28.2.13676358                                                                                       | 27.1.12297006                                                                                          |
| New Architecture      | gradle property `newArchEnabled=false` with hard-coded `isNewArchEnabled=true` in `MainApplication` | implemented: New Architecture enabled by default (`newArchEnabled=false` removed), entry points use `reactHost` (`ExpoReactHostFactory`), `loadReactNative`, and `fabricEnabled` |

Integration shape (bare workflow, no prebuild):

- `android/` remains hand-maintained; the Kotlin protection runtime is untouched.
- Expo autolinking is wired through `expo-autolinking-settings` in `settings.gradle.kts`; React Native autolinking runs through Expo's `rnConfigCommand`.
- `MainApplication` uses `ExpoReactHostFactory.getDefaultReactHost` with `ApplicationLifecycleDispatcher`; `MainActivity` wraps its delegate in `ReactActivityDelegateWrapper`.
- `babel-preset-expo` replaces `@react-native/babel-preset`; Metro config extends `expo/metro-config`.
- Release bundling goes through Expo CLI (`cliFile`, `bundleCommand: "export:embed"`).
- `npm start` runs `expo start --dev-client`; `npm run android` runs `expo run:android`. Android Studio builds the same `android/` directory as before.
- `react` and `react-native` are pinned as root devDependencies so npm auto-installed peers deduplicate to a single copy hoisted at the monorepo root (the Android Gradle files resolve React Native from the root `node_modules`).

## Rationale

Expo SDK 57 stable supports React Native 0.86.x only, so the Expo requirement forces the 0.86.3 baseline. The same version resolves the 8 high-severity `npm audit` findings that ADR-0002 deferred. The toolchain matrix (Gradle 9.3.1, AGP 8.12.0, Kotlin 2.1.20, SDK 36) is the version set React Native 0.86.3 and the Expo SDK 57 templates are tested against; keeping AGP 9.0.1 or Gradle 9.4.1 is not viable with Expo SDK 57.

The 0.87-era `MainApplication` had mixed new architecture flags. In React Native 0.86.3, New Architecture is enabled by default (setting `newArchEnabled=false` is deprecated/unsupported since RN 0.82). The legacy flag was removed from `gradle.properties`, and the native entry points fully implement the New Architecture baseline using `ExpoReactHostFactory.getDefaultReactHost`, `loadReactNative`, `fabricEnabled`, and `ReactActivityDelegateWrapper`.

## Consequences

- `npm audit` no longer reports the Metro/image-size high-severity findings; 10 moderate findings remain in dev-only `@expo` config tooling (`@expo/prebuild-config`, `@expo/inline-modules`) that the bare workflow does not execute. See `docs/security/dependency-audit.md`.
- TypeScript 5.9.3 rejects `ignoreDeprecations: "6.0"`; that speculative value was removed from `tsconfig.base.json` and `apps/mobile/tsconfig.json` to restore typecheck.
- compile/target SDK dropped from 37 to 36. The PRD's release-policy review must revalidate the target SDK before store release.
- Expo SDK libraries can now be added with `npx expo install`.
- Migrating to prebuild/continuous native generation would require packaging the protection runtime as Expo modules or config plugins; that remains out of scope until EAS Build or OTA updates are required.

## References

- Expo SDK 57 bare-minimum template: https://github.com/expo/expo/tree/sdk-57/templates/expo-template-bare-minimum
- Installing Expo modules in existing React Native apps: https://docs.expo.dev/bare/installing-expo-modules/
- React Native 0.86.3 version catalog: `node_modules/react-native/gradle/libs.versions.toml`
- ADR-0002: Initial Runtime Stack
- Dependency audit: `docs/security/dependency-audit.md`
