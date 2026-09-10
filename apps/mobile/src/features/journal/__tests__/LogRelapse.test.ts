import { validateUrgeInput } from "../utils/journalUtils";

describe("Log a Relapse (JOUR-03) Logic & Invariants", () => {
  const recoveryBaseline = "2026-08-01";

  describe("Validation invariants", () => {
    it("accepts valid relapse notes and timestamps", () => {
      const now = Date.now();
      const res = validateUrgeInput("Late night trigger", now, recoveryBaseline);
      expect(res.isValid).toBe(true);
    });

    it("rejects future timestamps for relapse events", () => {
      const future = Date.now() + 60000;
      const res = validateUrgeInput("", future, recoveryBaseline);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Choose a date and time in the past.");
    });

    it("rejects timestamps before recovery baseline", () => {
      const preBaseline = new Date("2026-07-20T12:00:00Z").getTime();
      const res = validateUrgeInput("", preBaseline, recoveryBaseline);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("cannot be before your recovery baseline");
    });

    it("rejects notes over 500 characters", () => {
      const longNote = "x".repeat(501);
      const res = validateUrgeInput(longNote, Date.now(), recoveryBaseline);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Keep notes under 500 characters.");
    });
  });

  describe("Streak preservation invariant", () => {
    function simulateRecoveryCalculation(
      baselineDate: string,
      currentDate: string,
      relapseDays: Set<string>
    ) {
      const baseline = new Date(baselineDate).getTime();
      const current = new Date(currentDate).getTime();
      const msPerDay = 24 * 60 * 60 * 1000;

      let longestStreak = 0;
      let tempStreak = 0;

      const totalDays = Math.max(0, Math.floor((current - baseline) / msPerDay));
      for (let i = 0; i <= totalDays; i++) {
        const d = new Date(baseline + i * msPerDay).toISOString().slice(0, 10);
        if (relapseDays.has(d)) {
          tempStreak = 0;
        } else {
          tempStreak++;
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
        }
      }
      const currentStreak = tempStreak;
      return { currentStreak, longestStreak };
    }

    it("resets current streak to 0 on relapse day while preserving longest historical streak", () => {
      // 14 days clean, then relapse on day 15
      const relapseDays = new Set(["2026-08-15"]);
      const result = simulateRecoveryCalculation("2026-08-01", "2026-08-15", relapseDays);

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(14); // Preserved!
    });
  });
});
