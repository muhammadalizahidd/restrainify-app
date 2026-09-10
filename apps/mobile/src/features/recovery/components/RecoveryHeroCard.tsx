import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { NativeProgressRing as NativeRing } from "../../../components/RestrainifyProgressRing";

export interface RecoveryHeroCardProps {
  currentStreak: number;
  cleanDays: number;
  windowDays?: number;
}

/**
 * RecoveryHeroCard displays the primary recovery momentum hero card according to the
 * Restrainify Orbit / Clarity design system.
 *
 * Backend mapping:
 * - Current streak: snapshot.recovery.current
 * - Clean days in window: snapshot.recovery.cleanDays
 */
export function RecoveryHeroCard({
  currentStreak,
  cleanDays,
  windowDays = 30,
}: RecoveryHeroCardProps) {
  const { palette: p } = useOffline();

  const progress = Math.min(1, Math.max(0, cleanDays / windowDays));

  return (
    <LinearGradient
      colors={[p.heroStart, p.heroMiddle, p.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.6 }}
      style={s.heroCard}
    >
      {/* Top kicker */}
      <View style={s.kickerRow}>
        <Text style={s.kickerText}>YOUR RECOVERY</Text>
        <Text style={s.kickerText}>DAY {currentStreak}</Text>
      </View>

      {/* Main Grid: Streak info on left, clean days ring on right */}
      <View style={s.contentGrid}>
        <View style={s.leftCol}>
          <Text style={s.streakTitle}>
            {currentStreak} {currentStreak === 1 ? "day" : "days"}
          </Text>
          <Text style={s.streakSub}>
            Current streak · history remains even if this resets.
          </Text>
        </View>

        <View
          accessibilityLabel={`${cleanDays} clean days out of ${windowDays}`}
          style={s.ringWrap}
        >
          <NativeRing progress={progress} style={StyleSheet.absoluteFill} />
          <View style={s.ringLabelWrap}>
            <Text style={s.ringValue}>{cleanDays}</Text>
            <Text style={s.ringLabel}>CLEAN / {windowDays}</Text>
          </View>
        </View>
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
  contentGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 12,
  },
  leftCol: {
    flex: 1,
    minWidth: 0,
  },
  streakTitle: {
    color: "#FFFFFF",
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: -2,
    fontWeight: "700",
  },
  streakSub: {
    color: "#DBEAFF",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    marginTop: 6,
    maxWidth: 240,
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
  ringValue: {
    color: "#FFFFFF",
    fontSize: 27,
    letterSpacing: -1.3,
    fontWeight: "700",
  },
  ringLabel: {
    color: "#DBEAFF",
    fontSize: 7.5,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
