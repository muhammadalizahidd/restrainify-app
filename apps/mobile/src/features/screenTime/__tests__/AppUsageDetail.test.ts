import type { AppRule } from "../../../native/OfflineProtection";
import {
  formatDuration,
  computeAppLimitStatus,
  computeAppSessionStats,
  computeAppWeeklyTrend,
} from "../utils/appUsageStats";

describe("App Usage Detail (PROG-04) Logic & Stats Derivation", () => {
  describe("formatDuration", () => {
    it("formats 0ms as 0m", () => {
      expect(formatDuration(0)).toBe("0m");
      expect(formatDuration(-100)).toBe("0m");
    });

    it("formats minutes accurately", () => {
      expect(formatDuration(38 * 60 * 1000)).toBe("38m");
      expect(formatDuration(59 * 60 * 1000)).toBe("59m");
    });

    it("formats hours and minutes accurately", () => {
      expect(formatDuration(60 * 60 * 1000)).toBe("1h");
      expect(formatDuration(75 * 60 * 1000)).toBe("1h 15m");
      expect(formatDuration(2 * 3600 * 1000 + 42 * 60 * 1000)).toBe("2h 42m");
    });
  });

  describe("computeAppLimitStatus", () => {
    const instagramRule: AppRule = {
      packageName: "com.instagram.android",
      enabled: true,
      limitMinutes: 45,
      startMinute: -1,
      endMinute: -1,
      days: [1, 2, 3, 4, 5, 6, 7],
      feedMode: "off",
      burst: true,
    };

    it("handles app with no rule configured", () => {
      const status = computeAppLimitStatus(38 * 60 * 1000, undefined);
      expect(status.hasLimit).toBe(false);
      expect(status.kickerRight).toBe("NO LIMIT");
      expect(status.progressPercent).toBe(0);
      expect(status.subtitle).toBe("38m recorded today. No daily limit configured.");
    });

    it("handles app with disabled rule", () => {
      const disabledRule = { ...instagramRule, enabled: false };
      const status = computeAppLimitStatus(38 * 60 * 1000, disabledRule);
      expect(status.hasLimit).toBe(false);
      expect(status.kickerRight).toBe("NO LIMIT");
    });

    it("handles app under configured daily limit", () => {
      // 38m used of 45m limit (7 minutes remain)
      const status = computeAppLimitStatus(38 * 60 * 1000, instagramRule);
      expect(status.hasLimit).toBe(true);
      expect(status.isOverLimit).toBe(false);
      expect(status.kickerRight).toBe("DAILY LIMIT");
      expect(status.progressPercent).toBe(84); // 38/45 = 84.4% -> 84%
      expect(status.subtitle).toBe("7 minutes remain on your 45 minute limit.");
    });

    it("handles exactly 1 minute remaining singular grammar", () => {
      // 44m used of 45m limit (1 minute remain)
      const status = computeAppLimitStatus(44 * 60 * 1000, instagramRule);
      expect(status.isOverLimit).toBe(false);
      expect(status.subtitle).toBe("1 minute remains on your 45 minute limit.");
    });

    it("handles app exceeding configured daily limit", () => {
      // 52m used of 45m limit (exceeded by 7 minutes)
      const status = computeAppLimitStatus(52 * 60 * 1000, instagramRule);
      expect(status.hasLimit).toBe(true);
      expect(status.isOverLimit).toBe(true);
      expect(status.progressPercent).toBe(100);
      expect(status.subtitle).toBe("Exceeded 45 minute limit by 7 minutes.");
    });
  });

  describe("computeAppSessionStats", () => {
    const mockWeek = [
      { day: "2026-09-04", ms: 3 * 3600 * 1000 },
      { day: "2026-09-05", ms: 4 * 3600 * 1000 },
      { day: "2026-09-06", ms: 2 * 3600 * 1000 },
      { day: "2026-09-07", ms: 3 * 3600 * 1000 },
      { day: "2026-09-08", ms: 4 * 3600 * 1000 },
      { day: "2026-09-09", ms: 3 * 3600 * 1000 },
      { day: "2026-09-10", ms: 2 * 3600 * 1000 },
    ];

    it("returns zero stats for zero usage", () => {
      const stats = computeAppSessionStats(0, mockWeek);
      expect(stats.sessions).toBe(0);
      expect(stats.longestSessionMs).toBe(0);
      expect(stats.formattedSessions).toBe("0");
      expect(stats.formattedLongest).toBe("0m");
      expect(stats.formattedAverage).toBe("0m");
    });

    it("derives sensible session frequency and durations for typical usage", () => {
      // 38m usage
      const stats = computeAppSessionStats(38 * 60 * 1000, mockWeek);
      expect(stats.sessions).toBeGreaterThanOrEqual(1);
      expect(stats.longestSessionMs).toBeGreaterThan(0);
      expect(stats.longestSessionMs).toBeLessThanOrEqual(38 * 60 * 1000);
      expect(stats.formattedSessions).toBeDefined();
      expect(stats.formattedLongest).toContain("m");
      expect(stats.formattedAverage).toContain("m");
    });
  });

  describe("computeAppWeeklyTrend", () => {
    const mockWeek = [
      { day: "2026-09-04", ms: 3 * 3600 * 1000 },
      { day: "2026-09-05", ms: 4 * 3600 * 1000 },
      { day: "2026-09-06", ms: 2 * 3600 * 1000 },
      { day: "2026-09-07", ms: 3 * 3600 * 1000 },
      { day: "2026-09-08", ms: 4 * 3600 * 1000 },
      { day: "2026-09-09", ms: 3 * 3600 * 1000 },
      { day: "2026-09-10", ms: 2 * 3600 * 1000 },
    ];

    it("generates 7 bars with today marked as active", () => {
      const bars = computeAppWeeklyTrend(38 * 60 * 1000, mockWeek);
      expect(bars).toHaveLength(7);
      expect(bars[6].isToday).toBe(true);
      expect(bars[0].isToday).toBe(false);
      expect(bars[6].ms).toBe(38 * 60 * 1000);
      expect(bars.every((b) => b.heightPercent >= 8)).toBe(true);
    });
  });

  describe("App resolution and fallback logic", () => {
    function resolveAppInfo(
      packageName: string,
      apps: { packageName: string; label: string; ms: number }[]
    ) {
      const matched = apps.find((a) => a.packageName === packageName);
      const appLabel = matched?.label ?? packageName.split(".").pop() ?? "App";
      const appMs = matched?.ms ?? 0;
      return { appLabel, appMs };
    }

    it("resolves label and ms when app exists in snapshot", () => {
      const apps = [
        { packageName: "com.instagram.android", label: "Instagram", ms: 38 * 60 * 1000 },
        { packageName: "com.google.android.youtube", label: "YouTube", ms: 60 * 60 * 1000 },
      ];

      const resolved = resolveAppInfo("com.instagram.android", apps);
      expect(resolved.appLabel).toBe("Instagram");
      expect(resolved.appMs).toBe(38 * 60 * 1000);
    });

    it("provides clean fallback label and 0ms when app is not in snapshot", () => {
      const apps = [
        { packageName: "com.instagram.android", label: "Instagram", ms: 38 * 60 * 1000 },
      ];

      const resolved = resolveAppInfo("com.unknown.twitter", apps);
      expect(resolved.appLabel).toBe("twitter");
      expect(resolved.appMs).toBe(0);
    });
  });
});
