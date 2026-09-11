# ADR-0011: Domain 3 (Protection & Settings Configuration Domain) Architecture

## Status
Accepted and Implemented

## Date
2026-09-11

## Context
Domain 3 of the Restrainify mobile application provides granular configuration control over device-level filtering, anti-bypass friction, application limits, restriction schedules, and data lifecycle management across 14 dedicated screens.

Prior to this work, the settings tab displayed a legacy offline prototype (`SettingsScreen` in `features/offline/ProtectionScreens.tsx`). Delivering Domain 3 replaces this placeholder with a feature-organized architecture conforming to the approved Orbit / Clarity design system (`DESIGN.md`), `restrainify-v1-ui-architecture-mobile-fixed.html`, and strict platform-safety rules (`AGENT.md`).

The 14 screens built:
1. `SET-01`: **Settings Hub** (`SettingsHubScreen.tsx`)
2. `SET-WEB-02`: **Blocked & Allowed Domains** (`DomainManagerScreen.tsx`)
3. `SET-WEB-03`: **Scoped Overrides** (`ScopedOverridesScreen.tsx`)
4. `SET-VIS-02`: **Protected Contexts** (`ProtectedVisualContextsScreen.tsx`)
5. `SET-SOC-01`: **Short-Form Protection** (`ShortFormProtectionScreen.tsx`)
6. `SET-APP-01`: **App Controls Hub** (`AppControlsScreen.tsx`)
7. `SET-APP-02`: **App Limit & Schedule** (`AppLimitScreen.tsx`)
8. `SET-APP-03`: **Schedule Editor** (`ScheduleEditorScreen.tsx`)
9. `STATE-STRICT-02`: **Pending Change Cooldown** (`PendingChangeScreen.tsx`)
10. `SET-NOT-01`: **Notifications** (`NotificationsSettingsScreen.tsx`)
11. `SET-SYNC-01`: **Cloud Sync** (`CloudSyncScreen.tsx`)
12. `SET-DATA-01`: **Data & Privacy** (`DataPrivacyScreen.tsx`)
13. `SET-ACCOUNT-02`: **Delete Account** (`DeleteAccountScreen.tsx`)
14. `STATE-DATA-02`: **Reset Local Data** (`ResetLocalDataScreen.tsx`)

---

## Decision

### 1. Concrete Mapping Between Frontend and Native Backend Functions
Every user action and configuration parameter directly maps to authoritative native functions in `OfflineRuntime.kt` and the SQLCipher/Room persistent layer:

| Screen ID | Frontend Component | Native Kotlin Mapping (`OfflineRuntime.kt`) | Method / Invariant Enforced |
|:---|:---|:---|:---|
| `SET-01` | `SettingsHubScreen` | `OfflineRuntime.kt:35-38, 177-206` | Aggregates live status across 5 pillars; checks `strictRemainingMs` & `burstRemainingMs`. |
| `SET-WEB-02` | `DomainManagerScreen` | `OfflineRuntime.kt:88-99` | `command("domain", { domain, allow, enabled, remove })`. Enforces 5000 max domains and `assertCanWeaken()`. |
| `SET-WEB-03` | `ScopedOverridesScreen` | `OfflineRuntime.kt:61, 89` | Evaluates `strictRemainingMs`; routes weakening exceptions to `STATE-STRICT-02`. |
| `SET-VIS-02` | `ProtectedVisualContextsScreen` | `OfflineRuntime.kt:170-176` | `offlineProtection.apps()` queries installed apps; manages on-device scanning scope. |
| `SET-SOC-01` | `ShortFormProtectionScreen` | `OfflineRuntime.kt:111-112` | `command("rule", { packageName, feedMode })`. Declares TikTok `whole_app` fallback truthfully. |
| `SET-APP-01` | `AppControlsScreen` | `OfflineRuntime.kt:43-46, 180, 202-205` | Reads `usage.apps` vs daily limits; surfaces `capabilities.usage` health status. |
| `SET-APP-02` | `AppLimitScreen` | `OfflineRuntime.kt:100-119` | `command("rule", { packageName, limitMinutes, enabled })`. Enforces anti-weakening cooldowns. |
| `SET-APP-03` | `ScheduleEditorScreen` | `OfflineRuntime.kt:106-110` | `command("rule", { startMinute, endMinute, days })`. Validates bounds (0..1439), start != end, and repeat mask. |
| `STATE-STRICT-02` | `PendingChangeScreen` | `OfflineRuntime.kt:48-60, 147` | Live countdown from `strictRemainingMs`. Provides "Keep protection on · cancel request" action. |
| `SET-NOT-01` | `NotificationsSettingsScreen` | Native Notification permissions | Toggles recovery/health alerts; declares independence of core protection from OS notifications. |
| `SET-SYNC-01` | `CloudSyncScreen` | Local SQLCipher database & SyncQueue | Local-first resilience: offline writes persist locally without blocking or data loss. |
| `SET-DATA-01` | `DataPrivacyScreen` | SQLCipher database boundaries | Documents on-device ML guarantees and links to local reset vs server account deletion. |
| `SET-ACCOUNT-02` | `DeleteAccountScreen` | Authenticated remote API | Authenticated server account deletion, decoupled from device-only state. |
| `STATE-DATA-02` | `ResetLocalDataScreen` | `OfflineRuntime.kt:148` | `command("reset", { confirmed: true })`. **Invariant:** `assertCanWeaken()` prohibits reset during active cooldown. |

### 2. Architectural & Security Invariants Enforced
1. **Cooldown Anti-Bypass Defense:** The native runtime enforces `assertCanWeaken()` across domain rules, app rules, recovery settings, burst duration, and local database reset. The UI proactively badges locked controls and routes weakening attempts to the `STATE-STRICT-02` countdown screen.
2. **Truthful Capability Reporting:** In compliance with `AGENT.md` Section 26 and `DESIGN.md` Section 12.1, the application never claims absolute adult uninstall prevention, nor does it falsely claim reliable feed-only isolation for apps like TikTok where platform accessibility hooks vary.
3. **Destructive Boundary Decoupling:** Wiping local device data (`STATE-DATA-02`) and deleting a server account (`SET-ACCOUNT-02`) are strictly segregated into distinct interfaces with dedicated authentication and confirmation protocols.

---

## Consequences
- Domain 3 is **100% complete** (14 / 14 screens implemented, tested, and routed).
- Total application progress advances to **34 / 47 screens (72.3%)**.
- Automated Self-Evaluation Loop passed:
  - `npm run typecheck`: 0 errors across all workspaces.
  - `npm run lint`: 0 errors, 0 warnings across all workspaces.
  - `npm test`: 17 test suites, 135 tests passing (100% pass rate).
