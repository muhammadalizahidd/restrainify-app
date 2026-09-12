import type {
  SyncPullRequest,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
  UserActivityPing,
} from "@restrainify/contracts";
import { getApiBaseUrl } from "../../auth/api/authApi";

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
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
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

export const syncApi = {
  /**
   * Pushes pending local mutations to the cloud backend.
   */
  async push(accessToken: string, payload: SyncPushRequest): Promise<SyncPushResponse> {
    return request<SyncPushResponse>("/api/sync/push", accessToken, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Pulls server changes created or modified after client's cursor.
   */
  async pull(accessToken: string, payload: SyncPullRequest): Promise<SyncPullResponse> {
    return request<SyncPullResponse>("/api/sync/pull", accessToken, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Reports user active presence / last login heartbeat to backend for active users.
   */
  async recordActivity(
    accessToken: string,
    ping: UserActivityPing
  ): Promise<{ success: boolean; lastActiveAt: string }> {
    return request<{ success: boolean; lastActiveAt: string }>(
      "/api/user/activity",
      accessToken,
      {
        method: "POST",
        body: JSON.stringify(ping),
      }
    );
  },
};
