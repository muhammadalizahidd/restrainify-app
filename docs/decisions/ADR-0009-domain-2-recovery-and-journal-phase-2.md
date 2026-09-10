# ADR-0009: Domain 2 Phase 2 Architecture (Log Relapse, Fap Tracker Hub, and Log Tracker Event)

## Status

Accepted

## Date

2026-09-11

## Context

Continuing Domain 2 ("Recovery & Journal Domain"), three key behavioral workflows require explicit architectural modeling:
1. `JOUR-03` **Log a Relapse**: Recording a setback without erasing past progress. The streak calculation must be reset, but historical clean days and longest streaks must remain intact. Users must be protected against accidental streak resets through a confirmation dialog.
2. `JOUR-04` **Fap Tracker Hub**: An optional, user-controlled tracker for personal behavioral records. Crucially, tracker events must be completely uncoupled from device protection filters (VPN, App limits, Visual blocking) to maintain privacy and autonomy.
3. `JOUR-05` **Log Tracker Event**: A minimal, frictionless timestamp logger for the opt-in tracker.

## Decision

We implement these three screens using modular feature isolation, explicit confirmation guards, and direct mapping to encrypted Room persistence:

### 1. Relapse Streak Recalculation & History Preservation Invariant
- **`JOUR-03` (Log a Relapse)**:
  - Invokes `command("event", { kind: "relapse", timestamp, note, resisted: false })` in `OfflineRuntime.kt:125-135`.
  - Recalculates `recovery.current` streak via `Policy.recovery()` while strictly preserving `recovery.longest` and past clean days.
  - Features an explicit confirmation dialog before database mutation: *"Record a relapse? Your current streak will be recalculated. Your history and longest streak will stay."*
  - Reassures the user that device protection settings remain unchanged by logging a relapse.

### 2. Strict Protection Uncoupling for Fap Tracker
- **`JOUR-04` (Fap Tracker Hub)** & **`JOUR-05` (Log Tracker Event)**:
  - Housed in a dedicated module `apps/mobile/src/features/fapTracker/` to prevent coupling with core recovery systems.
  - Queries `snapshot.events.filter(e => e.kind === "tracker")` across rolling time windows: Today, This week (last 7 days), and This month (last 30 days).
  - Displays a prominent compliance notice: *"Protection is separate — Tracker events do not automatically weaken or strengthen website/app protection."*
  - Gracefully handles disabled tracker state (`!snapshot.settings.trackerEnabled`) with an in-place enablement banner commanding `command("setting", { key: "trackerEnabled", value: true })`.
  - `JOUR-05` provides a 1-tap timestamp logger saving `kind: "tracker"` directly to Room storage.

### 3. Design System Alignment (`DESIGN.md`)
- Adheres to Orbit / Clarity design tokens: Space Grotesk typography, subtle borders (`borderSubtle`), neutral card surfaces (`surfacePrimary`), and Phosphor vector icons (`history`, `calendar-outline`, `alert-circle-outline`, `notebook-outline`, `clock-outline`).
- Semantic color mapping: Danger red `#B64E55` / `dangerSurface` used exclusively for relapse actions, and calm blue `#254C91` for active tracker elements.

### 4. Navigation Stack Integration
- `OfflineNavigator.tsx`:
  - `case "log-relapse":` mounts `<LogRelapseScreen open={open} onBack={back} />`.
  - `case "fap-tracker":` and `case "tracker":` mount `<FapTrackerScreen open={open} onBack={back} />`.
  - `case "log-fap":` mounts `<LogTrackerEventScreen open={open} onBack={back} />`.

## Consequences

- Domain 2 advances to 60% completion (6 of 10 screens complete).
- Overall Restrainify V1 screen implementation advances to 36.2% (17 of 47 screens complete).
- Full test coverage verified with 12 Jest test suites (102 passing tests), 0 TypeScript errors, and 0 ESLint warnings.
