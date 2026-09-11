import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useOffline } from "../../../app/providers/OfflineProvider";

export interface ProgressPulseHeroCardProps {
  cleanDays: number;
  currentStreak: number;
  longestStreak: number;
  resistedUrges: number;
  windowDays?: number;
}

/**
 * ProgressPulseHeroCard displays the primary recovery momentum hero card
 * for PROG-01 (Progress Overview).
 *
 * It visualizes the total clean days within the last 30 days rolling window
 * alongside current streak, longest streak, and urges resisted.
 */
export function ProgressPulseHeroCard({
  cleanDays,
  currentStreak,
  longestStreak,
  resistedUrges,
  windowDays = 30,
}: ProgressPulseHeroCardProps) {
  const { palette: p } = useOffline();

  return (
    <LinearGradient
      colors={[p.heroStart, p.heroMiddle, p.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.6 }}
      style={s.heroCard}
    >
      {/* Top kicker */}
      <View style={s.kickerRow}>
        <Text style={s.kickerText}>RECOVERY PULSE</Text>
        <View style={s.pillBadge}>
          <Text style={s.pillText}>LAST {windowDays} DAYS</Text>
        </View>
      </View>

      {/* Hero title & subtitle */}
      <Text style={s.heroTitle}>{cleanDays} clean days.</Text>
      <Text style={s.heroSub}>
        Your current streak is one signal. Your longer recovery pattern is the bigger story.
      </Text>

      {/* 3-stat momentum row */}
      <View style={s.statsRow}>
        <View style={s.statCol}>
          <Text style={s.statValue}>{currentStreak}</Text>
          <Text style={s.statLabel}>Current streak</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statCol}>
          <Text style={s.statValue}>{longestStreak}</Text>
          <Text style={s.statLabel}>Longest streak</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statCol}>
          <Text style={s.statValue}>{resistedUrges}</Text>
          <Text style={s.statLabel}>Urges resisted</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  heroCard: {
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
  },
  kickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  kickerText: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "#DBEAFF",
    fontWeight: "700",
  },
  pillBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  pillText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#FFFFFF",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 4,
  },
  heroSub: {
    color: "#DBEAFF",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: "95%",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.16)",
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  statLabel: {
    color: "#DBEAFF",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
});
