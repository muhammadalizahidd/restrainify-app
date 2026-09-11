# ADR-0005: Screen Time Breakdown, Native UsageStats Integration, and Attention Budgeting Architecture

## Status

Accepted

## Date

2026-09-10

## Context

Digital wellbeing applications frequently suffer from two common flaws:
1. **Inaccurate or Fake Usage Metrics:** Cross-platform apps often attempt to track screen time using foreground JavaScript heartbeat loops or periodic pollers. These fail completely when apps run in the background, when the OS terminates processes in battery saver mode, or across device reboots.
2. **Shame-Inducing Punitive Framing:** Traditional screen time trackers present usage in angry red warning boxes and characterize all phone time as failure. Users who use their devices for work, navigation, or creative tools become demoralized and abandon the application.

Furthermore, `PROG-03: Screen Time Breakdown Screen` requires:
1. Truthful visualization of user screen time backed by Android OS level `UsageStatsManager` through `OfflineRuntime.kt`.
2. Segmented attention budgeting supporting both daily (3-hour target) and weekly (21-hour target) viewpoints.
3. A 7-day usage trend bar chart displaying weekday initials (`M`, `T`, `W`, etc.) and a delta percentage comparison against yesterday.
4. Per-app usage accounting showing actual foreground time alongside configured daily allowances (e.g., `38m / 45m`) and over-limit status.
5. Truthful permission handling: if `capabilities.usage` is false, present an actionable gate linking directly to Android's `ACTION_USAGE_ACCESS_SETTINGS`.
6. Strict adherence to `DESIGN.md` (calm Orbit / Clarity aesthetics, no em dashes) and `AGENT.md` (strict TypeScript types, no `any`, no placeholder TODOs).

## Decision

We adopt a **native-backed, non-punitive attention budgeting architecture** with dual-timeframe aggregation and lightweight proportional chart rendering:

### 1. Direct Native Backend Mapping
All metrics and actions are directly mapped to the Android Kotlin runtime:
- **`capabilities.usage`**: Evaluated in `OfflineRuntime.kt` via `hasUsageAccess()`, checking `AppOpsManager.OPSTR_GET_USAGE_STATS`.
- **`offlineProtection.settings("usage")`**: Directly launches `Settings.ACTION_USAGE_ACCESS_SETTINGS` via `ProtectionBridgeModule.kt`.
- **`usage.todayMs`**: Sum of foreground durations from today's midnight to current epoch milliseconds retrieved from Android's `UsageStatsManager.queryAndAggregateUsageStats()`.
- **`usage.week`**: 7-day array of daily foreground totals (`(6L downTo 0).map { offset -> ... }`).
- **`usage.apps`**: Per-app foreground durations sorted descending with localized package labels resolved via Android `PackageManager`.
- **`settings.rules`**: Matching rule configuration per package (`packageName`, `limitMinutes`, `enabled`) stored in Room SQLCipher.

### 2. Dual-Timeframe Segmented Attention Budgeting
The screen provides an ephemeral segmented toggle between **Day** and **Week** views:
- **Day View**:
  - Focuses on `usage.todayMs` against the 3-hour baseline daily target.
  - Formats goal delta as either remaining (`1h 0m left before your daily attention goal.`) or exceeded (`Exceeded daily attention goal by 45m.`).
  - Evaluates per-app daily allowances, presenting status as `${appUsage} / ${ruleLimit}` (e.g., `38m / 45m`) and highlighting over-limit apps in danger red.
- **Week View**:
  - Aggregates the 7-day window (`usage.week.reduce((acc, curr) => acc + curr.ms, 0)`) against the 21-hour baseline weekly target.
  - Displays pure app usage durations without confusing daily limit comparisons.

### 3. SVG-Free 60fps Proportional Bar Chart
Rather than introducing heavy third-party charting libraries (which add bundle size and risk Hermes/Fabric compilation breaks), the 7-day bar chart is constructed using standard React Native `View` flexbox styles:
- **Proportional height formula**: `Math.max(8, Math.round((dayMs / maxMs) * chartHeight))`, where `maxMs = Math.max(...weekUsage.map(w => w.ms), dailyGoalMs, 1)`.
- **Active day styling**: Today's bar is emphasized with `brandPrimary`, while past days use `surfaceMuted`.
- **Trend pill**: Compares today vs yesterday, showing `↓ X% vs yesterday` (green) or `↑ X% vs yesterday` (neutral).

### 4. Non-Judgmental Psychological Framing
In line with Restrainify's core design philosophy, screen time is treated as an attention budget rather than a moral score:
- Zero em dashes (`—`) are used in UI copy (standardizing on hyphens or clear prepositional phrases).
- Reassurance card explicitly clarifies: *"Restrainify measures attention to help you build calm daily boundaries. Time spent in essential tools is not treated as a personal setback."*

### 5. Home Screen Entry Point Wiring & Touch Isolation
- In `DashboardMetrics.tsx`: The Screen Time metric card is wrapped in a `Pressable` that invokes `onOpenScreenTime` (`open("screen-time")`).
- In `AttentionTrendCard.tsx`: The entire 7-day trend card is pressable and navigates to `open("screen-time")`.
- In `OfflineNavigator.tsx`: `"screen-time"` is registered as a top-level subscreen, excluded from generic back-button duplication, and integrated with Android hardware back button dispatching.
- In `ScreenTimeScreen.tsx`: Tapping any app row invokes `open("apps")` to jump directly into the app limit configuration editor.

## Alternatives Considered

| Alternative | Pros | Cons | Reason for Rejection |
|---|---|---|---|
| **Option A: In-Memory JS Session Tracker** | Pure React Native, no native permissions required. | Misses all usage outside the app; stops on sleep/reboot; drains battery if kept alive in background. | Untruthful and unreliable; violates the core principle of Truthful Native State. |
| **Option B: Third-Party Native Charting Library (e.g. Victory, react-native-svg-charts)** | Built-in animated transitions and axes. | Heavy bundle size (500KB+); frequent React Native New Architecture compatibility breaks; high memory footprint. | Overkill for a 7-bar chart. Simple proportional flexbox views render at 60fps with zero dependencies. |
| **Option C: Native Android UsageStats + Proportional Flexbox Chart (Selected)** | 100% truthful OS-level data; zero extra dependencies; instant 60fps rendering; graceful permission fallback. | Requires `PACKAGE_USAGE_STATS` permission on Android. | The only truthful, robust, and lightweight approach for production Android. |

## Consequences

- Screen time reporting is completely truthful, tamper-resistant, and battery-efficient.
- The UI renders smoothly across low-end and high-end Android hardware without external chart dependencies.
- Users have intuitive drill-downs from both the Home metrics grid and the attention trend card into detailed app breakdowns.
