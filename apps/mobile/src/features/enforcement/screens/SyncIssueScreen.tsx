import { useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface SyncIssueScreenProps {
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * SyncIssueScreen implements STATE-07: Offline / Sync Issue
 * from the Restrainify UI Architecture specification.
 *
 * Demonstrates non-blocking local-first synchronization failure resilience.
 * Connectivity interruptions never halt local on-device filtering or tracking.
 *
 * Backend mapping:
 * - Local encrypted SQLCipher storage remains authoritative (`OfflineRuntime.kt`)
 * - Sync retry attempts reconnection without discarding queued local mutations.
 */
export function SyncIssueScreen({
  onBack,
}: SyncIssueScreenProps) {
  const { snapshot: data, palette: p, refresh, reconciling } = useOffline();
  const [retrying, setRetrying] = useState(false);

  const pendingEventCount = data?.events ? Math.min(data.events.length, 2) : 2;

  const handleRetrySync = async () => {
    setRetrying(true);
    try {
      await refresh();
      Alert.alert(
        "Sync Retried",
        "Local queue was re-evaluated. If offline, changes will synchronize automatically when connection returns.",
        [{ text: "OK" }]
      );
    } catch {
      Alert.alert(
        "Still Offline",
        "Device is offline. All records remain safely stored in local encrypted storage.",
        [{ text: "OK" }]
      );
    } finally {
      setRetrying(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContainer,
        { backgroundColor: p.backgroundPrimary },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header */}
      <View style={styles.headerRow}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[
              styles.backButton,
              {
                backgroundColor: p.surfacePrimary,
                borderColor: p.borderSubtle,
              },
            ]}
          >
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={styles.titleWrap}>
          <Text style={[styles.headerKicker, { color: p.textSecondary }]}>
            NON-BLOCKING SYNC FAILURE
          </Text>
          <Text
            accessibilityRole="header"
            style={[styles.headerTitle, { color: p.textPrimary }]}
          >
            Cloud Sync
          </Text>
        </View>
      </View>

      {/* 2. Warning Notice */}
      <View
        style={[
          styles.noticeCard,
          {
            backgroundColor: p.warningSurface,
            borderColor: p.borderSubtle,
          },
        ]}
      >
        <View style={styles.noticeIconWrap}>
          <Icon name="cloud-off-outline" size={22} color={p.warning} />
        </View>
        <View style={styles.noticeTextWrap}>
          <Text style={[styles.noticeTitle, { color: p.warning }]}>
            Offline · changes saved locally
          </Text>
          <Text style={[styles.noticeBody, { color: p.textSecondary }]}>
            Core protection and local tracking continue. Eligible changes will
            retry when connectivity returns.
          </Text>
        </View>
      </View>

      {/* 3. Section: Pending */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
          Pending
        </Text>
      </View>

      {/* 4. Pending Queue Row List */}
      <View
        style={[
          styles.rowList,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
          },
        ]}
      >
        {/* Row 1: Recovery Events */}
        <View style={[styles.row, { borderBottomColor: p.borderSubtle }]}>
          <View
            style={[styles.rowIconWrap, { backgroundColor: p.surfaceMuted }]}
          >
            <Icon name="history" size={18} color={p.brandPrimary} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: p.textPrimary }]}>
              {pendingEventCount} recovery events
            </Text>
            <Text style={[styles.rowSubtitle, { color: p.textSecondary }]}>
              Waiting to synchronize
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: p.surfaceMuted }]}>
            <Text style={[styles.statusPillText, { color: p.textSecondary }]}>
              Pending
            </Text>
          </View>
        </View>

        {/* Row 2: Settings Changes */}
        <View style={styles.row}>
          <View
            style={[styles.rowIconWrap, { backgroundColor: p.surfaceMuted }]}
          >
            <Icon name="cog-outline" size={18} color={p.brandPrimary} />
          </View>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowTitle, { color: p.textPrimary }]}>
              1 settings change
            </Text>
            <Text style={[styles.rowSubtitle, { color: p.textSecondary }]}>
              Waiting to synchronize
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: p.surfaceMuted }]}>
            <Text style={[styles.statusPillText, { color: p.textSecondary }]}>
              Pending
            </Text>
          </View>
        </View>
      </View>

      {/* 5. Retry Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retry sync"
        onPress={handleRetrySync}
        disabled={retrying || reconciling}
        style={({ pressed }) => [
          styles.retryBtn,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
          },
          pressed && styles.btnPressed,
        ]}
      >
        {retrying ? (
          <ActivityIndicator size="small" color={p.brandPrimary} />
        ) : (
          <Text style={[styles.retryBtnText, { color: p.textPrimary }]}>
            Retry sync
          </Text>
        )}
      </Pressable>

      {/* 6. Helper Callout */}
      <Text style={[styles.helperNote, { color: p.textSecondary }]}>
        If a change is rejected or conflicts, Restrainify keeps enough local
        state to expose a repair path rather than silently discarding it.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
  },
  headerKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginTop: 2,
  },
  noticeCard: {
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 22,
  },
  noticeIconWrap: {
    marginTop: 2,
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  noticeBody: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  sectionHeader: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  rowList: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  rowSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  retryBtn: {
    width: "100%",
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  btnPressed: {
    opacity: 0.8,
  },
  helperNote: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    paddingHorizontal: 12,
  },
});
