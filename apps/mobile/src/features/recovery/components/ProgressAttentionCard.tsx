import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { duration } from "../../../components/OfflineUI";

export interface ProgressAttentionCardProps {
  todayMs: number;
  weekUsage: { day: string; ms: number }[];
}

/**
 * ProgressAttentionCard displays the 7-day attention trend card for PROG-01.
 * Shows formatted today usage, comparison pill vs yesterday, and 7-day bars.
 */
export function ProgressAttentionCard({
  todayMs,
  weekUsage,
}: ProgressAttentionCardProps) {
  const { palette: p } = useOffline();

  // Compare today with yesterday (second to last item)
  const yesterdayMs = weekUsage.at(-2)?.ms ?? 0;
  const change =
    yesterdayMs > 0
      ? Math.round(((todayMs - yesterdayMs) / yesterdayMs) * 100)
      : null;

  const isReduced = change !== null && change <= 0;

  const maxMs = Math.max(...weekUsage.map((w) => w.ms), todayMs, 1);
  const chartHeight = 84;

  return (
    <View style={s.container}>
      {/* Section Header */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Attention trend
        </Text>
        <Text style={[s.sectionBadge, { color: p.textSecondary }]}>
          7 DAYS
        </Text>
      </View>

      {/* Main Trend Card */}
      <View
        style={[
          s.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {/* Top Header Row with Today's Usage & Pill */}
        <View style={s.topRow}>
          <View>
            <Text style={[s.usageValue, { color: p.textPrimary }]}>
              {duration(todayMs)}
            </Text>
            <Text style={[s.todayLabel, { color: p.textSecondary }]}>Today</Text>
          </View>
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

        {/* 7-Day Bar Chart */}
        <View style={[s.barChart, { height: chartHeight + 24 }]}>
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
    marginTop: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionBadge: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  usageValue: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  todayLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 4,
  },
  barSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  bar: {
    width: "100%",
    borderRadius: 6,
  },
  dayLabel: {
    fontSize: 10,
    marginTop: 6,
  },
});
