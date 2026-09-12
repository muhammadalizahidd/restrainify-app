/**
 * Auth Service Abstraction Layer
 *
 * Provides a single boundary for all authentication operations.
 * Currently returns stubbed local responses since Supabase Auth
 * is not yet connected to the mobile app.
 *
 * When Supabase is integrated:
 * 1. Install @supabase/supabase-js
 * 2. Replace the stub implementations below with real Supabase Auth calls
 * 3. Screen components remain completely untouched
 *
 * Input validation (email format, password length) happens at this boundary
 * before any network call would be attempted.
 */

import { promptGoogleSignIn } from "./services/googleAuth";
import { authApi } from "./api/authApi";
import { authStorage } from "./storage/authStorage";

// ---------- Types ----------

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  provider: "google";
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

// ---------- OAuth Authentication Service ----------

export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const googleRes = await promptGoogleSignIn();
    if (!googleRes) {
      return { success: false, error: "Google sign-in was cancelled" };
    }

    const authRes = await authApi.verifyGoogleIdToken(googleRes.idToken);

    await authStorage.saveAuthData({
      session: authRes.session,
      user: authRes.user,
      profile: authRes.profile,
      settings: authRes.settings,
    });

    return {
      success: true,
      user: {
        id: authRes.user.id,
        email: authRes.user.email ?? "",
        displayName: authRes.profile.fullName ?? authRes.user.fullName ?? "User",
        provider: "google",
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google sign-in failed";
    return {
      success: false,
      error: message.includes("Google") ? message : `Google sign-in failed: ${message}`,
    };
  }
}
