/**
 * Unit tests for Recovery Progress & Calendar Screen (PROG-02) logic and computations:
 * 1. 30-day rolling window generation
 * 2. Monday-first weekday alignment calculation
 * 3. Day state classification (clean vs relapse vs pre-baseline vs today)
 * 4. Urges resisted & personal best computation
 */

describe("Recovery Progress & Calendar Screen (PROG-02) Logic", () => {
  function localDay(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function computeCalendarDays(
    referenceDate: Date,
    recoveryStart: string,
    relapseDays: Set<string>
  ) {
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);
    const todayString = localDay(today);

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 29);

    // Monday-first offset: 0 for Mon, 1 for Tue, ... 6 for Sun
    const startWeekday = (startDate.getDay() + 6) % 7;

    const days = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dayStr = localDay(d);
      const isToday = dayStr === todayString;
      const isBeforeStart = dayStr < recoveryStart;
      const isRelapse = relapseDays.has(dayStr);

      let state: "before" | "relapse" | "clean" = "clean";
      if (isBeforeStart) {
        state = "before";
      } else if (isRelapse) {
        state = "relapse";
      }

      days.push({
        dateNumber: d.getDate(),
        dayString: dayStr,
        isToday,
        state,
      });
    }

    return { startWeekday, days };
  }

  describe("Calendar 30-day window generation", () => {
    it("generates exactly 30 days ending on the reference date", () => {
      const ref = new Date("2026-09-10T12:00:00Z");
      const { days } = computeCalendarDays(ref, "2026-08-01", new Set());

      expect(days.length).toBe(30);
      expect(days[days.length - 1].dayString).toBe("2026-09-10");
      expect(days[days.length - 1].isToday).toBe(true);
      expect(days[0].dayString).toBe("2026-08-12");
      expect(days[0].isToday).toBe(false);
    });

    it("calculates correct Monday-first offset", () => {
      // 2026-09-10 is a Thursday. 29 days before is 2026-08-12 (Wednesday).
      // Wednesday offset: Mon(0), Tue(1), Wed(2) -> 2
      const ref = new Date("2026-09-10T12:00:00Z");
      const { startWeekday } = computeCalendarDays(ref, "2026-08-01", new Set());
      expect(startWeekday).toBe(2);
    });
  });

  describe("Day state classification (clean vs relapse vs pre-baseline)", () => {
    it("marks days before baseline start as 'before'", () => {
      const ref = new Date("2026-09-10T12:00:00Z");
      // Tracking started on 2026-09-01
      const { days } = computeCalendarDays(ref, "2026-09-01", new Set());

      // 2026-08-12 to 2026-08-31 should be 'before'
      const augustDays = days.filter((d) => d.dayString < "2026-09-01");
      expect(augustDays.length).toBe(20);
      expect(augustDays.every((d) => d.state === "before")).toBe(true);

      // 2026-09-01 to 2026-09-10 should be 'clean'
      const septDays = days.filter((d) => d.dayString >= "2026-09-01");
      expect(septDays.length).toBe(10);
      expect(septDays.every((d) => d.state === "clean")).toBe(true);
    });

    it("correctly identifies relapse days without altering other clean days", () => {
      const ref = new Date("2026-09-10T12:00:00Z");
      const relapses = new Set(["2026-09-05", "2026-09-08"]);
      const { days } = computeCalendarDays(ref, "2026-08-01", relapses);

      const day5 = days.find((d) => d.dayString === "2026-09-05");
      const day8 = days.find((d) => d.dayString === "2026-09-08");
      const day6 = days.find((d) => d.dayString === "2026-09-06");

      expect(day5?.state).toBe("relapse");
      expect(day8?.state).toBe("relapse");
      expect(day6?.state).toBe("clean");
    });
  });

  describe("Recovery event aggregations", () => {
    interface EventItem {
      kind: "urge" | "relapse" | "burst" | "tracker";
      resisted: boolean;
    }

    function countResistedUrges(events: EventItem[]) {
      return events.filter(
        (e) => (e.kind === "urge" || e.kind === "burst") && e.resisted
      ).length;
    }

    it("aggregates only resisted urges and burst interventions", () => {
      const events: EventItem[] = [
        { kind: "urge", resisted: true },
        { kind: "urge", resisted: false },
        { kind: "burst", resisted: true },
        { kind: "relapse", resisted: false },
        { kind: "tracker", resisted: true }, // Tracker is separate
      ];

      expect(countResistedUrges(events)).toBe(2);
    });

    it("evaluates personal best progress correctly", () => {
      function isPersonalBest(current: number, longest: number) {
        return current >= longest && current > 0;
      }

      expect(isPersonalBest(14, 14)).toBe(true);
      expect(isPersonalBest(15, 14)).toBe(true);
      expect(isPersonalBest(10, 14)).toBe(false);
      expect(isPersonalBest(0, 0)).toBe(false);
    });
  });
});
