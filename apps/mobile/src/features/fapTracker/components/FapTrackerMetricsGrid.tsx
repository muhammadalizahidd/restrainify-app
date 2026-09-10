import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";

export interface FapTrackerMetricsGridProps {
  today: number;
  thisWeek: number;
  thisMonth: number;
}

/**
 * FapTrackerMetricsGrid renders the 3-column metric cards for JOUR-04:
 * 1. Today events
 * 2. This week events
 * 3. This month events
 */
export function FapTrackerMetricsGrid({
  today,
  thisWeek,
  thisMonth,
}: FapTrackerMetricsGridProps) {
  const { palette: p } = useOffline();

  const metrics = [
    { value: today, label: "Today", unit: "events" },
    { value: thisWeek, label: "This week", unit: "events" },
    { value: thisMonth, label: "This month", unit: "events" },
  ];

  return (
    <View style={s.grid}>
      {metrics.map((m) => (
        <View
          key={m.label}
          style={[
            s.card,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          <Text style={[s.value, { color: p.textPrimary }]}>{m.value}</Text>
          <Text style={[s.label, { color: p.textPrimary }]}>{m.label}</Text>
          <Text style={[s.unit, { color: p.textSecondary }]}>{m.unit}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 14,
  },
  card: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  unit: {
    fontSize: 9.5,
    fontWeight: "500",
    marginTop: 1,
  },
});
