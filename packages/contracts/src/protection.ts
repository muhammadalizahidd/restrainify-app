export type ProtectionRuntimeState =
  | "ACTIVE"
  | "STANDBY"
  | "PARTIAL"
  | "DEGRADED"
  | "VISUAL_WARMING"
  | "VISUAL_ACTIVE"
  | "VISUAL_THROTTLED";

export type CapabilityHealthState = "active" | "standby" | "degraded" | "disabled" | "error";

export interface CapabilityHealth {
  readonly state: CapabilityHealthState;
  readonly label: string;
  readonly detail?: string;
  readonly repairAction?: string;
  readonly checkedAt: string;
}

export interface ProtectionHealth {
  readonly runtimeState: ProtectionRuntimeState;
  readonly website: CapabilityHealth;
  readonly visual: CapabilityHealth;
  readonly usage: CapabilityHealth;
  readonly antiBypass: CapabilityHealth;
  readonly sync?: SyncHealth;
}

export interface SyncHealth {
  readonly state: "offline" | "syncing" | "online" | "error";
  readonly pendingCount: number;
  readonly lastSyncedAt?: string;
  readonly detail?: string;
}
