import { StyleSheet, Text, View, Pressable } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, duration } from "../../../components/OfflineUI";

export interface AttentionTrendCardProps {
  todayUsageMs: number;
  weekUsage: { day: string; ms: number }[];
  hasUsagePermission: boolean;
  onOpenPermissions: () => void;
  onPress?: () => void;
  dailyGoalMs?: number; // Default 3 hours = 3 * 3600000 = 10800000 ms
}

/**
 * AttentionTrendCard displays:
 * - Subheader: "{time} of your {goal} daily goal" · "↓ {percent}% today"
 * - 7-day bar chart with weekday initials (M, T, W, T, F, S, S)
 * - Today's bar highlighted in active brand tone
 */
export function AttentionTrendCard({
  todayUsageMs,
  weekUsage,
  hasUsagePermission,
  onOpenPermissions,
  onPress,
  dailyGoalMs = 3 * 60 * 60 * 1000,
}: AttentionTrendCardProps) {
  const { palette: p } = useOffline();

  const goalDurationText = duration(dailyGoalMs);
  const todayDurationText = duration(todayUsageMs);

  const yesterdayMs = weekUsage.at(-2)?.ms ?? 0;
  const change = yesterdayMs > 0
    ? Math.round(((todayUsageMs - yesterdayMs) / yesterdayMs) * 100)
    : null;

  const isReduced = change !== null && change <= 0;
  const maxMs = Math.max(...weekUsage.map((w) => w.ms), dailyGoalMs, 1);
  const chartHeight = 70;

  if (!hasUsagePermission) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Connect Usage Access to unlock weekly attention patterns"
        onPress={onOpenPermissions}
        style={({ pressed }) => [
          s.compactCard,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
          },
          pressed && s.cardPressed,
        ]}
      >
        <View style={[s.compactIconWrap, { backgroundColor: p.surfaceMuted }]}>
          <Icon name="chart-timeline-variant" size={20} color={p.brandPrimary} />
        </View>
        <View style={s.compactTextWrap}>
          <Text style={[s.compactTitle, { color: p.textPrimary }]}>
            Weekly Attention Patterns
          </Text>
          <Text style={[s.compactSubtitle, { color: p.textSecondary }]}>
            Connect Usage Access to view 7-day focus trends
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color={p.textSecondary} />
      </Pressable>
    );
  }

  return (
    <View style={s.container}>
      {/* Section Title */}
      <View style={s.sectionTitleRow}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Weekly Attention Trend
        </Text>
        {change !== null && (
          <Text
            style={[
              s.changeBadge,
              { color: isReduced ? p.success : p.textSecondary },
            ]}
          >
            {isReduced ? "↓ " : "↑ "}
            {Math.abs(change)}% vs yesterday
          </Text>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Screen time breakdown, ${todayDurationText} of ${goalDurationText} daily goal`}
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [
          s.card,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
          },
          pressed && s.cardPressed,
        ]}
      >
        <View style={s.cardMetaRow}>
          <Text style={[s.goalText, { color: p.textSecondary }]}>
            {todayDurationText} today · {goalDurationText} daily baseline
          </Text>
        </View>

        {/* 7-Day Bar Chart */}
        <View style={[s.barChart, { height: chartHeight + 20 }]}>
          {weekUsage.map((item, index) => {
            const isToday = index === weekUsage.length - 1;
            const barHeight = Math.max(
              6,
              Math.round((item.ms / maxMs) * chartHeight)
            );
            const dayLabel = new Date(`${item.day}T12:00:00`).toLocaleDateString(
              undefined,
              { weekday: "narrow" }
            );

            return (
              <View key={item.day} style={s.barSlot}>
                <View
                  style={[
                    s.bar,
                    {
                      height: barHeight,
                      backgroundColor: isToday
                        ? p.brandPrimary
                        : p.surfaceMuted,
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
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  compactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 70,
    marginTop: 10,
  },
  compactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  compactTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  compactTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  compactSubtitle: {
    fontSize: 10.5,
    marginTop: 3,
    lineHeight: 14,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  changeBadge: {
    fontSize: 10,
    fontWeight: "600",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  goalText: {
    fontSize: 10,
    fontWeight: "500",
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 11,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0, 0, 0, 0.08)",
  },
  barSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: "72%",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    minHeight: 6,
  },
  dayLabel: {
    fontSize: 9,
    marginTop: 5,
    textAlign: "center",
  },
});
