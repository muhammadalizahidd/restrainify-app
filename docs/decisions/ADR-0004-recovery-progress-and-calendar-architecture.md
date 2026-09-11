# ADR-0004: Recovery Progress Modeling, Rolling 30-Day Calendar, and Non-Destructive Streak Architecture

## Status

Accepted

## Date

2026-09-10

## Context

Recovery and habit-control applications traditionally rely on an all-or-nothing streak counter. Behavioral research and user feedback demonstrate that when a single slip-up resets a streak to zero, users frequently experience the "abstinence violation effect"—feeling that weeks of effort have been erased, which often triggers relapse spirals and product abandonment.

Furthermore, `PROG-02: Recovery Progress & Calendar Screen` requires:
1. Truthful visualization of the user's recovery progress directly mapped to the Kotlin native Room database (`OfflineRuntime.kt` and `Policy.kt`).
2. A 30-day calendar matrix displaying clean days, relapse days, pre-baseline days, and today's status aligned to day-of-week headers (`M T W T F S S`).
3. Preserving historical streak achievements (e.g., longest streak) even after a current streak reset.
4. Smooth navigation from the Home Dashboard Momentum Hero Card (`MAIN-01`) with complete back-stack support.

## Decision

We adopt a **non-destructive, multi-metric recovery model** with a rolling 30-day calendar window:

### 1. Multi-Dimensional Recovery Metrics
Instead of a single integer streak, recovery is modeled across four native-backed dimensions:
- **`recovery.current`**: The active clean streak since the last recorded relapse or baseline start date.
- **`recovery.longest`**: The historical personal best streak across all recorded events.
- **`recovery.cleanDays`**: Total clean days in the rolling 30-day window (`Policy.recovery(start, today, relapses)`).
- **`settings.recoveryStart`**: The baseline date initializing recovery tracking (`YYYY-MM-DD`).

### 2. Rolling 30-Day Calendar Grid
- Displays the 30-day window ending on today (`today - 29 days` through `today`).
- Aligned to standard international Monday-first weekday headers (`M`, `T`, `W`, `T`, `F`, `S`, `S`) using the offset formula `(startDate.getDay() + 6) % 7`.
- Cells are state-classified into:
  - `clean`: Green background (`successSurface`) and green text (`success`).
  - `relapse`: Red background (`dangerSurface`) and red text (`danger`).
  - `before`: Muted surface (`surfaceMuted`) and muted text (`textMuted`) for days prior to `recoveryStart`.
  - `today`: Highlighted with an inset focus ring (`brandPrimary`).

### 3. Preserved Recovery History Timeline
- Displays the active streak alongside historical streaks (e.g., `Longest streak · 31 days`).
- Microcopy reinforces psychological safety: *"Restrainify never wipes out your recovery history. A difficult day does not erase the days that came before it."*

### 4. Navigation & Entry Point Wiring
- Tapping the upper 75% of the Home Screen `MomentumHeroCard` navigates to `PROG-02` (`open("recovery-progress")`).
- The daily reward claim button remains touch-isolated to prevent mis-navigation.
- Integrated into `OfflineNavigator.tsx` with dedicated subscreen back button and Android hardware back button handler.

## Alternatives Considered

| Alternative | Pros | Cons | Reason for Rejection |
|---|---|---|---|
| **Option A: Traditional Single Streak Counter** | Very simple to implement; single integer. | Causes psychological demoralization upon relapse; encourages cheating/hiding relapses; loses engagement. | Violates product core values of calm, non-judgmental, and truthful support. |
| **Option B: Full Month Calendar with Month Navigation** | Familiar month-by-month calendar view. | Introduces pagination state and date queries outside the 30-day Room calculation window; shifts focus away from the 30-day milestone. | Out of scope for V1 recovery focus; complicates offline-first data synchronization. |
| **Option C: Rolling 30-Day Calendar with Weekday Alignment (Selected)** | Direct 1:1 mapping with native `Policy.recovery()` 30-day window; zero pagination latency; clinically validated milestone frame. | Does not paginate to arbitrary past years without a separate journal drill-down. | Perfectly matches approved V1 specification and clinical recovery goals. |

## Consequences

- Recovery state is resilient against defeatist relapse spirals.
- The UI layer strictly consumes native Room state without maintaining independent mutable state.
- Automated tests in `RecoveryProgress.test.ts` verify windowing, offsets, and classifications deterministically with zero runtime regressions.
