# ADR-0010: Domain 2 Completion (Tools Action Hub & Configuration Settings) Architecture

## Status
Accepted and Implemented

## Date
2026-09-11

## Context
Domain 2 of the Restrainify mobile app addresses the "Recovery & Journal Domain" across 10 functional screens.
With `PROG-01` through `JOUR-05` delivered in prior milestones, four screens remained to achieve 100% completion of Domain 2:
1. `TOOL-01`: **Tools Action Hub** (Immediate action surface replacing passive content catalogs)
2. `SET-REC-01`: **Recovery Settings** (Streak calculation configuration & immutable baseline date protection)
3. `SET-BURST-01`: **Burst Settings** (Duration selection & paused applications management)
4. `SET-FAP-01`: **Fap Tracker Settings** (Independent enable/disable toggle & complete protection uncoupling)

## Decision

### 1. Concrete Mapping Between Frontend and Native Backend Functions
Every frontend component directly invokes and reflects specific native functions inside `OfflineRuntime.kt`:

| Screen ID | Frontend Component | Native Kotlin Mapping (`OfflineRuntime.kt`) | Method / Invariant Enforced |
|:---|:---|:---|:---|
| `TOOL-01` | `ToolsScreen` & `PrimaryBurstToolCard` | `OfflineRuntime.kt:47, 201` | `burstRemaining(): Long` determines active vs idle crisis state |
| `TOOL-01` | Primary Burst Button | `OfflineRuntime.kt:136-145` | `command("burst")` starts emergency cooldown & records `LocalEvent` |
| `TOOL-01` | Run Health Check | `OfflineRuntime.kt:177, 186-187` | `refresh()` evaluates live Android capabilities (`vpn`, `accessibility`, `usage`, `vpnError`) |
| `SET-REC-01` | `RecoverySettingsScreen` | `OfflineRuntime.kt:36, 73-77` | `command("setting", { key: "recoveryEnabled", value })` enforces `assertCanWeaken()` on disable |
| `SET-REC-01` | Baseline Date Editor | `OfflineRuntime.kt:80-84` | `command("setting", { key: "recoveryStart", value })`. **Invariant:** `require(dao.eventsOfKind("relapse").isEmpty())` locks baseline editing when any relapse has occurred |
| `SET-BURST-01` | `BurstSettingsScreen` | `OfflineRuntime.kt:37, 78` | `command("setting", { key: "burstMinutes", value })` validates `value in 1..1440` and checks `assertCanWeaken()` |
| `SET-BURST-01` | Paused Apps Drilldown | `OfflineRuntime.kt:38, 115-118` | Filters `rules.filter(r => r.enabled && r.burst)` and navigates to `apps` rule editor |
| `SET-FAP-01` | `FapTrackerSettingsScreen` | `OfflineRuntime.kt:36, 73-77` | `command("setting", { key: "trackerEnabled", value })` with explicit uncoupling disclosure |

### 2. Architectural Invariants Enforced
1. **Historical Baseline Integrity:** If a user logs a relapse, the baseline streak start date is irrevocably locked. The UI replaces the editor with a locked badge and explanatory guidance, preventing retroactive revisionism of recovery milestones.
2. **Cooldown Anti-Weakening Defense:** Any attempt to weaken protection settings (decreasing burst duration, disabling recovery tracking, or disabling the tracker) during an active Burst cooldown or Strict Mode lock throws a native exception via `assertCanWeaken()`. The UI preemptively disables these controls and warns the user.
3. **Decoupled Privacy Boundaries:** The Fap Tracker is explicitly communicated as an optional behavioral log with zero coupling to network DNS filtering or Accessibility app-blocking rules. All check-ins remain exclusively in local SQLCipher storage on the device.

## Consequences
- Domain 2 is now **100% complete** (10 / 10 screens implemented, tested, and routed).
- Total application progress reaches **20 / 47 screens (42.6%)**.
- All 16 test suites (116 tests total) pass with 0 errors, 0 warnings, and 0 TypeScript errors.
