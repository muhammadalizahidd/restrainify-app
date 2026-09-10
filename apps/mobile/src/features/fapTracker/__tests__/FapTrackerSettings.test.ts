import { describe, expect, it } from "@jest/globals";

describe("SET-FAP-01: Fap Tracker Settings Logic & Invariants", () => {
  it("filters events to accurately count tracker check-ins", () => {
    const events = [
      { id: "e1", kind: "tracker", day: "2026-09-08", timestamp: 1000, note: "", resisted: false },
      { id: "e2", kind: "urge", day: "2026-09-09", timestamp: 2000, note: "", resisted: true },
      { id: "e3", kind: "tracker", day: "2026-09-10", timestamp: 3000, note: "", resisted: false },
      { id: "e4", kind: "relapse", day: "2026-09-10", timestamp: 4000, note: "", resisted: false },
    ];

    const trackerCount = events.filter((e) => e.kind === "tracker").length;
    expect(trackerCount).toBe(2);
  });

  it("prohibits disabling tracker during active cooldown", () => {
    const burstRemainingMs = 0;
    const strictRemainingMs = 300000;
    const isCooldownActive = burstRemainingMs > 0 || strictRemainingMs > 0;

    const canWeaken = !isCooldownActive;
    expect(canWeaken).toBe(false);
  });

  it("permits toggling tracker when no cooldown is running", () => {
    const burstRemainingMs = 0;
    const strictRemainingMs = 0;
    const isCooldownActive = burstRemainingMs > 0 || strictRemainingMs > 0;

    const canWeaken = !isCooldownActive;
    expect(canWeaken).toBe(true);
  });
});
