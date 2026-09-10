import type { LocalEvent } from "../../../native/OfflineProtection";

export interface TrackerMetrics {
  today: number;
  thisWeek: number;
  thisMonth: number;
}

/**
 * Filters events belonging to the private tracker (kind === "tracker")
 * and sorts them in descending chronological order.
 */
export function filterTrackerEvents(events: LocalEvent[]): LocalEvent[] {
  return events
    .filter((e) => e.kind === "tracker")
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Computes 3-period event counts for the Fap Tracker:
 * - Today: events on reference calendar day
 * - This week: events within rolling 7 days
 * - This month: events within rolling 30 days
 */
export function computeTrackerMetrics(
  events: LocalEvent[],
  refDate: Date = new Date()
): TrackerMetrics {
  const trackerEvents = filterTrackerEvents(events);
  const nowMs = refDate.getTime();

  const refDayStr = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, "0")}-${String(refDate.getDate()).padStart(2, "0")}`;

  const sevenDaysAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgoMs = nowMs - 30 * 24 * 60 * 60 * 1000;

  let today = 0;
  let thisWeek = 0;
  let thisMonth = 0;

  for (const e of trackerEvents) {
    if (e.day === refDayStr) {
      today++;
    }
    if (e.timestamp >= sevenDaysAgoMs && e.timestamp <= nowMs) {
      thisWeek++;
    }
    if (e.timestamp >= thirtyDaysAgoMs && e.timestamp <= nowMs) {
      thisMonth++;
    }
  }

  return { today, thisWeek, thisMonth };
}

/**
 * Formats a timestamp into full date string (e.g. "Monday, September 7").
 */
export function formatTrackerDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * Formats a timestamp into 12-hour time string (e.g. "10:12 PM").
 */
export function formatTrackerTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
