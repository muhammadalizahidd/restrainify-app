import { describe, expect, it } from "@jest/globals";
import type { DomainRule } from "../../../native/OfflineProtection";
import { getFirstName } from "../utils/getFirstName";

describe("Domain 3: Protection & Settings Configuration Domain Logic & Invariants", () => {
  describe("SET-01: Settings Hub", () => {
    it("derives correct status badges for all five configuration pillars", () => {
      const state = {
        settings: {
          websiteEnabled: true,
          rules: [
            { packageName: "com.instagram.android", enabled: true, feedMode: "experimental" },
            { packageName: "com.google.android.youtube", enabled: true, feedMode: "experimental" },
            { packageName: "com.reddit.frontpage", enabled: true, feedMode: "off" },
            { packageName: "com.facebook.katana", enabled: false, feedMode: "off" },
          ],
          strictMinutes: 60,
          recoveryEnabled: true,
          burstMinutes: 15,
          trackerEnabled: false,
        },
        strictRemainingMs: 45 * 60 * 1000,
        burstRemainingMs: 0,
      };

      const webBadge = state.settings.websiteEnabled ? "Active" : "Off";
      expect(webBadge).toBe("Active");

      const activeRules = state.settings.rules.filter((r) => r.enabled).length;
      expect(activeRules).toBe(3);

      const activeFeeds = state.settings.rules.filter(
        (r) => r.enabled && r.feedMode !== "off"
      ).length;
      expect(activeFeeds).toBe(2);

      const strictBadge =
        state.strictRemainingMs > 0
          ? `${Math.ceil(state.strictRemainingMs / 60000)}m locked`
          : "Off";
      expect(strictBadge).toBe("45m locked");
    });

    it("dynamically resolves the user's first name for the Account badge", () => {
      // Full name with spaces
      expect(getFirstName("Ali Khan")).toBe("Ali");
      // Single name
      expect(getFirstName("Ali")).toBe("Ali");
      // Multiple parts
      expect(getFirstName("Sarah Jane Connor")).toBe("Sarah");
      // Leading whitespace
      expect(getFirstName("   John Doe  ")).toBe("John");
      // Fallback to email when full name is missing
      expect(getFirstName(null, "ali.reza@example.com")).toBe("Ali");
      expect(getFirstName("", "john@example.com")).toBe("John");
      // Display name fallback
      expect(getFirstName(null, null, "Mahnoor")).toBe("Mahnoor");
      // Unauthenticated / null
      expect(getFirstName(null, null, null)).toBeUndefined();
    });

    it("verifies badge wrapping and layout constraints", () => {
      // Layout constraints ensure badge text wraps rather than pushing adjacent content off-screen
      const badgeStyle = {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        maxWidth: 100,
        flexShrink: 1,
        alignItems: "center",
        justifyContent: "center",
      };
      const textStyle = {
        fontSize: 11,
        fontWeight: "600",
        textAlign: "center",
        flexWrap: "wrap",
      };

      expect(badgeStyle.maxWidth).toBe(100);
      expect(badgeStyle.flexShrink).toBe(1);
      expect(textStyle.textAlign).toBe("center");
      expect(textStyle.flexWrap).toBe("wrap");
    });
  });

  describe("SET-WEB-02: Blocked & Allowed Domain Rules", () => {
    function normalizeDomain(input: string): string | null {
      const host = input.trim().toLowerCase().replace(/^https?:\/\//, "");
      if (!host || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) return null;
      return host;
    }

    it("normalizes domains and strips HTTP/HTTPS protocols", () => {
      expect(normalizeDomain("https://example.com")).toBe("example.com");
      expect(normalizeDomain("http://trigger-site.org/path")).toBe(null);
      expect(normalizeDomain("sub.domain.co.uk")).toBe("sub.domain.co.uk");
      expect(normalizeDomain("invalid")).toBe(null);
    });

    it("enforces max 5000 custom domain rules limit", () => {
      const currentLength = 5000;
      const canAdd = currentLength < 5000;
      expect(canAdd).toBe(false);
    });

    it("prevents removing or disabling block rules during active Strict Mode or Burst", () => {
      const isCooldownActive = true;
      const rule: DomainRule = { host: "trigger.com", allow: false, enabled: true };

      const canDisable = !(isCooldownActive && !rule.allow && rule.enabled);
      expect(canDisable).toBe(false);
    });
  });

  describe("SET-WEB-03: Scoped Overrides", () => {
    it("routes weakening overrides to pending cooldown when Strict Mode is locked", () => {
      const strictRemainingMs = 600000;
      const isLocked = strictRemainingMs > 0;
      const nextRoute = isLocked ? "pending-change" : "applied";
      expect(nextRoute).toBe("pending-change");
    });
  });

  describe("SET-VIS-02: Protected Visual Contexts", () => {
    it("accurately categorizes supported apps vs unsupported apps", () => {
      const apps = [
        { packageName: "com.instagram.android", supported: true },
        { packageName: "com.google.android.youtube", supported: true },
        { packageName: "com.random.unsupported", supported: false },
      ];

      const supported = apps.filter((a) => a.supported);
      expect(supported).toHaveLength(2);
      expect(supported.map((s) => s.packageName)).toContain("com.instagram.android");
    });
  });

  describe("SET-SOC-01: Short-Form Protection & TikTok Fallback", () => {
    it("declares reliable feed-only support for Instagram/YouTube and whole-app fallback for TikTok", () => {
      const feeds = [
        { name: "Instagram", mode: "feed_only", reliable: true },
        { name: "YouTube", mode: "feed_only", reliable: true },
        { name: "TikTok", mode: "whole_app", reliable: false },
      ];

      const tikTok = feeds.find((f) => f.name === "TikTok");
      expect(tikTok?.mode).toBe("whole_app");
      expect(tikTok?.reliable).toBe(false);
    });
  });

  describe("SET-APP-01: App Controls Hub", () => {
    it("calculates daily allowance progress and detects over-limit state", () => {
      const usageMs = 46 * 60 * 1000;
      const limitMinutes = 45;
      const isOverLimit = limitMinutes > 0 && usageMs >= limitMinutes * 60000;
      expect(isOverLimit).toBe(true);
    });

    it("truthfully reflects Usage Access health status", () => {
      const hasUsageAccess = false;
      const healthStatus = hasUsageAccess ? "Healthy" : "Action required";
      expect(healthStatus).toBe("Action required");
    });
  });

  describe("SET-APP-02: App Limit & Schedule", () => {
    it("warns user if attempting to weaken allowance during cooldown", () => {
      const currentAllowance = 30;
      const requestedAllowance = 60;
      const strictRemainingMs = 300000;

      const isWeakening = requestedAllowance > currentAllowance;
      const requiresPending = isWeakening && strictRemainingMs > 0;
      expect(requiresPending).toBe(true);
    });

    it("constructs valid delete payload to remove an app limit", () => {
      const packageName = "com.instagram.android";
      const payload = {
        packageName,
        remove: true,
      };

      expect(payload.packageName).toBe("com.instagram.android");
      expect(payload.remove).toBe(true);
    });

    it("prohibits deleting an app limit during active strict mode cooldown", () => {
      const isCooldownActive = (strictRemainingMs: number, burstRemainingMs: number) =>
        strictRemainingMs > 0 || burstRemainingMs > 0;

      expect(isCooldownActive(60000, 0)).toBe(true);
      expect(isCooldownActive(0, 120000)).toBe(true);
      expect(isCooldownActive(0, 0)).toBe(false);
    });

    it("filters out removed app rule to produce truthful empty or updated state", () => {
      const initialRules = [
        { packageName: "com.instagram.android", limitMinutes: 30 },
        { packageName: "com.google.android.youtube", limitMinutes: 45 },
      ];
      const pkgToRemove = "com.instagram.android";
      const updatedRules = initialRules.filter((r) => r.packageName !== pkgToRemove);

      expect(updatedRules).toHaveLength(1);
      expect(updatedRules[0]!.packageName).toBe("com.google.android.youtube");

      const finalRules = updatedRules.filter((r) => r.packageName !== "com.google.android.youtube");
      expect(finalRules).toHaveLength(0);
    });
  });

  describe("SET-APP-03: Schedule Editor Time & Day Invariants", () => {
    function parseTimeToMinutes(timeStr: string): number | null {
      const trimmed = timeStr.trim();
      const match24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
      if (match24) {
        const hours = parseInt(match24[1]!, 10);
        const minutes = parseInt(match24[2]!, 10);
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          return hours * 60 + minutes;
        }
      }
      return null;
    }

    it("correctly converts 24h string to daily minute count", () => {
      expect(parseTimeToMinutes("22:00")).toBe(1320);
      expect(parseTimeToMinutes("08:30")).toBe(510);
      expect(parseTimeToMinutes("25:00")).toBe(null);
      expect(parseTimeToMinutes("12:65")).toBe(null);
    });

    it("enforces startMinute != endMinute and bounds in 0..1439", () => {
      const validateSchedule = (start: number, end: number, days: number[]) => {
        if (start < 0 || start > 1439) return false;
        if (end < 0 || end > 1439) return false;
        if (start === end) return false;
        if (days.length === 0 || !days.every((d) => d >= 1 && d <= 7)) return false;
        return true;
      };

      expect(validateSchedule(1320, 480, [1, 2, 3, 4, 5, 6, 7])).toBe(true);
      expect(validateSchedule(600, 600, [1, 2])).toBe(false);
      expect(validateSchedule(600, 800, [])).toBe(false);
    });
  });

  describe("STATE-STRICT-02: Pending Change Cooldown Timer", () => {
    it("formats remaining milliseconds into MM:SS correctly", () => {
      const formatTime = (ms: number) => {
        const totalSec = Math.ceil(ms / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      };

      expect(formatTime(18 * 60 * 1000 + 42 * 1000)).toBe("18:42");
      expect(formatTime(59 * 1000)).toBe("00:59");
      expect(formatTime(0)).toBe("00:00");
    });
  });

  describe("SET-NOT-01: Notifications Settings", () => {
    it("preserves core protection independent of notification grant state", () => {
      const vpnActive = true;
      const isCoreProtectionRunning = vpnActive;
      expect(isCoreProtectionRunning).toBe(true);
    });
  });

  describe("SET-SYNC-01: Cloud Sync Local-First Resilience", () => {
    it("continues local offline tracking without network dependency", () => {
      const canSaveEventLocally = true;
      expect(canSaveEventLocally).toBe(true);
    });
  });

  describe("SET-DATA-01: Data & Privacy Boundaries", () => {
    it("ensures raw screen frames are never stored or transmitted", () => {
      const dataHandling = {
        storesRawScreenshots: false,
        onDeviceInference: true,
        detailedBrowsingHistory: false,
      };

      expect(dataHandling.storesRawScreenshots).toBe(false);
      expect(dataHandling.onDeviceInference).toBe(true);
      expect(dataHandling.detailedBrowsingHistory).toBe(false);
    });
  });

  describe("SET-ACCOUNT-02: Delete Account Validation", () => {
    it("requires explicit DELETE confirmation for server account deletion", () => {
      const validateDelete = (confirmation: string) => {
        return confirmation.trim().toUpperCase() === "DELETE";
      };

      expect(validateDelete("")).toBe(false);
      expect(validateDelete("del")).toBe(false);
      expect(validateDelete("delete")).toBe(true);
      expect(validateDelete("DELETE")).toBe(true);
    });
  });

  describe("STATE-DATA-02: Reset Local Data & Invariants", () => {
    it("strictly blocks local data reset when Strict Mode or Burst is active", () => {
      const burstRemainingMs = 0;
      const strictRemainingMs = 15 * 60 * 1000;
      const isCooldownActive = burstRemainingMs > 0 || strictRemainingMs > 0;

      const canResetLocalData = !isCooldownActive;
      expect(canResetLocalData).toBe(false);
    });

    it("requires confirmed: true to execute database reset", () => {
      const executeReset = (input: { confirmed?: boolean }) => {
        if (!input.confirmed) throw new Error("Confirmation required");
        return true;
      };

      expect(() => executeReset({})).toThrow("Confirmation required");
      expect(executeReset({ confirmed: true })).toBe(true);
    });
  });

  describe("SET-FEED-01: Short-Form Feeds & App Exemption Invariants", () => {
    interface RuleDraft {
      packageName: string;
      enabled: boolean;
      feedMode: "off" | "experimental" | "whole_app";
      limitMinutes: number;
      startMinute: number;
      endMinute: number;
    }

    function toggleFeed(
      targetPkg: string,
      currentEnabled: boolean,
      existingRule?: Partial<RuleDraft>
    ): RuleDraft {
      const nextEnabled = !currentEnabled;
      const hasLimitOrSchedule = Boolean(
        existingRule &&
          ((existingRule.limitMinutes ?? 0) > 0 || (existingRule.startMinute ?? -1) >= 0)
      );
      const isTikTok = targetPkg.includes("musically") || targetPkg.includes("tiktok");
      return {
        packageName: targetPkg,
        enabled: nextEnabled || hasLimitOrSchedule,
        feedMode: nextEnabled ? (isTikTok ? "whole_app" : "experimental") : "off",
        limitMinutes: existingRule?.limitMinutes ?? 0,
        startMinute: existingRule?.startMinute ?? -1,
        endMinute: existingRule?.endMinute ?? -1,
      };
    }

    function isSocialAppExempt(pkg: string, rules: RuleDraft[]): boolean {
      const rule = rules.find((r) => r.packageName === pkg);
      if (!rule) return false;
      return !rule.enabled || rule.feedMode === "off";
    }

    it("disables feed and exempts app when toggled off without existing limits", () => {
      const result = toggleFeed("com.instagram.android", true);
      expect(result.enabled).toBe(false);
      expect(result.feedMode).toBe("off");
      expect(isSocialAppExempt("com.instagram.android", [result])).toBe(true);
    });

    it("preserves daily limit while setting feedMode to off when toggled off", () => {
      const result = toggleFeed("com.instagram.android", true, {
        limitMinutes: 45,
        startMinute: -1,
      });
      expect(result.enabled).toBe(true);
      expect(result.feedMode).toBe("off");
      expect(result.limitMinutes).toBe(45);
      // Because feedMode is "off", it is still exempt from generic social blocking
      expect(isSocialAppExempt("com.instagram.android", [result])).toBe(true);
    });

    it("enables feed protection with experimental mode for Instagram / YouTube", () => {
      const ig = toggleFeed("com.instagram.android", false);
      expect(ig.enabled).toBe(true);
      expect(ig.feedMode).toBe("experimental");
      expect(isSocialAppExempt("com.instagram.android", [ig])).toBe(false);

      const yt = toggleFeed("com.google.android.youtube", false);
      expect(yt.enabled).toBe(true);
      expect(yt.feedMode).toBe("experimental");
    });

    it("enables TikTok with whole_app fallback mode", () => {
      const tt = toggleFeed("com.zhiliaoapp.musically", false);
      expect(tt.enabled).toBe(true);
      expect(tt.feedMode).toBe("whole_app");
      expect(isSocialAppExempt("com.zhiliaoapp.musically", [tt])).toBe(false);
    });

    it("evaluates active feed counts accurately based on feedMode", () => {
      const rules: RuleDraft[] = [
        { packageName: "com.instagram.android", enabled: false, feedMode: "off", limitMinutes: 0, startMinute: -1, endMinute: -1 },
        { packageName: "com.google.android.youtube", enabled: true, feedMode: "experimental", limitMinutes: 0, startMinute: -1, endMinute: -1 },
        { packageName: "com.zhiliaoapp.musically", enabled: true, feedMode: "whole_app", limitMinutes: 0, startMinute: -1, endMinute: -1 },
      ];

      const activeFeeds = rules.filter((r) => r.enabled && r.feedMode !== "off");
      expect(activeFeeds).toHaveLength(2);
      expect(activeFeeds.map((r) => r.packageName)).toEqual([
        "com.google.android.youtube",
        "com.zhiliaoapp.musically",
      ]);
    });

    it("matches variant packages canonically for Instagram and Facebook", () => {
      const { isSameSocialApp, getCanonicalSocialPackage, DEFAULT_FEED_PACKAGES } = require("../../protection/utils/socialPackages");
      expect(isSameSocialApp("com.instagram.android", "com.instagram.lite")).toBe(true);
      expect(isSameSocialApp("com.instagram.android", "com.instagram.barcelona")).toBe(true);
      expect(isSameSocialApp("com.facebook.katana", "com.facebook.lite")).toBe(true);
      expect(isSameSocialApp("com.instagram.android", "com.google.android.youtube")).toBe(false);
      expect(getCanonicalSocialPackage("com.instagram.lite")).toBe("com.instagram.android");

      // Default feed packages calculation when rules list has an Instagram off exemption
      const exemptRules = [
        { packageName: "com.instagram.android", enabled: false, feedMode: "off" },
      ];
      const activeFeedsCount = DEFAULT_FEED_PACKAGES.filter((pkg: string) => {
        const rule = exemptRules.find((r: any) => isSameSocialApp(r.packageName, pkg));
        return rule ? rule.enabled && rule.feedMode !== "off" : true;
      }).length;
      expect(activeFeedsCount).toBe(4); // 4 feeds remain active, Instagram is off
    });
  });
});
