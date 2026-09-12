import type { OfflineSnapshot } from "../../../native/OfflineProtection";

export interface ProtectionHealthScore {
  webHealthy: boolean;
  appHealthy: boolean;
  usageHealthy: boolean;
  strictHealthy: boolean;
  tracksWeb: boolean;
  tracksApps: boolean;
  percent: number;
  isFullyProtected: boolean;
  healthValue: string;
  healthDetail: string;
}

export interface HealthDataInput {
  settings: Partial<OfflineSnapshot["settings"]>;
  capabilities: {
    vpn?: boolean;
    vpnError?: string | null;
    accessibility?: boolean;
    usage?: boolean;
    privateDns?: string | null;
  } & Omit<Partial<OfflineSnapshot["capabilities"]>, "privateDns">;
}

/**
 * computeProtectionHealth evaluates real-time device capability states
 * against configured user goals and active protection settings.
 *
 * Core improvements:
 * 1. Supports both Local DNS VPN and Private DNS modes for web filtering.
 * 2. Adapts denominator based on user's active goals (e.g., if user only selected "websites",
 *    health reaches 100% when web filtering is healthy rather than penalizing for unused app controls).
 * 3. Provides truthful, descriptive status details (e.g. "Web active · App controls off").
 */
export function computeProtectionHealth(
  data: HealthDataInput,
  reconciling = false
): ProtectionHealthScore {
  const isWebsiteActive = data.settings.websiteEnabled ?? false;
  const dnsMode = data.settings.dnsMode || "vpn";
  const privateDnsDetected = Boolean(
    data.capabilities.privateDns && data.capabilities.privateDns.trim().length > 0
  );

  // Web filtering health: evaluates based on configured resolver mode
  let webHealthy = false;
  if (isWebsiteActive) {
    if (dnsMode === "vpn") {
      webHealthy = Boolean(data.capabilities.vpn && !data.capabilities.vpnError);
    } else {
      webHealthy = privateDnsDetected;
    }
  }

  // App controls health: requires Android accessibility capability AND affirmative consent
  const appHealthy = Boolean(
    data.capabilities.accessibility && data.settings.accessibilityConsent
  );

  // Usage stats health: required for screen time and attention tracking
  const usageHealthy = Boolean(data.capabilities.usage);

  // Anti-bypass health: Strict Mode delay configured
  const strictHealthy = (data.settings.strictMinutes ?? 0) > 0;

  // Goals-adaptive scoring
  const goals = data.settings.goals ?? ["websites", "apps"];
  const tracksWeb = goals.includes("websites");
  const tracksApps = goals.includes("apps") || goals.includes("feeds");

  // Determine active check items based on user's selected scope
  const activeChecks: boolean[] = [];
  if (tracksWeb) activeChecks.push(webHealthy);
  if (tracksApps) activeChecks.push(appHealthy);

  // Fallback if no specific goals configured: evaluate Web + App
  if (activeChecks.length === 0) {
    activeChecks.push(webHealthy, appHealthy);
  }

  const activeCount = activeChecks.filter(Boolean).length;
  const total = activeChecks.length;
  const percent = total > 0 ? Math.round((activeCount / total) * 100) : 0;
  const isFullyProtected = activeCount === total && total > 0;

  // Dynamic status display
  let healthValue = `${percent}%`;
  let healthDetail: string;

  if (reconciling) {
    healthValue = "…";
    healthDetail = "Checking capabilities…";
  } else if (isFullyProtected) {
    healthValue = "100%";
    healthDetail = "All systems active";
  } else if (webHealthy && !appHealthy) {
    healthDetail = tracksApps ? "Web active · App controls off" : "Website protection active";
  } else if (!webHealthy && appHealthy) {
    healthDetail = "App controls active · Web filter off";
  } else {
    healthDetail = "Protection needs setup";
  }

  return {
    webHealthy,
    appHealthy,
    usageHealthy,
    strictHealthy,
    tracksWeb,
    tracksApps,
    percent,
    isFullyProtected,
    healthValue,
    healthDetail,
  };
}
