import { StyleSheet, Text, View, Pressable } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, duration } from "../../../components/OfflineUI";

export interface DashboardMetricsProps {
  todayUsageMs: number;
  yesterdayUsageMs: number;
  hasUsagePermission: boolean;
  isWebHealthy: boolean;
  isAppHealthy: boolean;
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
  isWebHealthy,
  isAppHealthy,
  reconciling,
  onOpenProtectionHealth,
  onOpenScreenTime,
}: DashboardMetricsProps) {
  const { palette: p } = useOffline();

  // Truthful health status calculation
  const totalCapabilities = 2; // WebFilter (VPN) + AppRestrictions (Accessibility)
  let activeCount = 0;
  if (isWebHealthy) activeCount++;
  if (isAppHealthy) activeCount++;

  const healthPercent = Math.round((activeCount / totalCapabilities) * 100);
  const isFullHealth = activeCount === totalCapabilities;

  const healthValue = reconciling
    ? "…"
    : isFullHealth
    ? "100%"
    : `${healthPercent}%`;

  const healthDetail = reconciling
    ? "Checking capabilities…"
    : isFullHealth
    ? "All systems active"
    : "Action needed";

  // Screen time delta vs yesterday
  const change = yesterdayUsageMs > 0
    ? Math.round(((todayUsageMs - yesterdayUsageMs) / yesterdayUsageMs) * 100)
    : null;

  const isReduced = change !== null && change <= 0;

  return (
    <View style={s.metricsRow}>
      {/* Column 1: Primary Protection Health Metric */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Protection health: ${healthValue}, ${healthDetail}`}
        onPress={onOpenProtectionHealth}
        style={({ pressed }) => [
          s.primaryMetricCard,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
          },
          pressed && s.cardPressed,
        ]}
      >
        <View style={[s.miniIcon, { backgroundColor: p.surfaceMuted }]}>
          <Icon
            name={isFullHealth ? "shield-check-outline" : "shield-alert-outline"}
            color={isFullHealth ? p.brandPrimary : p.warning}
            size={18}
          />
        </View>

        <Text
          style={[
            s.primaryValue,
            { color: isFullHealth ? p.textPrimary : p.warning },
          ]}
        >
          {healthValue}
        </Text>
        <Text style={[s.primaryLabel, { color: p.textPrimary }]}>
          Protection health
        </Text>
        <Text style={[s.primaryDetail, { color: p.textSecondary }]}>
          {healthDetail}
        </Text>
      </Pressable>

      {/* Column 2: Stacked Screen Time & Trend */}
      <View style={s.secondaryColumn}>
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
    </View>
  );
}

const s = StyleSheet.create({
  metricsRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 10,
  },
  primaryMetricCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    justifyContent: "space-between",
    minHeight: 128,
  },
  cardPressed: {
    opacity: 0.88,
  },
  miniIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  primaryValue: {
    fontSize: 27,
    letterSpacing: -1.1,
    fontWeight: "700",
  },
  primaryLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 2,
  },
  primaryDetail: {
    fontSize: 9.5,
    marginTop: 3,
    lineHeight: 13,
  },
  secondaryColumn: {
    flex: 1,
    gap: 9,
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
