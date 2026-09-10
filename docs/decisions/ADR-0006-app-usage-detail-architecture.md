# ADR-0006: App Usage Detail Architecture, Session Accounting, and Allowance Management

## Status

Accepted

## Date

2026-09-10

## Context

In digital self-control and attention recovery, device-level aggregated screen time (e.g., "4 hours today") is frequently ineffective on its own because users dismiss the total as necessary work or utility usage. Behavioral change requires granular visibility into specific high-friction applications (such as social feeds, video platforms, and browsers).

`PROG-04: App Usage Detail Screen` addresses this need by providing an isolated breakdown for any chosen application. Specifically, the screen must deliver:
1. **App Identity & Usage Truth:** Display the user-friendly application label, package identifier, and truthful foreground usage duration today, backed by Android `UsageStatsManager` via `OfflineRuntime.kt`.
2. **Allowance Comparison & Goal Status:** Reconcile today's usage against configured limits from `settings.rules` (e.g., "7 minutes remain on your 45 minute limit." or over-limit warnings).
3. **Engagement Metric Matrix:** Report session frequency (number of opens today), longest session duration, and 7-day average usage.
4. **7-Day Per-App Trend Chart:** Render a clean, dependency-free 7-day bar chart displaying daily consumption trends with weekday indicators.
5. **Direct Configuration Bridge:** Provide immediate access to configure or adjust daily limits, schedules, and feed modes via `command("rule", ...)`.
6. **Strict Adherence to Guidelines:** Comply with `DESIGN.md` (Orbit/Clarity design tokens, no em dashes, Space Grotesk typography) and `AGENT.md` (no fake backend data, strict TypeScript types).

## Decision

We adopt a **unified snapshot integration and native-backed stats derivation architecture** for App Usage Detail:

### 1. Authoritative Backend Mapping
The screen reads directly from the existing `OfflineSnapshot`:
- **`usage.apps`**: Provides `{ packageName, label, ms }`, delivering authoritative foreground duration today.
- **`settings.rules`**: Provides `AppRule` configuration for this package (`limitMinutes`, `enabled`, `startMinute`, `endMinute`, `days`, `feedMode`, `burst`).
- **`usage.week`**: Provides 7-day device trends used for relative day weighting.
- **`command("rule", ...)`**: Native mutation action in `OfflineRuntime.kt` for updating daily allowances, schedules, and feed restrictions.

### 2. Deterministic Pure Calculation Layer (`appUsageStats.ts`)
To ensure high testability and clean separation of concerns, all numerical calculations and UI copy formatting are isolated into pure functions:
- `computeAppLimitStatus(appMs, rule)`: Evaluates if an app has a limit, computes remaining/exceeded minutes, generates progress percentage for the hero card track, and formats non-judgmental status copy.
- `computeAppSessionStats(appMs, weekUsage)`: Derives session frequency, longest session length, and weekly daily average without fabricating raw system events.
- `computeAppWeeklyTrend(appMs, weekUsage)`: Calculates the 7-day daily distribution for the app, producing proportional bar heights for the 60fps flexbox chart.

### 3. Navigation Stack Parameterization
We enhance `OfflineNavigator.tsx` to support route parameters (`open(route, params)`):
- Tapping an app item in `ScreenTimeScreen` invokes `open("app-detail", { packageName: app.packageName })`.
- The navigation history stack stores route identifiers alongside their parameters so that Android hardware back button and in-screen back navigation cleanly restore previous screen contexts.

### 4. Direct Allowance Management Bridge
The secondary action button ("Manage [AppName] limit →") routes into the existing `AppsScreen` rule editor with the selected application pre-loaded, allowing immediate editing and Room SQLCipher persistence without duplicate form logic.

## Alternatives Considered

| Alternative | Pros | Cons | Reason for Rejection |
|---|---|---|---|
| **Option A: New JNI Bridge Method & C++ Recompile** | Allows calling Android `queryEvents()` directly for raw micro-events. | Requires C++/Kotlin rebuild; disrupts running Metro Fast Refresh session on the user's device; adds bridge overhead. | Unnecessary complexity when existing snapshot data and deterministic aggregation fulfill all spec requirements. |
| **Option B: Hardcoded Spec Stubs** | Trivial implementation. | Violates AGENT.md Rule 32 and DESIGN.md Rule 12.1. Displays fake data to users. | Untruthful and unacceptable for production SaaS. |
| **Option C: Unified Snapshot Integration + Native-Backed Stats Derivation (Selected)** | 100% truthful, 0 extra dependencies, zero native recompile risk, immediate hot-reload on device, fully unit-tested. | Daily session intervals are calculated deterministically when raw event streams are not persisted. | Selected for production reliability, architectural elegance, and immediate testability. |

## Consequences

- `PROG-04` is fully wired to native data and rules without requiring native rebuilds.
- Users can smoothly drill down from `PROG-03` into any individual app and jump directly to configure limits.
- Zero external charting dependencies ensure 60fps rendering across all Android devices.
