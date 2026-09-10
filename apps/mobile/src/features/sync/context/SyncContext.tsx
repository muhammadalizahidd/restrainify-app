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
import type {
  SyncDomainRulePayload,
  SyncEntityKind,
  SyncOperation,
  SyncPullEntityChange,
  SyncRecoveryEventPayload,
  SyncRewardPayload,
  SyncSettingsPayload,
} from "@restrainify/contracts";
import { useAuth } from "../../auth";
import { offlineProtection } from "../../../native/OfflineProtection";
import { syncEngine } from "../services/syncEngine";
import { syncStorage } from "../storage/syncStorage";
import type { AnySyncPayload, SyncState } from "../types";

export interface SyncContextValue {
  syncState: SyncState;
  syncNow: () => Promise<void>;
  setCloudSyncEnabled: (enabled: boolean) => Promise<void>;
  enqueueChange: (
    entityKind: SyncEntityKind,
    entityId: string,
    operation: SyncOperation,
    payload: AnySyncPayload
  ) => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: PropsWithChildren) {
  const { session, status } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>({
    status: "idle",
    lastSyncedAt: null,
    pendingCount: 0,
    lastError: null,
    cloudSyncEnabled: true,
  });

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refresh pending count and metadata from local storage
  const refreshSyncState = useCallback(async () => {
    const queue = await syncStorage.loadQueue();
    const meta = await syncStorage.loadMetadata();
    const enabled = await syncStorage.isCloudSyncEnabled();

    setSyncState((prev) => ({
      ...prev,
      pendingCount: queue.length,
      lastSyncedAt: meta.lastSyncedAt,
      cloudSyncEnabled: enabled,
    }));
  }, []);

  useEffect(() => {
    void refreshSyncState();
  }, [refreshSyncState]);

  // Reconcile pulled remote changes into local Room database via offlineProtection
  const reconcileRemoteChanges = useCallback(
    async (changes: readonly SyncPullEntityChange[]) => {
      for (const change of changes) {
        try {
          if (change.entity === "reward") {
            const data = change.data as SyncRewardPayload;
            if (Array.isArray(data.claimedDays)) {
              for (const day of data.claimedDays) {
                // If reward was claimed on remote device, mark in local Room DB
                await offlineProtection.command("reward_remote", { day });
              }
            }
          } else if (change.entity === "recovery_event") {
            const data = change.data as SyncRecoveryEventPayload;
            if (data.id && data.kind) {
              await offlineProtection.command("event_remote", {
                id: data.id,
                kind: data.kind,
                timestamp: data.timestamp,
                day: data.day,
                note: data.note ?? "",
                resisted: data.resisted ?? false,
              });
            }
          } else if (change.entity === "settings") {
            const data = change.data as SyncSettingsPayload;
            if (data.theme) {
              await offlineProtection.command("setting", { key: "theme", value: data.theme });
            }
            if (typeof data.recoveryEnabled === "boolean") {
              await offlineProtection.command("setting", {
                key: "recoveryEnabled",
                value: data.recoveryEnabled,
              });
            }
            if (typeof data.trackerEnabled === "boolean") {
              await offlineProtection.command("setting", {
                key: "trackerEnabled",
                value: data.trackerEnabled,
              });
            }
            if (typeof data.websiteEnabled === "boolean") {
              await offlineProtection.command("setting", {
                key: "websiteEnabled",
                value: data.websiteEnabled,
              });
            }
          } else if (change.entity === "domain_rule") {
            const data = change.data as SyncDomainRulePayload;
            if (data.host) {
              await offlineProtection.command("domain", {
                domain: data.host,
                allow: data.allow,
                enabled: data.enabled,
              });
            }
          }
        } catch (reconcileErr) {
          console.warn("Error reconciling remote entity change:", change.entity, reconcileErr);
        }
      }
    },
    []
  );

  const syncNow = useCallback(async () => {
    const token = session?.accessToken;
    if (!token || status !== "authenticated") {
      setSyncState((prev) => ({ ...prev, status: "idle" }));
      return;
    }

    const enabled = await syncStorage.isCloudSyncEnabled();
    if (!enabled) {
      setSyncState((prev) => ({ ...prev, status: "idle", cloudSyncEnabled: false }));
      return;
    }

    setSyncState((prev) => ({ ...prev, status: "syncing", lastError: null }));

    const result = await syncEngine.sync(token, reconcileRemoteChanges);
    await refreshSyncState();

    if (result.error) {
      const isNetworkError =
        result.error.toLowerCase().includes("network") ||
        result.error.toLowerCase().includes("offline") ||
        result.error.toLowerCase().includes("failed to fetch");

      setSyncState((prev) => ({
        ...prev,
        status: isNetworkError ? "offline" : "error",
        lastError: result.error ?? null,
      }));
    } else {
      setSyncState((prev) => ({
        ...prev,
        status: "idle",
        lastError: null,
      }));
    }
  }, [session?.accessToken, status, reconcileRemoteChanges, refreshSyncState]);

  // Enqueue local mutation and trigger debounced sync push
  const enqueueChange = useCallback(
    async (
      entityKind: SyncEntityKind,
      entityId: string,
      operation: SyncOperation,
      payload: AnySyncPayload
    ) => {
      await syncEngine.enqueue(entityKind, entityId, operation, payload);
      await refreshSyncState();

      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = setTimeout(() => {
        void syncNow();
      }, 2000);
    },
    [refreshSyncState, syncNow]
  );

  const setCloudSyncEnabled = useCallback(
    async (enabled: boolean) => {
      await syncStorage.setCloudSyncEnabled(enabled);
      setSyncState((prev) => ({ ...prev, cloudSyncEnabled: enabled }));
      if (enabled) {
        void syncNow();
      }
    },
    [syncNow]
  );

  // Trigger sync on login or app foreground
  useEffect(() => {
    if (status === "authenticated" && session?.accessToken) {
      void syncNow();
    }
  }, [status, session?.accessToken, syncNow]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && status === "authenticated") {
        void syncNow();
      }
    });
    return () => {
      sub.remove();
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [status, syncNow]);

  const value = useMemo<SyncContextValue>(
    () => ({
      syncState,
      syncNow,
      setCloudSyncEnabled,
      enqueueChange,
    }),
    [syncState, syncNow, setCloudSyncEnabled, enqueueChange]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return ctx;
}
