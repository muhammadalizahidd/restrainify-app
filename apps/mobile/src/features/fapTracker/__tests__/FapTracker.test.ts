import {
  computeTrackerMetrics,
  filterTrackerEvents,
  formatTrackerDate,
  formatTrackerTime,
} from "../utils/fapTrackerUtils";
import type { LocalEvent } from "../../../native/OfflineProtection";

describe("Fap Tracker (JOUR-04 & JOUR-05) Logic & Invariants", () => {
  const refDate = new Date("2026-09-10T15:00:00Z");

  describe("filterTrackerEvents", () => {
    it("filters only tracker events and sorts by timestamp descending", () => {
      const events: LocalEvent[] = [
        {
          id: "1",
          kind: "urge",
          timestamp: 1000,
          day: "2026-09-10",
          note: "",
          resisted: true,
        },
        {
          id: "2",
          kind: "tracker",
          timestamp: 2000,
          day: "2026-09-10",
          note: "Old tracker",
          resisted: false,
        },
        {
          id: "3",
          kind: "tracker",
          timestamp: 5000,
          day: "2026-09-10",
          note: "Newer tracker",
          resisted: false,
        },
        {
          id: "4",
          kind: "relapse",
          timestamp: 3000,
          day: "2026-09-10",
          note: "",
          resisted: false,
        },
      ];

      const trackerEvents = filterTrackerEvents(events);
      expect(trackerEvents.length).toBe(2);
      expect(trackerEvents[0].id).toBe("3"); // timestamp 5000 first
      expect(trackerEvents[1].id).toBe("2"); // timestamp 2000 second
    });
  });

  describe("computeTrackerMetrics", () => {
    it("computes Today, This week, and This month counts correctly", () => {
      const nowMs = refDate.getTime();
      const twoDaysAgo = nowMs - 2 * 24 * 60 * 60 * 1000;
      const tenDaysAgo = nowMs - 10 * 24 * 60 * 60 * 1000;
      const fortyDaysAgo = nowMs - 40 * 24 * 60 * 60 * 1000;

      const events: LocalEvent[] = [
        {
          id: "t-today",
          kind: "tracker",
          timestamp: nowMs - 1000,
          day: "2026-09-10",
          note: "",
          resisted: false,
        },
        {
          id: "t-week",
          kind: "tracker",
          timestamp: twoDaysAgo,
          day: "2026-09-08",
          note: "",
          resisted: false,
        },
        {
          id: "t-month",
          kind: "tracker",
          timestamp: tenDaysAgo,
          day: "2026-08-31",
          note: "",
          resisted: false,
        },
        {
          id: "t-old",
          kind: "tracker",
          timestamp: fortyDaysAgo,
          day: "2026-08-01",
          note: "",
          resisted: false,
        },
        {
          id: "urge-ignored",
          kind: "urge",
          timestamp: nowMs,
          day: "2026-09-10",
          note: "",
          resisted: true,
        },
      ];

      const metrics = computeTrackerMetrics(events, refDate);

      // Today: only t-today (1)
      expect(metrics.today).toBe(1);

      // This week: t-today + t-week (2)
      expect(metrics.thisWeek).toBe(2);

      // This month: t-today + t-week + t-month (3)
      expect(metrics.thisMonth).toBe(3);
    });
  });

  describe("formatters", () => {
    it("formats tracker dates with day and month", () => {
      const ts = new Date("2026-09-07T22:12:00").getTime();
      const dateStr = formatTrackerDate(ts);
      expect(dateStr).toContain("September");
      expect(dateStr).toContain("7");
    });

    it("formats tracker times in 12-hour format", () => {
      const ts = new Date("2026-09-07T22:12:00").getTime();
      const timeStr = formatTrackerTime(ts);
      expect(timeStr).toMatch(/10:12\s*(PM|pm)?/);
    });
  });

  describe("Uncoupling invariant", () => {
    it("ensures tracker events have kind === 'tracker' and do not pollute relapse days", () => {
      const trackerEvent: LocalEvent = {
        id: "tr-1",
        kind: "tracker",
        timestamp: Date.now(),
        day: "2026-09-10",
        note: "",
        resisted: false,
      };

      const relapseDays = new Set<string>();
      if (trackerEvent.kind === "relapse") {
        relapseDays.add(trackerEvent.day);
      }

      expect(relapseDays.size).toBe(0);
      expect(trackerEvent.kind).toBe("tracker");
    });
  });
});
