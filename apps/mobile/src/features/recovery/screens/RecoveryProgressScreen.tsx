import { StyleSheet, Text, View, Pressable } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { RecoveryHeroCard } from "../components/RecoveryHeroCard";
import { RecoveryMetricsGrid } from "../components/RecoveryMetricsGrid";
import { RecoveryCalendarCard } from "../components/RecoveryCalendarCard";
import { RecoveryTimeline } from "../components/RecoveryTimeline";

export interface RecoveryProgressScreenProps {
  open: (route: string) => void;
  onBack?: () => void;
}

/**
 * RecoveryProgressScreen implements PROG-02: Recovery Progress & Calendar Screen
 * from the Restrainify UI Architecture specification.
 *
 * It visualizes current and historical streak momentum, a 30-day calendar matrix,
 * resisted urges, blocked attempts, and preserved recovery timelines.
 */
export function RecoveryProgressScreen({ onBack }: RecoveryProgressScreenProps) {
  const { snapshot: data, palette: p } = useOffline();

  if (!data) return null;

  // Extract backend recovery metrics
  const currentStreak = data.recovery.current;
  const longestStreak = data.recovery.longest;
  const cleanDays = data.recovery.cleanDays;
  const recoveryStart = data.settings.recoveryStart;

  // Derived event statistics
  const relapseEvents = data.events.filter((e) => e.kind === "relapse");
  const relapseDays = new Set(relapseEvents.map((e) => e.day));
  const relapseCount = relapseEvents.length;

  const resistedUrges = data.events.filter(
    (e) => (e.kind === "urge" || e.kind === "burst") && e.resisted
  ).length;

  const blockedAttempts = data.blockedToday;

  return (
    <View style={s.container}>
      {/* 1. Subscreen Header with Back Navigation */}
      <View style={s.headerRow}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[
              s.backButton,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={s.titleWrap}>
          <Text style={[s.headerTitle, { color: p.textPrimary }]}>
            Recovery progress
          </Text>
          <Text style={[s.headerSub, { color: p.textSecondary }]}>
            History never disappears
          </Text>
        </View>
      </View>

      {/* 2. Recovery Momentum Hero Card */}
      <RecoveryHeroCard
        currentStreak={currentStreak}
        cleanDays={cleanDays}
        windowDays={30}
      />

      {/* 3. 3-Column Metrics Grid (Longest, Resisted, Blocked) */}
      <RecoveryMetricsGrid
        longest={longestStreak}
        resistedUrges={resistedUrges}
        blockedAttempts={blockedAttempts}
      />

      {/* 4. Last 30 Days Calendar Card */}
      <RecoveryCalendarCard
        recoveryStart={recoveryStart}
        cleanDays={cleanDays}
        relapseDays={relapseDays}
      />

      {/* 5. Recovery History Timeline */}
      <RecoveryTimeline
        currentStreak={currentStreak}
        longestStreak={longestStreak}
        recoveryStart={recoveryStart}
        relapseCount={relapseCount}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  titleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
});
