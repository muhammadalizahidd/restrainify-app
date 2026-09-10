import type { CapabilityHealth, ProtectionHealth, ProtectionRuntimeState, ProtectionSettings, RecoveryEvent, RecoverySnapshot, SyncHealth, SyncMutation } from "@restrainify/contracts";

export type AppRoute = "home" | "progress" | "journal" | "tools" | "settings" | "onboarding";

export interface DailyRewardState {
  readonly balance: number;
  readonly claimedOn?: string;
  readonly lifetimeEarned: number;
}

export interface BurstState {
  readonly active: boolean;
  readonly id?: string;
  readonly cooldownEndsAt?: string;
}

export interface TrackerEvent {
  readonly id: string;
  readonly occurredAt: string;
  readonly note?: string;
}

export interface RestrainifyState {
  readonly onboardingComplete: boolean;
  readonly route: AppRoute;
  readonly settings: ProtectionSettings;
  readonly health: ProtectionHealth;
  readonly recoveryEvents: readonly RecoveryEvent[];
  readonly reward: DailyRewardState;
  readonly burst: BurstState;
  readonly trackerEvents: readonly TrackerEvent[];
  readonly customDomains: readonly string[];
  readonly pendingMutations: readonly SyncMutation[];
}

const now = () => new Date().toISOString();
const dayKey = (timestamp: string) => timestamp.slice(0, 10);

function health(state: CapabilityHealth["state"], label: string, detail: string, repairAction?: string): CapabilityHealth {
  return { checkedAt: now(), detail, label, repairAction, state };
}

export function createInitialState(): RestrainifyState {
  const defaultSettings: ProtectionSettings = {
    cloudSyncEnabled: false,
    fapTrackerEnabled: false,
    personBlurMode: "off",
    recoveryTrackingEnabled: true,
    schemaVersion: 1,
    socialFeedProtectionEnabled: false,
    strictModeEnabled: false,
    updatedAt: now(),
    visualProtectionEnabled: false,
    websiteProtectionEnabled: false,
  };
  const unavailable = health("standby", "Not configured", "Complete setup to enable this protection.", "Set up");
  return {
    burst: { active: false },
    customDomains: [],
    health: { antiBypass: unavailable, runtimeState: "STANDBY", sync: { pendingCount: 0, state: "offline" }, usage: unavailable, visual: unavailable, website: unavailable },
    onboardingComplete: false,
    pendingMutations: [],
    recoveryEvents: [],
    reward: { balance: 0, lifetimeEarned: 0 },
    route: "onboarding",
    settings: defaultSettings,
    trackerEvents: [],
  };
}

function mutation(entityId: string, operation: SyncMutation["operation"], payload: unknown): SyncMutation {
  const timestamp = now();
  return { client_updated_at: timestamp, entity_id: entityId, mutation_id: `${entityId}-${timestamp}`, operation, payload, schema_version: 1 };
}

function enqueue(state: RestrainifyState, entityId: string, operation: SyncMutation["operation"], payload: unknown): RestrainifyState {
  if (!state.settings.cloudSyncEnabled) return state;
  return { ...state, pendingMutations: [...state.pendingMutations, mutation(entityId, operation, payload)] };
}

export function getRecoverySnapshot(events: readonly RecoveryEvent[], burst: BurstState, timestamp = now()): RecoverySnapshot {
  const relapses = events.filter((event) => event.type === "relapse").map((event) => event.occurredAt).sort();
  const latestRelapse = relapses.at(-1);
  const currentStreakDays = latestRelapse ? Math.max(0, Math.floor((Date.parse(timestamp) - Date.parse(latestRelapse)) / 86_400_000)) : 0;
  const last30Days = Array.from({ length: 30 }, (_, index) => dayKey(new Date(Date.parse(timestamp) - index * 86_400_000).toISOString()));
  const relapseDays = new Set(relapses.map(dayKey));
  return {
    burstActive: burst.active && Boolean(burst.cooldownEndsAt && Date.parse(burst.cooldownEndsAt) > Date.parse(timestamp)),
    currentStreakDays,
    longestStreakDays: currentStreakDays,
    pornFreeDaysLast30: last30Days.filter((day) => !relapseDays.has(day)).length,
    urgesLoggedToday: events.filter((event) => event.type === "urge" && dayKey(event.occurredAt) === dayKey(timestamp)).length,
  };
}

