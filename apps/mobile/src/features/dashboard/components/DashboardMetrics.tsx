import { StyleSheet, Text, View, Pressable } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, duration } from "../../../components/OfflineUI";
import type { ProtectionHealthScore } from "../../protection/utils/healthCalculator";

export interface DashboardMetricsProps {
  todayUsageMs: number;
  yesterdayUsageMs: number;
  hasUsagePermission: boolean;
  health: ProtectionHealthScore;
  reconciling: boolean;
  onOpenProtectionHealth: () => void;
  onOpenScreenTime?: () => void;
}

/**
 * DashboardMetrics renders the 2-column asymmetric metrics block:
 * Left: Primary Protection Health hero metric
 * Right: Stacked Screen Time & Yesterday trend metrics
 */
export function DashboardMetrics({
  todayUsageMs,
  yesterdayUsageMs,
  hasUsagePermission,
  health,
  reconciling,
  onOpenProtectionHealth,
  onOpenScreenTime,
}: DashboardMetricsProps) {
  const { palette: p } = useOffline();

  const isFullHealth = health.isFullyProtected;
  const displayHealthValue = reconciling ? "…" : health.healthValue;
  const displayHealthDetail = reconciling ? "Checking capabilities…" : health.healthDetail;

  // Screen time delta vs yesterday
  const change = yesterdayUsageMs > 0
    ? Math.round(((todayUsageMs - yesterdayUsageMs) / yesterdayUsageMs) * 100)
    : null;

  const isReduced = change !== null && change <= 0;

  return (
    <View style={s.metricsRow}>
      {/* Screen Time Metric */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Screen time: ${hasUsagePermission ? duration(todayUsageMs) : "No permission"}`}
        onPress={onOpenScreenTime}
        disabled={!onOpenScreenTime}
        style={({ pressed }) => [
          s.secondaryCard,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
          },
          pressed && s.cardPressed,
        ]}
      >
        <View style={[s.miniIconCompact, { backgroundColor: p.surfaceMuted }]}>
          <Icon name="clock-outline" size={17} color={p.brandPrimary} />
        </View>
        <View style={s.secondaryTextWrap}>
          <Text style={[s.secondaryValue, { color: p.textPrimary }]}>
            {hasUsagePermission ? duration(todayUsageMs) : "-"}
          </Text>
          <Text style={[s.secondaryLabel, { color: p.textSecondary }]}>
            Screen time
          </Text>
        </View>
      </Pressable>

      {/* Change vs Yesterday Metric */}
      <View
        style={[
          s.secondaryCard,
          {
            backgroundColor: isReduced ? p.successSurface : p.surfacePrimary,
            borderColor: isReduced ? "transparent" : p.borderSubtle,
          },
        ]}
      >
        <View
          style={[
            s.miniIconCompact,
            {
              backgroundColor: isReduced
                ? "rgba(31, 107, 75, 0.14)"
                : p.surfaceMuted,
            },
          ]}
        >
          <Icon
            name={isReduced ? "trending-down" : "trending-up"}
            color={isReduced ? p.success : p.textSecondary}
            size={17}
          />
        </View>
        <View style={s.secondaryTextWrap}>
          <Text
            style={[
              s.secondaryValue,
              { color: isReduced ? p.success : p.textPrimary },
            ]}
          >
            {change === null
              ? "-"
              : `${change > 0 ? "+" : ""}${change}%`}
          </Text>
          <Text
            style={[
              s.secondaryLabel,
              { color: isReduced ? p.success : p.textSecondary },
            ]}
          >
            {isReduced ? "Less today" : "vs yesterday"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  metricsRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 10,
  },
  cardPressed: {
    opacity: 0.88,
  },
  secondaryCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 58,
  },
  miniIconCompact: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  secondaryValue: {
    fontSize: 18,
    letterSpacing: -0.6,
    fontWeight: "700",
  },
  secondaryLabel: {
    fontSize: 9.5,
    fontWeight: "600",
    marginTop: 1,
  },
});
