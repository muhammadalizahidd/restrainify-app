/**
 * Unit tests for Progress Overview (PROG-01) logic and computations:
 * 1. Clean days percentage calculation and boundary clamping
 * 2. Resisted urges filtering from local event history
 * 3. Burst interventions count aggregation
 * 4. Day-over-day attention trend percentage change
 */

import { computeReclaimedHours, DEFAULT_DAILY_GOAL_MS } from "../utils/attentionReclaimed";

describe("Progress Overview Screen (PROG-01) Logic", () => {
  describe("Clean days percentage computation", () => {
    function computeCleanDaysPercentage(cleanDays: number, windowDays: number = 30): number {
      return Math.min(100, Math.max(0, Math.round((cleanDays / windowDays) * 100)));
    }

    it("correctly computes 90% for 27 clean days in 30 days window", () => {
      expect(computeCleanDaysPercentage(27, 30)).toBe(90);
    });

    it("clamps at 100% if clean days exceed window", () => {
      expect(computeCleanDaysPercentage(35, 30)).toBe(100);
    });

    it("clamps at 0% for negative or zero clean days", () => {
      expect(computeCleanDaysPercentage(0, 30)).toBe(0);
      expect(computeCleanDaysPercentage(-5, 30)).toBe(0);
    });
  });

  describe("Event aggregations (Resisted urges & Burst interventions)", () => {
    interface TestEvent {
      id: string;
      kind: "urge" | "burst" | "relapse" | "tracker";
      resisted: boolean;
    }

    it("counts resisted urges from both urge and burst event kinds", () => {
      const events: TestEvent[] = [
        { id: "1", kind: "urge", resisted: true },
        { id: "2", kind: "urge", resisted: false },
        { id: "3", kind: "burst", resisted: true },
        { id: "4", kind: "burst", resisted: false },
        { id: "5", kind: "relapse", resisted: false },
      ];

      const resistedCount = events.filter(
        (e) => (e.kind === "urge" || e.kind === "burst") && e.resisted
      ).length;

      expect(resistedCount).toBe(2);
    });

    it("counts total burst interventions independently of resisted outcome", () => {
      const events: TestEvent[] = [
        { id: "1", kind: "burst", resisted: true },
        { id: "2", kind: "burst", resisted: false },
        { id: "3", kind: "urge", resisted: true },
        { id: "4", kind: "burst", resisted: true },
      ];

      const burstCount = events.filter((e) => e.kind === "burst").length;
      expect(burstCount).toBe(3);
    });
  });

  describe("Attention trend percentage change", () => {
    function computeUsageChange(
      todayMs: number,
      yesterdayMs: number
    ): { change: number | null; isReduced: boolean } {
      if (yesterdayMs <= 0) return { change: null, isReduced: false };
      const change = Math.round(((todayMs - yesterdayMs) / yesterdayMs) * 100);
      return { change, isReduced: change <= 0 };
    }

    it("detects usage reduction (e.g. -28% vs yesterday)", () => {
      const yesterday = 100 * 60 * 1000;
      const today = 72 * 60 * 1000;
      const res = computeUsageChange(today, yesterday);
      expect(res.change).toBe(-28);
      expect(res.isReduced).toBe(true);
    });

    it("detects usage increase", () => {
      const yesterday = 50 * 60 * 1000;
      const today = 75 * 60 * 1000;
      const res = computeUsageChange(today, yesterday);
      expect(res.change).toBe(50);
      expect(res.isReduced).toBe(false);
    });

    it("handles zero yesterday usage gracefully", () => {
      const res = computeUsageChange(60000, 0);
      expect(res.change).toBeNull();
    });
  });

  describe("Reclaimed hours computation (computeReclaimedHours)", () => {
    it("computes 11h reclaimed when week usage is 10h out of a 21h budget", () => {
      // 7 days with ~1h 25m each = 10 hours total
      const oneHourTwentyFive = Math.round((10 * 3600 * 1000) / 7);
      const weekUsage = [
        { day: "2026-09-07", ms: oneHourTwentyFive },
        { day: "2026-09-08", ms: oneHourTwentyFive },
        { day: "2026-09-09", ms: oneHourTwentyFive },
        { day: "2026-09-10", ms: oneHourTwentyFive },
        { day: "2026-09-11", ms: oneHourTwentyFive },
        { day: "2026-09-12", ms: oneHourTwentyFive },
        { day: "2026-09-13", ms: 10 * 3600 * 1000 - 6 * oneHourTwentyFive },
      ];

      const reclaimed = computeReclaimedHours(weekUsage);
      expect(reclaimed).toBe(11);
    });

    it("returns 0h when usage exactly matches the allocated budget", () => {
      // 7 days with exactly 3h daily
      const threeHours = 3 * 3600 * 1000;
      const weekUsage = [
        { day: "2026-09-07", ms: threeHours },
        { day: "2026-09-08", ms: threeHours },
        { day: "2026-09-09", ms: threeHours },
        { day: "2026-09-10", ms: threeHours },
        { day: "2026-09-11", ms: threeHours },
        { day: "2026-09-12", ms: threeHours },
        { day: "2026-09-13", ms: threeHours },
      ];

      expect(computeReclaimedHours(weekUsage)).toBe(0);
    });

    it("clamps at 0h when usage exceeds the allocated budget", () => {
      // 7 days with 4h daily = 28h total (exceeds 21h budget)
      const fourHours = 4 * 3600 * 1000;
      const weekUsage = Array.from({ length: 7 }, (_, i) => ({
        day: `2026-09-0${i + 1}`,
        ms: fourHours,
      }));

      expect(computeReclaimedHours(weekUsage)).toBe(0);
    });

    it("truthfully returns 0h when usage permission is not granted", () => {
      const weekUsage = [
        { day: "2026-09-12", ms: 3600000 },
        { day: "2026-09-13", ms: 3600000 },
      ];
      expect(computeReclaimedHours(weekUsage, DEFAULT_DAILY_GOAL_MS, false)).toBe(0);
    });

    it("returns 0h for null, undefined, or empty weekUsage", () => {
      expect(computeReclaimedHours(null)).toBe(0);
      expect(computeReclaimedHours(undefined)).toBe(0);
      expect(computeReclaimedHours([])).toBe(0);
    });

    it("computes proportionally for partial weeks (e.g. 3 days recorded)", () => {
      // 3 days recorded: budget = 3 * 3h = 9h. Actual usage = 4h total. Reclaimed = 5h.
      const weekUsage = [
        { day: "2026-09-11", ms: 1 * 3600 * 1000 },
        { day: "2026-09-12", ms: 2 * 3600 * 1000 },
        { day: "2026-09-13", ms: 1 * 3600 * 1000 },
      ];
      expect(computeReclaimedHours(weekUsage)).toBe(5);
    });

    it("handles negative values in malformed data safely", () => {
      const weekUsage = [
        { day: "2026-09-12", ms: -5000 },
        { day: "2026-09-13", ms: 3600000 },
      ];
      // 2 days budget = 6h. Actual = 0 + 1h = 1h. Reclaimed = 5h.
      expect(computeReclaimedHours(weekUsage)).toBe(5);
    });
  });
});
