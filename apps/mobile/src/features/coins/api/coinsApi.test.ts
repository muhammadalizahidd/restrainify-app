jest.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

import { coinsApi } from "./coinsApi";
import { setApiBaseUrl } from "../../auth/api/authApi";

describe("coinsApi client", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    setApiBaseUrl("http://localhost:3000");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("checks daily coins availability via GET /api/coins/daily with Bearer token", async () => {
    const mockResponse = {
      success: true,
      data: {
        available: true,
        coinsPerDay: 10,
        claimedToday: false,
        currentDay: "2026-09-13",
        totalCoins: 30,
        lifetimeEarned: 30,
        lastClaimedDay: "2026-09-12",
        claimedDays: ["2026-09-11", "2026-09-12"],
      },
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const result = await coinsApi.checkDailyAvailability("token-xyz", {
      timezone: "Asia/Karachi",
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/coins/daily?timezone=Asia%2FKarachi",
      expect.objectContaining({
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-xyz",
        },
      })
    );
    expect(result.available).toBe(true);
    expect(result.coinsPerDay).toBe(10);
    expect(result.totalCoins).toBe(30);
  });

  it("claims 10 daily coins via POST /api/coins/daily with Bearer token", async () => {
    const mockResponse = {
      success: true,
      data: {
        claimed: true,
        coinsAwarded: 10,
        totalCoins: 40,
        claimedDay: "2026-09-13",
        createdAt: "2026-09-13T14:30:00.000Z",
      },
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const result = await coinsApi.claimDailyCoins("token-xyz", {
      timezone: "Asia/Karachi",
      day: "2026-09-13",
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/coins/daily",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-xyz",
        },
        body: JSON.stringify({
          timezone: "Asia/Karachi",
          day: "2026-09-13",
        }),
      })
    );
    expect(result.claimed).toBe(true);
    expect(result.coinsAwarded).toBe(10);
    expect(result.totalCoins).toBe(40);
  });

  it("throws error with code when already claimed (409 Conflict)", async () => {
    const mockResponse = {
      success: false,
      error: {
        code: "ALREADY_CLAIMED",
        message: "Daily coins reward has already been claimed for 2026-09-13.",
      },
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => mockResponse,
    } as Response);

    await expect(coinsApi.claimDailyCoins("token-xyz")).rejects.toThrow(
      "Daily coins reward has already been claimed for 2026-09-13."
    );
  });

  it("throws error when backend returns invalid/error payload", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: { code: "SERVER_ERROR", message: "Database failure" },
      }),
    } as Response);

    await expect(coinsApi.checkDailyAvailability("token-xyz")).rejects.toThrow(
      "Database failure"
    );
  });
});
