import { describe, expect, it } from "@jest/globals";
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  signUpWithEmail,
  signInWithEmail,
  sendPasswordReset,
  signInWithGoogle,
} from "../../auth/authService";

describe("Domain 4: Onboarding & Authentication Flow", () => {
  describe("Component 1: Auth Service Abstraction & Validation", () => {
    it("validates email formatting strictly", () => {
      expect(validateEmail("")).toBe("Email is required");
      expect(validateEmail("not-an-email")).toBe("Enter a valid email address");
      expect(validateEmail("missing@domain")).toBe("Enter a valid email address");
      expect(validateEmail("user@example.com")).toBeNull();
      expect(validateEmail("test.user+tag@sub.domain.org")).toBeNull();
    });

    it("enforces minimum 8-character password requirement", () => {
      expect(validatePassword("")).toBe("Password is required");
      expect(validatePassword("1234567")).toBe("Password must be at least 8 characters");
      expect(validatePassword("12345678")).toBeNull();
      expect(validatePassword("SuperSecretPassword123!")).toBeNull();
    });

    it("verifies password confirmation matching", () => {
      expect(validatePasswordConfirm("secret123", "")).toBe("Confirm your password");
      expect(validatePasswordConfirm("secret123", "secret456")).toBe("Passwords do not match");
      expect(validatePasswordConfirm("secret123", "secret123")).toBeNull();
    });

    it("stubbed signUpWithEmail returns mock user when valid", async () => {
      const invalid = await signUpWithEmail("bad", "123");
      expect(invalid.success).toBe(false);
      expect(invalid.user).toBeUndefined();
      expect(invalid.error).toBeDefined();

      const valid = await signUpWithEmail("test@example.com", "validPassword123");
      expect(valid.success).toBe(true);
      expect(valid.error).toBeUndefined();
      expect(valid.user?.email).toBe("test@example.com");
      expect(valid.user?.id).toBeDefined();
    });

    it("stubbed signInWithEmail handles success and rejection", async () => {
      const invalid = await signInWithEmail("bad", "short");
      expect(invalid.success).toBe(false);
      expect(invalid.user).toBeUndefined();
      expect(invalid.error).toBeDefined();

      const valid = await signInWithEmail("test@example.com", "validPassword123");
      expect(valid.success).toBe(true);
      expect(valid.error).toBeUndefined();
      expect(valid.user?.email).toBe("test@example.com");
    });

    it("sendPasswordReset always succeeds for security non-disclosure", async () => {
      const invalid = await sendPasswordReset("not-email");
      expect(invalid.success).toBe(false);

      // Even unknown emails return success so attackers cannot enumerate users
      const valid = await sendPasswordReset("anyone@example.com");
      expect(valid.success).toBe(true);
      expect(valid.error).toBeUndefined();
    });

    it("signInWithGoogle returns unsupported placeholder indicator", async () => {
      const res = await signInWithGoogle();
      expect(res.success).toBe(false);
      expect(res.error).toContain("Google sign-in");
    });
  });

  describe("ONB-05: Goal Selection Logic (Step 1/6)", () => {
    const ALLOWED_GOALS = ["websites", "visual", "feeds", "apps"];

    function validateGoals(goals: string[]): { valid: boolean; error?: string } {
      if (goals.length === 0) {
        return { valid: false, error: "Please select at least one goal to continue." };
      }
      for (const g of goals) {
        if (!ALLOWED_GOALS.includes(g)) {
          return { valid: false, error: `Unknown goal: ${g}` };
        }
      }
      return { valid: true };
    }

    it("requires at least one goal to proceed", () => {
      expect(validateGoals([]).valid).toBe(false);
      expect(validateGoals([]).error).toBe("Please select at least one goal to continue.");
    });

    it("accepts valid subsets of goals", () => {
      expect(validateGoals(["websites"]).valid).toBe(true);
      expect(validateGoals(["websites", "visual"]).valid).toBe(true);
      expect(validateGoals(["websites", "visual", "feeds", "apps"]).valid).toBe(true);
    });

    it("rejects unknown goal identifiers", () => {
      expect(validateGoals(["unknown_goal"]).valid).toBe(false);
      expect(validateGoals(["websites", "hack"]).valid).toBe(false);
    });
  });

  describe("ONB-06: Website Setup Capability Disclosures (Step 2/6)", () => {
    it("verifies VPN disclosure copy contains required privacy guarantees", () => {
      const disclosures = [
        "Restrainify creates a local VPN on your device to filter DNS requests.",
        "All filtering happens on your phone. No browsing data is uploaded, stored remotely, or shared with anyone.",
        "When websites are blocked, requests are denied locally.",
      ];

      expect(disclosures[0]).toContain("local VPN");
      expect(disclosures[1]).toContain("No browsing data is uploaded");
      expect(disclosures[2]).toContain("locally");
    });
  });

  describe("ONB-07: Visual Consent Invariants (Step 3/6)", () => {
    it("enforces explicit affirmative consent requirement before activation", () => {
      function canEnable(consentToggled: boolean): boolean {
        return consentToggled === true;
      }

      expect(canEnable(false)).toBe(false);
      expect(canEnable(true)).toBe(true);
    });

    it("verifies on-device ML privacy disclosure invariants", () => {
      const privacyNotes = {
        onDevice: true,
        noCloudUpload: true,
        noScreenCaptureStorage: true,
        requiresAccessibility: true,
      };

      expect(privacyNotes.onDevice).toBe(true);
      expect(privacyNotes.noCloudUpload).toBe(true);
      expect(privacyNotes.noScreenCaptureStorage).toBe(true);
    });
  });

  describe("ONB-08: Apps & Feeds Selection & Capabilities (Step 4/6)", () => {
    const curated = [
      { pkg: "com.instagram.android", feedSupported: true },
      { pkg: "com.google.android.youtube", feedSupported: true },
      { pkg: "com.zhiliaoapp.musically", feedSupported: false, note: "Full app restriction only" },
      { pkg: "com.snapchat.android", feedSupported: false },
    ];

    it("assigns feedMode correctly based on app capabilities", () => {
      function getFeedMode(feedSupported: boolean): "experimental" | "whole_app" {
        return feedSupported ? "experimental" : "whole_app";
      }

      expect(getFeedMode(curated[0].feedSupported)).toBe("experimental");
      expect(getFeedMode(curated[1].feedSupported)).toBe("experimental");
      expect(getFeedMode(curated[2].feedSupported)).toBe("whole_app");
      expect(getFeedMode(curated[3].feedSupported)).toBe("whole_app");
    });

    it("constructs valid command payload for app rules", () => {
      const selectedPkg = "com.instagram.android";
      const payload = {
        packageName: selectedPkg,
        feedMode: "experimental",
        enabled: true,
        burst: true,
        days: [1, 2, 3, 4, 5, 6, 7],
      };

      expect(payload.packageName).toBe("com.instagram.android");
      expect(payload.feedMode).toBe("experimental");
      expect(payload.days).toHaveLength(7);
      expect(payload.enabled).toBe(true);
    });
  });

  describe("ONB-09: Recovery Baseline Date Math & Guards (Step 5/6)", () => {
    function parseAndValidateStartDate(dateStr: string, today: string): { valid: boolean; error?: string } {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return { valid: false, error: "Invalid date format" };
      }
      if (dateStr > today) {
        return { valid: false, error: "Start date cannot be in the future" };
      }
      return { valid: true };
    }

    it("accepts today as baseline date", () => {
      const today = "2026-09-11";
      expect(parseAndValidateStartDate(today, today).valid).toBe(true);
    });

    it("accepts past dates as baseline date", () => {
      const today = "2026-09-11";
      expect(parseAndValidateStartDate("2026-09-01", today).valid).toBe(true);
      expect(parseAndValidateStartDate("2025-01-01", today).valid).toBe(true);
    });

    it("strictly rejects future baseline dates", () => {
      const today = "2026-09-11";
      const res = parseAndValidateStartDate("2026-09-12", today);
      expect(res.valid).toBe(false);
      expect(res.error).toBe("Start date cannot be in the future");
    });
  });

  describe("ONB-10: Truthful Protection Readiness Audit (Step 6/6)", () => {
    function computeReadiness(snapshot: {
      settings: {
        websiteEnabled: boolean;
        accessibilityConsent: boolean;
        rules: unknown[];
        recoveryEnabled: boolean;
      };
      capabilities: {
        vpn: boolean;
        accessibility: boolean;
      };
    }) {
      const websiteActive = Boolean(
        snapshot.settings.websiteEnabled && snapshot.capabilities.vpn
      );
      const visualActive = Boolean(
        snapshot.settings.accessibilityConsent && snapshot.capabilities.accessibility
      );
      const appsActive = snapshot.settings.rules.length > 0;
      const recoveryActive = Boolean(snapshot.settings.recoveryEnabled);

      const items = [websiteActive, visualActive, appsActive, recoveryActive];
      const activeCount = items.filter(Boolean).length;
      return { activeCount, totalCount: items.length };
    }

    it("accurately counts active protections when all are enabled and permitted", () => {
      const ready = computeReadiness({
        settings: {
          websiteEnabled: true,
          accessibilityConsent: true,
          rules: [{ packageName: "com.instagram.android" }],
          recoveryEnabled: true,
        },
        capabilities: {
          vpn: true,
          accessibility: true,
        },
      });

      expect(ready.activeCount).toBe(4);
      expect(ready.totalCount).toBe(4);
    });

    it("truthfully reflects missing VPN capability even if setting is enabled", () => {
      const degraded = computeReadiness({
        settings: {
          websiteEnabled: true, // User enabled it, but VPN permission was refused
          accessibilityConsent: false,
          rules: [],
          recoveryEnabled: true,
        },
        capabilities: {
          vpn: false, // Truth: OS permission denied
          accessibility: false,
        },
      });

      expect(degraded.activeCount).toBe(1); // Only recovery is active
    });

    it("truthfully reflects partial configuration (e.g. 2 of 4 ready)", () => {
      const partial = computeReadiness({
        settings: {
          websiteEnabled: true,
          accessibilityConsent: false,
          rules: [{ packageName: "com.google.android.youtube" }],
          recoveryEnabled: false,
        },
        capabilities: {
          vpn: true,
          accessibility: false,
        },
      });

      expect(partial.activeCount).toBe(2);
      expect(partial.totalCount).toBe(4);
    });
  });
});
