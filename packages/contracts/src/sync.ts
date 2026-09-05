export type SyncOperation = "create" | "update" | "delete";

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

export interface SyncPullResponse<TChange = unknown> {
  readonly cursor: string;
  readonly changes: readonly TChange[];
}
