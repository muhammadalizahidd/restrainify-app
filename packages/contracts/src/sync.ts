export type SyncOperation = "create" | "update" | "delete";

export type SyncEntityKind =
  | "settings"
  | "reward"
  | "recovery_event"
  | "tracker_event"
  | "domain_rule";

export interface SyncSettingsPayload {
  readonly theme: "system" | "light" | "dark";
  readonly recoveryEnabled: boolean;
  readonly trackerEnabled: boolean;
  readonly websiteEnabled: boolean;
  readonly dnsMode: "vpn" | "private";
  readonly burstMinutes: number;
  readonly strictMinutes: number;
  readonly recoveryStart: string;
  readonly cloudSyncEnabled: boolean;
  readonly updatedAt: string;
}

export interface SyncRewardPayload {
  readonly balance: number;
  readonly lifetimeEarned: number;
  readonly claimedDays: readonly string[];
  readonly updatedAt: string;
}

export interface SyncRecoveryEventPayload {
  readonly id: string;
  readonly kind: "relapse" | "urge" | "burst";
  readonly timestamp: number;
  readonly day: string;
  readonly note?: string;
  readonly resisted?: boolean;
}

export interface SyncTrackerEventPayload {
  readonly id: string;
  readonly timestamp: number;
  readonly day: string;
  readonly note?: string;
}

export interface SyncDomainRulePayload {
  readonly host: string;
  readonly allow: boolean;
  readonly enabled: boolean;
  readonly updatedAt: string;
}

export interface UserActivityPing {
  readonly lastActiveAt: string;
  readonly clientVersion?: string;
  readonly platform?: "android" | "ios" | "web";
}

export interface SyncMutation<TPayload = unknown> {
  readonly mutation_id: string;
  readonly entity_id: string;
  readonly operation: SyncOperation;
  readonly schema_version: number | string;
  readonly client_updated_at: string;
  readonly payload: TPayload;
}

export interface SyncPushRequest {
  readonly device_id: string;
  readonly cursor?: string;
  readonly last_active_at?: string;
  readonly mutations: readonly SyncMutation[];
}

export interface SyncMutationResult {
  readonly mutation_id: string;
  readonly status: "accepted" | "rejected" | "retry";
  readonly reason?: string;
}

export interface SyncPushResponse {
  readonly accepted_cursor: string;
  readonly results: readonly SyncMutationResult[];
}

export interface SyncPullRequest {
  readonly device_id: string;
  readonly cursor?: string;
}

export interface SyncPullEntityChange<T = unknown> {
  readonly entity: SyncEntityKind;
  readonly entity_id: string;
  readonly operation: SyncOperation;
  readonly updated_at: string;
  readonly data: T;
}

export interface SyncPullResponse {
  readonly cursor: string;
  readonly changes: readonly SyncPullEntityChange[];
}

