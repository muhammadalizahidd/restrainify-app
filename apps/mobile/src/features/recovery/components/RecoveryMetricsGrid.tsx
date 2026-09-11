import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";

export interface RecoveryMetricsGridProps {
  longest: number;
  resistedUrges: number;
  blockedAttempts: number;
}

/**
 * RecoveryMetricsGrid implements the 3-column metric summary
 * from PROG-02 (Longest streak, Resisted urges, Blocked attempts).
 */
export function RecoveryMetricsGrid({
  longest,
  resistedUrges,
  blockedAttempts,
}: RecoveryMetricsGridProps) {
  const { palette: p } = useOffline();

  return (
    <View style={s.grid3}>
      {/* Metric 1: Longest streak */}
      <View
        accessibilityLabel={`Longest streak: ${longest} days`}
        style={[s.metricCard, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}
      >
        <Text style={[s.metricValue, { color: p.textPrimary }]}>{longest}</Text>
        <Text style={[s.metricLabel, { color: p.textSecondary }]}>Longest</Text>
        <Text style={[s.metricSub, { color: p.textMuted }]}>days</Text>
      </View>

      {/* Metric 2: Resisted urges */}
      <View
        accessibilityLabel={`Resisted urges: ${resistedUrges}`}
        style={[s.metricCard, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}
      >
        <Text style={[s.metricValue, { color: p.textPrimary }]}>{resistedUrges}</Text>
        <Text style={[s.metricLabel, { color: p.textSecondary }]}>Resisted</Text>
        <Text style={[s.metricSub, { color: p.textMuted }]}>urges</Text>
      </View>

      {/* Metric 3: Blocked attempts */}
      <View
        accessibilityLabel={`Blocked attempts: ${blockedAttempts}`}
        style={[s.metricCard, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}
      >
        <Text style={[s.metricValue, { color: p.textPrimary }]}>{blockedAttempts}</Text>
        <Text style={[s.metricLabel, { color: p.textSecondary }]}>Blocked</Text>
        <Text style={[s.metricSub, { color: p.textMuted }]}>attempts</Text>
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
