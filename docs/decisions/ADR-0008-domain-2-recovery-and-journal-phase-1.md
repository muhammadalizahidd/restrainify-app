# ADR-0008: Domain 2 Phase 1 Architecture (Progress Overview, Recovery Journal Hub, and Log Urge)

## Status

Accepted

## Date

2026-09-11

## Context

Domain 2 ("Recovery & Journal Domain") provides structured recovery tracking, crisis management tools, and urge/relapse logging without diary bloat. The user needs actionable visibility into their behavioral recovery patterns and a frictionless way to record urge occurrences and outcomes.

The first three screens of Domain 2 establish the core anchors for the persistent "Progress" and "Journal" navigation tabs:
1. `PROG-01` **Progress Overview**: Landing screen for the persistent "Progress" bottom navigation tab. Combines recovery momentum analytics, 30-day clean days pulse, quick drill-down navigation cards, monthly protection impact counters, and a 7-day attention trend bar chart.
2. `JOUR-01` **Recovery Journal Hub**: Landing screen for the persistent "Journal" bottom navigation tab. Replaces generic diary writing with structured behavioral events bucketed into relative calendar periods (`Today`, `Yesterday`, and earlier dates), displaying urge outcomes, burst completions, and relapses with status pills and inline resistance marking.
3. `JOUR-02` **Log an Urge**: Dedicated subscreen for capturing an urge event in the moment with a binary choice ("I resisted it" vs "I didn't"), optional trigger/context notes (up to 500 characters), and validation against the user's recovery baseline date.

## Decision

We implement these three screens using modular feature boundaries, pure functional event processing, and direct mapping to encrypted Room storage in Android native code:

### 1. Feature Layer Separation (`features/recovery` vs `features/journal`)
- To prevent architectural conflation between high-level momentum analytics and transactional event capture, we organize:
  - `apps/mobile/src/features/recovery/`: Focused on recovery pulse, calendar, and digital attention analytics (`PROG-01`, `PROG-02`).
  - `apps/mobile/src/features/journal/`: Dedicated to event timeline streams, urge logging, relapse logging, and tracker entries (`JOUR-01`, `JOUR-02`, `JOUR-03`).

### 2. Direct Native Backend Function Mapping
- **`PROG-01` (Progress Overview)**:
  - Bound to `snapshot.recovery.cleanDays`, `snapshot.recovery.current`, and `snapshot.recovery.longest` (`OfflineRuntime.kt:199`).
  - Resisted urges count derived by filtering `snapshot.events` where `(kind == 'urge' || kind == 'burst') && resisted == true`.
  - Attention trend bound to `snapshot.usage.todayMs` and 7-day history `snapshot.usage.week` (`OfflineRuntime.kt:182-197`).
  - Monthly protection impact reads `snapshot.blockedToday` (`DailyRecord.blocked`).
  - Drill-down tiles route to `"recovery-progress"` (`PROG-02`) and `"screen-time"` (`PROG-03`).
- **`JOUR-01` (Recovery Journal Hub)**:
  - Timeline stream groups `snapshot.events` into relative date buckets (`Today`, `Yesterday`, formatted date) using `journalUtils.ts`.
  - Excludes private tracker events (`kind == 'tracker'`), maintaining strict uncoupling between recovery and optional trackers.
  - Interactive "Mark resisted" button commands `command("resist", { id })` (`OfflineRuntime.kt:146`).
  - Bottom navigation tile routes to `"fap-tracker"` (`JOUR-04`), reflecting `snapshot.settings.trackerEnabled`.
- **`JOUR-02` (Log an Urge)**:
  - Binary outcome selector: `resisted: true` ("I resisted it") vs `resisted: false` ("I didn't").
  - Form validation: enforces non-future timestamps, rejection of dates prior to `recoveryStart`, and 500-character note limit.
  - Submits transaction to Room database via `command("event", { kind: "urge", timestamp, note, resisted })` (`OfflineRuntime.kt:125-135`).

### 3. Design System Alignment (`DESIGN.md`)
- Adheres to Orbit / Clarity design tokens: Space Grotesk typography, calm neutral surfaces (`surfacePrimary`), subtle borders (`borderSubtle`), and no unapproved decorative AI gradients.
- Semantic color mapping: Trust blue `#254C91` for active brand highlights, green `#1F6B4B` / `successSurface` for resisted urges and clean days, danger red `#B64E55` / `dangerSurface` for relapse indicators.
- Phosphor vector icons with consistent optical weights: `chart-timeline-variant`, `timer-outline`, `notebook-outline`, `alert-circle-outline`, and `check`.

### 4. Navigation Stack Integration
- `OfflineNavigator.tsx`:
  - `case "progress":` maps to `<ProgressOverviewScreen open={open} />`.
  - `case "journal":` maps to `<RecoveryJournalScreen open={open} />`.
  - `case "log-urge":` maps to `<LogUrgeScreen open={open} onBack={back} />`.

## Consequences

- Domain 2 reaches 30% completion (3 of 10 screens complete).
- Overall Restrainify V1 screen implementation advances to 29.8% (14 of 47 screens complete).
- Persistent bottom navigation tabs "Progress" and "Journal" are fully backed by production components and live native data.
- Full test coverage verified with 10 Jest test suites (92 passing tests), 0 TypeScript errors, and 0 ESLint warnings.
