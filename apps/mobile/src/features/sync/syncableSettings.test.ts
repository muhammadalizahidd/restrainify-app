import { isSyncableSetting } from "./syncableSettings";

describe("syncable settings", () => {
  it("uploads only settings defined in the sync contract", () => {
    for (const key of ["theme", "recoveryEnabled", "websiteEnabled", "dnsMode", "burstMinutes", "strictMinutes", "recoveryStart", "safeSearch"]) {
      expect(isSyncableSetting(key)).toBe(true);
    }
  });

  it("keeps consents, Visual filter switches and onboarding state on the device", () => {
    for (const key of ["accessibilityConsent", "vpnConsent", "visualConsent", "visualAiEnabled", "visualAiBlockingEnabled", "allowShowReel", "onboardingComplete", "goals", "burstUninstallProtection"]) {
      expect(isSyncableSetting(key)).toBe(false);
    }
  });
});
