import { StyleSheet, Text, View, Pressable } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, Button } from "../../../components/OfflineUI";
import { offlineProtection } from "../../../native/OfflineProtection";
import { AppDetailHeroCard } from "../components/AppDetailHeroCard";
import { AppDetailMetricsGrid } from "../components/AppDetailMetricsGrid";
import { AppDetailUsageChart } from "../components/AppDetailUsageChart";
import {
  computeAppLimitStatus,
  computeAppSessionStats,
  computeAppWeeklyTrend,
} from "../utils/appUsageStats";

export interface AppUsageDetailScreenProps {
  packageName: string;
  open: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * AppUsageDetailScreen implements PROG-04: App Usage Detail Screen
 * from the Restrainify UI Architecture specification.
 *
 * It provides isolated per-app foreground accounting, daily allowance tracking,
 * session engagement statistics, and 7-day usage trends with direct limit management.
 */
export function AppUsageDetailScreen({
  packageName,
  open,
  onBack,
}: AppUsageDetailScreenProps) {
  const { snapshot: data, palette: p, run } = useOffline();

  if (!data) return null;

  const hasUsage = data.capabilities.usage;

  // Resolve matching app data and rule
  const matchedApp = data.usage.apps.find((a) => a.packageName === packageName);
  const appLabel = matchedApp?.label ?? packageName.split(".").pop() ?? "App";
  const appMs = matchedApp?.ms ?? 0;

  const matchedRule = data.settings.rules.find(
    (r) => r.packageName === packageName && r.enabled
  );

  // Compute stats
  const limitStatus = computeAppLimitStatus(appMs, matchedRule);
  const sessionStats = computeAppSessionStats(appMs, data.usage.week);
  const weeklyBars = computeAppWeeklyTrend(appMs, data.usage.week);

  return (
    <View style={s.container}>
      {/* 1. Header with Back Navigation */}
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
          <Text style={[s.headerKicker, { color: p.textSecondary }]}>
            Usage detail
          </Text>
          <Text numberOfLines={1} style={[s.headerTitle, { color: p.textPrimary }]}>
            {appLabel}
          </Text>
        </View>
      </View>

      {/* 2. Truthful Permission Handling */}
      {!hasUsage ? (
        <View
          style={[
            s.permissionCard,
            { backgroundColor: p.surfacePrimary, borderColor: p.warning },
          ]}
        >
          <View style={s.permissionHeader}>
            <Icon name="shield-alert-outline" size={22} color={p.warning} />
            <Text style={[s.permissionTitle, { color: p.textPrimary }]}>
              Usage Access Required
            </Text>
          </View>
          <Text style={[s.permissionBody, { color: p.textSecondary }]}>
            Restrainify reads Android UsageStats to measure foreground time for{" "}
            {appLabel} and enforce your daily allowances.
          </Text>
          <Button
            title="Enable in Android Settings"
            onPress={() => void run(() => offlineProtection.settings("usage"))}
          />
        </View>
      ) : (
        <>
          {/* 3. Hero Card with Progress Track */}
          <AppDetailHeroCard usageMs={appMs} limitStatus={limitStatus} />

          {/* 4. 3-Column Metrics Grid (Sessions, Longest, Average) */}
          <AppDetailMetricsGrid stats={sessionStats} />

          {/* 5. 7-Day Usage Bar Chart */}
          <AppDetailUsageChart bars={weeklyBars} />

          {/* 6. Action Button: Manage App Limit */}
          <View style={s.actionWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Manage ${appLabel} limit`}
              onPress={() => open("apps", { packageName })}
              style={({ pressed }) => [
                s.secondaryButton,
                {
                  backgroundColor: p.surfacePrimary,
                  borderColor: p.borderSubtle,
                },
                pressed && { backgroundColor: p.surfaceMuted },
              ]}
            >
              <Text style={[s.secondaryButtonText, { color: p.brandPrimary }]}>
                Manage {appLabel} limit →
              </Text>
            </Pressable>
          </View>
        </>
      )}
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
    marginBottom: 8,
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
  headerKicker: {
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginTop: 2,
  },
  permissionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginTop: 14,
    gap: 12,
  },
  permissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  permissionTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  permissionBody: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  actionWrap: {
    marginTop: 16,
    marginBottom: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});
