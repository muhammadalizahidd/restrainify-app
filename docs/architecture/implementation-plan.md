# Initial Scaffold Implementation Plan

## Requested Behavior

Create the initial project structure for Restrainify V1 after reviewing all provided instructions and making them the default implementation references.

## Requirements Used

- `AGENT.md`: plan before code, inspect before implementation, scope discipline, security/privacy, truthful reporting.
- `DESIGN.md`: React Native UI must follow Restrainify brand tokens, calm mobile dashboard hierarchy, Phosphor icons, truthful protection states.
- Product PRD: Android-first, local protection, dashboard, web/visual/app controls, recovery, Burst, daily reward, accounts, sync, optional Fap Tracker.
- Technical PRD: React Native + Kotlin + Room/SQLCipher, external `restrainify.com` backend, Supabase Auth/PostgreSQL, TFLite, offline-first sync, native protection truth.

## Affected Areas

- Repository workspace layout.
- Mobile app presentation, design tokens, feature folders, native bridge contracts.
- Android native Kotlin ownership placeholders.
- Mobile-to-external-backend API boundaries.
- Shared contracts.
- Supabase migration/RLS structure.
- Testing, security, and decision records.

## Current Implementation Inspected

The repository contained only the four markdown source documents. No existing implementation, tests, package manifests, or git metadata were present.

## Approach

Create a conservative monorepo scaffold that expresses ownership boundaries without hard-coding unresolved runtime/library versions. Add typed contracts and documentation that prevent accidental violations of privacy, native ownership, and truthful status requirements.

## Edge Cases And Constraints

- Offline protection must remain useful without sync.
- UI must not show trusted protection state until native reconciliation succeeds.
- Raw visual frames must never be stored, logged, or sent to the server.
- Android permissions must have plain-language disclosure and graceful denial states.
- Exact Burst durations, Strict Mode cooldowns, Android version matrix, ML thresholds, and dependency versions remain unresolved.

## Security And Privacy

Security-sensitive surfaces are documented but not implemented. Future implementation must include Supabase ownership/RLS, authenticated API routes in the separate web repo, idempotent sync, SQLCipher local storage, model validation, and no sensitive logging.

## Verification

Initial scaffold verification should include file listing and JSON syntax checks. Full builds cannot run until dependency versions are selected and packages are installed.

---

# Milestone: Expo Tooling & React Native New Architecture Baseline (2026-09-05)

## Summary of Changes

1. **Expo Tooling Adoption (Bare Workflow):** Integrated Expo SDK 57 tooling (`expo@57.0.20`, `expo-dev-client@57.0.18`, `babel-preset-expo@57.0.10`) into the bare React Native project.
2. **React Native Baseline:** Aligned on React Native `0.86.3` and React `19.2.3` (resolving upstream Metro `image-size` high-severity vulnerabilities).
3. **Android Toolchain:** Configured AGP `8.12.0`, Gradle `9.3.1`, Kotlin `2.1.20`, compile/target SDK `36`, and NDK `27.1.12297006`.
4. **React New Architecture:** Enabled by default (legacy `newArchEnabled=false` removed). Hand-maintained Android entry points implemented via `reactHost` (`ExpoReactHostFactory.getDefaultReactHost`), `loadReactNative`, `fabricEnabled`, and `ReactActivityDelegateWrapper`.
5. **Decisions & Audit:** Recorded in `ADR-0003-adopt-expo-tooling.md`, superseding `ADR-0002` and resolving `ADR-0001`. Security status recorded in `docs/security/dependency-audit.md`.

---

# Milestone: Domain 1 Delivery & Recovery Progress (2026-09-10)

## Summary of Completed Screens

1. **MAIN-01 (Home Dashboard):** Implemented header brand area, `MomentumHeroCard` with native `RestrainifyProgressRing`, `DashboardMetrics` at-a-glance tiles, `QuickProtectionGrid`, `AttentionTrendCard` 7-day usage chart, and `BurstActionCard` crisis trigger.
2. **TOOL-02 (Protection Health):** Real-time device health reporting across VPN, Accessibility, UsageStats, and Battery optimization, truthfully mapping native capability states.
3. **BURST-01 (Burst Active):** Immediate high-urgency crisis mode with countdown timer orb, pattern interrupt grounding, and strict anti-bypass cooldown.
4. **BURST-02 (Burst Outcome):** Urge outcome recording ("I resisted it" vs "I didn't") completing the intervention without erasing past streaks.
5. **PROG-02 (Recovery Progress & Calendar):** Rolling 30-day recovery calendar with Monday-first weekday alignment (`M T W T F S S`), color-coded clean/relapse indicators, 3-metric summary (`Longest`, `Resisted`, `Blocked`), native progress ring (`cleanDays / 30`), and preserved historical streak timeline.
6. **PROG-03 (Screen Time Breakdown):** Daily and weekly digital attention budgeting hero card, SVG-free 60fps proportional 7-day usage bar chart with weekday initials and delta percentage pill, per-app foreground time accounting compared against daily allowances (`38m / 45m`), and truthful permission gates linking to Android Usage Access Settings.

