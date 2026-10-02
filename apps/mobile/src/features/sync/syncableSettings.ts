import type { SyncSettingsPayload } from "@restrainify/contracts";

/**
 * The only settings that are uploaded. This mirrors `SyncSettingsPayload` in the shared contract.
 * Everything else (permission consents, Visual filter switches, app rules, ...) stays on the device.
 */
const SYNCABLE_SETTINGS: ReadonlySet<string> = new Set<keyof SyncSettingsPayload>([
  "theme",
  "recoveryEnabled",
  "trackerEnabled",
  "websiteEnabled",
  "dnsMode",
  "burstMinutes",
  "strictMinutes",
  "recoveryStart",
  "cloudSyncEnabled",
  "safeSearch",
  "proxyResistance",
  "socialWebsites",
]);

export function isSyncableSetting(key: string): boolean {
  return SYNCABLE_SETTINGS.has(key);
}
