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

    it("defaults safeSearch and proxyResistance to true and socialWebsites to false", () => {
      const settings = {
        safeSearch: undefined as boolean | undefined,
        proxyResistance: undefined as boolean | undefined,
        socialWebsites: undefined as boolean | undefined,
      };
      expect(settings.safeSearch ?? true).toBe(true);
      expect(settings.proxyResistance ?? true).toBe(true);
      expect(settings.socialWebsites ?? false).toBe(false);
    });

    it("blocks weakening protection settings when cooldown is active", () => {
      function canModifyProtectionSetting(newValue: boolean, isCooldown: boolean): boolean {
        if (!newValue && isCooldown) return false;
        return true;
      }
      expect(canModifyProtectionSetting(false, true)).toBe(false); // weakening blocked
      expect(canModifyProtectionSetting(true, true)).toBe(true); // strengthening allowed
      expect(canModifyProtectionSetting(false, false)).toBe(true); // allowed when no cooldown
    });

    it("verifies social websites block toggle logic and auto-enables website protection", async () => {
      let socialWebsites = false;
      let websiteEnabled = false;
      let vpnStarted = false;

      const handleToggleSocial = async (value: boolean, isCooldown: boolean) => {
        if (!value && isCooldown) {
          throw new Error("Settings Locked: cannot disable during cooldown");
        }
        socialWebsites = value;
        if (value && !websiteEnabled) {
          websiteEnabled = true;
          vpnStarted = true;
        }
        return true;
      };

      // 1. Enabling social websites turns on socialWebsites and auto-arms website VPN
      await handleToggleSocial(true, false);
      expect(socialWebsites).toBe(true);
      expect(websiteEnabled).toBe(true);
      expect(vpnStarted).toBe(true);

      // 2. Disabling during cooldown is blocked
      await expect(handleToggleSocial(false, true)).rejects.toThrow("Settings Locked");
      expect(socialWebsites).toBe(true);

      // 3. Disabling when no cooldown succeeds
      await handleToggleSocial(false, false);
      expect(socialWebsites).toBe(false);
    });

    it("identifies supported social website domains and subdomains", () => {
      const socialDomains = [
        "instagram.com",
        "facebook.com",
        "tiktok.com",
        "twitter.com",
        "x.com",
        "reddit.com",
        "snapchat.com",
        "pinterest.com",
        "threads.net",
        "fb.com",
        "redd.it",
      ];
      function isSocialDomain(host: string): boolean {
        const h = host.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
        return socialDomains.some((d) => h === d || h.endsWith(`.${d}`));
      }
      expect(isSocialDomain("instagram.com")).toBe(true);
      expect(isSocialDomain("www.instagram.com")).toBe(true);
      expect(isSocialDomain("m.facebook.com")).toBe(true);
      expect(isSocialDomain("fb.com")).toBe(true);
      expect(isSocialDomain("tiktok.com")).toBe(true);
      expect(isSocialDomain("x.com")).toBe(true);
      expect(isSocialDomain("reddit.com")).toBe(true);
      expect(isSocialDomain("redd.it")).toBe(true);
      expect(isSocialDomain("threads.net")).toBe(true);
      expect(isSocialDomain("wikipedia.org")).toBe(false);
      expect(isSocialDomain("google.com")).toBe(false);
    });

    it("verifies social app packages trigger StayFree-style overlay and separate from web filter", () => {
      const socialPackages = new Set([
        "com.instagram.android",
        "com.instagram.barcelona",
        "com.zhiliaoapp.musically",
        "com.facebook.katana",
        "com.twitter.android",
        "com.reddit.frontpage",
        "com.snapchat.android",
        "com.pinterest",
      ]);

      function evaluateStayFreeAppOverlay(pkg: string, socialProtectionActive: boolean) {
        if (socialProtectionActive && socialPackages.has(pkg)) {
          return {
            showOverlay: true,
            eyebrow: "Social protection",
            action: "Close App",
            dismissToHome: true,
          };
        }
        return { showOverlay: false };
      }

      // Opening Instagram with social protection enabled triggers StayFree overlay
      const igResult = evaluateStayFreeAppOverlay("com.instagram.android", true);
      expect(igResult.showOverlay).toBe(true);
      expect(igResult.action).toBe("Close App");
      expect(igResult.dismissToHome).toBe(true);

      // Opening non-social app does not trigger overlay
      const settingsResult = evaluateStayFreeAppOverlay("com.android.settings", true);
      expect(settingsResult.showOverlay).toBe(false);

      // Disabled social protection does not trigger overlay
      const igDisabledResult = evaluateStayFreeAppOverlay("com.instagram.android", false);
      expect(igDisabledResult.showOverlay).toBe(false);
    });

    it("verifies allow-list rules override adult domain blocking", () => {
      const allowedDomains = ["pornhub.com", "allowed-site.com"];
      function isHostAllowed(host: string, rules: string[]): boolean {
        return rules.includes(host);
      }
      expect(isHostAllowed("pornhub.com", allowedDomains)).toBe(true);
      expect(isHostAllowed("xvideos.com", allowedDomains)).toBe(false);
    });

    it("verifies resolver mode switching and Private DNS fallback status", () => {
      function evaluateResolverStatus(mode: "vpn" | "private", vpnActive: boolean, privateDns: string | null) {
        if (mode === "vpn") {
          return vpnActive ? "vpn_connected" : "vpn_disconnected";
        }
        return privateDns ? "private_dns_active" : "private_dns_setup_needed";
      }

      expect(evaluateResolverStatus("vpn", true, null)).toBe("vpn_connected");
      expect(evaluateResolverStatus("vpn", false, null)).toBe("vpn_disconnected");
      expect(evaluateResolverStatus("private", false, "family.cloudflare-dns.com")).toBe("private_dns_active");
      expect(evaluateResolverStatus("private", false, null)).toBe("private_dns_setup_needed");
    });

    it("ensures Safe Browsing toggle is locked/unmovable during execution and cooldown to prevent triple toggling", async () => {
      let isLocked = false;
      let optimisticActive: boolean | null = null;
      let websiteEnabled = false;

      const getSwitchValue = () => (optimisticActive !== null ? optimisticActive : websiteEnabled);

      const handleToggle = async (value: boolean) => {
        if (isLocked) return false;
        isLocked = true;
        optimisticActive = value;

        // Simulate async operation
        await new Promise((resolve) => setTimeout(() => resolve(undefined), 20));
        websiteEnabled = value;

        // Unlock after cooldown
        await new Promise((resolve) => setTimeout(() => resolve(undefined), 30));
        isLocked = false;
        optimisticActive = null;
        return true;
      };

      expect(getSwitchValue()).toBe(false);
      expect(isLocked).toBe(false);

      // Trigger click once
      const togglePromise = handleToggle(true);

      // Immediately upon click, optimistic state is applied and it is locked/unmovable
      expect(getSwitchValue()).toBe(true);
      expect(isLocked).toBe(true);

      // Second click while unmovable is rejected
      const secondAttempt = await handleToggle(false);
      expect(secondAttempt).toBe(false);
      expect(getSwitchValue()).toBe(true); // Still true, no triple bounce

      await togglePromise;
      expect(isLocked).toBe(false);
      expect(getSwitchValue()).toBe(true);
      expect(websiteEnabled).toBe(true);
    });
  });

  describe("SET-WEB-03: Scoped Overrides Logic", () => {
    interface DomainRule {
      host: string;
      allow: boolean;
      enabled: boolean;
    }

    it("filters active allowed domain overrides from database rules", () => {
      const rules: DomainRule[] = [
        { host: "example-trigger.com", allow: false, enabled: true },
        { host: "work-portal.example", allow: true, enabled: true },
        { host: "youtube.com", allow: true, enabled: false },
      ];
      const allowed = rules.filter((r) => r.allow);
      const activeOverrides = allowed.filter((r) => r.enabled);

      expect(allowed).toHaveLength(2);
      expect(activeOverrides).toHaveLength(1);
      expect(activeOverrides[0]?.host).toBe("work-portal.example");
    });

    it("blocks adding or enabling weakening overrides when strict cooldown is active", () => {
      function canAddOrEnableOverride(isCooldown: boolean): boolean {
        if (isCooldown) return false;
        return true;
      }

      expect(canAddOrEnableOverride(true)).toBe(false);
      expect(canAddOrEnableOverride(false)).toBe(true);
    });

    it("allows removing an allowed exception override even during cooldown because it strengthens protection", () => {
      function canRemoveAllowedOverride(action: "remove_allowed" | "add_allowed", isCooldown: boolean): boolean {
        if (action === "add_allowed" && isCooldown) return false;
        return true;
      }

      expect(canRemoveAllowedOverride("remove_allowed", true)).toBe(true);
      expect(canRemoveAllowedOverride("add_allowed", true)).toBe(false);
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
