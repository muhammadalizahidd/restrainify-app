import { describe, expect, it, jest } from "@jest/globals";

// Mock React Native native modules
jest.mock("react-native", () => ({
  StyleSheet: { create: (s: unknown) => s },
  View: "View",
  Text: "Text",
  Platform: { OS: "android", Version: 33 },
  NativeModules: {
    RestrainifyProtectionBridge: {
      getState: jest.fn(),
      execute: jest.fn(),
    },
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
}));

import {
  IS_BURST_MODE_ENABLED,
  isBurstModeEnabled,
  assertBurstModeAvailable,
} from "../burstAccess";
import { offlineProtection } from "../../../native/OfflineProtection";

describe("Burst Mode Access Restriction", () => {
  it("has Burst Mode disabled by default in current free tier", () => {
    expect(IS_BURST_MODE_ENABLED).toBe(false);
    expect(isBurstModeEnabled()).toBe(false);
  });

  it("throws descriptive error when assertBurstModeAvailable is called while restricted", () => {
    expect(() => assertBurstModeAvailable()).toThrow(
      "Burst Mode is currently unavailable."
    );
  });

  it("guards offlineProtection.command against 'burst' action", async () => {
    await expect(offlineProtection.command("burst")).rejects.toThrow(
      "Burst Mode is currently unavailable."
    );
  });

  it("permits other commands through the bridge when burst is restricted", async () => {
    const nativeModule =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("react-native").NativeModules.RestrainifyProtectionBridge;
    nativeModule.execute.mockResolvedValueOnce(
      JSON.stringify({
        settings: { onboardingComplete: true },
        capabilities: {},
        events: [],
        recovery: { current: 0, longest: 0, cleanDays: 0 },
        usage: { todayMs: 0, week: [], apps: [] },
      })
    );

    const snapshot = await offlineProtection.command("strict", { minutes: 15 });
    expect(snapshot.settings.onboardingComplete).toBe(true);
    expect(nativeModule.execute).toHaveBeenCalledWith(
      "strict",
      JSON.stringify({ minutes: 15 })
    );
  });
});

