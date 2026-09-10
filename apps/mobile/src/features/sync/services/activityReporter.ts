import { Platform } from "react-native";
import { syncApi } from "../api/syncApi";
import { syncStorage } from "../storage/syncStorage";

// Throttle active user activity reporting: at most once every 6 hours unless forced
const ACTIVITY_THROTTLE_MS = 6 * 60 * 60 * 1000;

export const activityReporter = {
  /**
   * Reports user active presence / last login to backend for authenticated users.
   * Throttled so repeated app foreground events within a few hours do not spam the backend.
   */
  async reportActiveUserPresence(accessToken: string, force = false): Promise<boolean> {
    if (!accessToken) return false;

    try {
      const meta = await syncStorage.loadMetadata();
      const now = Date.now();
      const lastReported = meta.lastHeartbeatAt ? Date.parse(meta.lastHeartbeatAt) : 0;

      if (!force && now - lastReported < ACTIVITY_THROTTLE_MS) {
        return false;
      }

      const isoNow = new Date(now).toISOString();
      await syncApi.recordActivity(accessToken, {
        lastActiveAt: isoNow,
        platform: Platform.OS === "android" ? "android" : Platform.OS === "ios" ? "ios" : undefined,
        clientVersion: "1.0.0",
      });

      await syncStorage.saveMetadata({
        ...meta,
        lastHeartbeatAt: isoNow,
      });

      return true;
    } catch (err) {
      // Best-effort reporting; never disrupt active app usage
      console.warn("Active user activity heartbeat failed:", err);
      return false;
    }
  },
};
