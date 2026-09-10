export interface MobileSession {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  expiresAt?: number;
  tokenType?: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  provider: "google";
}

export interface UserProfile {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  provider: string;
  lastSignInAt?: string | null;
}

export interface UserSettings {
  id: string;
  userId: string;
  strictModeEnabled: boolean;
  emergencyUnlockDelayMinutes: number;
  explicitContentFilterEnabled: boolean;
  shortFormVideoFilterEnabled: boolean;
}

export interface MobileAuthResponse {
  session: MobileSession;
  user: AuthUser;
  profile: UserProfile;
  settings: UserSettings;
}

export type AuthStatus = "unauthenticated" | "loading" | "authenticated" | "error";

export interface AuthState {
  status: AuthStatus;
  session: MobileSession | null;
  user: AuthUser | null;
  profile: UserProfile | null;
  settings: UserSettings | null;
  error: string | null;
}
