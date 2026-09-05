# Android Native Runtime

This directory is reserved for the generated React Native Android project and Kotlin protection runtime.

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

