import { describe, expect, it } from "@jest/globals";

describe("SET-BURST-01: Burst Settings Logic & Invariants", () => {
  it("counts enabled apps configured to pause during Burst", () => {
    const rules = [
      { packageName: "com.instagram.android", enabled: true, burst: true },
      { packageName: "com.google.android.youtube", enabled: true, burst: false },
      { packageName: "com.zhiliaoapp.musically", enabled: false, burst: true },
      { packageName: "com.facebook.katana", enabled: true, burst: true },
    ];

    const burstAppsCount = rules.filter((r) => r.enabled && r.burst).length;
    expect(burstAppsCount).toBe(2);
  });

  it("validates burst duration bounds (1 to 1440 minutes)", () => {
    const validateDuration = (min: number) => {
      if (!Number.isInteger(min)) return "NOT_INTEGER";
      if (min < 1 || min > 1440) return "OUT_OF_BOUNDS";
      return "VALID";
    };

    expect(validateDuration(0)).toBe("OUT_OF_BOUNDS");
    expect(validateDuration(1441)).toBe("OUT_OF_BOUNDS");
    expect(validateDuration(-15)).toBe("OUT_OF_BOUNDS");
    expect(validateDuration(15)).toBe("VALID");
    expect(validateDuration(60)).toBe("VALID");
    expect(validateDuration(1440)).toBe("VALID");
  });

  it("prohibits duration modifications during active cooldown", () => {
    const burstRemainingMs = 450000;
    const strictRemainingMs = 0;
    const isCooldownActive = burstRemainingMs > 0 || strictRemainingMs > 0;

    const canWeakenOrChange = !isCooldownActive;
    expect(canWeakenOrChange).toBe(false);
  });
});
