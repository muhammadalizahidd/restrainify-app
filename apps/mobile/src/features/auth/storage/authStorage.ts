import * as SecureStore from "expo-secure-store";
import type { AuthUser, MobileSession, UserProfile, UserSettings } from "../types";

const SESSION_KEY = "restrainify_auth_session";
const USER_KEY = "restrainify_auth_user";
const PROFILE_KEY = "restrainify_auth_profile";
const SETTINGS_KEY = "restrainify_auth_settings";

export interface StoredAuthData {
  session: MobileSession;
  user: AuthUser;
  profile: UserProfile | null;
  settings: UserSettings | null;
}

export const authStorage = {
  async saveAuthData(data: {
    session: MobileSession;
    user: AuthUser;
    profile?: UserProfile | null;
    settings?: UserSettings | null;
  }): Promise<void> {
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(data.session));
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
      if (data.profile) {
        await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(data.profile));
      }
      if (data.settings) {
        await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(data.settings));
      }
    } catch (e) {
      console.warn("Could not save auth data to secure store:", e);
    }
  },

  async loadAuthData(): Promise<StoredAuthData | null> {
    try {
      const rawSession = await SecureStore.getItemAsync(SESSION_KEY);
      const rawUser = await SecureStore.getItemAsync(USER_KEY);
      if (!rawSession || !rawUser) return null;

      const session = JSON.parse(rawSession) as MobileSession;
      const user = JSON.parse(rawUser) as AuthUser;

      const rawProfile = await SecureStore.getItemAsync(PROFILE_KEY);
      const rawSettings = await SecureStore.getItemAsync(SETTINGS_KEY);

      return {
        session,
        user,
        profile: rawProfile ? (JSON.parse(rawProfile) as UserProfile) : null,
        settings: rawSettings ? (JSON.parse(rawSettings) as UserSettings) : null,
      };
    } catch (e) {
      console.warn("Could not load auth data from secure store:", e);
      return null;
    }
  },

  async saveTokens(session: MobileSession): Promise<void> {
    try {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn("Could not update session tokens in secure store:", e);
    }
  },

  async clearAuthData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      await SecureStore.deleteItemAsync(PROFILE_KEY);
      await SecureStore.deleteItemAsync(SETTINGS_KEY);
    } catch (e) {
      console.warn("Could not clear auth data from secure store:", e);
    }
  },
};
