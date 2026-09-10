import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AppState, useColorScheme } from "react-native";
import { offlineProtection, type OfflineSnapshot } from "../../native/OfflineProtection";
import { themes } from "../../design";
import { syncEngine } from "../../features/sync/services/syncEngine";

function useOfflineState() {
  const [snapshot, setSnapshot] = useState<OfflineSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reconciling, setReconciling] = useState(true);
  const generation = useRef(0);
  const locked = useRef(false);
  const system = useColorScheme();
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    setReconciling(true);
    try { const next = await offlineProtection.snapshot(); if (ticket === generation.current) { setSnapshot(next); setError(null); } }
    catch (e) { if (ticket === generation.current) setError(e instanceof Error ? e.message : "Cannot read local data"); }
    finally { if (ticket === generation.current) setReconciling(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const lifecycle = AppState.addEventListener("change", state => { if (state === "active") void refresh(); else setReconciling(true); });
    const events = offlineProtection.subscribe(() => { if (AppState.currentState === "active") void refresh(); });
    return () => { generation.current++; lifecycle.remove(); events?.remove(); };
  }, [refresh]);
  // Reconcile once at cooldown expiry, not a repeating background timer.
  useEffect(() => {
    if (!snapshot) return;
    const times = [snapshot.burstRemainingMs, snapshot.strictRemainingMs].filter(value => value > 0);
    if (!times.length) return;
    const timer = setTimeout(() => { void refresh(); }, Math.min(...times) + 200);
    return () => clearTimeout(timer);
  }, [snapshot, refresh]);
  const run = useCallback(async (work: () => Promise<unknown>, message?: string) => {
    if (locked.current) return false;
    locked.current = true; setBusy(true); setError(null);
    try { await work(); await refresh(); return true; }
    catch (e) { setError(e instanceof Error ? e.message : message ?? "The operation could not be saved"); return false; }
    finally { locked.current = false; setBusy(false); }
  }, [refresh]);
  const command = useCallback((action: string, payload: Record<string, unknown> = {}) => run(async () => {
    await offlineProtection.command(action, payload);
    try {
      const nowIso = new Date().toISOString();
      if (action === "reward") {
        const day = nowIso.slice(0, 10);
        void syncEngine.enqueue("reward", "daily-reward", "update", {
          balance: (snapshot?.reward.balance ?? 0) + 10,
          lifetimeEarned: (snapshot?.reward.balance ?? 0) + 10,
          claimedDays: [day],
          updatedAt: nowIso,
        });
      } else if (action === "setting") {
        void syncEngine.enqueue("settings", "user-settings", "update", {
          [String(payload.key)]: payload.value,
          updatedAt: nowIso,
        } as unknown as Record<string, unknown>);
      } else if (action === "domain") {
        void syncEngine.enqueue(
          "domain_rule",
          `domain-${payload.domain}`,
          payload.remove ? "delete" : "create",
          {
            host: String(payload.domain || ""),
            allow: Boolean(payload.allow),
            enabled: payload.enabled !== false,
            updatedAt: nowIso,
          }
        );
      } else if (action === "event") {
        const ts = Number(payload.timestamp || Date.now());
        void syncEngine.enqueue(
          "recovery_event",
          `event-${ts}`,
          "create",
          {
            id: `event-${ts}`,
            kind: payload.kind as "relapse" | "urge" | "burst",
            timestamp: ts,
            day: new Date(ts).toISOString().slice(0, 10),
            note: String(payload.note || ""),
            resisted: Boolean(payload.resisted),
          }
        );
      }
    } catch (enqueueErr) {
      console.warn("Failed to enqueue sync mutation:", enqueueErr);
    }
  }), [run, snapshot?.reward.balance]);
  const theme = snapshot?.settings.theme === "system" || !snapshot ? system : snapshot.settings.theme;
  return { snapshot, busy, reconciling, error, clearError: () => setError(null), refresh, command, run, palette: themes[theme === "dark" ? "dark" : "light"], dark: theme === "dark" };
}
const Context = createContext<ReturnType<typeof useOfflineState> | null>(null);
export function OfflineProvider({ children }: PropsWithChildren) { const value = useOfflineState(); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useOffline() { const value = useContext(Context); if (!value) throw new Error("OfflineProvider is missing"); return value; }
