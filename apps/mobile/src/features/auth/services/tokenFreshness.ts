import type { MobileSession } from "../types";

/** Treat a token as stale this many seconds before it really expires. */
export const TOKEN_REFRESH_SKEW_SECONDS = 60;

function decodeBase64Url(input: string): string | null {
  try {
    const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return (globalThis as unknown as { atob: (v: string) => string }).atob(padded);
  } catch {
    return null;
  }
}

/** Reads the `exp` claim (seconds since epoch) from a JWT without verifying it. */
export function readJwtExpiry(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  const json = decodeBase64Url(payload);
  if (!json) return null;
  try {
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

/**
 * True when the access token is expired, about to expire, or its expiry cannot be determined.
 * The JWT `exp` claim wins over the stored `expiresAt`, which the backend may omit.
 */
export function isSessionStale(
  session: Pick<MobileSession, "accessToken" | "expiresAt">,
  nowSeconds: number = Date.now() / 1000
): boolean {
  const expiry = readJwtExpiry(session.accessToken) ?? session.expiresAt ?? null;
  if (expiry === null) return true;
  return nowSeconds > expiry - TOKEN_REFRESH_SKEW_SECONDS;
}
