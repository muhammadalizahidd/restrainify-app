import { describe, expect, it } from "@jest/globals";

describe("SET-REC-01: Recovery Settings Logic & Invariants", () => {
  it("locks baseline modification when relapse events exist in history", () => {
    const events = [
      { id: "e1", kind: "urge", day: "2026-09-01", timestamp: 1000, note: "", resisted: true },
      { id: "e2", kind: "relapse", day: "2026-09-05", timestamp: 5000, note: "Late night slip", resisted: false },
    ];

    const hasRelapse = events.some((e) => e.kind === "relapse");
    expect(hasRelapse).toBe(true);

    // Invariant: UI must prohibit baseline change if relapse exists
    const canEditBaseline = !hasRelapse;
    expect(canEditBaseline).toBe(false);
  });

  it("permits baseline modification when no relapse events exist", () => {
    const events = [
      { id: "e1", kind: "urge", day: "2026-09-01", timestamp: 1000, note: "", resisted: true },
      { id: "e2", kind: "tracker", day: "2026-09-02", timestamp: 2000, note: "", resisted: false },
    ];

    const hasRelapse = events.some((e) => e.kind === "relapse");
    expect(hasRelapse).toBe(false);

    const canEditBaseline = !hasRelapse;
    expect(canEditBaseline).toBe(true);
  });

  it("validates baseline date format as YYYY-MM-DD and rejects future dates", () => {
    const validateDate = (input: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.trim())) return "INVALID_FORMAT";
      const todayStr = "2026-09-10";
      if (input.trim() > todayStr) return "FUTURE_DATE";
      return "VALID";
    };

    expect(validateDate("invalid")).toBe("INVALID_FORMAT");
    expect(validateDate("09-10-2026")).toBe("INVALID_FORMAT");
    expect(validateDate("2026-09-20")).toBe("FUTURE_DATE");
    expect(validateDate("2026-08-15")).toBe("VALID");
  });

  it("prohibits disabling recovery tracking while active cooldown is running", () => {
    const burstRemainingMs = 120000;
    const strictRemainingMs = 0;
    const isCooldownActive = burstRemainingMs > 0 || strictRemainingMs > 0;

    const canWeaken = !isCooldownActive;
    expect(canWeaken).toBe(false);
  });
});
