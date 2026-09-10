import * as SecureStore from "expo-secure-store";
import type { QueuedMutation, SyncMetadata } from "../types";

const MUTATIONS_KEY = "restrainify_sync_mutations";
const METADATA_KEY = "restrainify_sync_metadata";
const SYNC_ENABLED_KEY = "restrainify_cloud_sync_enabled";

function generateDeviceId(): string {
  return "dev_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
}

export const syncStorage = {
  async getDeviceId(): Promise<string> {
    const meta = await this.loadMetadata();
    if (meta.deviceId) return meta.deviceId;
    const newId = generateDeviceId();
    await this.saveMetadata({ ...meta, deviceId: newId });
    return newId;
  },

  async loadMetadata(): Promise<SyncMetadata> {
    try {
      const raw = await SecureStore.getItemAsync(METADATA_KEY);
      if (!raw) {
        const initial: SyncMetadata = {
          cursor: null,
          lastSyncedAt: null,
          lastHeartbeatAt: null,
          deviceId: generateDeviceId(),
        };
        await this.saveMetadata(initial);
        return initial;
      }
      return JSON.parse(raw) as SyncMetadata;
    } catch {
      return {
        cursor: null,
        lastSyncedAt: null,
        lastHeartbeatAt: null,
        deviceId: generateDeviceId(),
      };
    }
  },

  async saveMetadata(metadata: SyncMetadata): Promise<void> {
    try {
      await SecureStore.setItemAsync(METADATA_KEY, JSON.stringify(metadata));
    } catch (e) {
      console.warn("Failed to persist sync metadata:", e);
    }
  },

  async isCloudSyncEnabled(): Promise<boolean> {
    try {
      const raw = await SecureStore.getItemAsync(SYNC_ENABLED_KEY);
      if (raw === null) return true; // Enabled by default for authenticated users
      return raw === "true";
    } catch {
      return true;
    }
  },

  async setCloudSyncEnabled(enabled: boolean): Promise<void> {
    try {
      await SecureStore.setItemAsync(SYNC_ENABLED_KEY, enabled ? "true" : "false");
    } catch (e) {
      console.warn("Failed to set cloud sync enabled flag:", e);
    }
  },

  async loadQueue(): Promise<QueuedMutation[]> {
    try {
      const raw = await SecureStore.getItemAsync(MUTATIONS_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as QueuedMutation[];
    } catch {
      return [];
    }
  },

  async saveQueue(mutations: readonly QueuedMutation[]): Promise<void> {
    try {
      await SecureStore.setItemAsync(MUTATIONS_KEY, JSON.stringify(mutations));
    } catch (e) {
      console.warn("Failed to persist sync mutations queue:", e);
    }
  },

  async enqueueMutation(mutation: QueuedMutation): Promise<void> {
    const queue = await this.loadQueue();
    // Dedup or replace existing pending mutation for same entity if applicable
    const existingIndex = queue.findIndex(m => m.entity_id === mutation.entity_id && m.operation === mutation.operation);
    if (existingIndex >= 0) {
      queue[existingIndex] = mutation;
    } else {
      queue.push(mutation);
    }
    await this.saveQueue(queue);
  },

  async dequeueMutations(mutationIds: readonly string[]): Promise<void> {
    const queue = await this.loadQueue();
    const idSet = new Set(mutationIds);
    const remaining = queue.filter(m => !idSet.has(m.mutation_id));
    await this.saveQueue(remaining);
  },

  async clearAll(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(MUTATIONS_KEY);
      await SecureStore.deleteItemAsync(METADATA_KEY);
      await SecureStore.deleteItemAsync(SYNC_ENABLED_KEY);
    } catch (e) {
      console.warn("Failed to clear sync storage:", e);
    }
  },
};
