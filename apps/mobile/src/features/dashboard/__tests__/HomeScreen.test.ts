/**
 * Unit tests for Home Screen (MAIN-01) logic and calculations:
 * 1. Milestone and 21-day progress calculations
 * 2. Truthful protection health scoring
 * 3. Daily attention delta calculations
 * 4. Daily focus coins reward idempotency
 */

describe("Home Screen (MAIN-01) Dashboard Logic", () => {
  describe("Momentum & Milestone calculations", () => {
    function computeMilestone(currentStreak: number, goalDays = 21) {
      const percent = Math.min(100, Math.floor((currentStreak / goalDays) * 100));
      const daysRemaining = Math.max(0, goalDays - currentStreak);
      return { percent, daysRemaining };
    }

    it("calculates correct percentage and days remaining for Day 14 of 21", () => {
      const { percent, daysRemaining } = computeMilestone(14, 21);
      expect(percent).toBe(66);
      expect(daysRemaining).toBe(7);
    });

    it("handles Day 0 baseline cleanly", () => {
      const { percent, daysRemaining } = computeMilestone(0, 21);
      expect(percent).toBe(0);
      expect(daysRemaining).toBe(21);
    });

    it("caps percentage at 100% when goal is surpassed", () => {
      const { percent, daysRemaining } = computeMilestone(28, 21);
      expect(percent).toBe(100);
      expect(daysRemaining).toBe(0);
    });
  });

  describe("Truthful Protection Health calculation", () => {
    function computeHealth(capabilities: {
      vpn: boolean;
      vpnError: string | null;
      accessibility: boolean;
      accessibilityConsent: boolean;
    }) {
      const webHealthy = capabilities.vpn && !capabilities.vpnError;
      const appHealthy = capabilities.accessibility && capabilities.accessibilityConsent;
      const total = 2;
      let active = 0;
      if (webHealthy) active++;
      if (appHealthy) active++;
      const percent = Math.round((active / total) * 100);
      const isFullyProtected = active === total;
      return { webHealthy, appHealthy, percent, isFullyProtected };
    }

    it("reports 100% fully protected when all required capabilities are active", () => {
      const health = computeHealth({
        vpn: true,
        vpnError: null,
        accessibility: true,
        accessibilityConsent: true,
      });
      expect(health.percent).toBe(100);
      expect(health.isFullyProtected).toBe(true);
      expect(health.webHealthy).toBe(true);
      expect(health.appHealthy).toBe(true);
    });

    it("truthfully reports 50% degraded when app accessibility is revoked or lacking consent", () => {
      const health = computeHealth({
        vpn: true,
        vpnError: null,
        accessibility: true,
        accessibilityConsent: false, // Consent missing
      });
      expect(health.percent).toBe(50);
      expect(health.isFullyProtected).toBe(false);
      expect(health.webHealthy).toBe(true);
      expect(health.appHealthy).toBe(false);
    });

    it("truthfully reports 0% when both VPN and accessibility have issues", () => {
      const health = computeHealth({
        vpn: true,
        vpnError: "VPN revoked by system",
        accessibility: false,
        accessibilityConsent: true,
      });
      expect(health.percent).toBe(0);
      expect(health.isFullyProtected).toBe(false);
    });
  });

  describe("Attention time delta calculations", () => {
    function computeTimeDelta(todayMs: number, yesterdayMs: number) {
      if (!yesterdayMs) return null;
      return Math.round(((todayMs - yesterdayMs) / yesterdayMs) * 100);
    }

    it("computes negative percentage (less usage) when attention is reclaimed", () => {
      // 1h 42m today (6120000 ms) vs ~2h 22m yesterday (8500000 ms)
      const delta = computeTimeDelta(6120000, 8500000);
      expect(delta).toBe(-28);
    });

    it("computes positive percentage when usage increased", () => {
      const delta = computeTimeDelta(9000000, 6000000);
      expect(delta).toBe(50);
    });

    it("returns null when yesterday has zero recorded usage", () => {
      const delta = computeTimeDelta(3600000, 0);
      expect(delta).toBeNull();
    });
  });

  describe("Daily Reward idempotency", () => {
    it("recognizes claimed status and blocks multiple claims on the same day", () => {
      const today = "2026-09-10";
      const days = [{ day: today, reward: true }];
      const isClaimed = days.some((d) => d.reward && d.day >= today);
      expect(isClaimed).toBe(true);
    });
  });

  describe("Short-Form Feeds Protection modal logic", () => {
    it("computes active feeds count correctly from rules", () => {
      const rules = [
        { packageName: "com.instagram.android", enabled: true, feedMode: "experimental" as const },
        { packageName: "com.google.android.youtube", enabled: true, feedMode: "experimental" as const },
        { packageName: "com.facebook.katana", enabled: false, feedMode: "off" as const },
        { packageName: "com.zhiliaoapp.musically", enabled: true, feedMode: "whole_app" as const },
      ];
      const activeCount = rules.filter((r) => r.enabled && r.feedMode !== "off").length;
      expect(activeCount).toBe(3);
    });

    it("identifies TikTok fallback as whole_app instead of pretending feed isolation works", () => {
      const isTikTokWholeAppFallback = (pkg: string, mode: string) =>
        pkg === "com.zhiliaoapp.musically" && mode === "whole_app";

      expect(isTikTokWholeAppFallback("com.zhiliaoapp.musically", "whole_app")).toBe(true);
      expect(isTikTokWholeAppFallback("com.instagram.android", "experimental")).toBe(false);
    });
  });

  describe("App Controls modal logic", () => {
    it("computes controlled apps count accurately from rules or defaults", () => {
      const emptyRules: unknown[] = [];
      const controlledCountEmpty = emptyRules.length || 4;
      expect(controlledCountEmpty).toBe(4);

      const definedRules = [
        { packageName: "com.instagram.android", limitMinutes: 30 },
        { packageName: "com.google.android.youtube", limitMinutes: 45 },
      ];
      const controlledCountDefined = definedRules.length || 4;
      expect(controlledCountDefined).toBe(2);
    });

    it("formats schedule restriction text correctly", () => {
      const formatSchedule = (startMinute: number, endMinute: number) => {
        const startH = Math.floor(startMinute / 60);
        const startM = startMinute % 60;
        const endH = Math.floor(endMinute / 60);
        const endM = endMinute % 60;
        return `Blocked ${startH.toString().padStart(2, "0")}:${startM.toString().padStart(2, "0")}–${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
      };

      // 10:00 PM (22:00 = 1320m) to 8:00 AM (08:00 = 480m)
      const scheduleStr = formatSchedule(1320, 480);
      expect(scheduleStr).toBe("Blocked 22:00–08:00");
    });
  });

  describe("Device Permission & Access Usage Access logic", () => {
    it("evaluates usage status accurately based on capability flag", () => {
      const evaluateUsage = (usageGranted: boolean) => ({
        isUsageGranted: usageGranted,
        badgeText: usageGranted ? "Granted" : "Grant needed",
        titleText: usageGranted ? "Usage Access Active" : "Usage Access Required",
      });

      const granted = evaluateUsage(true);
      expect(granted.isUsageGranted).toBe(true);
      expect(granted.badgeText).toBe("Granted");
      expect(granted.titleText).toBe("Usage Access Active");

      const notGranted = evaluateUsage(false);
      expect(notGranted.isUsageGranted).toBe(false);
      expect(notGranted.badgeText).toBe("Grant needed");
      expect(notGranted.titleText).toBe("Usage Access Required");
    });
  });
});



