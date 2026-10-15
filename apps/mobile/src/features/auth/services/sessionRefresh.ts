import type { MobileSession } from "../types";

export const SESSION_REFRESH_BUFFER_SECONDS = 5 * 60;

export function sessionNeedsRefresh(session: MobileSession, nowSeconds = Date.now() / 1000) {
  return (
    typeof session.expiresAt !== "number" ||
    nowSeconds >= session.expiresAt - SESSION_REFRESH_BUFFER_SECONDS
  );
}

export interface SessionRefreshGate {
  ensureFresh(session: MobileSession, nowSeconds?: number, force?: boolean): Promise<MobileSession>;
}

interface RefreshFlight {
  refreshToken: string;
  promise: Promise<MobileSession>;
}

/**
 * Serializes refresh-token rotation so concurrent cloud requests never exchange
 * the same Supabase refresh token twice. The replacement session is persisted
 * before it is returned to callers.
 */
export function createSessionRefreshGate(
  refreshSession: (refreshToken: string) => Promise<MobileSession>,
  persistSession: (session: MobileSession) => Promise<void>,
) {
  let refreshInFlight: RefreshFlight | null = null;

  const gate: SessionRefreshGate = {
    async ensureFresh(session, nowSeconds = Date.now() / 1000, force = false) {
      if (!force && !sessionNeedsRefresh(session, nowSeconds)) {
        return session;
      }

      if (!refreshInFlight || refreshInFlight.refreshToken !== session.refreshToken) {
        const pendingRefresh = (async () => {
          const replacement = await refreshSession(session.refreshToken);
          await persistSession(replacement);
          return replacement;
        })();
        const flight = {
          refreshToken: session.refreshToken,
          promise: pendingRefresh,
        };

        refreshInFlight = flight;
        void pendingRefresh.then(
          () => {
            if (refreshInFlight === flight) refreshInFlight = null;
          },
          () => {
            if (refreshInFlight === flight) refreshInFlight = null;
          },
        );
      }

      return refreshInFlight.promise;
    },
  };

  return gate;
}
