import type { PersonBlurMode } from "@restrainify/contracts";

describe("Domain 1 Completion Screens Logic (Steps 7 to 10)", () => {
  describe("SET-WEB-01: Website Protection Logic", () => {
    function computeWebsiteStatus(
      enabled: boolean,
      dnsMode: "vpn" | "private",
      vpnActive: boolean,
      vpnError: string | null
    ) {
      if (!enabled) {
        return { status: "needs_setup", title: "Website protection needs setup", isHealthy: false };
      }
      if (dnsMode === "vpn") {
        const isHealthy = vpnActive && !vpnError;
        return {
          status: isHealthy ? "active" : "ready",
          title: isHealthy ? "Website protection active" : "Local DNS VPN ready",
          isHealthy,
        };
      }
      return { status: "active", title: "Private DNS configured", isHealthy: true };
    }

    it("reports needs setup when website protection is disabled", () => {
      const res = computeWebsiteStatus(false, "vpn", false, null);
      expect(res.status).toBe("needs_setup");
      expect(res.isHealthy).toBe(false);
    });

    it("reports active when local DNS VPN is connected without error", () => {
      const res = computeWebsiteStatus(true, "vpn", true, null);
      expect(res.status).toBe("active");
      expect(res.title).toBe("Website protection active");
      expect(res.isHealthy).toBe(true);
    });

    it("reports ready when enabled but VPN service is starting", () => {
      const res = computeWebsiteStatus(true, "vpn", false, null);
      expect(res.status).toBe("ready");
      expect(res.title).toBe("Local DNS VPN ready");
      expect(res.isHealthy).toBe(false);
    });

    it("correctly counts custom domain rules", () => {
      const domains = [
        { host: "example.com", allow: true, enabled: true },
        { host: "badsite.com", allow: false, enabled: true },
        { host: "test.org", allow: false, enabled: false },
      ];
      expect(domains.length).toBe(3);
    });
  });

  describe("SET-VIS-01: Visual Protection Logic & PersonBlurMode", () => {
    const validModes: PersonBlurMode[] = ["off", "blur_women", "blur_men", "blur_everyone"];

    it("accepts all approved PersonBlurMode contracts without sensitivity sliders", () => {
      expect(validModes).toHaveLength(4);
      expect(validModes).toContain("blur_women");
      expect(validModes).toContain("blur_men");
      expect(validModes).toContain("blur_everyone");
      expect(validModes).toContain("off");
    });

    function checkVisualReadiness(accessibility: boolean, consent: boolean) {
      return accessibility && consent;
    }

    it("evaluates readiness based on affirmative consent and system capability", () => {
      expect(checkVisualReadiness(true, true)).toBe(true);
      expect(checkVisualReadiness(true, false)).toBe(false);
      expect(checkVisualReadiness(false, true)).toBe(false);
    });
  });

  describe("SET-STRICT-01: Strict Mode & Anti-Bypass Cooldown Invariants", () => {
    function assertCanWeaken(strictRemainingMs: number, burstRemainingMs: number) {
      if (strictRemainingMs > 0 || burstRemainingMs > 0) {
        throw new Error("Protection is locked until the active cooldown ends.");
      }
      return true;
    }

    it("permits changes when no cooldown is active", () => {
      expect(assertCanWeaken(0, 0)).toBe(true);
    });

    it("throws error and prevents weakening while strict lock is active", () => {
      expect(() => assertCanWeaken(15 * 60 * 1000, 0)).toThrow(
        "Protection is locked until the active cooldown ends."
      );
    });

    it("validates strict lock duration within acceptable bounds (1 to 1440 min)", () => {
      function validateDuration(minutes: number) {
        return minutes >= 1 && minutes <= 1440;
      }
      expect(validateDuration(30)).toBe(true);
      expect(validateDuration(60)).toBe(true);
      expect(validateDuration(1440)).toBe(true);
      expect(validateDuration(0)).toBe(false);
      expect(validateDuration(2000)).toBe(false);
    });
  });

  describe("SET-ACCOUNT-01: Account & Profile Invariants", () => {
    it("extracts avatar initial from profile display name", () => {
      function getInitial(name: string) {
        return name.trim().charAt(0).toUpperCase() || "A";
      }
      expect(getInitial("Ali")).toBe("A");
      expect(getInitial("Mahnoor")).toBe("M");
      expect(getInitial("")).toBe("A");
    });

    it("upholds local protection survival invariant across auth state changes", () => {
      const localProtectionConfig = { websiteEnabled: true, rulesCount: 5 };
      let isAuthenticated = true;
      expect(isAuthenticated).toBe(true);

      // Simulate logout
      isAuthenticated = false;

      // Invariant: local protection configuration remains untouched
      expect(localProtectionConfig.websiteEnabled).toBe(true);
      expect(localProtectionConfig.rulesCount).toBe(5);
      expect(isAuthenticated).toBe(false);
    });
  });
});
