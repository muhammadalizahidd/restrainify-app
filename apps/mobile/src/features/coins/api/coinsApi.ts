import type {
  DailyCoinsAvailability,
  DailyCoinsClaimResult,
  DailyCoinsCheckQuery,
  DailyCoinsClaimBody,
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
    const err = new Error(message);
    (err as unknown as { code?: string }).code = json.error?.code;
    throw err;
  }

  return json.data;
}

export const coinsApi = {
  /**
   * Checks if daily coins/points are available for the authenticated user from the backend.
   */
  async checkDailyAvailability(
    accessToken: string,
    query?: DailyCoinsCheckQuery
  ): Promise<DailyCoinsAvailability> {
    const params = new URLSearchParams();
    if (query?.timezone) params.append("timezone", query.timezone);
    if (query?.day) params.append("day", query.day);
    const queryString = params.toString();
    const path = `/api/coins/daily${queryString ? `?${queryString}` : ""}`;

    return request<DailyCoinsAvailability>(path, accessToken, {
      method: "GET",
    });
  },

  /**
   * Claims 10 daily coins for the authenticated user on the backend.
   */
  async claimDailyCoins(
    accessToken: string,
    body?: DailyCoinsClaimBody
  ): Promise<DailyCoinsClaimResult> {
    return request<DailyCoinsClaimResult>("/api/coins/daily", accessToken, {
      method: "POST",
      body: JSON.stringify(body || {}),
    });
  },
};
