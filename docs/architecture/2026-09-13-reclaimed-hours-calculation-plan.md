# Implementation Plan: Dynamic "Time Reclaimed" Calculation

## 1. Requested Behavior or Problem
In `PROG-01` (Progress Overview Screen), the "Time reclaimed" tile currently displays a hardcoded `11h` because:
1. `apps/mobile/src/features/recovery/screens/ProgressOverviewScreen.tsx:73` passes `reclaimedHours={11}` as a hardcoded static prop.
2. `apps/mobile/src/features/recovery/components/ProgressMetricDrilldown.tsx:20` defaults `reclaimedHours = 11`.

This violates `AGENT.md` Section 26 ("Truthful System Status: Never present state that does not reflect authoritative system state"). The metric should instead be dynamically computed from live Android `UsageStatsManager` data.

## 2. Relevant Requirements
- `AGENT.md` Section 26: Truthful System Status (accurate, non-fabricated metrics; truthful degraded states when permissions are missing).
- `DESIGN.md`: Calm, non-punitive digital wellbeing framing; zero em dashes.
- `Restrainify_V1_Product_PRD.md` Section 3.6 (FR-APP-001 to FR-APP-004): Daily and weekly screen time and attention budgeting.
- `ADR-0005`: Screen Time Breakdown, Native UsageStats Integration, and Attention Budgeting Architecture (standard 3-hour daily / 21-hour weekly baseline target).

## 3. Files to Create and Modify
- `apps/mobile/src/features/recovery/utils/attentionReclaimed.ts` (New): Utility module providing `computeReclaimedHours(weekUsage, dailyGoalMs, hasUsagePermission)`.
- `apps/mobile/src/features/recovery/screens/ProgressOverviewScreen.tsx`: Import `computeReclaimedHours` and dynamically derive `reclaimedHours` from `data.usage.week`, `data.capabilities.usage`, and the 3h daily attention target.
- `apps/mobile/src/features/recovery/components/ProgressMetricDrilldown.tsx`: Change default prop from `11` to `0`.
- `apps/mobile/src/features/recovery/__tests__/ProgressOverview.test.ts`: Add comprehensive unit test coverage for `computeReclaimedHours`.

## 4. Current Implementation Inspected
- In `ProgressOverviewScreen.tsx`:
  - `const weekUsage = data.usage.week;` (Array of `{ day: string; ms: number }`).
  - `data.capabilities.usage` (boolean flag for `AppOpsManager.OPSTR_GET_USAGE_STATS`).
  - Line 73 passes `reclaimedHours={11}`.
- In `ProgressMetricDrilldown.tsx`:
  - Line 20: `reclaimedHours = 11`.
  - Line 73: displays `{reclaimedHours}h`.
  - Line 76: subtext `Compared with your baseline`.

## 5. Proposed Calculation Logic
Given:
- `weekUsage`: List of $N$ daily records ($N \le 7$).
- `dailyGoalMs`: Daily attention target (default 3 hours = $10,800,000$ ms).
- `hasUsagePermission`: Boolean from `capabilities.usage`.

Formula:
1. If `!hasUsagePermission` or `!weekUsage || weekUsage.length === 0`: return `0`.
2. Total budget across recorded days: $T_{\text{budget}} = N \times \text{dailyGoalMs}$.
3. Total actual usage across recorded days: $T_{\text{actual}} = \sum \max(0, \text{day}.\text{ms})$.
4. Reclaimed time in milliseconds: $T_{\text{reclaimed}} = \max(0, T_{\text{budget}} - T_{\text{actual}})$.
5. Reclaimed hours: $\text{round}(T_{\text{reclaimed}} / (3600 \times 1000))$.

Example:
For a 7-day window with standard 3h/day baseline budget ($21$ hours total):
If user's total week usage was 10 hours, reclaimed hours = $21 - 10 = 11$ hours.
If user's total week usage exceeded 21 hours, reclaimed hours = $0$ hours.

## 6. Important Edge Cases
- **No usage permission granted:** Returns `0` (never fabricates non-zero metrics without permission).
- **Empty `weekUsage` array:** Returns `0`.
- **Usage exceeds budget:** Clamped at `0` (non-negative; attention reclaimed cannot be negative).
- **Negative `day.ms` in corrupted data:** Clamped at `0` per day.
- **Partial week (e.g. 3 days recorded after install):** Scaled proportionally to available days ($3 \times 3\text{h} = 9\text{h}$ budget).

## 7. Security and Privacy Implications
- Fully local on-device calculation. No external API calls, logging, or frame captures.

## 8. Verification Plan
- Unit tests in `ProgressOverview.test.ts` covering:
  - Standard weekly usage under budget (e.g., 10h used out of 21h budget -> 11h reclaimed).
  - Exact match with budget -> 0h.
  - Usage exceeding budget -> 0h clamped.
  - Empty or missing week array -> 0h.
  - Missing usage permission -> 0h.
  - Partial week (e.g. 2 days recorded).
- `npm run lint --workspaces` (0 errors, 0 warnings).
- `npm run typecheck --workspaces` (0 errors).
- `npm test --workspaces` (all test suites passing).
- `jj --no-pager status` verification (no `jj describe` without user confirmation).
