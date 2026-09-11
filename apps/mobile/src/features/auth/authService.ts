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

// ---------- Types ----------

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  provider: "email" | "google";
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface ResetResult {
  success: boolean;
  error?: string;
}

// ---------- Validation ----------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required";
  if (!EMAIL_REGEX.test(trimmed)) return "Enter a valid email address";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  return null;
}

export function validatePasswordConfirm(
  password: string,
  confirm: string,
): string | null {
  if (!confirm) return "Confirm your password";
  if (password !== confirm) return "Passwords do not match";
  return null;
}

// ---------- Stubbed Auth Service ----------
// TODO: Replace with real Supabase Auth when backend is connected

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const emailError = validateEmail(email);
  if (emailError) return { success: false, error: emailError };
  const passwordError = validatePassword(password);
  if (passwordError) return { success: false, error: passwordError };

  // Stub: simulate successful signup
  const trimmed = email.trim().toLowerCase();
  return {
    success: true,
    user: {
      id: `local-${Date.now()}`,
      email: trimmed,
      displayName: trimmed.split("@")[0] ?? "User",
      provider: "email",
    },
  };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const emailError = validateEmail(email);
  if (emailError) return { success: false, error: emailError };
  if (!password) return { success: false, error: "Password is required" };

  // Stub: simulate successful login
  const trimmed = email.trim().toLowerCase();
  return {
    success: true,
    user: {
      id: `local-${Date.now()}`,
      email: trimmed,
      displayName: trimmed.split("@")[0] ?? "User",
      provider: "email",
    },
  };
}

export async function signInWithGoogle(): Promise<AuthResult> {
  // Stub: Google OAuth is not available until Supabase Auth is connected
  return {
    success: false,
    error:
      "Google sign-in will be available after cloud services are connected.",
  };
}

export async function sendPasswordReset(email: string): Promise<ResetResult> {
  const emailError = validateEmail(email);
  if (emailError) return { success: false, error: emailError };

  // Stub: always report success (security: don't reveal whether email exists)
  return { success: true };
}
