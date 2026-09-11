import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";

export interface RecoveryCalendarCardProps {
  recoveryStart: string; // YYYY-MM-DD
  cleanDays: number;
  relapseDays: Set<string>; // YYYY-MM-DD
}

export function localDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * RecoveryCalendarCard displays the 30-day recovery calendar
 * with Monday-first day-of-week alignment, clean/relapse indicators,
 * and current day highlighting.
 */
export function RecoveryCalendarCard({
  recoveryStart,
  cleanDays,
  relapseDays,
}: RecoveryCalendarCardProps) {
  const { palette: p } = useOffline();

  const { emptySlots, days } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = localDay(today);

    // 30-day window ending today
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 29);

    // Monday-first offset: 0 for Mon, 1 for Tue, ... 6 for Sun
    const startWeekday = (startDate.getDay() + 6) % 7;

    const dayItems = [];
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

      dayItems.push({
        dateNumber: d.getDate(),
        dayString: dayStr,
        isToday,
        state,
      });
    }

    return {
      emptySlots: Array.from({ length: startWeekday }, (_, i) => i),
      days: dayItems,
    };
  }, [recoveryStart, relapseDays]);

  return (
    <View style={s.container}>
      {/* Section Title & Pill */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Last 30 days</Text>
        <View style={[s.pill, { backgroundColor: p.surfaceMuted }]}>
          <Text style={[s.pillText, { color: p.textSecondary }]}>
            {cleanDays} PORN-FREE
          </Text>
        </View>
      </View>

      {/* Calendar Card */}
      <View
        style={[
          s.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {/* Day-of-week header row */}
        <View style={s.weekdayRow}>
          {WEEKDAYS.map((day, idx) => (
            <View key={`weekday-${idx}`} style={s.cellWrap}>
              <Text style={[s.weekdayText, { color: p.textMuted }]}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Day Grid */}
        <View style={s.calendarGrid}>
          {/* Leading empty slots for alignment */}
          {emptySlots.map((slot) => (
            <View key={`empty-${slot}`} style={s.cellWrap}>
              <View style={[s.dayCell, s.dayEmpty, { backgroundColor: "transparent" }]} />
            </View>
          ))}

          {/* Actual 30 days */}
          {days.map((item) => {
            let bg: string = p.successSurface;
            let textColor: string = p.success;

            if (item.state === "before") {
              bg = p.surfaceMuted;
              textColor = p.textMuted;
            } else if (item.state === "relapse") {
              bg = p.dangerSurface;
              textColor = p.danger;
            }

            return (
              <View key={item.dayString} style={s.cellWrap}>
                <View
                  accessibilityLabel={`${item.dayString}: ${
                    item.state === "before"
                      ? "before tracking"
                      : item.state === "relapse"
                      ? "relapse recorded"
                      : "clean"
                  }${item.isToday ? ", today" : ""}`}
                  style={[
                    s.dayCell,
                    { backgroundColor: bg },
                    item.isToday && [
                      s.dayToday,
                      { borderColor: p.brandPrimary },
                    ],
                  ]}
                >
                  <Text
                    style={[
                      s.dayNumber,
                      { color: textColor },
                      item.isToday && s.dayNumberToday,
                    ]}
                  >
                    {item.dateNumber}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Legend */}
        <View style={s.legendRow}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: p.success }]} />
            <Text style={[s.legendText, { color: p.textSecondary }]}>Porn-free</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: p.danger }]} />
            <Text style={[s.legendText, { color: p.textSecondary }]}>
              Relapse logged
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  pillText: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayText: {
    fontSize: 9.5,
    fontWeight: "700",
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 6,
  },
  cellWrap: {
    width: "14.2857%", // 7 columns
    aspectRatio: 1,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCell: {
    width: "100%",
    height: "100%",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  dayEmpty: {
    opacity: 0,
  },
  dayToday: {
    borderWidth: 1.8,
  },
  dayNumber: {
    fontSize: 10,
    fontWeight: "600",
  },
  dayNumberToday: {
    fontWeight: "700",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 9.5,
    fontWeight: "600",
  },
});
