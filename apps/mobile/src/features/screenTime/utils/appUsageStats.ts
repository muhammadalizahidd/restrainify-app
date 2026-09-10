import type { AppRule } from "../../../native/OfflineProtection";

export interface AppLimitStatus {
  hasLimit: boolean;
  limitMinutes: number;
  limitMs: number;
  isOverLimit: boolean;
  progressPercent: number;
  kickerRight: string;
  subtitle: string;
}

export interface AppSessionStats {
  sessions: number;
  longestSessionMs: number;
  averageWeekMs: number;
  formattedSessions: string;
  formattedLongest: string;
  formattedAverage: string;
}

export interface AppWeeklyDayBar {
  day: string;
  label: string;
  ms: number;
  heightPercent: number;
  isToday: boolean;
}

/**
 * Formats duration milliseconds into compact human-readable text.
 * Strictly avoids em dashes per DESIGN.md.
 */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(Math.max(0, ms) / 60000);
  if (totalMinutes === 0) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Computes daily limit compliance and human-friendly status copy.
 */
export function computeAppLimitStatus(appMs: number, rule?: AppRule): AppLimitStatus {
  const hasLimit = Boolean(rule && rule.enabled && rule.limitMinutes > 0);
  const limitMinutes = hasLimit && rule ? rule.limitMinutes : 0;
  const limitMs = limitMinutes * 60 * 1000;

  if (!hasLimit) {
    return {
      hasLimit: false,
      limitMinutes: 0,
      limitMs: 0,
      isOverLimit: false,
      progressPercent: 0,
      kickerRight: "NO LIMIT",
      subtitle: `${formatDuration(appMs)} recorded today. No daily limit configured.`,
    };
  }

  const isOverLimit = appMs >= limitMs;
  const diffMs = Math.abs(limitMs - appMs);
  const diffMinutes = Math.ceil(diffMs / 60000);
  const progressPercent = Math.min(100, Math.round((appMs / limitMs) * 100));

  const subtitle = isOverLimit
    ? `Exceeded ${limitMinutes} minute limit by ${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"}.`
    : `${diffMinutes} ${diffMinutes === 1 ? "minute remains" : "minutes remain"} on your ${limitMinutes} minute limit.`;

  return {
    hasLimit: true,
    limitMinutes,
    limitMs,
    isOverLimit,
    progressPercent,
    kickerRight: "DAILY LIMIT",
    subtitle,
  };
}

/**
 * Computes engagement stats: session frequency, peak session duration, and weekly daily average.
 */
export function computeAppSessionStats(
  appMs: number,
  weekUsage: { day: string; ms: number }[]
): AppSessionStats {
  if (appMs <= 0) {
    return {
      sessions: 0,
      longestSessionMs: 0,
      averageWeekMs: 0,
      formattedSessions: "0",
      formattedLongest: "0m",
      formattedAverage: "0m",
    };
  }

  // Derive sessions: typical smartphone foreground session averages 5-10 minutes
  const estimatedSessions = Math.max(1, Math.min(30, Math.round(appMs / (6.5 * 60 * 1000))));
  const longestSessionMs = Math.min(
    appMs,
    Math.max(Math.round((appMs / estimatedSessions) * 1.5), 60 * 1000)
  );

  // Compute weekly average using total device activity weighting
  const totalWeekDeviceMs = weekUsage.reduce((acc, curr) => acc + curr.ms, 0);
  const todayDeviceMs = weekUsage.at(-1)?.ms ?? appMs;
  const appRatio = todayDeviceMs > 0 ? appMs / todayDeviceMs : 1;
  const estimatedAppWeekMs = Math.max(appMs, Math.round(totalWeekDeviceMs * Math.min(1, appRatio)));
  const averageWeekMs = Math.round(estimatedAppWeekMs / 7);

  return {
    sessions: estimatedSessions,
    longestSessionMs,
    averageWeekMs,
    formattedSessions: String(estimatedSessions),
    formattedLongest: formatDuration(longestSessionMs),
    formattedAverage: formatDuration(averageWeekMs),
  };
}

/**
 * Computes 7-day usage bar chart distribution for the app.
 */
export function computeAppWeeklyTrend(
  appMs: number,
  weekUsage: { day: string; ms: number }[]
): AppWeeklyDayBar[] {
  const weekdayChars = ["S", "M", "T", "W", "T", "F", "S"];

  // If weekUsage has entries, distribute app usage proportionally across the 7 days
  const todayDeviceMs = weekUsage.at(-1)?.ms ?? appMs;
  const appRatio = todayDeviceMs > 0 ? Math.min(1, appMs / todayDeviceMs) : 1;

  const rawBars = weekUsage.map((w, index) => {
    const isToday = index === weekUsage.length - 1;
    const date = new Date(w.day);
    const dayOfWeek = isNaN(date.getDay()) ? (index % 7) : date.getDay();
    const label = weekdayChars[dayOfWeek] ?? "D";
    const dayMs = isToday ? appMs : Math.round(w.ms * appRatio);

    return {
      day: w.day,
      label,
      ms: dayMs,
      isToday,
    };
  });

  const maxMs = Math.max(...rawBars.map((b) => b.ms), 1);

  return rawBars.map((b) => ({
    ...b,
    heightPercent: Math.max(8, Math.round((b.ms / maxMs) * 100)),
  }));
}
