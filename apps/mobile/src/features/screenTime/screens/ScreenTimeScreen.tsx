import { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, Button } from "../../../components/OfflineUI";
import { offlineProtection } from "../../../native/OfflineProtection";
import { ScreenTimeHeroCard } from "../components/ScreenTimeHeroCard";
import { ScreenTimeBarChart } from "../components/ScreenTimeBarChart";
import { AppUsageList } from "../components/AppUsageList";

export interface ScreenTimeScreenProps {
  open: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * ScreenTimeScreen implements PROG-03: Screen Time Breakdown Screen
 * from the Restrainify UI Architecture specification.
 *
 * It provides daily and weekly digital attention budgeting,
 * 7-day usage trending, and per-app usage accounting with allowance comparisons.
 */
export function ScreenTimeScreen({ open, onBack }: ScreenTimeScreenProps) {
  const { snapshot: data, palette: p, run } = useOffline();
  const [timeframe, setTimeframe] = useState<"day" | "week">("day");

  if (!data) return null;

  const hasUsage = data.capabilities.usage;

  // Compute metrics based on active timeframe
  const weekTotalMs = data.usage.week.reduce((acc, curr) => acc + curr.ms, 0);
  const activeUsageMs = timeframe === "day" ? data.usage.todayMs : weekTotalMs;

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
          <Text style={[s.headerTitle, { color: p.textPrimary }]}>
            Screen time
          </Text>
          <Text style={[s.headerSub, { color: p.textSecondary }]}>
            Daily & weekly attention
          </Text>
        </View>
      </View>

      {/* 2. Segmented Timeframe Toggle (Day vs Week) */}
      <View style={[s.segmented, { backgroundColor: p.surfaceMuted }]}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: timeframe === "day" }}
          onPress={() => setTimeframe("day")}
          style={[
            s.segmentBtn,
            timeframe === "day" && [
              s.segmentBtnActive,
              { backgroundColor: p.surfacePrimary },
            ],
          ]}
        >
          <Text
            style={[
              s.segmentText,
              {
                color: timeframe === "day" ? p.textPrimary : p.textSecondary,
                fontWeight: timeframe === "day" ? "700" : "500",
              },
            ]}
          >
            Day
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: timeframe === "week" }}
          onPress={() => setTimeframe("week")}
          style={[
            s.segmentBtn,
            timeframe === "week" && [
              s.segmentBtnActive,
              { backgroundColor: p.surfacePrimary },
            ],
          ]}
        >
          <Text
            style={[
              s.segmentText,
              {
                color: timeframe === "week" ? p.textPrimary : p.textSecondary,
                fontWeight: timeframe === "week" ? "700" : "500",
              },
            ]}
          >
            Week
          </Text>
        </Pressable>
      </View>

      {/* 3. Truthful Permission Handling */}
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
            Restrainify reads Android UsageStats to measure attention and enforce
            the limits you choose. Without this permission, screen time cannot be
            truthfully reported.
          </Text>
          <Button
            title="Enable in Android Settings"
            onPress={() => void run(() => offlineProtection.settings("usage"))}
          />
        </View>
      ) : (
        <>
          {/* 4. Attention Goal Hero Card */}
          <ScreenTimeHeroCard
            timeframe={timeframe}
            usageMs={activeUsageMs}
          />

          {/* 5. 7-Day Usage Trend Bar Chart */}
          <ScreenTimeBarChart
            weekUsage={data.usage.week}
            todayUsageMs={data.usage.todayMs}
          />

          {/* 6. Per-App Usage Breakdown List */}
          <AppUsageList
            apps={data.usage.apps}
            rules={data.settings.rules}
            timeframe={timeframe}
            onSelectApp={() => open("apps")}
          />

          {/* 7. Reassurance Mindset Card */}
          <View
            style={[
              s.mindsetCard,
              { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
            ]}
          >
            <Text style={[s.mindsetText, { color: p.textSecondary }]}>
              Restrainify measures attention to help you build calm daily
              boundaries. Time spent in essential tools is not treated as a personal
              setback.
            </Text>
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
  segmented: {
    flexDirection: "row",
    borderRadius: 13,
    padding: 3,
    marginTop: 6,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  segmentBtnActive: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 11,
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
  mindsetCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    marginTop: 8,
    marginBottom: 12,
  },
  mindsetText: {
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "500",
  },
});
