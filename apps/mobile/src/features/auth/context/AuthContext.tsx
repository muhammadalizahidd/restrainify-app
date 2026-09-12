import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { AuthState } from "../types";
import { authStorage } from "../storage/authStorage";
import { authApi } from "../api/authApi";
import { promptGoogleSignIn, promptGoogleSignOut } from "../services/googleAuth";

export interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  clearError: () => void;
  refresh: () => Promise<void>;
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

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

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
    setState({
      status: "authenticated",
      session: stored.session,
      user: stored.user,
      profile: stored.profile,
      settings: stored.settings,
      error: null,
    });

    // Check token freshness in background if refreshToken is present
    if (stored.session.refreshToken) {
      const isExpiringSoon =
        stored.session.expiresAt &&
        Date.now() / 1000 > stored.session.expiresAt - 300;

      if (isExpiringSoon) {
        try {
          const freshSession = await authApi.refreshSession(stored.session.refreshToken);
          await authStorage.saveTokens(freshSession);
          setState((prev) => ({
            ...prev,
            session: freshSession,
          }));
        } catch (e) {
          // If network is offline, maintain local authenticated session
          console.warn("Background token refresh failed (offline or network error):", e);
        }
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    }),
    [state, signInWithGoogle, signOut, deleteAccount, clearError, refresh]
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