export function claimDailyReward(state: RestrainifyState, timestamp = now()): RestrainifyState {
  if (state.reward.claimedOn === dayKey(timestamp)) return state;
  const reward = { balance: state.reward.balance + 10, claimedOn: dayKey(timestamp), lifetimeEarned: state.reward.lifetimeEarned + 10 };
  return enqueue({ ...state, reward }, "daily-reward", "update", reward);
}

export function addCustomDomain(state: RestrainifyState, value: string): RestrainifyState {
  const domain = value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0] ?? "";
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain) || state.customDomains.includes(domain)) return state;
  const customDomains = [...state.customDomains, domain];
  return enqueue({ ...state, customDomains }, `domain-${domain}`, "create", { domain });
}

export function updateSettings(state: RestrainifyState, patch: Partial<ProtectionSettings>): RestrainifyState {
  const settings = { ...state.settings, ...patch, updatedAt: now() };
  const configured = settings.websiteProtectionEnabled || settings.visualProtectionEnabled || settings.socialFeedProtectionEnabled;
  const runtimeState: ProtectionRuntimeState = configured ? "PARTIAL" : "STANDBY";
  const enabledButUnavailable = health("degraded", "Needs Android setup", "Enable the required Android permission to restore this protection.", "Review setup");
  const disabled = health("standby", "Not enabled", "Turn this feature on when you are ready.", "Configure");
  const healthState = {
    antiBypass: settings.strictModeEnabled ? enabledButUnavailable : disabled,
    runtimeState,
    sync: syncHealth(state),
    usage: enabledButUnavailable,
    visual: settings.visualProtectionEnabled ? enabledButUnavailable : disabled,
    website: settings.websiteProtectionEnabled ? enabledButUnavailable : disabled,
  } satisfies ProtectionHealth;
  return enqueue({ ...state, health: healthState, settings }, "protection-settings", "update", settings);
}

function syncHealth(state: RestrainifyState): SyncHealth {
  if (!state.settings.cloudSyncEnabled) return { pendingCount: 0, state: "offline", detail: "Sync is off" };
  return { pendingCount: state.pendingMutations.length, state: "offline", detail: "Connect an account to sync" };
}

export function triggerBurst(state: RestrainifyState, timestamp = now()): RestrainifyState {
  const id = `burst-${timestamp}`;
  const cooldownEndsAt = new Date(Date.parse(timestamp) + 10 * 60_000).toISOString();
  const event: RecoveryEvent = { id, occurredAt: timestamp, type: "burst_triggered" };
  return enqueue({ ...state, burst: { active: true, cooldownEndsAt, id }, recoveryEvents: [...state.recoveryEvents, event] }, id, "create", event);
}

export function markBurstResisted(state: RestrainifyState, timestamp = now()): RestrainifyState {
  if (!state.burst.id) return state;
  const event: RecoveryEvent = { id: `${state.burst.id}-resisted`, occurredAt: timestamp, type: "burst_resisted" };
  return enqueue({ ...state, burst: { active: false }, recoveryEvents: [...state.recoveryEvents, event] }, event.id, "create", event);
}

export function addTrackerEvent(state: RestrainifyState, note?: string, timestamp = now()): RestrainifyState {
  if (!state.settings.fapTrackerEnabled) return state;
  const event = { id: `tracker-${timestamp}`, note, occurredAt: timestamp };
  return enqueue({ ...state, trackerEvents: [...state.trackerEvents, event] }, event.id, "create", event);
}

export function logRecoveryEvent(state: RestrainifyState, type: RecoveryEvent["type"], note?: string, timestamp = now()): RestrainifyState {
  if (!state.settings.recoveryTrackingEnabled) return state;
  const event = { id: `recovery-${timestamp}`, note, occurredAt: timestamp, type };
  return enqueue({ ...state, recoveryEvents: [...state.recoveryEvents, event] }, event.id, "create", event);
}
