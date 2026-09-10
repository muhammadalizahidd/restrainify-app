import {
  formatEventTime,
  formatLocalDay,
  groupEventsByRelativeDate,
  validateUrgeInput,
} from "../utils/journalUtils";
import type { LocalEvent } from "../../../native/OfflineProtection";

describe("Recovery Journal (JOUR-01) Logic & Utilities", () => {
  const refDate = new Date("2026-09-10T15:30:00Z");

  describe("groupEventsByRelativeDate", () => {
    it("groups events into Today, Yesterday, and formatted date", () => {
      const todayTimestamp = new Date("2026-09-10T10:00:00Z").getTime();
      const yesterdayTimestamp = new Date("2026-09-09T22:00:00Z").getTime();
      const earlierTimestamp = new Date("2026-09-05T14:00:00Z").getTime();

      const events: LocalEvent[] = [
        {
          id: "1",
          kind: "urge",
          timestamp: todayTimestamp,
          day: "2026-09-10",
          note: "Went for a walk",
          resisted: true,
        },
        {
          id: "2",
          kind: "burst",
          timestamp: todayTimestamp - 3600000,
          day: "2026-09-10",
          note: "",
          resisted: true,
        },
        {
          id: "3",
          kind: "relapse",
          timestamp: yesterdayTimestamp,
          day: "2026-09-09",
          note: "Late scrolling",
          resisted: false,
        },
        {
          id: "4",
          kind: "urge",
          timestamp: earlierTimestamp,
          day: "2026-09-05",
          note: "",
          resisted: false,
        },
        {
          id: "5",
          kind: "tracker", // should be excluded from recovery journal
          timestamp: todayTimestamp,
          day: "2026-09-10",
          note: "Private tracker event",
          resisted: false,
        },
      ];

      const groups = groupEventsByRelativeDate(events, refDate);

      expect(groups.length).toBe(3);

      // Today
      expect(groups[0].title).toBe("Today");
      expect(groups[0].badge).toBe("2 EVENTS");
      expect(groups[0].events.length).toBe(2);
      expect(groups[0].events[0].id).toBe("1"); // newer timestamp first

      // Yesterday
      expect(groups[1].title).toBe("Yesterday");
      expect(groups[1].badge).toBe("1 EVENT");
      expect(groups[1].events[0].id).toBe("3");

      // Earlier
      expect(groups[2].badge).toBe("1 EVENT");
      expect(groups[2].events[0].id).toBe("4");
    });

    it("ignores tracker events in recovery journal timeline", () => {
      const events: LocalEvent[] = [
        {
          id: "t1",
          kind: "tracker",
          timestamp: Date.now(),
          day: "2026-09-10",
          note: "Private",
          resisted: false,
        },
      ];
      const groups = groupEventsByRelativeDate(events, refDate);
      expect(groups.length).toBe(0);
    });
  });

  describe("formatEventTime and formatLocalDay", () => {
    it("formats local day as YYYY-MM-DD", () => {
      const d = new Date(2026, 8, 10); // Sept 10, 2026
      expect(formatLocalDay(d)).toBe("2026-09-10");
    });

    it("returns formatted 12-hour time string", () => {
      const ts = new Date("2026-09-10T22:42:00").getTime();
      const formatted = formatEventTime(ts);
      expect(formatted).toMatch(/10:42\s*(PM|pm)?/);
    });
  });

  describe("validateUrgeInput", () => {
    const baseline = "2026-08-01";

    it("accepts valid past timestamp and reasonable note", () => {
      const ts = Date.now() - 60000;
      const res = validateUrgeInput("Triggered by phone notification", ts, baseline);
      expect(res.isValid).toBe(true);
    });

    it("rejects future timestamps", () => {
      const ts = Date.now() + 100000;
      const res = validateUrgeInput("", ts, baseline);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Choose a date and time in the past.");
    });

    it("rejects dates before recovery baseline", () => {
      const ts = new Date("2026-07-15T12:00:00Z").getTime();
      const res = validateUrgeInput("", ts, baseline);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("cannot be before your recovery baseline");
    });

    it("rejects notes longer than 500 characters", () => {
      const longNote = "a".repeat(501);
      const res = validateUrgeInput(longNote, Date.now() - 1000, baseline);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Keep notes under 500 characters.");
    });
  });
});
