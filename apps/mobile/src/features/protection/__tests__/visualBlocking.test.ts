import type { OfflineSnapshot } from "../../../native/OfflineProtection";
import {
  hasVisualAccessibility,
  isVisualBlockingOn,
  setVisualBlocking,
} from "../utils/visualBlocking";

function snapshot(
  settings: Partial<OfflineSnapshot["settings"]>,
  accessibility: boolean
): OfflineSnapshot {
  return {
    settings: { accessibilityConsent: false, visualAiEnabled: false, visualAiBlockingEnabled: false, ...settings },
    capabilities: { accessibility },
  } as unknown as OfflineSnapshot;
}

describe("visual blocking single switch", () => {
  it("requires both in-app consent and a connected accessibility service", () => {
    expect(hasVisualAccessibility(snapshot({ accessibilityConsent: true }, true))).toBe(true);
    expect(hasVisualAccessibility(snapshot({ accessibilityConsent: true }, false))).toBe(false);
    expect(hasVisualAccessibility(snapshot({ accessibilityConsent: false }, true))).toBe(false);
    expect(hasVisualAccessibility(null)).toBe(false);
  });

  it("is on only when sampling and blocking are both enabled", () => {
    expect(isVisualBlockingOn(snapshot({ visualAiEnabled: true, visualAiBlockingEnabled: true }, true))).toBe(true);
    expect(isVisualBlockingOn(snapshot({ visualAiEnabled: true }, true))).toBe(false);
    expect(isVisualBlockingOn(snapshot({ visualAiBlockingEnabled: true }, true))).toBe(false);
    expect(isVisualBlockingOn(undefined)).toBe(false);
  });

  it("enables sampling before blocking and disables blocking before sampling", async () => {
    const calls: string[] = [];
    const command = async (_a: string, p: Record<string, unknown>) => {
      calls.push(`${String(p.key)}=${String(p.value)}`);
      return true;
    };
    expect(await setVisualBlocking(command, true)).toBe(true);
    expect(await setVisualBlocking(command, false)).toBe(true);
    expect(calls).toEqual([
      "visualAiEnabled=true",
      "visualAiBlockingEnabled=true",
      "visualAiBlockingEnabled=false",
      "visualAiEnabled=false",
    ]);
  });

  it("stops on first failure without touching the second flag", async () => {
    const calls: string[] = [];
    const command = async (_a: string, p: Record<string, unknown>) => {
      calls.push(String(p.key));
      return false;
    };
    expect(await setVisualBlocking(command, true)).toBe(false);
    expect(calls).toEqual(["visualAiEnabled"]);
  });

  it("rolls back the first flag when the second fails", async () => {
    const calls: string[] = [];
    const command = async (_a: string, p: Record<string, unknown>) => {
      calls.push(`${String(p.key)}=${String(p.value)}`);
      return p.key === "visualAiEnabled";
    };
    expect(await setVisualBlocking(command, true)).toBe(false);
    expect(calls).toEqual([
      "visualAiEnabled=true",
      "visualAiBlockingEnabled=true",
      "visualAiEnabled=false",
    ]);
  });
});
