import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import type { AppSessionStats } from "../utils/appUsageStats";

export interface AppDetailMetricsGridProps {
  stats: AppSessionStats;
}

/**
 * AppDetailMetricsGrid implements the 3-column metric summary
 * from PROG-04 (Sessions today, Longest session, Average this week).
 */
export function AppDetailMetricsGrid({ stats }: AppDetailMetricsGridProps) {
  const { palette: p } = useOffline();

  return (
    <View style={s.grid3}>
      {/* Metric 1: Sessions */}
      <View
        accessibilityLabel={`Sessions today: ${stats.formattedSessions}`}
        style={[
          s.metricCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <Text style={[s.metricValue, { color: p.textPrimary }]}>
          {stats.formattedSessions}
        </Text>
        <Text style={[s.metricLabel, { color: p.textSecondary }]}>Sessions</Text>
        <Text style={[s.metricSub, { color: p.textMuted }]}>today</Text>
      </View>

      {/* Metric 2: Longest session */}
      <View
        accessibilityLabel={`Longest session: ${stats.formattedLongest}`}
        style={[
          s.metricCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <Text style={[s.metricValue, { color: p.textPrimary }]}>
          {stats.formattedLongest}
        </Text>
        <Text style={[s.metricLabel, { color: p.textSecondary }]}>Longest</Text>
        <Text style={[s.metricSub, { color: p.textMuted }]}>session</Text>
      </View>

      {/* Metric 3: Average this week */}
      <View
        accessibilityLabel={`Average this week: ${stats.formattedAverage}`}
        style={[
          s.metricCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <Text style={[s.metricValue, { color: p.textPrimary }]}>
          {stats.formattedAverage}
        </Text>
        <Text style={[s.metricLabel, { color: p.textSecondary }]}>Average</Text>
        <Text style={[s.metricSub, { color: p.textMuted }]}>this week</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  grid3: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontSize: 26,
    letterSpacing: -1,
    fontWeight: "700",
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
  metricSub: {
    fontSize: 9.5,
    fontWeight: "500",
    marginTop: 2,
  },
});
