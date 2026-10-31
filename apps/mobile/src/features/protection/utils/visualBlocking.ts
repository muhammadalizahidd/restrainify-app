import type { OfflineSnapshot } from "../../../native/OfflineProtection";

type SettingCommand = (
  action: string,
  payload: Record<string, unknown>
) => Promise<boolean>;

/**
 * Apps the native pipeline samples (Policy.KNOWN_FEED_PACKAGES, incl. Lite/regional variants), each with its own
 * on/off switch. Ids match Policy.VISUAL_PLATFORMS.
 */
export const VISUAL_PROTECTED_APPS = [
  { id: "instagram", name: "Instagram" },
  { id: "tiktok", name: "TikTok" },
  { id: "youtube", name: "YouTube" },
  { id: "snapchat", name: "Snapchat" },
  { id: "facebook", name: "Facebook" },
] as const;

export type VisualPlatformId = (typeof VISUAL_PROTECTED_APPS)[number]["id"];

/** Every platform is on unless the user switched it off. */
export function isVisualPlatformOn(data: OfflineSnapshot | null | undefined, platform: VisualPlatformId): boolean {
  return !(data?.settings.visualAiDisabledPlatforms ?? []).includes(platform);
}

/**
 * Android Accessibility must be both consented to in-app and connected in the OS.
 * Native sampling returns early without either (RestrictionService.requestVisualFrame).
 */
export function hasVisualAccessibility(data: OfflineSnapshot | null | undefined): boolean {
  return Boolean(data?.capabilities.accessibility && data.settings.accessibilityConsent);
}

/** Visual blocking is one user-facing switch backed by two native settings. */
export function isVisualBlockingOn(data: OfflineSnapshot | null | undefined): boolean {
  return Boolean(data?.settings.visualAiEnabled && data.settings.visualAiBlockingEnabled);
}

/**
 * Sets both native flags together. Sampling is enabled before blocking and disabled after it,
 * and a partial failure is rolled back so the two flags never disagree.
 */
export async function setVisualBlocking(command: SettingCommand, enabled: boolean): Promise<boolean> {
  const first = enabled ? "visualAiEnabled" : "visualAiBlockingEnabled";
  const second = enabled ? "visualAiBlockingEnabled" : "visualAiEnabled";
  if (!(await command("setting", { key: first, value: enabled }))) return false;
  if (await command("setting", { key: second, value: enabled })) return true;
  await command("setting", { key: first, value: !enabled });
  return false;
}
