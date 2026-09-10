import { StyleSheet, Text, View, Pressable } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { duration } from "../../../components/OfflineUI";

export interface AttentionTrendCardProps {
  todayUsageMs: number;
  weekUsage: { day: string; ms: number }[];
  hasUsagePermission: boolean;
  onOpenPermissions: () => void;
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

  // Compute maximum usage across the week for proportional bar scaling
  const maxMs = Math.max(...weekUsage.map((w) => w.ms), dailyGoalMs, 1);
  const chartHeight = 84;

  return (
    <View style={s.container}>
      {/* Section Title */}
      <View style={s.sectionTitleRow}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Your attention, reclaimed.
        </Text>
        <Text style={[s.sectionSide, { color: p.textSecondary }]}>
          THIS WEEK
        </Text>
      </View>

      {/* Main Card */}
      <View
        style={[
          s.card,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
          },
        ]}
      >
        {hasUsagePermission ? (
          <>
            {/* Header info row */}
            <View style={s.cardMetaRow}>
              <Text style={[s.goalText, { color: p.textSecondary }]}>
                {todayDurationText} of your {goalDurationText} daily goal
              </Text>
              {change !== null && (
                <Text
                  style={[
                    s.changeText,
                    { color: isReduced ? p.success : p.textPrimary },
                  ]}
                >
                  {isReduced ? "↓ " : "↑ "}
                  {Math.abs(change)}% today
                </Text>
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
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onOpenPermissions}
            style={s.permissionPrompt}
          >
            <Text style={[s.promptTitle, { color: p.textPrimary }]}>
              Usage Access Required
            </Text>
            <Text style={[s.promptDetail, { color: p.textSecondary }]}>
              Enable Android Usage Access to truthfully track screen time and
              view weekly focus patterns.
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 22,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionSide: {
    fontSize: 10,
    fontWeight: "600",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  goalText: {
    fontSize: 10,
    fontWeight: "500",
  },
  changeText: {
    fontSize: 10.5,
    fontWeight: "700",
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
    minHeight: 8,
  },
  dayLabel: {
    fontSize: 9,
    marginTop: 6,
    textAlign: "center",
  },
  permissionPrompt: {
    paddingVertical: 10,
    gap: 4,
  },
  promptTitle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  promptDetail: {
    fontSize: 10.5,
    lineHeight: 15,
  },
});
