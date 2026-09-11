# ADR-0013: Domain 5 (System & Enforcement Overlays) Architecture

## Status
Accepted and Implemented

## Date
2026-09-12

## Context
Domain 5 of the Restrainify mobile application provides real-time device enforcement states, camera blur covers, pre-permission plain-language disclosures, and truthful capability degradation explainers across 8 dedicated screens (`STATE-01` through `STATE-08`).

Prior to this work, while native background restrictions existed in Kotlin (`RestrictionService.kt`), the corresponding React Native presentation layer lacked dedicated full-screen overlay components, explicit capability repair paths, feed-level block states, and non-blocking offline sync resilience screens.

Delivering Domain 5 completes the full 5-Domain roadmap of the Restrainify mobile specification (52 of 52 screens complete, 100% DONE), conforming strictly to `DESIGN.md`, `AGENT.md`, `SCREEN_ROADMAP_AND_TRACKER.md`, and the master HTML specification.

The 8 screens built:
1. `STATE-01`: **Pre-Permission Disclosure** (`PermissionDisclosureScreen.tsx`)
2. `STATE-02`: **Permission Denied Fallback** (`PermissionDeniedScreen.tsx`)
3. `STATE-03`: **Degraded State Repair** (`DegradedStateScreen.tsx`)
4. `STATE-04`: **App Limit Reached** (`AppLimitReachedScreen.tsx`)
5. `STATE-05`: **Scheduled Block Overlay** (`ScheduledBlockScreen.tsx`)
6. `STATE-06`: **Short-Form Feed Block** (`ShortFormBlockScreen.tsx`)
7. `STATE-07`: **Offline / Sync Issue** (`SyncIssueScreen.tsx`)
8. `STATE-08`: **Visual Content Cover** (`VisualCoverScreen.tsx`)

---

## Decisions & Architectural Tradeoffs

### 1. Template Pattern via Reusable `EnforcementBlockCard`
Instead of duplicating the full-screen centered blocking card layout across 5 screens (`STATE-01`, `STATE-02`, `STATE-04`, `STATE-05`, `STATE-06`), we extracted `EnforcementBlockCard.tsx`.
- Matches the Orbit / Clarity `block-screen` and `block-card` specifications in `DESIGN.md`.
- Enforces consistent typography, icon badge sizing (`block-icon`), uppercase eyebrow kicker, bold display headers, optional prominent numeric values (`block-value`), and high-contrast action button stacks.
- Reduces UI boilerplate by >40% and guarantees design cohesion.

### 2. Native Intent Mapping & Truthful Capability Reporting
Conforming to `AGENT.md` Section 26 ("Truthful System Status"):
- `STATE-01` (`PermissionDisclosureScreen`) directly invokes `offlineProtection.settings(kind)` to transition into the relevant Android OS activity (`Settings.ACTION_USAGE_ACCESS_SETTINGS`, `ACTION_ACCESSIBILITY_SETTINGS`, or VPN consent).
- `STATE-02` (`PermissionDeniedScreen`) informs the user when a permission was rejected and provides an explicit "Continue with partial protection" path rather than faking active protection.
- `STATE-03` (`DegradedStateScreen`) maps to live device capability flags (`snapshot.capabilities.vpnError`, `capabilities.usage`, `capabilities.accessibility`), providing a 1-tap repair route.

### 3. Strict Anti-Bypass Friction Integration
- When an app limit expires (`STATE-04`), requesting an override routes to `pending-change` (`STATE-STRICT-02`), invoking the anti-impulse cooldown timer.
- Scheduled blocks (`STATE-05`) are bound to `Policy.scheduled()` and link to `app-limit` (`SET-APP-02`) rather than permitting bypass.
- Short-form feed blocks (`STATE-06`) enforce feed isolation without blocking utility applications.

### 4. Non-Blocking Local-First Sync Resilience
Conforming to `AGENT.md` Section 15 ("Offline and Synchronization"):
- `STATE-07` (`SyncIssueScreen`) treats network disconnection as a routine operating state.
- Local encrypted SQLCipher storage remains authoritative; protection and tracking continue uninterrupted.
- "Retry sync" re-evaluates the queue without risking data loss.

### 5. On-Device Ephemeral Vision Privacy Invariants
Conforming to `AGENT.md` Section 8 ("Privacy"):
- `STATE-08` (`VisualCoverScreen`) demonstrates the real-time on-screen blur overlay placed over detected explicit imagery.
- Guarantees zero frame persistence in storage, zero screenshot history, and zero external cloud vision processing.

---

## Verification & Self-Evaluation Results

1. **TypeScript Typecheck:** `npm run typecheck --workspaces` (0 errors).
2. **Jest Unit Tests:** `npm test --workspaces` (19 test suites passed, 166 tests passing).
3. **ESLint Static Analysis:** `npm run lint --workspaces` (0 warnings, 0 errors).
4. **Specification Alignment:** 52 / 52 screens verified in [SCREEN_ROADMAP_AND_TRACKER.md](file:///d:/Restrainify/restrainify-app/docs/architecture/SCREEN_ROADMAP_AND_TRACKER.md).
