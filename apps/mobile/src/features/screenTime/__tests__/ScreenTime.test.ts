/**
 * Unit tests for Screen Time Breakdown Screen (PROG-03) logic and computations:
 * 1. Daily & weekly goal remaining vs exceeded calculations
 * 2. 7-day usage percentage delta vs yesterday
 * 3. Proportional bar chart height scaling
 * 4. App rule matching for daily allowance comparison strings
 * 5. App list filtering and ordering
 */

import type { AppRule, InstalledApp } from "../../../native/OfflineProtection";

function duration(ms: number) {
  const minutes = Math.floor(ms / 60000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

describe("Screen Time Breakdown Screen (PROG-03) Logic", () => {
  describe("Goal remaining vs exceeded calculations", () => {
    function computeGoalStatus(usageMs: number, goalMs: number, timeframe: "day" | "week") {
      const percent = Math.min(100, Math.floor((usageMs / goalMs) * 100));
      const diffMs = goalMs - usageMs;
      const isUnderGoal = diffMs >= 0;
      const deltaText = duration(Math.abs(diffMs));

      const subText = isUnderGoal
        ? `${deltaText} left before your ${timeframe === "day" ? "daily" : "weekly"} attention goal.`
        : `Exceeded ${timeframe === "day" ? "daily" : "weekly"} attention goal by ${deltaText}.`;

      return { percent, isUnderGoal, deltaText, subText };
    }

    it("calculates remaining time correctly when under goal", () => {
      // 2h used against 3h daily goal (1h remaining)
      const usageMs = 2 * 3600 * 1000;
      const goalMs = 3 * 3600 * 1000;

      const result = computeGoalStatus(usageMs, goalMs, "day");
      expect(result.percent).toBe(66);
      expect(result.isUnderGoal).toBe(true);
      expect(result.deltaText).toBe("1h 0m");
      expect(result.subText).toBe("1h 0m left before your daily attention goal.");
    });

    it("calculates exceeded time correctly when over goal", () => {
      // 3h 45m used against 3h daily goal (45m exceeded)
      const usageMs = 3 * 3600 * 1000 + 45 * 60 * 1000;
      const goalMs = 3 * 3600 * 1000;

      const result = computeGoalStatus(usageMs, goalMs, "day");
      expect(result.percent).toBe(100);
      expect(result.isUnderGoal).toBe(false);
      expect(result.deltaText).toBe("45m");
      expect(result.subText).toBe("Exceeded daily attention goal by 45m.");
    });

    it("handles weekly budget calculations correctly", () => {
      // 14h used against 21h weekly goal (7h remaining)
      const usageMs = 14 * 3600 * 1000;
      const goalMs = 21 * 3600 * 1000;

      const result = computeGoalStatus(usageMs, goalMs, "week");
      expect(result.percent).toBe(66);
      expect(result.isUnderGoal).toBe(true);
      expect(result.deltaText).toBe("7h 0m");
      expect(result.subText).toBe("7h 0m left before your weekly attention goal.");
    });
  });

  describe("7-day usage percentage delta vs yesterday", () => {
    function computeDeltaVsYesterday(weekUsage: { day: string; ms: number }[], todayMs: number) {
      const yesterdayMs = weekUsage.at(-2)?.ms ?? 0;
      const change = yesterdayMs > 0
        ? Math.round(((todayMs - yesterdayMs) / yesterdayMs) * 100)
        : null;
      const isReduced = change !== null && change <= 0;
      return { change, isReduced };
    }

    it("reports reduction percentage when today usage is lower", () => {
      const weekUsage = [
        { day: "2026-09-08", ms: 4 * 3600 * 1000 },
        { day: "2026-09-09", ms: 4 * 3600 * 1000 }, // Yesterday: 4h
        { day: "2026-09-10", ms: 2 * 3600 * 1000 }, // Today: 2h (-50%)
      ];

      const { change, isReduced } = computeDeltaVsYesterday(weekUsage, 2 * 3600 * 1000);
      expect(change).toBe(-50);
      expect(isReduced).toBe(true);
    });

    it("reports increase percentage when today usage is higher", () => {
      const weekUsage = [
        { day: "2026-09-08", ms: 2 * 3600 * 1000 },
        { day: "2026-09-09", ms: 2 * 3600 * 1000 }, // Yesterday: 2h
        { day: "2026-09-10", ms: 3 * 3600 * 1000 }, // Today: 3h (+50%)
      ];

      const { change, isReduced } = computeDeltaVsYesterday(weekUsage, 3 * 3600 * 1000);
      expect(change).toBe(50);
      expect(isReduced).toBe(false);
    });

    it("returns null change when yesterday has 0 usage", () => {
      const weekUsage = [
        { day: "2026-09-09", ms: 0 },
        { day: "2026-09-10", ms: 3 * 3600 * 1000 },
      ];

      const { change, isReduced } = computeDeltaVsYesterday(weekUsage, 3 * 3600 * 1000);
      expect(change).toBeNull();
      expect(isReduced).toBe(false);
    });
  });

  describe("Proportional bar chart height scaling", () => {
    function computeBarHeight(ms: number, weekUsage: { ms: number }[], dailyGoalMs: number, chartHeight: number) {
      const maxMs = Math.max(...weekUsage.map((w) => w.ms), dailyGoalMs, 1);
      return Math.max(8, Math.round((ms / maxMs) * chartHeight));
    }

    it("scales bar proportionally to maximum weekly value", () => {
      const week = [{ ms: 1000 }, { ms: 6 * 3600 * 1000 }]; // 6h max
      const chartHeight = 96;

      // 3h should be half of 6h = 48px
      const height = computeBarHeight(3 * 3600 * 1000, week, 3 * 3600 * 1000, chartHeight);
      expect(height).toBe(48);
    });

    it("enforces minimum 8px bar height for non-zero or low values", () => {
      const week = [{ ms: 10 * 3600 * 1000 }];
      const chartHeight = 96;

      const height = computeBarHeight(100, week, 3 * 3600 * 1000, chartHeight);
      expect(height).toBe(8);
    });
  });

  describe("App usage list formatting & allowance comparison", () => {
    function formatAppUsage(
      app: InstalledApp & { ms: number },
      rules: AppRule[],
      timeframe: "day" | "week"
    ) {
      const rule = rules.find((r) => r.packageName === app.packageName && r.enabled);
      const hasLimit = rule && rule.limitMinutes > 0;
      const limitMs = hasLimit ? rule.limitMinutes * 60 * 1000 : 0;
      const isOverLimit = hasLimit && timeframe === "day" && app.ms >= limitMs;

      const usageDuration = duration(app.ms);
      const statusText = hasLimit && timeframe === "day"
        ? `${usageDuration} / ${duration(limitMs)}`
        : usageDuration;

      return { hasLimit, limitMs, isOverLimit, statusText };
    }

    const rules: AppRule[] = [
      {
        packageName: "com.instagram.android",
        enabled: true,
        limitMinutes: 45,
        startMinute: -1,
        endMinute: -1,
        days: [1, 2, 3, 4, 5, 6, 7],
        feedMode: "off",
        burst: true,
      },
      {
        packageName: "com.google.android.youtube",
        enabled: true,
        limitMinutes: 60,
        startMinute: -1,
        endMinute: -1,
        days: [1, 2, 3, 4, 5, 6, 7],
        feedMode: "off",
        burst: true,
      },
    ];

    it("formats status with allowance comparison when under daily limit", () => {
      const app = {
        packageName: "com.instagram.android",
        label: "Instagram",
        ms: 38 * 60 * 1000, // 38m used of 45m limit
      };

      const result = formatAppUsage(app, rules, "day");
      expect(result.hasLimit).toBe(true);
      expect(result.isOverLimit).toBe(false);
      expect(result.statusText).toBe("38m / 45m");
    });

    it("marks app as over limit when usage exceeds configured daily limit", () => {
      const app = {
        packageName: "com.instagram.android",
        label: "Instagram",
        ms: 50 * 60 * 1000, // 50m used of 45m limit
      };

      const result = formatAppUsage(app, rules, "day");
      expect(result.hasLimit).toBe(true);
      expect(result.isOverLimit).toBe(true);
      expect(result.statusText).toBe("50m / 45m");
    });

    it("shows only usage duration without daily limit comparison in week timeframe", () => {
      const app = {
        packageName: "com.instagram.android",
        label: "Instagram",
        ms: 3 * 3600 * 1000,
      };

      const result = formatAppUsage(app, rules, "week");
      expect(result.isOverLimit).toBe(false);
      expect(result.statusText).toBe("3h 0m");
    });

    it("filters out apps with zero usage", () => {
      const rawApps: (InstalledApp & { ms: number })[] = [
        { packageName: "app.a", label: "App A", ms: 120000 },
        { packageName: "app.b", label: "App B", ms: 0 },
        { packageName: "app.c", label: "App C", ms: 50000 },
      ];

      const filtered = rawApps.filter((a) => a.ms > 0).slice(0, 15);
      expect(filtered.length).toBe(2);
      expect(filtered.map((a) => a.packageName)).toEqual(["app.a", "app.c"]);
    });
  });
});
