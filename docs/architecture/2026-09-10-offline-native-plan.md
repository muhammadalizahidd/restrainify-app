# Offline Android implementation

Supersedes the prototype delivery approach: the user explicitly excludes auth, Supabase and visual-model infrastructure. Restore the Orbit/Clarity homepage and use its tokens throughout. Existing React-only state loses data on restart, invents protection success for Burst, computes UTC rewards and omits historical streaks; replace it with native transactional operations.

## Implementation

- Room 2.7.2 with SQLCipher Android and Keystore-wrapped random database key; Kotlin owns settings, recovery/check-ins, domains, rules, cooldowns and aggregate counts. Fresh database v1: existing prototype never persisted data, so no records to migrate. No destructive migration fallback.
- Registered React Native module with serialized command execution and JSON snapshots. Cold start/foreground reconciliation, explicit loading/errors, no optimistic success. No auth or sync queue in this offline phase.
- UsageStats permission and daily/weekly usage; Accessibility disclosure and affirmative consent; foreground-only app limits/schedules/Burst enforcement through an accessibility overlay with an exit-to-home action. Versioned conservative resource-ID feed matching and explicitly selectable whole-app fallback; unverified selectors are labeled experimental, not guaranteed.
- DNS-only local VpnService with explicit Android consent, foreground notification, protected upstream DNS sockets, bounded request work, stop/revoke/failure health, hostname block/allow precedence, minimal daily counters. Split routes capture only the advertised DNS address, never HTTPS traffic. Encrypted DNS and cached/embedded IPs can bypass this scope; expose this in UI. Private DNS setup reports actual system settings and explains that custom local rules require VPN. No interception of TLS or full-traffic relay.
- Offline UI: onboarding, restored live dashboard, progress/calendar, dated relapse/urge journal, optional tracker/history, Burst configuration/outcome, installed-app controls and schedules, social feed rules/fallbacks, DNS/domain tools, capability repair, theme/privacy/reset. Visual detection clearly deferred.
- Burst and strict durations are user-configured before activation; no fixed duration silently treated as product policy. Cooldowns use elapsed realtime within a boot and fail conservatively across clock rollback/reboot. Completion cannot lift an active cooldown.

## Verification / review

Check TypeScript, lint, deterministic JS and native policy/DNS tests and compile Android without launching Metro/device. Verify DNS malformed input, boundary-safe matching, local-day rewards, preserved longest streak, tracker gating, cooldown enforcement, encrypted-store errors. Device-only VPN/Accessibility/OEM/usage behavior remains unverified until actually exercised; document this honestly. New permission and encrypted-storage code require review for consent, no sensitive logs, bounded CPU/network use, lifecycle cleanup and least privilege. No screenshots are captured. Reset requires in-app confirmation and cannot bypass active strict/Burst cooldowns.

## Revision: one dashboard across connectivity states

Offline is an operational state of the same app, not a separate screen or online/offline product fork. Use neutral active entry-point names (`ProtectionProvider`, `AppNavigator`, `HomeScreen`) and render connectivity, native capability, and sync health inside the existing dashboard. Login and cloud sync remain deferred, so there is no online screen.

## Revision: safe-area native codegen

The Expo Android build generated missing New Architecture headers for `react-native-safe-area-context`. The app now uses the platform status-bar inset in its existing root view and does not depend on that optional native codegen package.
