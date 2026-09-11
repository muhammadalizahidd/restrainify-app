# Validation Strategy

The source technical PRD contains a testing and observability gap, so this document is a starting strategy rather than a canonical release matrix.

## Required Validation Areas

- Security validation.
- Privacy validation.
- Offline/online behavior.
- Sync idempotency and conflict handling.
- Android lifecycle and reboot behavior.
- OEM battery/service survival behavior.
- Visual-filter latency and false-positive measurement.
- App limits across date, reboot, and timezone changes.
- Accessibility, MediaProjection, VPN, notification, and Google Play policy review before release.

## Active Automated Test Suites

Every feature screen maintains dedicated unit tests in `apps/mobile/src/features/<feature>/__tests__/` verifying business logic, edge cases, and calculations:

1. **`HomeScreen.test.ts` (MAIN-01):** Momentum milestone calculations, cap limits, truthful capability health calculations, daily attention delta percentages.
2. **`ProtectionHealth.test.ts` (TOOL-02):** Truthful scoring matrix, individual capability statuses (VPN, Accessibility, Usage, Battery), repair route mappings.
3. **`BurstLogic.test.ts` (BURST-01, BURST-02):** Cooldown formatting, accessibility requirement checks, app selection validation, urge outcome idempotency.
4. **`RecoveryProgress.test.ts` (PROG-02):** 30-day rolling calendar windowing, Monday-first weekday offsets, day state classification (clean vs relapse vs pre-baseline vs today), personal best progress evaluation.
5. **`ScreenTime.test.ts` (PROG-03):** Day and week attention goal remaining vs exceeded calculations, 7-day usage percentage delta vs yesterday, proportional bar chart height scaling, app rule matching for daily allowance comparisons (`38m / 45m`), zero-usage app filtering.
6. **`appModel.test.ts` (Core):** Offline model invariants, snapshot parsing, command dispatching.

## Verification Protocol Per Feature Step

Before declaring any screen or feature complete:
- **Type Checking:** `npm run typecheck --workspace=@restrainify/mobile` (0 errors)
- **Unit Testing:** `npm test` (100% passing suites, 0 regressions)
- **Linting:** `npm run lint --workspace=@restrainify/mobile` (0 warnings, 0 errors)
- **Live Device:** Metro Fast Refresh validation on the active physical Android device (`npm run android`)

