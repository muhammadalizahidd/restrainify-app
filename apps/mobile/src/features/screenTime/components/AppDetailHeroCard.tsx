import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { formatDuration, type AppLimitStatus } from "../utils/appUsageStats";

export interface AppDetailHeroCardProps {
  usageMs: number;
  limitStatus: AppLimitStatus;
}

/**
 * AppDetailHeroCard displays today's app duration, limit status,
 * and proportional progress track according to the Orbit / Clarity design system.
 */
export function AppDetailHeroCard({ usageMs, limitStatus }: AppDetailHeroCardProps) {
  const { palette: p } = useOffline();
  const usageText = formatDuration(usageMs);

  return (
    <LinearGradient
      colors={[p.heroStart, p.heroMiddle, p.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.6 }}
      style={s.heroCard}
    >
      {/* Top kicker */}
      <View style={s.kickerRow}>
        <Text style={s.kickerText}>TODAY</Text>
        <Text style={s.kickerText}>{limitStatus.kickerRight}</Text>
      </View>

      {/* Primary duration headline */}
      <Text style={s.heroTitle}>{usageText}</Text>
      <Text style={s.heroSub}>{limitStatus.subtitle}</Text>

      {/* Progress Track Bar */}
      <View style={s.trackBar}>
        <View
          accessibilityLabel={`${limitStatus.progressPercent} percent of daily limit used`}
          style={[
            s.trackFill,
            {
              width: `${limitStatus.progressPercent}%`,
              backgroundColor: limitStatus.isOverLimit ? "#FFB4B8" : "#FFFFFF",
            },
          ]}
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
    borderRadius: 9,
  },
});
