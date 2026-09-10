import { Platform } from "react-native";
import type { MobileAuthResponse, MobileSession, UserProfile, UserSettings } from "../types";

// Configurable backend URL: reads EXPO_PUBLIC_API_URL from environment,
// falling back to Android emulator host (10.0.2.2:3000) or localhost:3000
const DEFAULT_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000");

let baseUrl = DEFAULT_URL;

export function setApiBaseUrl(url: string) {
  baseUrl = url.replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  return baseUrl;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    error: {
      code: "PARSE_ERROR",
      message: `Invalid server response (${response.status})`,
    },
  }));

  if (!response.ok || !json.success || !json.data) {
    const message = json.error?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return json.data;
}

export const authApi = {
  /**
   * Exchanges native Google ID Token for an authenticated Supabase session and Drizzle profile.
   */
  async verifyGoogleIdToken(idToken: string, nonce?: string): Promise<MobileAuthResponse> {
    return request<MobileAuthResponse>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken, nonce }),
    });
  },

  /**
   * Refreshes the mobile session using a refresh token.
   */
  async refreshSession(refreshToken: string): Promise<MobileSession> {
    return request<MobileSession>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  },

  /**
   * Fetches the user profile and attention settings.
   */
  async getMe(accessToken: string): Promise<{
    user: { id: string; email: string | null; provider: string };
    profile: UserProfile;
    settings: UserSettings;
  }> {
    return request("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },

  /**
   * Signs out the user session.
   */
  async logout(accessToken?: string): Promise<void> {
    try {
      await request("/api/auth/logout", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
    } catch (e) {
      // Best-effort logout; ignore network errors during sign-out
      console.warn("Backend logout notification failed:", e);
    }
  },

  /**
   * Deletes the user account completely from the backend.
   */
  async deleteAccount(accessToken: string): Promise<void> {
    await request("/api/account/delete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
};
