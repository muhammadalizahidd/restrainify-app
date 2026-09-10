import type {
  SyncEntityKind,
  SyncOperation,
  SyncPullEntityChange,
  SyncPushRequest,
} from "@restrainify/contracts";
import { syncApi } from "../api/syncApi";
import { syncStorage } from "../storage/syncStorage";
import { activityReporter } from "./activityReporter";
import type { AnySyncPayload, QueuedMutation, SyncResult } from "../types";

let isSyncing = false;

export const syncEngine = {
  /**
   * Helper to construct and enqueue a local-first mutation.
   */
  async enqueue(
    entityKind: SyncEntityKind,
    entityId: string,
    operation: SyncOperation,
    payload: AnySyncPayload
  ): Promise<QueuedMutation> {
    const isEnabled = await syncStorage.isCloudSyncEnabled();
    const timestamp = new Date().toISOString();
    const mutation: QueuedMutation = {
      mutation_id: `${entityId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      entity_id: entityId,
      entity_kind: entityKind,
      operation,
      schema_version: 1,
      client_updated_at: timestamp,
      payload,
      retry_count: 0,
      created_at: timestamp,
    };

    if (isEnabled) {
      await syncStorage.enqueueMutation(mutation);
    }
    return mutation;
  },

  /**
   * Executes a full push-and-pull synchronization cycle.
   */
  async sync(
    accessToken: string,
    onReconcileLocal?: (changes: readonly SyncPullEntityChange[]) => Promise<void>
  ): Promise<SyncResult> {
    if (!accessToken) {
      return { pushedCount: 0, pulledCount: 0, error: "Not authenticated" };
    }

    const isEnabled = await syncStorage.isCloudSyncEnabled();
    if (!isEnabled) {
      return { pushedCount: 0, pulledCount: 0, error: "Cloud sync is disabled" };
    }

    if (isSyncing) {
      return { pushedCount: 0, pulledCount: 0 };
    }

    isSyncing = true;
    let pushedCount = 0;
    let pulledCount = 0;

    try {
      const deviceId = await syncStorage.getDeviceId();
      const metadata = await syncStorage.loadMetadata();
      const pendingMutations = await syncStorage.loadQueue();
      const nowIso = new Date().toISOString();

      // 1. Push pending local mutations if any exist
      let acceptedCursor = metadata.cursor;
      if (pendingMutations.length > 0) {
        const pushPayload: SyncPushRequest = {
          device_id: deviceId,
          cursor: metadata.cursor ?? undefined,
          last_active_at: nowIso,
          mutations: pendingMutations,
        };

        const pushResponse = await syncApi.push(accessToken, pushPayload);
        acceptedCursor = pushResponse.accepted_cursor;

        const acceptedIds = pushResponse.results
          .filter((r) => r.status === "accepted")
          .map((r) => r.mutation_id);

        if (acceptedIds.length > 0) {
          await syncStorage.dequeueMutations(acceptedIds);
          pushedCount = acceptedIds.length;
        }
      }

      // 2. Pull server changes since current cursor
      const pullResponse = await syncApi.pull(accessToken, {
        device_id: deviceId,
        cursor: acceptedCursor ?? undefined,
      });

      if (pullResponse.changes.length > 0 && onReconcileLocal) {
        await onReconcileLocal(pullResponse.changes);
        pulledCount = pullResponse.changes.length;
      }

      // 3. Update sync metadata
      const nextCursor = pullResponse.cursor || acceptedCursor || metadata.cursor;
      await syncStorage.saveMetadata({
        ...metadata,
        cursor: nextCursor,
        lastSyncedAt: nowIso,
      });

      // 4. Report active user presence / last login (throttled)
      void activityReporter.reportActiveUserPresence(accessToken);

      return { pushedCount, pulledCount };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      return { pushedCount, pulledCount, error: message };
    } finally {
      isSyncing = false;
    }
  },
};
