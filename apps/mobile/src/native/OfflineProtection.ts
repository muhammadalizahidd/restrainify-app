import { NativeEventEmitter, NativeModules } from "react-native";

export interface DomainRule { host: string; allow: boolean; enabled: boolean }
export interface AppRule {
  packageName: string; enabled: boolean; limitMinutes: number;
  startMinute: number; endMinute: number; days: number[];
  feedMode: "off" | "experimental" | "whole_app"; burst: boolean;
}
export interface InstalledApp { packageName: string; label: string }
export interface LocalEvent { id: string; kind: "relapse" | "urge" | "burst" | "tracker"; timestamp: number; day: string; note: string; resisted: boolean }
export interface OfflineSnapshot {
  settings: {
    onboardingComplete: boolean; theme: "system" | "light" | "dark";
    recoveryEnabled: boolean; trackerEnabled: boolean; websiteEnabled: boolean;
    accessibilityConsent: boolean; dnsMode: "vpn" | "private";
    burstMinutes: number; strictMinutes: number; recoveryStart: string;
    domains: DomainRule[]; rules: AppRule[]; burstId?: string;
  };
  capabilities: { usage: boolean; accessibility: boolean; vpn: boolean; vpnError: string | null; privateDns: string };
  events: LocalEvent[];
  recovery: { current: number; longest: number; cleanDays: number };
  reward: { balance: number; claimed: boolean };
  burstRemainingMs: number; strictRemainingMs: number; blockedToday: number;
  usage: { todayMs: number; week: { day: string; ms: number }[]; apps: (InstalledApp & { ms: number })[] };
  storageError: string | null;
}
interface NativeProtection {
  getState(): Promise<string>;
  execute(action: string, payload: string): Promise<string>;
  getInstalledApps(): Promise<string>;
  openSettings(kind: string): Promise<void>;
  startWebsiteProtection(): Promise<void>;
  stopWebsiteProtection(): Promise<void>;
  addListener(name: string): void;
  removeListeners(count: number): void;
}
const native = NativeModules.RestrainifyProtectionBridge as NativeProtection | undefined;
function requireNative(): NativeProtection {
  if (!native) throw new Error("Install the Android development build to use encrypted storage and protection. Expo Go cannot provide these services.");
  return native;
}
export function parseSnapshot(raw: string): OfflineSnapshot {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || !("settings" in value) || !("capabilities" in value) || !("events" in value) || !Array.isArray(value.events) || !("recovery" in value) || !("usage" in value)) throw new Error("Android returned an invalid protection snapshot.");
  return value as OfflineSnapshot;
}
export const offlineProtection = {
  snapshot: async () => parseSnapshot(await requireNative().getState()),
  command: async (action: string, payload: Record<string, unknown> = {}) => parseSnapshot(await requireNative().execute(action, JSON.stringify(payload))),
  apps: async (): Promise<InstalledApp[]> => JSON.parse(await requireNative().getInstalledApps()) as InstalledApp[],
  settings: (kind: string) => requireNative().openSettings(kind),
  startVpn: () => requireNative().startWebsiteProtection(),
  stopVpn: () => requireNative().stopWebsiteProtection(),
  subscribe: (listener: () => void) => native ? new NativeEventEmitter(native).addListener("ProtectionChanged", listener) : undefined,
};
