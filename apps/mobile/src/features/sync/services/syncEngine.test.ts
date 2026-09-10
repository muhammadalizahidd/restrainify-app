jest.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import { syncEngine } from "./syncEngine";
import { syncApi } from "../api/syncApi";
import { syncStorage } from "../storage/syncStorage";
import { activityReporter } from "./activityReporter";
import type { SyncPullEntityChange, SyncPushResponse, SyncPullResponse } from "@restrainify/contracts";

jest.mock("../api/syncApi");
jest.mock("../storage/syncStorage");
jest.mock("./activityReporter");

describe("syncEngine", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (syncStorage.isCloudSyncEnabled as jest.Mock).mockResolvedValue(true);
    (syncStorage.getDeviceId as jest.Mock).mockResolvedValue("dev-mock-123");
    (syncStorage.loadMetadata as jest.Mock).mockResolvedValue({
      cursor: "cur-1",
      lastSyncedAt: null,
      lastHeartbeatAt: null,
      deviceId: "dev-mock-123",
    });
    (syncStorage.loadQueue as jest.Mock).mockResolvedValue([]);
    (syncStorage.dequeueMutations as jest.Mock).mockResolvedValue(undefined);
    (syncStorage.saveMetadata as jest.Mock).mockResolvedValue(undefined);
    (activityReporter.reportActiveUserPresence as jest.Mock).mockResolvedValue(true);
  });

  it("enqueues a mutation when cloud sync is enabled", async () => {
    (syncStorage.enqueueMutation as jest.Mock).mockResolvedValue(undefined);

    const mutation = await syncEngine.enqueue("reward", "daily-reward", "update", {
      balance: 10,
      lifetimeEarned: 10,
      claimedDays: ["2026-09-11"],
      updatedAt: "2026-09-11T00:00:00.000Z",
    });

    expect(mutation.entity_kind).toBe("reward");
    expect(mutation.entity_id).toBe("daily-reward");
    expect(syncStorage.enqueueMutation).toHaveBeenCalledWith(expect.objectContaining({
      entity_id: "daily-reward",
    }));
  });

  it("pushes pending mutations and pulls changes", async () => {
    const mockPending = [
      {
        mutation_id: "mut-1",
        entity_id: "reward",
        entity_kind: "reward" as const,
        operation: "update" as const,
        schema_version: 1,
        client_updated_at: "2026-09-11T00:00:00.000Z",
        payload: { balance: 10 },
        retry_count: 0,
        created_at: "2026-09-11T00:00:00.000Z",
      },
    ];
    (syncStorage.loadQueue as jest.Mock).mockResolvedValue(mockPending);

    const pushRes: SyncPushResponse = {
      accepted_cursor: "cur-2",
      results: [{ mutation_id: "mut-1", status: "accepted" }],
    };
    (syncApi.push as jest.Mock).mockResolvedValue(pushRes);

    const pullChanges: SyncPullEntityChange[] = [
      {
        entity: "settings",
        entity_id: "user-settings",
        operation: "update",
        updated_at: "2026-09-11T00:00:00.000Z",
        data: { theme: "dark" },
      },
    ];
    const pullRes: SyncPullResponse = {
      cursor: "cur-3",
      changes: pullChanges,
    };
    (syncApi.pull as jest.Mock).mockResolvedValue(pullRes);

    const reconcileMock = jest.fn().mockResolvedValue(undefined);

    const result = await syncEngine.sync("test-token", reconcileMock);

    expect(syncApi.push).toHaveBeenCalled();
    expect(syncStorage.dequeueMutations).toHaveBeenCalledWith(["mut-1"]);
    expect(syncApi.pull).toHaveBeenCalledWith("test-token", {
      device_id: "dev-mock-123",
      cursor: "cur-2",
    });
    expect(reconcileMock).toHaveBeenCalledWith(pullChanges);
    expect(result).toEqual({ pushedCount: 1, pulledCount: 1 });
  });

  it("handles offline network error gracefully without losing local data", async () => {
    (syncStorage.loadQueue as jest.Mock).mockResolvedValue([
      {
        mutation_id: "mut-1",
        entity_id: "reward",
        entity_kind: "reward",
        operation: "update",
        schema_version: 1,
        client_updated_at: "2026-09-11T00:00:00.000Z",
        payload: {},
        retry_count: 0,
        created_at: "2026-09-11T00:00:00.000Z",
      },
    ]);
    (syncApi.push as jest.Mock).mockRejectedValue(new Error("Network request failed"));

    const result = await syncEngine.sync("test-token");

    expect(result.error).toBe("Network request failed");
    expect(syncStorage.dequeueMutations).not.toHaveBeenCalled();
  });
});
