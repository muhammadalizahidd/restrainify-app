import type { LocalEvent } from "../../../native/OfflineProtection";

export interface EventDateGroup {
  title: string;
  badge?: string;
  events: LocalEvent[];
}

/**
 * Formats a Date object as YYYY-MM-DD in local time.
 */
export function formatLocalDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formats an epoch timestamp into readable 12-hour time (e.g. "10:42 PM").
 */
export function formatEventTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Groups recovery events into relative date buckets: "Today", "Yesterday", or formatted date.
 * Sorts events within each bucket in descending chronological order.
 */
export function groupEventsByRelativeDate(
  events: LocalEvent[],
  referenceDate: Date = new Date()
): EventDateGroup[] {
  const todayKey = formatLocalDay(referenceDate);

  const yesterdayDate = new Date(referenceDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = formatLocalDay(yesterdayDate);

  // Group events by day key
  const map = new Map<string, LocalEvent[]>();
  for (const event of events) {
    // Non-tracker events belong to recovery journal
    if (event.kind === "tracker") continue;
    const key = event.day || formatLocalDay(new Date(event.timestamp));
    const list = map.get(key) ?? [];
    list.push(event);
    map.set(key, list);
  }

  // Sort day keys descending
  const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

  return sortedKeys.map((key) => {
    const list = map.get(key)!;
    // Sort events in day by timestamp descending
    list.sort((a, b) => b.timestamp - a.timestamp);

    let title: string;
    let badge: string | undefined;

    if (key === todayKey) {
      title = "Today";
      badge = `${list.length} ${list.length === 1 ? "EVENT" : "EVENTS"}`;
    } else if (key === yesterdayKey) {
      title = "Yesterday";
      badge = `${list.length} ${list.length === 1 ? "EVENT" : "EVENTS"}`;
    } else {
      const d = new Date(`${key}T12:00:00`);
      title = d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      badge = `${list.length} ${list.length === 1 ? "EVENT" : "EVENTS"}`;
    }

    return {
      title,
      badge,
      events: list,
    };
  });
}

/**
 * Validates urge input before submitting to the native backend.
 */
export function validateUrgeInput(
  note: string,
  timestamp: number,
  recoveryBaseline: string
): { isValid: boolean; error?: string } {
  const now = Date.now();
  if (!Number.isFinite(timestamp) || timestamp > now) {
    return { isValid: false, error: "Choose a date and time in the past." };
  }

  const eventDay = formatLocalDay(new Date(timestamp));
  if (eventDay < recoveryBaseline) {
    return {
      isValid: false,
      error: `Event date cannot be before your recovery baseline (${recoveryBaseline}).`,
    };
  }

  if (note.trim().length > 500) {
    return {
      isValid: false,
      error: "Keep notes under 500 characters.",
    };
  }

  return { isValid: true };
}
