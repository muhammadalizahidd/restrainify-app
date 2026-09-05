export type PersonBlurMode = "off" | "blur_women" | "blur_men" | "blur_everyone";

export interface ProtectionSettings {
  readonly websiteProtectionEnabled: boolean;
  readonly visualProtectionEnabled: boolean;
  readonly personBlurMode: PersonBlurMode;
  readonly socialFeedProtectionEnabled: boolean;
  readonly recoveryTrackingEnabled: boolean;
  readonly fapTrackerEnabled: boolean;
  readonly cloudSyncEnabled: boolean;
  readonly strictModeEnabled: boolean;
  readonly schemaVersion: number;
  readonly updatedAt: string;
}