## Architectural & Native Backend Integrations

- **Native Room Contracts & OS Services:** Bound directly to `OfflineRuntime.kt`, Room DAOs, `Policy.recovery()`, and Android `UsageStatsManager` / `AppOpsManager`.
- **Navigation Integration:** Connected `MomentumHeroCard` tap target to `open("recovery-progress")`, `DashboardMetrics` and `AttentionTrendCard` tap targets to `open("screen-time")`, with hardware back button support in `OfflineNavigator.tsx`.
- **Automated Verification:** 6 Jest test suites passing (52 unit tests), 0 TypeScript errors, 0 ESLint warnings. Documented in `ADR-0004` and `ADR-0005`.

---

# Milestone: Domain 2 Phase 1 Delivery (2026-09-11)

## Summary of Completed Screens

1. **PROG-01 (Progress Overview):** Primary anchor for the "Progress" persistent bottom navigation tab. Features the Recovery Pulse Hero Card (30-day clean days, current streak, longest streak, urges resisted), 2-column quick drill-down tiles (`Porn-free days` $\rightarrow$ `PROG-02`, `Time reclaimed` $\rightarrow$ `PROG-03`), monthly Protection Impact counters (`Adult sites blocked`, `Risky visuals covered`, `Burst interventions`), and 7-day Attention Trend bar chart with day-over-day delta pills.
2. **JOUR-01 (Recovery Journal Hub):** Primary anchor for the "Journal" persistent bottom navigation tab. Organizes structured recovery events into relative date sections (`Today`, `Yesterday`, and calendar dates). Displays status badges (`Resisted`, `Completed`, `Relapse`), timestamps, trigger notes, inline "Mark resisted" command action, and dedicated navigation card to the opt-in Fap Tracker (`JOUR-04`).
3. **JOUR-02 (Log an Urge):** Frictionless temptation capture subscreen with 2-choice goal card selector ("I resisted it" vs "I didn't"), optional trigger/context textarea with 500-character limit counter, baseline timestamp validation, and transactional Room DB write via native bridge command `command("event")`.

## Architectural & Native Backend Integrations

- **Feature Modularization:** Established clean separation between `features/recovery` (analytics & pulse) and `features/journal` (event timeline & transactional logging).
- **Native Room Contracts:** Directly mapped to `OfflineRuntime.kt:199` (`recovery` stats), `OfflineRuntime.kt:182-197` (`UsageStatsManager`), `OfflineRuntime.kt:192` (`dao.events()`), `OfflineRuntime.kt:146` (`dao.resist()`), and `OfflineRuntime.kt:125-135` (`command("event")`).
- **Navigation Wiring:** Connected in `OfflineNavigator.tsx` with hardware back press handling and subscreen back actions.
- **Automated Verification:** 10 Jest test suites passing (92 unit tests), 0 TypeScript errors, 0 ESLint warnings. Documented in `ADR-0008`.

---

# Milestone: Domain 2 Phase 2 Delivery (2026-09-11)

## Summary of Completed Screens

1. **JOUR-03 (Log a Relapse):** Transactional setback logging subscreen featuring a prominent history preservation notice, formatted date/time, trigger note textarea with 500-character counter, and a mandatory confirmation alert before database mutation. Resets current streak calculation while strictly preserving historical clean records and longest streaks.
2. **JOUR-04 (Fap Tracker Hub):** Optional, user-controlled tracker interface with 3-period metric grid (`Today`, `This week`, `This month`), event history timeline, and explicit notice that tracker records do not alter device protection filters. Features a graceful in-place enablement state for disabled tracker mode.
3. **JOUR-05 (Log Tracker Event):** Frictionless 1-tap timestamp recorder for the opt-in tracker, persisting directly to encrypted Room database.

## Architectural & Native Backend Integrations

- **Feature Modularization:** Housed tracker screens within `apps/mobile/src/features/fapTracker/`, maintaining architectural independence from core recovery systems.
- **Native Room Contracts:** Directly mapped to `OfflineRuntime.kt:125-135` (`command("event")` for `"relapse"` and `"tracker"`), `OfflineRuntime.kt:73` (`command("setting", { key: "trackerEnabled" })`), and Room DAO event filtering.
- **Navigation Wiring:** Mounted `log-relapse`, `fap-tracker`, `tracker`, and `log-fap` in `OfflineNavigator.tsx`.
- **Automated Verification:** 12 Jest test suites passing (102 unit tests), 0 TypeScript errors, 0 ESLint warnings. Documented in `ADR-0009`.


