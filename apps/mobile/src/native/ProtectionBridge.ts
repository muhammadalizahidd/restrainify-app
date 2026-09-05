import type { ProtectionHealth } from "@restrainify/contracts";

export interface ProtectionBridge {
  getDashboardState(): Promise<unknown>;
  getProtectionHealth(): Promise<ProtectionHealth>;
  updateProtectionSettings(patch: unknown): Promise<ProtectionHealth>;
  triggerBurst(): Promise<{ id: string; cooldownEndsAt: string }>;
  markBurstResisted(id: string): Promise<void>;
  addCustomBlockedDomain(domain: string): Promise<void>;
  removeCustomBlockedDomain(domain: string): Promise<void>;
  logRelapse(timestamp: string, category: string, note?: string): Promise<void>;
}

export const protectionBridgeModuleName = "RestrainifyProtectionBridge";
