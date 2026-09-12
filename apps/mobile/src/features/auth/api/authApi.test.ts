jest.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

import { authApi, setApiBaseUrl } from "./authApi";

describe("authApi client", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    setApiBaseUrl("http://localhost:3000");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("verifies Google ID Token via POST /api/auth/google", async () => {
    const mockResponse = {
      success: true,
      data: {
        session: {
          accessToken: "access-token-123",
          refreshToken: "refresh-token-123",
          expiresIn: 3600,
        },
        user: {
          id: "u-1",
          email: "test@example.com",
          fullName: "Tester",
          avatarUrl: null,
          provider: "google",
        },
        profile: {
          id: "u-1",
          email: "test@example.com",
          fullName: "Tester",
          avatarUrl: null,
          provider: "google",
        },
        settings: {
          id: "s-1",
          userId: "u-1",
          strictModeEnabled: false,
          emergencyUnlockDelayMinutes: 15,
          explicitContentFilterEnabled: true,
          shortFormVideoFilterEnabled: true,
        },
      },
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await authApi.verifyGoogleIdToken("google-id-token-abc", "nonce-123");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/google",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idToken: "google-id-token-abc", nonce: "nonce-123" }),
      })
    );
    expect(result).toEqual(mockResponse.data);
  });

  it("refreshes session via POST /api/auth/refresh", async () => {
    const mockSession = {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockSession,
      }),
    } as Response);

    const result = await authApi.refreshSession("old-refresh-token");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/refresh",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refreshToken: "old-refresh-token" }),
      })
    );
    expect(result).toEqual(mockSession);
  });

  it("handles server error responses deterministically", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: {
          code: "AUTH_FAILED",
          message: "Invalid or expired Google token",
        },
      }),
    } as Response);

    await expect(authApi.verifyGoogleIdToken("bad-token")).rejects.toThrow(
      "Invalid or expired Google token"
    );
  });

  it("deletes user account via POST /api/account/delete with bearer token", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { message: "Account deleted", deleted: true },
      }),
    } as Response);

    await authApi.deleteAccount("bearer-token-123");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/account/delete",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer bearer-token-123",
        }),
      })
    );
  });
});
