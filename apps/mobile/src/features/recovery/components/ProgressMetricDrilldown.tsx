import { Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface ProgressMetricDrilldownProps {
  cleanDays: number;
  windowDays?: number;
  reclaimedHours?: number;
  open?: (route: string) => void;
}

/**
 * ProgressMetricDrilldown provides 2-column metric summary tiles:
 * 1. Clean days percentage
 * 2. Time reclaimed vs baseline
 */
export function ProgressMetricDrilldown({
  cleanDays,
  windowDays = 30,
  reclaimedHours = 0,
}: ProgressMetricDrilldownProps) {
  const { palette: p } = useOffline();

  const cleanPercentage = Math.min(
    100,
    Math.max(0, Math.round((cleanDays / windowDays) * 100))
  );

  return (
    <View style={s.grid}>
      {/* 1. Clean Days Summary Card */}
      <View
        accessibilityRole="summary"
        accessibilityLabel={`Clean days: ${cleanPercentage} percent. ${cleanDays} of the last ${windowDays} days.`}
        style={[
          s.card,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
          },
        ]}
      >
        <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
          <Icon name="chart-timeline-variant" size={16} color={p.brandPrimary} />
        </View>
        <Text style={[s.value, { color: p.textPrimary }]}>{cleanPercentage}%</Text>
        <Text style={[s.label, { color: p.textPrimary }]}>Clean days</Text>
        <Text style={[s.subtext, { color: p.textSecondary }]}>
          {cleanDays} of the last {windowDays} days
        </Text>
      </View>

      {/* 2. Time Reclaimed Summary Card */}
      <View
        accessibilityRole="summary"
        accessibilityLabel={`Time reclaimed: ${reclaimedHours} hours compared with baseline.`}
        style={[
          s.card,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
          },
        ]}
      >
        <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
          <Icon name="timer-outline" size={16} color={p.brandPrimary} />
        </View>
        <Text style={[s.value, { color: p.textPrimary }]}>{reclaimedHours}h</Text>
        <Text style={[s.label, { color: p.textPrimary }]}>Time reclaimed</Text>
        <Text style={[s.subtext, { color: p.textSecondary }]}>
          Compared with your baseline
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  card: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "space-between",
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  subtext: {
    fontSize: 9.5,
    marginTop: 2,
    fontWeight: "500",
  },
});
