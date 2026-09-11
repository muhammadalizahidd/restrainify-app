import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { PrimaryBurstToolCard } from "../components/PrimaryBurstToolCard";

export interface ToolsScreenProps {
  open: (route: string) => void;
}

/**
 * ToolsScreen implements TOOL-01: Tools Action Hub
 * from the Restrainify UI Architecture specification.
 *
 * It serves as the primary landing surface for the "Tools" bottom navigation tab,
 * providing:
 * - Immediate crisis intervention trigger via PrimaryBurstToolCard (BURST-01)
 * - Live Protection Health status (TOOL-02)
 * - On-demand native capability health refresh
 * - Direct shortcuts to Fap Tracker (JOUR-04) and Recovery Journal (JOUR-01)
 *
 * Backend mapping:
 * - snapshot.burstRemainingMs -> OfflineRuntime.kt:47, 201
 * - snapshot.capabilities -> OfflineRuntime.kt:186-187
 * - snapshot.settings.trackerEnabled -> OfflineRuntime.kt:36
 * - refresh() -> OfflineRuntime.kt:177 (snapshot re-evaluation)
 */
export function ToolsScreen({ open }: ToolsScreenProps) {
  const { snapshot: data, palette: p, refresh } = useOffline();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  if (!data) return null;

  const burstRemainingMs = data.burstRemainingMs;
  const caps = data.capabilities;
  const isHealthy =
    caps.vpn && caps.accessibility && caps.usage && !caps.vpnError;

  const trackerEnabled = data.settings.trackerEnabled;

  const handleRunHealthCheck = async () => {
    setIsRefreshing(true);
    setRefreshNotice("Checking capabilities...");
    try {
      await refresh();
      setRefreshNotice("All capabilities refreshed");
      setTimeout(() => setRefreshNotice(null), 2500);
    } catch {
      setRefreshNotice("Health check failed");
      setTimeout(() => setRefreshNotice(null), 2500);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <View style={s.container}>
      {/* 1. Page Header */}
      <View style={s.pageHead}>
        <Text style={[s.eyebrow, { color: p.textSecondary }]}>Action tools</Text>
        <Text style={[s.pageTitle, { color: p.textPrimary }]}>
          Protect the next choice.
        </Text>
        <Text style={[s.pageSub, { color: p.textSecondary }]}>
          Immediate interventions and protection repair — not a content library.
        </Text>
      </View>

      {/* 2. Primary Tool: Burst Action Hero Card */}
      <PrimaryBurstToolCard
        burstRemainingMs={burstRemainingMs}
        open={open}
      />

      {/* 3. Protection Section */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Protection</Text>
      </View>
      <View
        style={[
          s.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {/* Protection Health Drilldown Row */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Protection Health: ${isHealthy ? "100 percent" : "Needs attention"}. Tap to open protection health.`}
          onPress={() => open("protection-health")}
          style={({ pressed }) => [
            s.row,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
            <Icon
              name="shield-check"
              size={18}
              color={isHealthy ? p.success : p.warning}
            />
          </View>
          <View style={s.rowText}>
            <Text style={[s.rowTitle, { color: p.textPrimary }]}>
              Protection Health
            </Text>
            <Text style={[s.rowSub, { color: p.textSecondary }]}>
              All required capabilities in one repairable status view
            </Text>
          </View>
          <View
            style={[
              s.badge,
              { backgroundColor: isHealthy ? p.successSurface : p.surfaceMuted },
            ]}
          >
            <Text
              style={[
                s.badgeText,
                { color: isHealthy ? p.success : p.textSecondary },
              ]}
            >
              {isHealthy ? "100%" : "Attention"}
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color={p.textSecondary} />
        </Pressable>

        {/* Run Health Check Row */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Run a health check. Refresh current device capability states."
          onPress={() => void handleRunHealthCheck()}
          disabled={isRefreshing}
          style={({ pressed }) => [
            s.row,
            {
              borderTopWidth: 1,
              borderTopColor: p.borderSubtle,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
            <Icon name="refresh" size={18} color={p.brandPrimary} />
          </View>
          <View style={s.rowText}>
            <Text style={[s.rowTitle, { color: p.textPrimary }]}>
              Run a health check
            </Text>
            <Text style={[s.rowSub, { color: p.textSecondary }]}>
              {refreshNotice ?? "Refresh current device capability states"}
            </Text>
          </View>
          <Text style={[s.nowText, { color: p.brandPrimary }]}>
            {isRefreshing ? "Checking..." : "Now"}
          </Text>
        </Pressable>
      </View>

      {/* 4. Recovery Tools Section */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Recovery tools
        </Text>
      </View>
      <View
        style={[
          s.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {/* Fap Tracker Row */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Fap Tracker: ${trackerEnabled ? "Enabled" : "Disabled"}. Tap to open.`}
          onPress={() => open("fap-tracker")}
          style={({ pressed }) => [
            s.row,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
            <Icon name="calendar-outline" size={18} color={p.brandPrimary} />
          </View>
          <View style={s.rowText}>
            <Text style={[s.rowTitle, { color: p.textPrimary }]}>
              Fap Tracker
            </Text>
            <Text style={[s.rowSub, { color: p.textSecondary }]}>
              {trackerEnabled
                ? "Optional tracker is currently enabled"
                : "Optional tracker is disabled"}
            </Text>
          </View>
          <Text style={[s.nowText, { color: p.textSecondary }]}>
            {trackerEnabled ? "Enabled" : "Disabled"}
          </Text>
          <Icon name="chevron-right" size={16} color={p.textSecondary} />
        </Pressable>

        {/* Recovery Journal Row */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recovery Journal. Log urges and relapse events. Tap to open."
          onPress={() => open("journal")}
          style={({ pressed }) => [
            s.row,
            {
              borderTopWidth: 1,
              borderTopColor: p.borderSubtle,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
            <Icon name="notebook-outline" size={18} color={p.brandPrimary} />
          </View>
          <View style={s.rowText}>
            <Text style={[s.rowTitle, { color: p.textPrimary }]}>
              Recovery Journal
            </Text>
            <Text style={[s.rowSub, { color: p.textSecondary }]}>
              Log urges and relapse events
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color={p.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 4,
  },
  pageHead: {
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
  },
  pageSub: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  rowSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  nowText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
