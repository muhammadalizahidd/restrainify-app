# Mobile Dashboard Implementation Plan

## Goal

Replace the placeholder React Native dashboard with the approved Orbit / Clarity homescreen layout and root logo, while preserving the product rule that the UI never presents fixture data as verified native protection.

## Requirements and boundaries

- Implement the dashboard order in `DESIGN.md`: header, streak/reward, overview, protection health, screen-time trend, Burst, and persistent navigation.
- Use the supplied local Orbit / Clarity HTML as the approved visual direction and its logo asset as the app mark.
- The React Native layer remains presentation-only. Kotlin remains authoritative for native protection health, consistent with `ARCH-001`, `ARCH-002`, and the bridge reconciliation invariant.
- Until `ProtectionBridge` has a native implementation, use the existing degraded fixture and label it as setup-required. Do not display active protection, synced data, or sample metrics as trusted state.
- Keep this first slice offline-only and add no permissions, storage, API, or synchronization. Use Expo's supported gradient package for the banner and core React Native views for the progress ring; this avoids an additional native codegen dependency in the Expo client.

## Files and implementation

- `apps/mobile/src/design/brandTokens.ts`: replace temporary tokens with the approved Orbit / Clarity palette and dashboard sizing tokens.
- `apps/mobile/src/components/AppScreen.tsx`: support a fixed bottom-navigation inset and safe mobile scrolling.
- `apps/mobile/src/features/dashboard/state/dashboardFixture.ts`: provide the dashboard presentation data alongside existing degraded native-health state.
- `apps/mobile/src/features/dashboard/screens/HomeScreen.tsx`: implement the responsive homescreen and its local claim/Burst feedback states.
- `apps/mobile/assets/restrainify-logo.png`: bundle the user-supplied logo for native rendering.

## Edge cases and validation

- The screen must remain readable when protection is degraded, reward is already claimed, Burst is active, or screen-time data is unavailable.
- All buttons must have labels and adequate touch targets. Protection health includes text, not color alone.
- No user data is persisted or transmitted by this UI slice. No migration, native-service, battery, or privacy-boundary change is involved.
- Verify TypeScript and lint after implementation; do not run Android build until the dashboard slice is complete because it is unrelated to this presentation-only change.

## Revision: Android layout correction

The first dashboard pass overflowed the streak card at narrow Android widths because the streak column could not shrink beside the progress ring. The correction constrains that column, reduces the ring and reward row at small widths, assigns stable chart keys, and replaces deprecated React Native `SafeAreaView` with the platform status-bar inset. No product behavior or native protection boundary changes.

## Revision: Expo native build compatibility

`react-native-svg` did not generate its required New Architecture headers in the user's Expo Android build. Replace the SVG progress ring with a segmented core-React-Native ring and remove that native package. The ring retains the 66% visual state without adding a native build dependency.
