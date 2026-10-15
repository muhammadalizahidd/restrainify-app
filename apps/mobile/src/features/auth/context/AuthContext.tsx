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
import { createSessionRefreshGate, type SessionRefreshGate } from "../services/sessionRefresh";
import { syncStorage } from "../../sync/storage/syncStorage";
import { promptGoogleSignIn, promptGoogleSignOut } from "../services/googleAuth";

export interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  clearError: () => void;
  refresh: () => Promise<void>;
  /** Fresh access token, or null if the session cannot be refreshed. `force` refreshes even if it looks valid (e.g. after a 401). */
  getAccessToken: (options?: { force?: boolean }) => Promise<string | null>;
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
  const sessionRefreshGateRef = useRef<SessionRefreshGate | null>(null);
  if (!sessionRefreshGateRef.current) {
    sessionRefreshGateRef.current = createSessionRefreshGate(
      authApi.refreshSession,
      authStorage.saveTokens,
    );
  }

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const ensureFreshSession = useCallback(async (force = false) => {
    const session = sessionRef.current;
    if (!session) return null;

    const refreshToken = session.refreshToken;
    try {
      const refreshedSession = await sessionRefreshGateRef.current!.ensureFresh(session, undefined, force);
      if (sessionRef.current?.refreshToken !== refreshToken) {
        return sessionRef.current;
      }

      if (refreshedSession !== session) {
        sessionRef.current = refreshedSession;
        setState((prev) =>
          prev.session?.refreshToken === refreshToken
            ? { ...prev, session: refreshedSession }
            : prev,
        );
      }

      return refreshedSession;
    } catch {
      // Local protection remains available offline; cloud work waits for a valid session.
      console.warn("Session refresh failed; cloud requests are paused until it succeeds.");
      return null;
    }
  }, []);

  const getAccessToken = useCallback(async (options?: { force?: boolean }) => {
    const session = await ensureFreshSession(options?.force);
    return session?.accessToken ?? null;
  }, [ensureFreshSession]);

  const refresh = useCallback(async () => {
    const stored = await authStorage.loadAuthData();
    if (!stored) {
      sessionRef.current = null;
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

    sessionRef.current = stored.session;
    setState({
      status: "authenticated",
      session: stored.session,
      user: stored.user,
      profile: stored.profile,
      settings: stored.settings,
      error: null,
    });

    await ensureFreshSession();
  }, [ensureFreshSession]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void ensureFreshSession();
      }
    });
    return () => subscription.remove();
  }, [ensureFreshSession]);

  useEffect(() => {
    const session = state.session;
    if (!session) return;

    const refreshAt = (session.expiresAt ?? Date.now() / 1000) - 300;
    const delay = Math.max(0, refreshAt * 1000 - Date.now());
    const timer = setTimeout(() => {
      if (AppState.currentState === "active") {
        void ensureFreshSession();
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [state.session?.expiresAt, state.session?.refreshToken, ensureFreshSession]);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const googleRes = await promptGoogleSignIn();
      if (!googleRes) {
        // User cancelled the prompt
        setState((prev) => ({
          ...prev,
          status: prev.session ? "authenticated" : "unauthenticated",
        }));
        return false;
      }

      const authRes = await authApi.verifyGoogleIdToken(googleRes.idToken);

      await authStorage.saveAuthData({
        session: authRes.session,
        user: authRes.user,
        profile: authRes.profile,
        settings: authRes.settings,
      });

      sessionRef.current = authRes.session;
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
    const currentToken = await getAccessToken();
    sessionRef.current = null;
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
  }, [getAccessToken]);

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    const currentToken = await getAccessToken();
    if (!currentToken) return false;

    setState((prev) => ({ ...prev, status: "loading" }));

    try {
      await authApi.deleteAccount(currentToken);
      await promptGoogleSignOut();
      await authStorage.clearAuthData();
      // The server account is gone: drop anything still queued for upload and the sync identity, so none of it
      // can be sent to a different account that signs in later on this phone.
      await syncStorage.clearAll();

      sessionRef.current = null;
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
  }, [getAccessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signInWithGoogle,
      signOut,
      deleteAccount,
      clearError,
      refresh,
      getAccessToken,
    }),
    [state, signInWithGoogle, signOut, deleteAccount, clearError, refresh, getAccessToken],
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
