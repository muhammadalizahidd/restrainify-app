import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { ProgressPulseHeroCard } from "../components/ProgressPulseHeroCard";
import { ProgressMetricDrilldown } from "../components/ProgressMetricDrilldown";
import { ProgressImpactCard } from "../components/ProgressImpactCard";
import { ProgressAttentionCard } from "../components/ProgressAttentionCard";
import { computeReclaimedHours } from "../utils/attentionReclaimed";

export interface ProgressOverviewScreenProps {
  open: (route: string) => void;
}

/**
 * ProgressOverviewScreen implements PROG-01: Progress Overview
 * from the Restrainify UI Architecture specification.
 *
 * It serves as the primary landing surface for the "Progress" bottom navigation tab,
 * integrating recovery pulse statistics, quick drill-down navigations,
 * protection impact counters, and weekly attention trend analytics.
 */
export function ProgressOverviewScreen({ open }: ProgressOverviewScreenProps) {
  const { snapshot: data, palette: p } = useOffline();

  if (!data) return null;

  // Backend recovery data
  const currentStreak = data.recovery.current;
  const longestStreak = data.recovery.longest;
  const cleanDays = data.recovery.cleanDays;

  // Resisted urges count from local events
  const resistedUrges = data.events.filter(
    (e) => (e.kind === "urge" || e.kind === "burst") && e.resisted
  ).length;

  // Burst interventions count
  const burstCount = data.events.filter((e) => e.kind === "burst").length;

  // Today & weekly usage data
  const todayMs = data.usage.todayMs;
  const weekUsage = data.usage.week;

  // Attention reclaimed compared to baseline
  const reclaimedHours = computeReclaimedHours(
    weekUsage,
    undefined,
    data.capabilities.usage
  );

  // Protection impact: blocked sites today
  const blockedSitesCount = data.blockedToday;

  return (
    <View style={s.container}>
      {/* 1. Page Header */}
      <View style={s.pageHead}>
        <Text style={[s.pageTitle, { color: p.textPrimary }]}>
          Your progress.
        </Text>
      </View>

      {/* 2. Recovery Pulse Hero Card */}
      <ProgressPulseHeroCard
        cleanDays={cleanDays}
        currentStreak={currentStreak}
        longestStreak={longestStreak}
        resistedUrges={resistedUrges}
        windowDays={30}
      />

      {/* 3. 2-Column Quick Metric Drilldown Tiles */}
      <ProgressMetricDrilldown
        cleanDays={cleanDays}
        windowDays={30}
        reclaimedHours={reclaimedHours}
        open={open}
      />

      {/* 4. Protection Impact Compact Boxes */}
      <ProgressImpactCard
        blockedSitesCount={blockedSitesCount}
        burstCount={burstCount}
      />

      {/* 5. 7-Day Attention Trend Bar Chart Card */}
      <ProgressAttentionCard todayMs={todayMs} weekUsage={weekUsage} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 2,
  },
  pageHead: {
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
  },
});
