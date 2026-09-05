# Android Native Runtime

This directory contains the hand-maintained React Native Android project (bare Expo workflow, React Native 0.86.3 with New Architecture enabled) and the Kotlin protection runtime.

The Kotlin layer owns:

- Protection Orchestrator.
- Foreground service lifecycle.
- Accessibility and MediaProjection capture abstractions.
- Visual ML scheduling and overlays.
- Local VPN/DNS filtering.
- UsageStats app limits.
- Room + SQLCipher repositories.
- Sync worker integration.

Do not let React Native directly open Room or claim protection health without native reconciliation.

