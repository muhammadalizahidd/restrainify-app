import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { formatDuration, type AppWeeklyDayBar } from "../utils/appUsageStats";

export interface AppDetailUsageChartProps {
  bars: AppWeeklyDayBar[];
}

/**
 * AppDetailUsageChart renders the 7-day usage bar chart for a single app
 * with weekday initial labels and active day highlighting.
 */
export function AppDetailUsageChart({ bars }: AppDetailUsageChartProps) {
  const { palette: p } = useOffline();
  const chartHeight = 96;

  return (
    <View style={s.container}>
      {/* Section Header */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>7-day usage</Text>
      </View>

      {/* Chart Card */}
      <View
        style={[
          s.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <View style={[s.barChart, { height: chartHeight + 28 }]}>
          {bars.map((item) => {
            const barHeight = Math.max(8, Math.round((item.heightPercent / 100) * chartHeight));

            return (
              <View key={item.day} style={s.barSlot}>
                <View
                  accessibilityLabel={`${item.day}: ${formatDuration(item.ms)}`}
                  style={[
                    s.bar,
                    {
                      height: barHeight,
                      backgroundColor: item.isToday ? p.brandPrimary : p.surfaceMuted,
                    },
                  ]}
                />
                <Text
                  style={[
                    s.dayLabel,
                    {
                      color: item.isToday ? p.brandPrimary : p.textSecondary,
                      fontWeight: item.isToday ? "700" : "500",
                    },
                  ]}
                >
                  {item.label}
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
