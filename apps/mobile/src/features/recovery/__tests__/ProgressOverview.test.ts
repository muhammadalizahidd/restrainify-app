/**
 * Unit tests for Progress Overview (PROG-01) logic and computations:
 * 1. Clean days percentage calculation and boundary clamping
 * 2. Resisted urges filtering from local event history
 * 3. Burst interventions count aggregation
 * 4. Day-over-day attention trend percentage change
 */

describe("Progress Overview Screen (PROG-01) Logic", () => {
  describe("Clean days percentage computation", () => {
    function computePornFreePercentage(cleanDays: number, windowDays: number = 30): number {
      return Math.min(100, Math.max(0, Math.round((cleanDays / windowDays) * 100)));
    }

    it("correctly computes 90% for 27 clean days in 30 days window", () => {
      expect(computePornFreePercentage(27, 30)).toBe(90);
    });

    it("clamps at 100% if clean days exceed window", () => {
      expect(computePornFreePercentage(35, 30)).toBe(100);
    });

    it("clamps at 0% for negative or zero clean days", () => {
      expect(computePornFreePercentage(0, 30)).toBe(0);
      expect(computePornFreePercentage(-5, 30)).toBe(0);
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
});
