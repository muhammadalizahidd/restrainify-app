import { StyleSheet, Text, View, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { NativeProgressRing as NativeRing } from "../../../components/RestrainifyProgressRing";

export interface MomentumHeroCardProps {
  currentStreak: number;
  goalDays?: number;
  onClaimReward: () => void;
  rewardClaimed: boolean;
  rewardBalance: number;
  busy?: boolean;
  onPress?: () => void;
}

/**
 * MomentumHeroCard renders the central recovery momentum card according to the
 * Restrainify Orbit / Clarity design system.
 *
 * Backend mapping:
 * - Current streak: snapshot.recovery.current
 * - Milestone horizon: default 21 days (or calculated target)
 * - Daily reward: snapshot.reward.claimed, snapshot.reward.balance
 * - Mutation: command("reward")
 */
export function MomentumHeroCard({
  currentStreak,
  goalDays = 21,
  onClaimReward,
  rewardClaimed,
  rewardBalance,
  busy = false,
  onPress,
}: MomentumHeroCardProps) {
  const { palette: p } = useOffline();

  // Progress percentage toward immediate milestone
  const percent = Math.min(100, Math.floor((currentStreak / goalDays) * 100));
  const daysRemaining = Math.max(0, goalDays - currentStreak);

  return (
    <LinearGradient
      colors={[p.heroStart, p.heroMiddle, p.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.6 }}
      style={s.heroCard}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View recovery progress and calendar. Current streak: ${currentStreak} days.`}
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
      >
        {/* Top kicker */}
        <View style={s.kickerRow}>
          <Text style={s.kickerText}>YOUR MOMENTUM</Text>
          <Text style={s.kickerText}>DAY {currentStreak}</Text>
        </View>

        {/* Streak Number & Milestone Ring */}
        <View style={s.streakGrid}>
          <View style={s.streakLeft}>
            <Text style={s.streakNumber}>{currentStreak}</Text>
            <Text style={s.streakSubtitle}>
              DAYS CLEAN · PERSONAL BEST{"\n"}IN PROGRESS
            </Text>
          </View>

          <View
            accessibilityLabel={`${percent} percent of your ${goalDays} day goal`}
            style={s.ringWrap}
          >
            <NativeRing progress={percent / 100} style={StyleSheet.absoluteFill} />
            <View style={s.ringLabelWrap}>
              <Text style={s.ringPercent}>{percent}%</Text>
              <Text style={s.ringGoal}>{goalDays} DAY GOAL</Text>
            </View>
          </View>
        </View>

        {/* Milestone Track Progress Bar */}
        <View style={s.milestoneMeta}>
          <Text style={s.milestoneText}>
            Next milestone <Text style={s.boldWhite}>{goalDays} days</Text>
          </Text>
          <Text style={s.boldWhite}>{daysRemaining} to go</Text>
        </View>
        <View style={s.trackBar}>
          <View style={[s.trackFill, { width: `${percent}%` }]} />
        </View>
      </Pressable>

      {/* Daily Reward Subcard */}
      <View style={s.rewardSubcard}>
        <View style={s.giftBadge}>
          <Icon name="gift-outline" color="#FFFFFF" size={20} />
        </View>
        <View style={s.rewardCopy}>
          <Text style={s.rewardTitle}>
            {rewardClaimed ? "A little win, secured." : "A little win, just for you."}
          </Text>
          <Text style={s.rewardDetail}>
            {rewardClaimed
              ? `${rewardBalance} focus coins earned`
              : "Your daily +10 focus coins are ready"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={rewardClaimed ? "Daily reward claimed" : "Claim daily reward"}
          disabled={busy || rewardClaimed}
          onPress={onClaimReward}
          style={({ pressed }) => [
            s.claimButton,
            rewardClaimed && s.claimButtonDisabled,
            pressed && !rewardClaimed && s.claimButtonPressed,
          ]}
        >
          <Text style={[s.claimButtonText, rewardClaimed && s.claimButtonTextDisabled]}>
            {rewardClaimed ? "Claimed ✓" : "Claim +10"}
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  heroCard: {
    borderRadius: 25,
    padding: 18,
    overflow: "hidden",
    position: "relative",
  },
  kickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kickerText: {
    fontSize: 9.5,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#DBEAFF",
    fontWeight: "700",
  },
  streakGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 14,
    gap: 12,
  },
  streakLeft: {
    flex: 1,
    minWidth: 0,
  },
  streakNumber: {
    color: "#FFFFFF",
    fontSize: 82,
    lineHeight: 84,
    letterSpacing: -5,
    fontWeight: "700",
  },
  streakSubtitle: {
    color: "#DBEAFF",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    marginTop: 6,
  },
  ringWrap: {
    width: 112,
    height: 112,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  ringLabelWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringPercent: {
    color: "#FFFFFF",
    fontSize: 27,
    letterSpacing: -1.3,
    fontWeight: "700",
  },
  ringGoal: {
    color: "#DBEAFF",
    fontSize: 7.5,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  milestoneMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  milestoneText: {
    color: "#DBEAFF",
    fontSize: 9.5,
    fontWeight: "500",
  },
  boldWhite: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  trackBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.17)",
    borderRadius: 9,
    marginTop: 8,
    marginBottom: 14,
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 9,
  },
  rewardSubcard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 17,
    padding: 11,
  },
  giftBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  rewardCopy: {
    flex: 1,
  },
  rewardTitle: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 15,
  },
  rewardDetail: {
    color: "#DBEAFF",
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3,
  },
  claimButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 13,
    minHeight: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  claimButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  claimButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  claimButtonText: {
    color: "#15336C",
    fontSize: 10.5,
    fontWeight: "700",
  },
  claimButtonTextDisabled: {
    color: "#DBEAFF",
  },
});
