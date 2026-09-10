import { authStorage } from "./authStorage";
import type { AuthUser, MobileSession, UserProfile, UserSettings } from "../types";

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

describe("authStorage service", () => {
  const mockSession: MobileSession = {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    expiresIn: 3600,
    expiresAt: 1800000000,
    tokenType: "bearer",
  };

  const mockUser: AuthUser = {
    id: "user-123",
    email: "user@example.com",
    fullName: "Test User",
    avatarUrl: "https://example.com/avatar.jpg",
    provider: "google",
  };

  const mockProfile: UserProfile = {
    id: "user-123",
    email: "user@example.com",
    fullName: "Test User",
    avatarUrl: "https://example.com/avatar.jpg",
    provider: "google",
  };

  const mockSettings: UserSettings = {
    id: "settings-123",
    userId: "user-123",
    strictModeEnabled: false,
    emergencyUnlockDelayMinutes: 15,
    explicitContentFilterEnabled: true,
    shortFormVideoFilterEnabled: true,
  };

  beforeEach(async () => {
    await authStorage.clearAuthData();
    jest.clearAllMocks();
  });

  it("saves and loads complete auth data", async () => {
    await authStorage.saveAuthData({
      session: mockSession,
      user: mockUser,
      profile: mockProfile,
      settings: mockSettings,
    });

    const loaded = await authStorage.loadAuthData();
    expect(loaded).not.toBeNull();
    expect(loaded?.session).toEqual(mockSession);
    expect(loaded?.user).toEqual(mockUser);
    expect(loaded?.profile).toEqual(mockProfile);
    expect(loaded?.settings).toEqual(mockSettings);
  });

  it("returns null if session or user is missing", async () => {
    const loaded = await authStorage.loadAuthData();
    expect(loaded).toBeNull();
  });

  it("updates session tokens with saveTokens", async () => {
    await authStorage.saveAuthData({
      session: mockSession,
      user: mockUser,
    });

    const updatedSession: MobileSession = {
      ...mockSession,
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    };

    await authStorage.saveTokens(updatedSession);

    const loaded = await authStorage.loadAuthData();
    expect(loaded?.session.accessToken).toBe("new-access-token");
    expect(loaded?.session.refreshToken).toBe("new-refresh-token");
  });

  it("clears all stored auth data", async () => {
    await authStorage.saveAuthData({
      session: mockSession,
      user: mockUser,
    });

    await authStorage.clearAuthData();

    const loaded = await authStorage.loadAuthData();
    expect(loaded).toBeNull();
  });
});
