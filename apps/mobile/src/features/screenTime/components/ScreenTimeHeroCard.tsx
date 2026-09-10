import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { duration } from "../../../components/OfflineUI";

export interface ScreenTimeHeroCardProps {
  timeframe: "day" | "week";
  usageMs: number;
  goalMs?: number;
}

/**
 * ScreenTimeHeroCard displays the primary attention hero card according to the
 * Restrainify Orbit / Clarity design system.
 *
 * Backend mapping:
 * - Day usage: snapshot.usage.todayMs
 * - Week usage: sum of snapshot.usage.week[].ms
 * - Goal calculation: derived against daily 3h budget or weekly 21h budget
 */
export function ScreenTimeHeroCard({
  timeframe,
  usageMs,
  goalMs = timeframe === "day" ? 3 * 3600 * 1000 : 21 * 3600 * 1000,
}: ScreenTimeHeroCardProps) {
  const { palette: p } = useOffline();

  const usageText = duration(usageMs);
  const goalText = duration(goalMs);
  const percent = Math.min(100, Math.floor((usageMs / goalMs) * 100));

  const diffMs = goalMs - usageMs;
  const isUnderGoal = diffMs >= 0;
  const deltaText = duration(Math.abs(diffMs));

  const kickerLabel = timeframe === "day" ? "TODAY" : "THIS WEEK";
  const goalKicker = `${goalText.toUpperCase()} GOAL`;

  const subText = isUnderGoal
    ? `${deltaText} left before your ${timeframe === "day" ? "daily" : "weekly"} attention goal.`
    : `Exceeded ${timeframe === "day" ? "daily" : "weekly"} attention goal by ${deltaText}.`;

  return (
    <LinearGradient
      colors={[p.heroStart, p.heroMiddle, p.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.6 }}
      style={s.heroCard}
    >
      {/* Top kicker */}
      <View style={s.kickerRow}>
        <Text style={s.kickerText}>{kickerLabel}</Text>
        <Text style={s.kickerText}>{goalKicker}</Text>
      </View>

      {/* Primary duration headline */}
      <Text style={s.heroTitle}>{usageText}</Text>
      <Text style={s.heroSub}>{subText}</Text>

      {/* Progress Track Bar */}
      <View style={s.trackBar}>
        <View
          accessibilityLabel={`${percent} percent of attention goal used`}
          style={[s.trackFill, { width: `${percent}%` }]}
        />
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  heroCard: {
    borderRadius: 25,
    padding: 18,
    marginTop: 10,
    overflow: "hidden",
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
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -2,
    fontWeight: "700",
    marginTop: 10,
  },
  heroSub: {
    color: "#DBEAFF",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    marginTop: 4,
    maxWidth: 290,
  },
  trackBar: {
    height: 5,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 9,
    marginTop: 16,
    marginBottom: 4,
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 9,
  },
});
