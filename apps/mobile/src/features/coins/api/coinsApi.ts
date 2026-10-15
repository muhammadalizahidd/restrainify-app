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
    (err as unknown as { status?: number }).status = response.status;
    throw err;
  }

  return json.data;
}

/** True when the backend rejected the bearer token (expired/invalid JWT). */
export function isAuthRejection(err: unknown): boolean {
  const e = err as { status?: number; code?: string } | null;
  return e?.status === 401 || e?.code === "UNAUTHORIZED";
}

export function isAlreadyClaimed(err: unknown): boolean {
  const e = err as { status?: number; code?: string } | null;
  return e?.code === "ALREADY_CLAIMED" || e?.status === 409;
}

/** Device IANA timezone so the server resolves the user's local calendar day instead of the UTC day. */
function deviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
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
    const timezone = query?.timezone ?? deviceTimezone();
    if (timezone) params.append("timezone", timezone);
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
      body: JSON.stringify({ timezone: deviceTimezone(), ...(body || {}) }),
    });
  },
};
