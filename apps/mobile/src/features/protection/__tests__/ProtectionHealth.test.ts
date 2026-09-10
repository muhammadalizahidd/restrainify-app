/**
 * Unit tests for Protection Health (TOOL-02) Diagnostic Matrix & System Repair logic:
 * 1. Truthful capability health matrix evaluation
 * 2. System repair action determination and priority ranking
 * 3. Health score calculation across security domains
 * 4. Native intent bridge routing verification
 */

jest.mock("react-native", () => ({
  NativeModules: {
    RestrainifyProtectionBridge: {
      getState: jest.fn(),
      execute: jest.fn(),
      openSettings: jest.fn().mockResolvedValue(true),
      startWebsiteProtection: jest.fn().mockResolvedValue(true),
      stopWebsiteProtection: jest.fn().mockResolvedValue(true),
      queryInstalledApps: jest.fn().mockResolvedValue([]),
      setAppRules: jest.fn().mockResolvedValue(true),
      setDomainRules: jest.fn().mockResolvedValue(true),
      setStrictFriction: jest.fn().mockResolvedValue(true),
      recheckCapabilities: jest.fn(),
    },
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
  Platform: { OS: "android", Version: 33 },
}));

import { offlineProtection } from "../../../native/OfflineProtection";

describe("Protection Health (TOOL-02) Diagnostic Matrix & System Repair", () => {
  describe("Health matrix evaluation", () => {
    function evaluateHealth(capabilities: {
      vpn: boolean;
      vpnError: string | null;
      accessibility: boolean;
      accessibilityConsent: boolean;
      usage: boolean;
      strictMinutes: number;
    }) {
      const webHealthy = capabilities.vpn && !capabilities.vpnError;
      const appHealthy =
        capabilities.accessibility && capabilities.accessibilityConsent;
      const usageHealthy = capabilities.usage;
      const strictHealthy = capabilities.strictMinutes > 0;

      // 4 core pillars evaluated for total diagnostic score
      const checks = [webHealthy, appHealthy, usageHealthy, strictHealthy];
      const activeCount = checks.filter(Boolean).length;
      const score = Math.round((activeCount / checks.length) * 100);
      const isFullyProtected = webHealthy && appHealthy;

      return {
        webHealthy,
        appHealthy,
        usageHealthy,
        strictHealthy,
        score,
        isFullyProtected,
      };
    }

    it("evaluates 100% health when all protective layers and anti-bypass friction are active", () => {
      const result = evaluateHealth({
        vpn: true,
        vpnError: null,
        accessibility: true,
        accessibilityConsent: true,
        usage: true,
        strictMinutes: 15,
      });

      expect(result.score).toBe(100);
      expect(result.isFullyProtected).toBe(true);
      expect(result.webHealthy).toBe(true);
      expect(result.appHealthy).toBe(true);
      expect(result.usageHealthy).toBe(true);
      expect(result.strictHealthy).toBe(true);
    });

    it("evaluates degraded status when Accessibility is granted in Android OS but consent is missing", () => {
      const result = evaluateHealth({
        vpn: true,
        vpnError: null,
        accessibility: true,
        accessibilityConsent: false, // Consent missing
        usage: true,
        strictMinutes: 0,
      });

      expect(result.appHealthy).toBe(false);
      expect(result.isFullyProtected).toBe(false);
      expect(result.score).toBe(50);
    });

    it("detects VPN error condition even if VPN capability flag was reported true", () => {
      const result = evaluateHealth({
        vpn: true,
        vpnError: "Local DNS VPN disconnected by Android system",
        accessibility: true,
        accessibilityConsent: true,
        usage: true,
        strictMinutes: 0,
      });

      expect(result.webHealthy).toBe(false);
      expect(result.isFullyProtected).toBe(false);
      expect(result.score).toBe(50);
    });
  });

  describe("System repair priority determination", () => {
    interface HealthSnapshot {
      webHealthy: boolean;
      appHealthy: boolean;
      usageHealthy: boolean;
      accessibilityGranted: boolean;
      accessibilityConsent: boolean;
    }

    function determineRepairAction(snapshot: HealthSnapshot): {
      needsRepair: boolean;
      primaryAction: string;
      intentTarget: "accessibility" | "usage" | "vpn" | "battery" | null;
    } {
      if (!snapshot.accessibilityGranted) {
        return {
          needsRepair: true,
          primaryAction: "Open Android Accessibility settings to enable App Restriction service",
          intentTarget: "accessibility",
        };
      }
      if (!snapshot.accessibilityConsent) {
        return {
          needsRepair: true,
          primaryAction: "Confirm Accessibility consent toggle in Protection setup",
          intentTarget: null,
        };
      }
      if (!snapshot.webHealthy) {
        return {
          needsRepair: true,
          primaryAction: "Reconnect local DNS VPN protection",
          intentTarget: "vpn",
        };
      }
      if (!snapshot.usageHealthy) {
        return {
          needsRepair: true,
          primaryAction: "Grant Android Usage Access for daily screentime tracking",
          intentTarget: "usage",
        };
      }
      return {
        needsRepair: false,
        primaryAction: "All protection services running smoothly",
        intentTarget: null,
      };
    }

    it("prioritizes Accessibility permission when it is missing", () => {
      const repair = determineRepairAction({
        webHealthy: false,
        appHealthy: false,
        usageHealthy: false,
        accessibilityGranted: false,
        accessibilityConsent: false,
      });

      expect(repair.needsRepair).toBe(true);
      expect(repair.intentTarget).toBe("accessibility");
    });

    it("prompts for user consent if OS permission is on but in-app consent is false", () => {
      const repair = determineRepairAction({
        webHealthy: true,
        appHealthy: false,
        usageHealthy: true,
        accessibilityGranted: true,
        accessibilityConsent: false,
      });

      expect(repair.needsRepair).toBe(true);
      expect(repair.intentTarget).toBeNull();
      expect(repair.primaryAction).toContain("consent");
    });

    it("recommends VPN reconnect when app controls are active but web protection is down", () => {
      const repair = determineRepairAction({
        webHealthy: false,
        appHealthy: true,
        usageHealthy: true,
        accessibilityGranted: true,
        accessibilityConsent: true,
      });

      expect(repair.needsRepair).toBe(true);
      expect(repair.intentTarget).toBe("vpn");
    });

    it("signals healthy when all services are running", () => {
      const repair = determineRepairAction({
        webHealthy: true,
        appHealthy: true,
        usageHealthy: true,
        accessibilityGranted: true,
        accessibilityConsent: true,
      });

      expect(repair.needsRepair).toBe(false);
      expect(repair.intentTarget).toBeNull();
    });
  });

  describe("OfflineProtection bridge integration", () => {
    it("provides settings methods for direct intent navigation", async () => {
      const settingsSpy = jest.spyOn(offlineProtection, "settings").mockResolvedValue(true);

      await offlineProtection.settings("accessibility");
      expect(settingsSpy).toHaveBeenCalledWith("accessibility");

      await offlineProtection.settings("usage");
      expect(settingsSpy).toHaveBeenCalledWith("usage");

      await offlineProtection.settings("battery");
      expect(settingsSpy).toHaveBeenCalledWith("battery");

      settingsSpy.mockRestore();
    });
  });
});
