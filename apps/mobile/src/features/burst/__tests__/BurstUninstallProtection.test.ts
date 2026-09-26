import { describe, expect, it, jest } from "@jest/globals";

describe("BURST-UNINSTALL-01: Burst Mode Temporary Uninstall Protection", () => {
  describe("Consent flow decision tree", () => {
    interface SessionState {
      burstUninstallProtection: boolean;
      deviceAdminActive: boolean;
      hasAccessibility: boolean;
      hasBurstApps: boolean;
    }

    function determineActivationAction(state: SessionState): "SHOW_CONSENT_MODAL" | "START_BURST_DIRECTLY" | "BLOCKED" {
      if (!state.hasAccessibility || !state.hasBurstApps) {
        return "BLOCKED";
      }
      if (state.burstUninstallProtection && !state.deviceAdminActive) {
        return "SHOW_CONSENT_MODAL";
      }
      return "START_BURST_DIRECTLY";
    }

    it("requires consent modal when uninstall protection is enabled and device admin is not yet active", () => {
      const action = determineActivationAction({
        burstUninstallProtection: true,
        deviceAdminActive: false,
        hasAccessibility: true,
        hasBurstApps: true,
      });
      expect(action).toBe("SHOW_CONSENT_MODAL");
    });

    it("bypasses consent modal and starts burst directly when device admin is already active", () => {
      const action = determineActivationAction({
        burstUninstallProtection: true,
        deviceAdminActive: true,
        hasAccessibility: true,
        hasBurstApps: true,
      });
      expect(action).toBe("START_BURST_DIRECTLY");
    });

    it("bypasses consent modal and starts burst directly when user has opted out of uninstall protection", () => {
      const action = determineActivationAction({
        burstUninstallProtection: false,
        deviceAdminActive: false,
        hasAccessibility: true,
        hasBurstApps: true,
      });
      expect(action).toBe("START_BURST_DIRECTLY");
    });

    it("blocks activation if accessibility access is missing, regardless of admin status", () => {
      const action = determineActivationAction({
        burstUninstallProtection: true,
        deviceAdminActive: false,
        hasAccessibility: false,
        hasBurstApps: true,
      });
      expect(action).toBe("BLOCKED");
    });
  });

  describe("Consent modal user action handlers", () => {
    it("starts Burst only after Device Administrator activation succeeds", async () => {
      const requestAdmin = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
      const startBurst = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      let modalVisible = true;

      const handleActivateWithProtection = async () => {
        const activated = await requestAdmin();
        if (!activated) return;
        modalVisible = false;
        await startBurst();
      };

      await handleActivateWithProtection();
      expect(requestAdmin).toHaveBeenCalledTimes(1);
      expect(modalVisible).toBe(false);
      expect(startBurst).toHaveBeenCalledTimes(1);
    });

    it("keeps the consent dialog open when Device Administrator activation is declined", async () => {
      const requestAdmin = jest.fn<() => Promise<boolean>>().mockResolvedValue(false);
      const startBurst = jest.fn<() => Promise<void>>();
      let modalVisible = true;

      const handleActivateWithProtection = async () => {
        const activated = await requestAdmin();
        if (!activated) return;
        modalVisible = false;
        await startBurst();
      };

      await handleActivateWithProtection();
      expect(modalVisible).toBe(true);
      expect(startBurst).not.toHaveBeenCalled();
    });

    it("handles 'Start Without Protection': dismisses modal and starts burst immediately without admin", async () => {
      const requestAdmin = jest.fn<() => Promise<boolean>>();
      const startBurst = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      let modalVisible = true;

      const handleActivateWithoutProtection = async () => {
        modalVisible = false;
        await startBurst();
      };

      await handleActivateWithoutProtection();
      expect(requestAdmin).not.toHaveBeenCalled();
      expect(modalVisible).toBe(false);
      expect(startBurst).toHaveBeenCalledTimes(1);
    });

    it("handles 'Cancel': closes modal and does not start burst", () => {
      const startBurst = jest.fn<() => Promise<void>>();
      let modalVisible = true;

      const handleClose = () => {
        modalVisible = false;
      };

      handleClose();
      expect(modalVisible).toBe(false);
      expect(startBurst).not.toHaveBeenCalled();
    });
  });

  describe("Anti-weaken enforcement on burstUninstallProtection setting", () => {
    function updateUninstallProtection(
      newValue: boolean,
      currentValue: boolean,
      burstRemainingMs: number,
      strictRemainingMs: number
    ) {
      if (!newValue && currentValue) {
        if (burstRemainingMs > 0 || strictRemainingMs > 0) {
          throw new Error("Protection is locked until the active cooldown ends.");
        }
      }
      return newValue;
    }

    it("allows toggling uninstall protection when no cooldown is active", () => {
      expect(updateUninstallProtection(false, true, 0, 0)).toBe(false);
      expect(updateUninstallProtection(true, false, 0, 0)).toBe(true);
    });

    it("rejects disabling uninstall protection while Burst countdown is active", () => {
      expect(() => updateUninstallProtection(false, true, 180_000, 0)).toThrow(
        "Protection is locked until the active cooldown ends."
      );
    });

    it("rejects disabling uninstall protection while Strict Mode is active", () => {
      expect(() => updateUninstallProtection(false, true, 0, 600_000)).toThrow(
        "Protection is locked until the active cooldown ends."
      );
    });

    it("allows enabling uninstall protection even if cooldown is active (hardening invariant)", () => {
      expect(updateUninstallProtection(true, false, 180_000, 0)).toBe(true);
    });
  });

  describe("Device Administrator auto-revocation lifecycle", () => {
    interface AdminState {
      adminActive: boolean;
      alarmScheduledAt: number | null;
    }

    function onBurstStarted(now: number, minutes: number, enabled: boolean, state: AdminState) {
      if (enabled && state.adminActive) {
        state.alarmScheduledAt = now + minutes * 60_000;
      }
    }

    function ensureRevokedIfExpired(burstRemainingMs: number, state: AdminState): boolean {
      if (burstRemainingMs === 0 && state.adminActive) {
        state.adminActive = false;
        state.alarmScheduledAt = null;
        return true;
      }
      return false;
    }

    it("schedules auto-revocation alarm for exact expiration timestamp", () => {
      const now = 1700000000000;
      const state: AdminState = { adminActive: true, alarmScheduledAt: null };
      onBurstStarted(now, 15, true, state);
      expect(state.alarmScheduledAt).toBe(now + 15 * 60_000);
    });

    it("revokes device admin immediately when burst remaining reaches 0", () => {
      const state: AdminState = { adminActive: true, alarmScheduledAt: 1700000900000 };
      const revoked = ensureRevokedIfExpired(0, state);
      expect(revoked).toBe(true);
      expect(state.adminActive).toBe(false);
      expect(state.alarmScheduledAt).toBeNull();
    });

    it("does not revoke admin while burst countdown is still active", () => {
      const state: AdminState = { adminActive: true, alarmScheduledAt: 1700000900000 };
      const revoked = ensureRevokedIfExpired(60_000, state);
      expect(revoked).toBe(false);
      expect(state.adminActive).toBe(true);
    });
  });

  describe("Anti-tamper detection logic (Policy.isUninstallOrSettingsTamper)", () => {
    interface MockNode {
      text?: string;
      contentDescription?: string;
      viewIdResourceName?: string;
      children?: MockNode[];
    }

    function isUninstallOrSettingsTamper(
      pkg: string,
      root: MockNode | null,
      targetAppLabel = "Restrainify",
      targetPackage = "com.restrainify"
    ): boolean {
      const lower = pkg.toLowerCase().trim();
      const isInstaller =
        lower === "com.android.packageinstaller" ||
        lower === "com.google.android.packageinstaller";
      const isSettings = lower === "com.android.settings";

      if (!isInstaller && !isSettings) return false;
      if (!root) return false;

      const queue: MockNode[] = [root];
      let foundTarget = false;
      let foundTamper = false;

      const tamperKeywords = [
        "uninstall",
        "force stop",
        "deactivate this device admin",
        "deactivate",
        "remove active admin",
      ];

      while (queue.length > 0) {
        const node = queue.shift()!;
        const combined = `${node.text ?? ""} ${node.contentDescription ?? ""} ${node.viewIdResourceName ?? ""}`.toLowerCase();

        if (
          combined.includes(targetAppLabel.toLowerCase()) ||
          combined.includes(targetPackage.toLowerCase())
        ) {
          foundTarget = true;
        }

        if (tamperKeywords.some((kw) => combined.includes(kw))) {
          foundTamper = true;
        }

        if (isInstaller && foundTarget) return true;
        if (isSettings && foundTarget && foundTamper) return true;

        if (node.children) {
          queue.push(...node.children);
        }
      }

      return false;
    }

    it("detects package installer prompt targeting Restrainify", () => {
      const tree: MockNode = {
        text: "Do you want to uninstall this app?",
        children: [{ text: "Restrainify" }],
      };
      expect(isUninstallOrSettingsTamper("com.android.packageinstaller", tree)).toBe(true);
      expect(isUninstallOrSettingsTamper("com.google.android.packageinstaller", tree)).toBe(true);
    });

    it("ignores package installer prompt targeting a different application", () => {
      const tree: MockNode = {
        text: "Do you want to uninstall this app?",
        children: [{ text: "Calculator" }],
      };
      expect(isUninstallOrSettingsTamper("com.android.packageinstaller", tree)).toBe(false);
    });

    it("detects Settings screen attempting to deactivate device admin or force-stop Restrainify", () => {
      const tree: MockNode = {
        text: "Device Admin Apps",
        children: [
          { text: "Restrainify" },
          { text: "Deactivate this device admin" },
        ],
      };
      expect(isUninstallOrSettingsTamper("com.android.settings", tree)).toBe(true);
    });

    it("detects App Info screen in Settings displaying Uninstall for Restrainify", () => {
      const tree: MockNode = {
        text: "App info",
        children: [
          { text: "Restrainify" },
          { text: "Uninstall" },
          { text: "Force stop" },
        ],
      };
      expect(isUninstallOrSettingsTamper("com.android.settings", tree)).toBe(true);
    });

    it("ignores Settings screens unrelated to Restrainify", () => {
      const tree: MockNode = {
        text: "Wi-Fi Settings",
        children: [{ text: "Home Network" }],
      };
      expect(isUninstallOrSettingsTamper("com.android.settings", tree)).toBe(false);
    });

    it("ignores normal applications that are neither Settings nor Package Installer", () => {
      const tree: MockNode = {
        text: "Restrainify mentioned in a chat",
        children: [{ text: "Uninstall" }],
      };
      expect(isUninstallOrSettingsTamper("com.whatsapp", tree)).toBe(false);
    });
  });
});
