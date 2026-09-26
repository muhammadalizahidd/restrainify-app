/**
 * Utility for computing attention / time reclaimed from Android UsageStats data.
 * Adheres to Restrainify's non-punitive digital wellbeing philosophy (ADR-0005)
 * and truthful reporting standards (AGENT.md Section 26).
 */

export const DEFAULT_DAILY_GOAL_MS = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

export interface DayUsageRecord {
  day: string;
  ms: number;
}

/**
 * Computes the total attention hours reclaimed over the recorded week window
 * compared against the daily attention target baseline.
 *
 * @param weekUsage Array of daily usage records ({ day: string, ms: number })
 * @param dailyGoalMs Target daily attention budget in milliseconds (default: 3h)
 * @param hasUsagePermission Whether the Android PACKAGE_USAGE_STATS permission is active
 * @returns Total integer hours reclaimed (clamped to >= 0)
 */
export function computeReclaimedHours(
  weekUsage?: DayUsageRecord[] | null,
  dailyGoalMs: number = DEFAULT_DAILY_GOAL_MS,
  hasUsagePermission: boolean = true
): number {
  if (!hasUsagePermission || !weekUsage || weekUsage.length === 0) {
    return 0;
  }

  // Calculate total attention budget for the recorded days in the window
  const totalBudgetMs = weekUsage.length * Math.max(0, dailyGoalMs);

  // Sum actual usage across available days (sanitizing negative values)
  const totalUsageMs = weekUsage.reduce(
    (acc, curr) => acc + Math.max(0, curr.ms),
    0
  );

  // Time reclaimed is the positive delta between allocated budget and actual usage
  const reclaimedMs = Math.max(0, totalBudgetMs - totalUsageMs);

  // Return rounded integer hours
  return Math.round(reclaimedMs / (60 * 60 * 1000));
}
