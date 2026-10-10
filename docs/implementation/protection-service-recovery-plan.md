# Protection-service recovery plan

## Problem

Freezing, force-stopping, or an OEM process kill can terminate Restrainify's `RestrictionService` and `DnsVpnService`. The app currently reports Accessibility as usable when its component is merely listed in Android secure settings, which is not proof that the service is bound and receiving events. `OfflineRuntime` also has no retry path after its encrypted storage initialization fails.

## Requirements and scope

- Never claim app protection is active unless `RestrictionService.onServiceConnected()` has run in the current process.
- Keep the Android accessibility enrollment state distinct from the live service state.
- The app must not attempt to start an `AccessibilityService`; Android alone owns that binding. When configured but disconnected, direct the user to Android Accessibility settings and explain the required off/on toggle.
- Reconnect the already-authorized DNS VPN only while Restrainify is foregrounded.
- Retry transient encrypted-storage initialization failures safely, with no duplicate database work.
- Preserve existing persisted configuration and native bridge behavior except for the corrected health semantics.

## Affected files

- `apps/mobile/android/app/src/main/java/com/restrainify/protection/OfflineRuntime.kt`
- `apps/mobile/android/app/src/main/java/com/restrainify/protection/service/RestrictionService.kt`
- `apps/mobile/android/app/src/main/java/com/restrainify/protection/webfilter/DnsVpnService.kt`
- `apps/mobile/android/app/src/main/java/com/restrainify/protection/bridge/ProtectionBridgeModule.kt`
- `apps/mobile/android/app/src/test/java/com/restrainify/protection/ProtectionOrchestratorTest.kt`
- `apps/mobile/src/native/OfflineProtection.ts`
- `apps/mobile/src/app/providers/OfflineProvider.tsx`
- `apps/mobile/src/features/protection/screens/ProtectionHealthScreen.tsx`
- `apps/mobile/src/features/protection/utils/healthCalculator.ts`
- focused TypeScript regression tests alongside the health utility
- `CURRENT_CONTEXT.md`

## Design

1. `OfflineRuntime` exposes `accessibilityConfigured` from Android Accessibility settings and `accessibilityConnected` from the in-process `RestrictionService` lifecycle. Existing `capabilities.accessibility` means connected, so all existing protection consumers become truthful without a compatibility shim.
2. `RestrictionService.onServiceConnected()` is the single source of `accessibilityConnected=true`; interruption and destruction clear it. Dynamic receiver cleanup is paired and idempotent.
3. `OfflineProvider` invokes a new foreground-only native reconciliation method before every snapshot refresh. It may start a configured DNS VPN only when Android reports that VPN authorization is already granted. It never tries to start Accessibility itself.
4. The Permissions UI distinguishes not configured from configured-but-disconnected and explains that the latter requires toggling Restrainify's service off then on in Android Settings.
5. Initialization records only a generic failure. Explicit foreground reconciliation may schedule one serialized reload when the runtime is not ready; it cannot run concurrent loads or retry successful initialization.

## Edge cases

- App freeze, force stop, OEM task kill, and Android service interruption all show disconnected protection rather than stale success.
- A user who removed Accessibility enrollment sees the normal grant path rather than a misleading reconnect instruction.
- A user with an ungranted/revoked VPN permission is not sent into a failing foreground-service start; the native status exposes a reconnect error.
- A storage open failure does not erase configuration or try to recreate the database. A later foreground retry either restores readiness or keeps the generic error visible.
- Repeated service connection callbacks cannot double-register the screen receiver.

## Security and privacy review

No new permission, network endpoint, account data, or telemetry is introduced. The native state exposes only service configuration/liveness booleans and generic error text. Accessibility remains user-controlled through Android Settings; the app does not attempt to bypass Android's consent model.

## Verification

- Add native unit coverage that a configured-but-disconnected accessibility state is not `ACTIVE`.
- Add TypeScript coverage that health requires connected accessibility.
- Run the mobile Jest suite and TypeScript check.
- Run the Android JVM test task.
- Install/run the debug app on the connected device, exercise foreground reconciliation, and inspect `dumpsys accessibility` plus app status. A real freeze/unfreeze manual test is included when the target device has no active Burst session.