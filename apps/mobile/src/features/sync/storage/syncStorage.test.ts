import { syncStorage } from "./syncStorage";
import type { QueuedMutation } from "../types";

jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    getItemAsync: jest.fn(async (key: string) => {
      return store.get(key) ?? null;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __store: store,
  };
});

describe("syncStorage service", () => {
  beforeEach(async () => {
    await syncStorage.clearAll();
    jest.clearAllMocks();
  });

  it("enqueues and loads mutations", async () => {
    const mutation: QueuedMutation = {
      mutation_id: "mut-1",
      entity_id: "reward",
      entity_kind: "reward",
      operation: "update",
      schema_version: 1,
      client_updated_at: "2026-09-11T00:00:00.000Z",
      payload: { balance: 10, lifetimeEarned: 10, claimedDays: ["2026-09-11"], updatedAt: "2026-09-11T00:00:00.000Z" },
      retry_count: 0,
      created_at: "2026-09-11T00:00:00.000Z",
    };

    await syncStorage.enqueueMutation(mutation);

    const queue = await syncStorage.loadQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].mutation_id).toBe("mut-1");
  });

  it("dequeues acknowledged mutations", async () => {
    const mut1: QueuedMutation = {
      mutation_id: "mut-1",
      entity_id: "reward",
      entity_kind: "reward",
      operation: "update",
      schema_version: 1,
      client_updated_at: "2026-09-11T00:00:00.000Z",
      payload: {},
      retry_count: 0,
      created_at: "2026-09-11T00:00:00.000Z",
    };
    const mut2: QueuedMutation = {
      mutation_id: "mut-2",
      entity_id: "settings",
      entity_kind: "settings",
      operation: "update",
      schema_version: 1,
      client_updated_at: "2026-09-11T00:01:00.000Z",
      payload: {},
      retry_count: 0,
      created_at: "2026-09-11T00:01:00.000Z",
    };

    await syncStorage.saveQueue([mut1, mut2]);
    await syncStorage.dequeueMutations(["mut-1"]);

    const remaining = await syncStorage.loadQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].mutation_id).toBe("mut-2");
  });

  it("handles metadata persistence and stable deviceId generation", async () => {
    const deviceId1 = await syncStorage.getDeviceId();
    expect(deviceId1).toBeTruthy();

    const deviceId2 = await syncStorage.getDeviceId();
    expect(deviceId2).toBe(deviceId1);

    await syncStorage.saveMetadata({
      cursor: "cursor-100",
      lastSyncedAt: "2026-09-11T00:00:00.000Z",
      lastHeartbeatAt: "2026-09-11T00:00:00.000Z",
      deviceId: deviceId1,
    });

    const loaded = await syncStorage.loadMetadata();
    expect(loaded.cursor).toBe("cursor-100");
  });

  it("toggles cloud sync enabled setting", async () => {
    expect(await syncStorage.isCloudSyncEnabled()).toBe(true);
    await syncStorage.setCloudSyncEnabled(false);
    expect(await syncStorage.isCloudSyncEnabled()).toBe(false);
    await syncStorage.setCloudSyncEnabled(true);
    expect(await syncStorage.isCloudSyncEnabled()).toBe(true);
  });
});
