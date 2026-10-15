import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import type { AuthState, MobileSession } from "../types";
import { authStorage } from "../storage/authStorage";
import { authApi } from "../api/authApi";
import { syncStorage } from "../../sync/storage/syncStorage";
import { isSessionStale } from "../services/tokenFreshness";
import { promptGoogleSignIn, promptGoogleSignOut } from "../services/googleAuth";

export interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  clearError: () => void;
  refresh: () => Promise<void>;
  /**
   * Returns an access token that is safe to send now, refreshing it first when it is
   * expired/expiring (or when `force` is set, e.g. after a 401). Concurrent callers share
   * one refresh. Throws an error with `code: "SESSION_EXPIRED"` if the session is dead.
   */
  getValidAccessToken: (options?: { force?: boolean }) => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    session: null,
    user: null,
    profile: null,
    settings: null,
    error: null,
  });

  const sessionRef = useRef<MobileSession | null>(null);
  sessionRef.current = state.session;
  const refreshInFlight = useRef<Promise<MobileSession> | null>(null);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const refreshTokens = useCallback((current: MobileSession): Promise<MobileSession> => {
    if (refreshInFlight.current) return refreshInFlight.current;

    const run = (async () => {
      try {
        // Always use the newest stored refresh token: Supabase rotates it on every use.
        const latest = sessionRef.current ?? current;
        const fresh = await authApi.refreshSession(latest.refreshToken);
        await authStorage.saveTokens(fresh);
        sessionRef.current = fresh;
        setState((prev) => ({ ...prev, session: fresh }));
        return fresh;
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 400 || status === 401 || status === 403) {
          // Refresh token is revoked/used: the session cannot be recovered without signing in again.
          await authStorage.clearAuthData();
          sessionRef.current = null;
          setState({
            status: "unauthenticated",
            session: null,
            user: null,
            profile: null,
            settings: null,
            error: "Your session expired. Please sign in again.",
          });
          const expired = new Error("Your session expired. Please sign in again.");
          (expired as unknown as { code?: string }).code = "SESSION_EXPIRED";
          throw expired;
        }
        throw err;
      } finally {
        refreshInFlight.current = null;
      }
    })();

    refreshInFlight.current = run;
    return run;
  }, []);

  const getValidAccessToken = useCallback(
    async (options?: { force?: boolean }): Promise<string> => {
      const current = sessionRef.current;
      if (!current) {
        const err = new Error("Please sign in to continue.");
        (err as unknown as { code?: string }).code = "SESSION_EXPIRED";
        throw err;
      }
      if (!options?.force && !isSessionStale(current)) return current.accessToken;
      const fresh = await refreshTokens(current);
      return fresh.accessToken;
    },
    [refreshTokens]
  );

  const refresh = useCallback(async () => {
    const stored = await authStorage.loadAuthData();
    if (!stored) {
      setState({
        status: "unauthenticated",
        session: null,
        user: null,
        profile: null,
        settings: null,
        error: null,
      });
      return;
    }

    // Set authenticated immediately from local secure cache
    sessionRef.current = stored.session;
    setState({
      status: "authenticated",
      session: stored.session,
      user: stored.user,
      profile: stored.profile,
      settings: stored.settings,
      error: null,
    });

    // Refresh a stale token in the background; failures (e.g. offline) are retried on demand
    // by getValidAccessToken when a request actually needs the token.
    if (stored.session.refreshToken && isSessionStale(stored.session)) {
      try {
        await refreshTokens(stored.session);
      } catch (e) {
        console.warn("Background token refresh failed:", e);
      }
    }
  }, [refreshTokens]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Coming back to the foreground is when a long-lived session is most likely stale.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const current = sessionRef.current;
      if (next === "active" && current && isSessionStale(current)) {
        void refreshTokens(current).catch((e) => console.warn("Foreground token refresh failed:", e));
      }
    });
    return () => sub.remove();
  }, [refreshTokens]);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const googleRes = await promptGoogleSignIn();
      if (!googleRes) {
        // User cancelled the prompt
        setState((prev) => ({ ...prev, status: prev.session ? "authenticated" : "unauthenticated" }));
        return false;
      }

      const authRes = await authApi.verifyGoogleIdToken(googleRes.idToken);

      await authStorage.saveAuthData({
        session: authRes.session,
        user: authRes.user,
        profile: authRes.profile,
        settings: authRes.settings,
      });

      setState({
        status: "authenticated",
        session: authRes.session,
        user: authRes.user,
        profile: authRes.profile,
        settings: authRes.settings,
        error: null,
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign in with Google";
      setState((prev) => ({
        ...prev,
        status: prev.session ? "authenticated" : "unauthenticated",
        error: message,
      }));
      return false;
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    const currentToken = state.session?.accessToken;
    setState((prev) => ({ ...prev, status: "loading" }));

    try {
      if (currentToken) {
        await authApi.logout(currentToken);
      }
    } catch (e) {
      console.warn("Backend logout error ignored during sign-out:", e);
    }

    await promptGoogleSignOut();
    await authStorage.clearAuthData();

    setState({
      status: "unauthenticated",
      session: null,
      user: null,
      profile: null,
      settings: null,
      error: null,
    });
  }, [state.session?.accessToken]);

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    const currentToken = state.session?.accessToken;
    if (!currentToken) return false;

    setState((prev) => ({ ...prev, status: "loading" }));

    try {
      await authApi.deleteAccount(currentToken);
      await promptGoogleSignOut();
      await authStorage.clearAuthData();
      // The server account is gone: drop anything still queued for upload and the sync identity, so none of it
      // can be sent to a different account that signs in later on this phone.
      await syncStorage.clearAll();

      setState({
        status: "unauthenticated",
        session: null,
        user: null,
        profile: null,
        settings: null,
        error: null,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete account";
      setState((prev) => ({
        ...prev,
        status: "authenticated",
        error: message,
      }));
      return false;
    }
  }, [state.session?.accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signInWithGoogle,
      signOut,
      deleteAccount,
      clearError,
      refresh,
      getValidAccessToken,
    }),
    [state, signInWithGoogle, signOut, deleteAccount, clearError, refresh, getValidAccessToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
