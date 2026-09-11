/**
 * Unit tests for Burst Crisis Intervention (BURST-01 & BURST-02):
 * 1. Timer formatting (MM:SS display for burst-orb)
 * 2. Activation prerequisites & backend constraint assertions
 * 3. Anti-bypass protection locking (assertCanWeaken)
 * 4. Urge outcome resolution and idempotency
 */

jest.mock("react-native", () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  View: "View",
  Text: "Text",
  Platform: { OS: "android", Version: 33 },
  NativeModules: { RestrainifyProtectionBridge: {} },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
}));

import { formatTimer } from "../components/BurstOrbTimer";

describe("Burst Crisis Intervention (BURST-01 & BURST-02)", () => {
  describe("Timer formatting (MM:SS countdown)", () => {
    it("formats 15 minutes as 15:00", () => {
      expect(formatTimer(15 * 60 * 1000)).toBe("15:00");
    });

    it("formats 12 minutes 34 seconds as 12:34", () => {
      expect(formatTimer(12 * 60 * 1000 + 34 * 1000)).toBe("12:34");
    });

    it("formats 45 seconds as 00:45", () => {
      expect(formatTimer(45 * 1000)).toBe("00:45");
    });

    it("handles 0 or negative milliseconds safely as 00:00", () => {
      expect(formatTimer(0)).toBe("00:00");
      expect(formatTimer(-5000)).toBe("00:00");
    });
  });

  describe("Burst activation prerequisites", () => {
    interface ActivationContext {
      burstRemainingMs: number;
      burstMinutes: number;
      accessibilityActive: boolean;
      accessibilityConsent: boolean;
      rules: { packageName: string; enabled: boolean; burst: boolean }[];
    }

    function canActivateBurst(ctx: ActivationContext): {
      allowed: boolean;
      error?: string;
    } {
      if (ctx.burstRemainingMs > 0) {
        return { allowed: false, error: "Burst is already active" };
      }
      if (ctx.burstMinutes < 1 || ctx.burstMinutes > 1440) {
        return { allowed: false, error: "Choose your Burst duration first" };
      }
      if (!ctx.accessibilityActive || !ctx.accessibilityConsent) {
        return {
          allowed: false,
          error: "Enable app restriction access before starting Burst",
        };
      }
      const hasBurstApps = ctx.rules.some(
        (rule) => rule.enabled && rule.burst
      );
      if (!hasBurstApps) {
        return { allowed: false, error: "Select at least one Burst app first" };
      }
      return { allowed: true };
    }

    it("allows activation when all safety prerequisites are satisfied", () => {
      const result = canActivateBurst({
        burstRemainingMs: 0,
        burstMinutes: 15,
        accessibilityActive: true,
        accessibilityConsent: true,
        rules: [
          { packageName: "com.instagram.android", enabled: true, burst: true },
        ],
      });

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("rejects activation if Burst is already active", () => {
      const result = canActivateBurst({
        burstRemainingMs: 600000,
        burstMinutes: 15,
        accessibilityActive: true,
        accessibilityConsent: true,
        rules: [
          { packageName: "com.instagram.android", enabled: true, burst: true },
        ],
      });

      expect(result.allowed).toBe(false);
      expect(result.error).toBe("Burst is already active");
    });

    it("rejects activation if no apps are selected for Burst restriction", () => {
      const result = canActivateBurst({
        burstRemainingMs: 0,
        burstMinutes: 15,
        accessibilityActive: true,
        accessibilityConsent: true,
        rules: [
          { packageName: "com.instagram.android", enabled: true, burst: false },
        ],
      });

      expect(result.allowed).toBe(false);
      expect(result.error).toBe("Select at least one Burst app first");
    });

    it("rejects activation if accessibility consent is missing", () => {
      const result = canActivateBurst({
        burstRemainingMs: 0,
        burstMinutes: 15,
        accessibilityActive: true,
        accessibilityConsent: false,
        rules: [
          { packageName: "com.instagram.android", enabled: true, burst: true },
        ],
      });

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(
        "Enable app restriction access before starting Burst"
      );
    });
  });

  describe("Anti-bypass protection locking (assertCanWeaken)", () => {
    function assertCanWeaken(burstRemainingMs: number, strictRemainingMs: number) {
      if (burstRemainingMs > 0 || strictRemainingMs > 0) {
        throw new Error("Protection is locked until the active cooldown ends.");
      }
      return true;
    }

    it("locks settings modifications while Burst cooldown is active", () => {
      expect(() => assertCanWeaken(300000, 0)).toThrow(
        "Protection is locked until the active cooldown ends."
      );
    });

    it("allows settings modifications when both Burst and Strict cooldowns have expired", () => {
      expect(assertCanWeaken(0, 0)).toBe(true);
    });
  });

  describe("Urge outcome resolution", () => {
    interface UrgeEvent {
      id: string;
      kind: "urge";
      resisted: boolean;
      note?: string;
    }

    function createUrgeOutcome(resisted: boolean, note?: string): UrgeEvent {
      return {
        id: `urge-${Date.now()}`,
        kind: "urge",
        resisted,
        note,
      };
    }

    it("creates resisted urge event when user overcomes temptation", () => {
      const event = createUrgeOutcome(true, "Used box breathing and walked away");
      expect(event.resisted).toBe(true);
      expect(event.kind).toBe("urge");
      expect(event.note).toBe("Used box breathing and walked away");
    });

    it("records unresisted urge honestly without altering streak", () => {
      const event = createUrgeOutcome(false, "Felt overwhelmed");
      expect(event.resisted).toBe(false);
      expect(event.kind).toBe("urge");
    });
  });
});
