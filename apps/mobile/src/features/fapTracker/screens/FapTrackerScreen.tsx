import { Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Button, Icon } from "../../../components/OfflineUI";
import { FapTrackerMetricsGrid } from "../components/FapTrackerMetricsGrid";
import { FapTrackerTimeline } from "../components/FapTrackerTimeline";
import {
  computeTrackerMetrics,
  filterTrackerEvents,
} from "../utils/fapTrackerUtils";

export interface FapTrackerScreenProps {
  open: (route: string) => void;
  onBack?: () => void;
}

/**
 * FapTrackerScreen implements JOUR-04: Fap Tracker Hub
 * from the Restrainify UI Architecture specification.
 *
 * Provides private, user-controlled event tracking uncoupled from protection filters.
 */
export function FapTrackerScreen({ open, onBack }: FapTrackerScreenProps) {
  const { snapshot: data, palette: p, command } = useOffline();

  if (!data) return null;

  const isEnabled = data.settings.trackerEnabled;
  const trackerEvents = filterTrackerEvents(data.events);
  const metrics = computeTrackerMetrics(data.events, new Date());

  const handleEnableTracker = async () => {
    await command("setting", { key: "trackerEnabled", value: true });
  };

  return (
    <View style={s.container}>
      {/* 1. Subscreen Header */}
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
            Fap Tracker
          </Text>
          <Text style={[s.headerSub, { color: p.textSecondary }]}>
            Optional · user-controlled
          </Text>
        </View>
      </View>

      {!isEnabled ? (
        /* Disabled State */
        <View style={s.disabledWrap}>
          <View
            style={[
              s.noticeCard,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <View style={[s.noticeIconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="notebook-outline" size={20} color={p.brandPrimary} />
            </View>
            <Text style={[s.noticeTitle, { color: p.textPrimary }]}>
              Fap Tracker is disabled
            </Text>
            <Text style={[s.noticeSub, { color: p.textSecondary }]}>
              This tracker is completely optional and uncoupled from your protection filters. Enable it anytime to log events privately on this device.
            </Text>
            <View style={{ width: "100%", marginTop: 12 }}>
              <Button
                title="Enable Fap Tracker"
                icon="check"
                onPress={() => void handleEnableTracker()}
              />
            </View>
          </View>
        </View>
      ) : (
        /* Enabled State */
        <>
          {/* 2. 3-Column Metrics Grid */}
          <FapTrackerMetricsGrid
            today={metrics.today}
            thisWeek={metrics.thisWeek}
            thisMonth={metrics.thisMonth}
          />

          {/* 3. Action Button: + Log tracker event */}
          <Button
            title="+ Log tracker event"
            icon="plus"
            onPress={() => open("log-fap")}
          />

          {/* 4. Chronological Event History */}
          <FapTrackerTimeline events={trackerEvents} />

          {/* 5. Protection Independence Notice */}
          <View
            style={[
              s.noticeCardSmall,
              { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
            ]}
          >
            <Icon name="shield-check" size={18} color={p.brandPrimary} />
            <View style={s.noticeSmallText}>
              <Text style={[s.noticeSmallTitle, { color: p.textPrimary }]}>
                Protection is separate
              </Text>
              <Text style={[s.noticeSmallSub, { color: p.textSecondary }]}>
                Tracker events do not automatically weaken or strengthen website/app protection.
              </Text>
            </View>
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
  disabledWrap: {
    marginTop: 10,
  },
  noticeCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  noticeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  noticeSub: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 280,
  },
  noticeCardSmall: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 16,
  },
  noticeSmallText: {
    flex: 1,
  },
  noticeSmallTitle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  noticeSmallSub: {
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 2,
  },
});
