jest.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

import { syncApi } from "./syncApi";
import { setApiBaseUrl } from "../../auth/api/authApi";
import type { SyncPushRequest, SyncPullRequest, UserActivityPing } from "@restrainify/contracts";

describe("syncApi client", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    setApiBaseUrl("http://localhost:3000");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("pushes mutations via POST /api/sync/push with bearer token", async () => {
    const mockResponse = {
      success: true,
      data: {
        accepted_cursor: "cursor-200",
        results: [{ mutation_id: "mut-1", status: "accepted" }],
      },
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const payload: SyncPushRequest = {
      device_id: "dev-123",
      mutations: [
        {
          mutation_id: "mut-1",
          entity_id: "reward",
          operation: "update",
          schema_version: 1,
          client_updated_at: "2026-09-11T00:00:00.000Z",
          payload: { balance: 10 },
        },
      ],
    };

    const res = await syncApi.push("token-123", payload);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/sync/push",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
      })
    );
    expect(res).toEqual(mockResponse.data);
  });

  it("pulls changes via POST /api/sync/pull", async () => {
    const mockResponse = {
      success: true,
      data: {
        cursor: "cursor-300",
        changes: [],
      },
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const payload: SyncPullRequest = {
      device_id: "dev-123",
      cursor: "cursor-200",
    };

    const res = await syncApi.pull("token-123", payload);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/sync/pull",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
        body: JSON.stringify(payload),
      })
    );
    expect(res).toEqual(mockResponse.data);
  });

  it("records user activity via POST /api/user/activity", async () => {
    const mockResponse = {
      success: true,
      data: {
        success: true,
        lastActiveAt: "2026-09-11T00:00:00.000Z",
      },
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const ping: UserActivityPing = {
      lastActiveAt: "2026-09-11T00:00:00.000Z",
      platform: "android",
      clientVersion: "1.0.0",
    };

    const res = await syncApi.recordActivity("token-123", ping);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/user/activity",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
        body: JSON.stringify(ping),
      })
    );
    expect(res.lastActiveAt).toBe("2026-09-11T00:00:00.000Z");
  });

  it("rejects gracefully when server responds with error", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Token expired" },
      }),
    } as Response);

    await expect(syncApi.pull("bad-token", { device_id: "d1" })).rejects.toThrow(
      "Token expired"
    );
  });
});
