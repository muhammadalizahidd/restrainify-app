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
