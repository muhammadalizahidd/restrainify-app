import { StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, duration } from "../../../components/OfflineUI";

export interface MomentumHeroCardProps {
  currentStreak: number;
  goalDays?: number;
  todayUsageMs?: number;
  yesterdayUsageMs?: number;
  hasUsagePermission?: boolean;
  onOpenScreenTime?: () => void;
  onClaimReward: () => void;
  rewardClaimed: boolean;
  rewardBalance: number;
  busy?: boolean;
  isAuth?: boolean;
  onPress?: () => void;
}

/**
 * MomentumHeroCard renders the central recovery momentum card according to the
 * Restrainify Orbit / Clarity design system.
 *
 * It combines deep celestial gradients, ambient orbit rings, milestone
 * progress indicators, and an interactive glassmorphic daily reward subcard.
 */
export function MomentumHeroCard({
  currentStreak,
  goalDays = 21,
  todayUsageMs,
  yesterdayUsageMs,
  hasUsagePermission = false,
  onOpenScreenTime,
  onClaimReward,
  rewardClaimed,
  rewardBalance,
  busy = false,
  isAuth = true,
  onPress,
}: MomentumHeroCardProps) {
  const { palette: p } = useOffline();

  // Screen time delta vs yesterday
  const change =
    yesterdayUsageMs && yesterdayUsageMs > 0
      ? Math.round((((todayUsageMs ?? 0) - yesterdayUsageMs) / yesterdayUsageMs) * 100)
      : null;

  const isReduced = change !== null && change <= 0;
  const screenTimeText = hasUsagePermission ? duration(todayUsageMs ?? 0) : "-";
  const changeText = change === null ? "-" : `${change > 0 ? "+" : ""}${change}%`;

  return (
    <LinearGradient
      colors={[p.heroStart, p.heroMiddle, p.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.8 }}
      style={s.heroCard}
    >
      {/* Background Orbit Ring Accents for Celestial Depth */}
      <View pointerEvents="none" style={s.orbitRingOuter} />
      <View pointerEvents="none" style={s.orbitRingInner} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View recovery progress and calendar. Current streak: ${currentStreak} days.`}
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [s.cardPressWrap, { opacity: pressed ? 0.94 : 1 }]}
      >
        {/* 1. Top Kicker Row: Momentum Pill Badge + Milestone Indicator */}
        <View style={s.kickerRow}>
          <View style={s.kickerBadge}>
            <Icon name="fire" size={13} color="#93C5FD" />
            <Text style={s.kickerBadgeText}>CURRENT MOMENTUM</Text>
          </View>
          <View style={s.milestoneChip}>
            <Text style={s.milestoneChipText}>DAY {currentStreak}</Text>
          </View>
        </View>

        {/* 2. Hero Center: Streak Big Number (Left) + Daily Win Reward Subcard (Right) */}
        <View style={s.streakGrid}>
          <View style={s.streakLeft}>
            <Text style={s.streakNumber}>{currentStreak}</Text>
            <Text style={s.streakSubtitle}>
              {currentStreak === 0
                ? "DAY ONE · FRESH HORIZON"
                : "DAYS CLEAN · PERSONAL BEST"}
            </Text>
            <Text style={s.streakQuote}>
              One day at a time builds a lifetime.
            </Text>
          </View>

          {/* Daily Win Subcard placed beside the streak counter in place of the removed ring */}
          <View style={s.rewardSubcard}>
            <View style={s.rewardHeaderRow}>
              <View style={s.rewardBadgeBox}>
                <Icon name="circle-multiple" color="#FDE68A" size={15} />
              </View>
              <View style={s.rewardCopy}>
                <Text style={s.rewardTitle}>
                  {rewardClaimed
                    ? "Daily Win"
                    : isAuth
                    ? "Daily Win"
                    : "Focus Coins"}
                </Text>
                <Text style={s.rewardDetail} numberOfLines={1}>
                  {rewardClaimed
                    ? `${rewardBalance} in vault`
                    : isAuth
                    ? "+10 focus coins"
                    : "Sign in"}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                rewardClaimed
                  ? "Daily reward claimed"
                  : isAuth
                  ? "Claim 10 daily focus coins"
                  : "Sign in to claim daily coins"
              }
              disabled={busy || rewardClaimed}
              onPress={onClaimReward}
              style={({ pressed }) => [
                s.claimButton,
                rewardClaimed && s.claimButtonDisabled,
                pressed && !rewardClaimed && !busy && s.claimButtonPressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#0D2352" />
              ) : (
                <Text
                  style={[
                    s.claimButtonText,
                    rewardClaimed && s.claimButtonTextDisabled,
                  ]}
                >
                  {rewardClaimed
                    ? "Claimed ✓"
                    : isAuth
                    ? "Claim +10 🪙"
                    : "Sign in"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* 3. Screen Time & Yesterday Trend Metrics Row */}
        <View style={s.heroMetricsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Screen time: ${screenTimeText}`}
            disabled={!onOpenScreenTime}
            onPress={onOpenScreenTime}
            style={({ pressed }) => [
              s.heroMetricCard,
              pressed && s.heroMetricPressed,
            ]}
          >
            <View style={s.heroMetricIconBox}>
              <Icon name="clock-outline" size={15} color="#DBEAFF" />
            </View>
            <View style={s.heroMetricTextWrap}>
              <Text style={s.heroMetricValue}>{screenTimeText}</Text>
              <Text style={s.heroMetricLabel}>Screen time</Text>
            </View>
          </Pressable>

          <View
            style={[
              s.heroMetricCard,
              isReduced && {
                backgroundColor: "rgba(16, 185, 129, 0.16)",
                borderColor: "rgba(52, 211, 153, 0.32)",
              },
            ]}
          >
            <View
              style={[
                s.heroMetricIconBox,
                isReduced && { backgroundColor: "rgba(16, 185, 129, 0.28)" },
              ]}
            >
              <Icon
                name={isReduced ? "trending-down" : "trending-up"}
                color={isReduced ? "#6EE7B7" : "#DBEAFF"}
                size={15}
              />
            </View>
            <View style={s.heroMetricTextWrap}>
              <Text
                style={[
                  s.heroMetricValue,
                  isReduced && { color: "#6EE7B7" },
                ]}
              >
                {changeText}
              </Text>
              <Text
                style={[
                  s.heroMetricLabel,
                  isReduced && { color: "#A7F3D0" },
                ]}
              >
                {isReduced ? "Less today" : "vs yesterday"}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  heroCard: {
    borderRadius: 24,
    padding: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.16)",
    shadowColor: "#0A2558",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 7,
  },
  orbitRingOuter: {
    position: "absolute",
    right: -80,
    top: -100,
    width: 290,
    height: 290,
    borderRadius: 145,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  orbitRingInner: {
    position: "absolute",
    right: -45,
    top: -65,
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  cardPressWrap: {
    zIndex: 1,
  },
  kickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kickerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderColor: "rgba(255, 255, 255, 0.22)",
    borderWidth: 1,
    borderRadius: 99,
    paddingVertical: 3.5,
    paddingHorizontal: 8.5,
  },
  kickerBadgeText: {
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#DBEAFF",
    fontWeight: "700",
  },
  milestoneChip: {
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderRadius: 99,
    paddingVertical: 3.5,
    paddingHorizontal: 8.5,
  },
  milestoneChipText: {
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#BFDBFE",
    fontWeight: "700",
  },
  streakGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 12,
    gap: 10,
  },
  streakLeft: {
    flex: 1,
    minWidth: 0,
  },
  streakNumber: {
    color: "#FFFFFF",
    fontSize: 66,
    lineHeight: 70,
    letterSpacing: -3.8,
    fontWeight: "800",
  },
  streakSubtitle: {
    color: "#E0EDFF",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginTop: 2,
  },
  streakQuote: {
    color: "#BFDBFE",
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  rewardSubcard: {
    width: 136,
    backgroundColor: "rgba(255, 255, 255, 0.11)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 16,
    padding: 9,
    justifyContent: "center",
  },
  rewardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  rewardBadgeBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(245, 158, 11, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  rewardCopy: {
    flex: 1,
    minWidth: 0,
  },
  rewardTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },
  rewardDetail: {
    color: "#DBEAFF",
    fontSize: 9,
    lineHeight: 12,
    marginTop: 1,
  },
  claimButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    minHeight: 32,
    marginTop: 8,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  claimButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.20)",
    borderColor: "rgba(255, 255, 255, 0.28)",
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  claimButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  claimButtonText: {
    color: "#0D2352",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  claimButtonTextDisabled: {
    color: "#DBEAFF",
    fontWeight: "600",
  },
  heroMetricsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 0,
    marginBottom: 0,
  },
  heroMetricCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.11)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 48,
  },
  heroMetricPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  heroMetricIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroMetricTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  heroMetricValue: {
    color: "#FFFFFF",
    fontSize: 15,
    letterSpacing: -0.4,
    fontWeight: "700",
  },
  heroMetricLabel: {
    color: "#DBEAFF",
    fontSize: 9.5,
    fontWeight: "600",
    marginTop: 1,
  },
});
