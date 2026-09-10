import type {
  SyncDomainRulePayload,
  SyncEntityKind,
  SyncMutation,
  SyncRecoveryEventPayload,
  SyncRewardPayload,
  SyncSettingsPayload,
  SyncTrackerEventPayload,
} from "@restrainify/contracts";

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

export interface SyncState {
  readonly status: SyncStatus;
  readonly lastSyncedAt: string | null;
  readonly pendingCount: number;
  readonly lastError: string | null;
  readonly cloudSyncEnabled: boolean;
}

export type AnySyncPayload =
  | SyncSettingsPayload
  | SyncRewardPayload
  | SyncRecoveryEventPayload
  | SyncTrackerEventPayload
  | SyncDomainRulePayload
  | Record<string, unknown>;

export interface QueuedMutation<T = AnySyncPayload> extends SyncMutation<T> {
  readonly entity_kind: SyncEntityKind;
  readonly retry_count: number;
  readonly created_at: string;
}

export interface SyncMetadata {
  readonly cursor: string | null;
  readonly lastSyncedAt: string | null;
  readonly lastHeartbeatAt: string | null;
  readonly deviceId: string;
}

export interface SyncResult {
  readonly pushedCount: number;
  readonly pulledCount: number;
  readonly error?: string;
}
