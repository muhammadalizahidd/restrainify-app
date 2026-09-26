# Implementation Plan: Android Release Build and Keystore Configuration

## 1. Requested Behavior or Problem
The project currently only defines a `debug` build type in `apps/mobile/android/app/build.gradle.kts`. When attempting to build a release APK (`./gradlew assembleRelease`), Gradle fails because:
1. `hermesCommand` location cannot be resolved in monorepo layout where `hermesc` is provided by `hermes-compiler`.
2. No `release` build type or signing configuration exists in `app/build.gradle.kts`.

## 2. Relevant Requirements
- `AGENT.md` Section 1.1: Pre-coding implementation plan mandatory.
- Enable reproducible release APK generation (`./gradlew assembleRelease`) for testing and production distribution.

## 3. Files to be Affected
- `apps/mobile/android/app/build.gradle.kts`:
  - Resolve cross-platform `hermesc` binary from `node_modules/hermes-compiler`.
  - Add `release` signing config (supporting Gradle properties, env vars, or release.keystore fallback).
  - Add `release` build type.

## 4. Verification Plan
- Run `./gradlew assembleRelease` in `apps/mobile/android`.
- Verify output APK exists at `apps/mobile/android/app/build/outputs/apk/release/`.
