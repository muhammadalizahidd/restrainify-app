import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { duration } from "../../../components/OfflineUI";

export interface ScreenTimeBarChartProps {
  weekUsage: { day: string; ms: number }[];
  todayUsageMs: number;
  dailyGoalMs?: number;
}

/**
 * ScreenTimeBarChart renders the 7-day attention bar chart
 * with weekday initials, percentage trend comparison, and active day highlighting.
 *
 * Backend mapping:
 * - weekUsage: snapshot.usage.week
 * - todayUsageMs: snapshot.usage.todayMs
 */
export function ScreenTimeBarChart({
  weekUsage,
  todayUsageMs,
  dailyGoalMs = 3 * 3600 * 1000,
}: ScreenTimeBarChartProps) {
  const { palette: p } = useOffline();

  const yesterdayMs = weekUsage.at(-2)?.ms ?? 0;
  const change = yesterdayMs > 0
    ? Math.round(((todayUsageMs - yesterdayMs) / yesterdayMs) * 100)
    : null;

  const isReduced = change !== null && change <= 0;

  // Maximum usage across the week for proportional height calculation
  const maxMs = Math.max(...weekUsage.map((w) => w.ms), dailyGoalMs, 1);
  const chartHeight = 96;

  return (
    <View style={s.container}>
      {/* Section Header */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>This week</Text>
        {change !== null && (
          <View
            style={[
              s.pill,
              { backgroundColor: isReduced ? p.successSurface : p.surfaceMuted },
            ]}
          >
            <Text
              style={[
                s.pillText,
                { color: isReduced ? p.success : p.textSecondary },
              ]}
            >
              {isReduced ? "↓ " : "↑ "}
              {Math.abs(change)}% vs yesterday
            </Text>
          </View>
        )}
      </View>

      {/* Chart Card */}
      <View
        style={[
          s.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <View style={[s.barChart, { height: chartHeight + 28 }]}>
          {weekUsage.map((item, index) => {
            const isToday = index === weekUsage.length - 1;
            const barHeight = Math.max(
              8,
              Math.round((item.ms / maxMs) * chartHeight)
            );
            const dayLabel = new Date(`${item.day}T12:00:00`).toLocaleDateString(
              undefined,
              { weekday: "narrow" }
            );

            return (
              <View key={item.day} style={s.barSlot}>
                <View
                  accessibilityLabel={`${item.day}: ${duration(item.ms)}`}
                  style={[
                    s.bar,
                    {
                      height: barHeight,
                      backgroundColor: isToday ? p.brandPrimary : p.surfaceMuted,
                    },
                  ]}
                />
                <Text
                  style={[
                    s.dayLabel,
                    {
                      color: isToday ? p.brandPrimary : p.textSecondary,
                      fontWeight: isToday ? "700" : "500",
                    },
                  ]}
                >
                  {dayLabel}
                </Text>
              </View>
            );
          })}
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
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingBottom: 4,
  },
  barSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: "68%",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    minHeight: 8,
  },
  dayLabel: {
    fontSize: 9.5,
    marginTop: 8,
    textAlign: "center",
  },
});
