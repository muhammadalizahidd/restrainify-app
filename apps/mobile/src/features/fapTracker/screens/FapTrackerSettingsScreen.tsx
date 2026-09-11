import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface FapTrackerSettingsScreenProps {
  open: (route: string) => void;
  onBack: () => void;
}

/**
 * FapTrackerSettingsScreen implements SET-FAP-01: Fap Tracker Settings
 * from the Restrainify UI Architecture specification.
 *
 * It allows the user to:
 * 1. Independently enable or disable the optional Fap Tracker
 * 2. Clearly understand the complete uncoupling between the tracker and device protection
 * 3. Access the Fap Tracker hub (JOUR-04) and event logging directly
 *
 * Backend mapping:
 * - snapshot.settings.trackerEnabled -> OfflineRuntime.kt:36
 * - Toggle trackerEnabled -> command("setting", { key: "trackerEnabled", value }) (OfflineRuntime.kt:73-77)
 *   Enforces: if (!value) assertCanWeaken()
 * - snapshot.events -> filtered by kind === "tracker"
 */
export function FapTrackerSettingsScreen({
  open,
  onBack,
}: FapTrackerSettingsScreenProps) {
  const { snapshot: data, palette: p, command } = useOffline();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!data) return null;

  const trackerEnabled = data.settings.trackerEnabled;
  const isCooldownActive =
    data.burstRemainingMs > 0 || data.strictRemainingMs > 0;
  const trackerEventsCount = data.events.filter(
    (e) => e.kind === "tracker"
  ).length;

  const handleToggleTracker = async (value: boolean) => {
    setErrorMessage(null);
    if (!value && isCooldownActive) {
      Alert.alert(
        "Settings Locked",
        "The tracker cannot be disabled while an active Burst or Strict cooldown is running."
      );
      return;
    }
    try {
      const ok = await command("setting", {
        key: "trackerEnabled",
        value,
      });
      if (!ok) {
        setErrorMessage("Failed to update tracker setting.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      setErrorMessage(msg);
    }
  };

  return (
    <View style={s.container}>
      {/* 1. Header Bar */}
      <View style={s.headerBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={({ pressed }) => [s.backButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name="arrow-left" size={20} color={p.textPrimary} />
        </Pressable>
        <Text style={[s.headerTitle, { color: p.textPrimary }]}>
          Fap Tracker Settings
        </Text>
      </View>

      {/* Error banner if any */}
      {errorMessage && (
        <View
          style={[
            s.errorBanner,
            { backgroundColor: p.dangerSurface, borderColor: p.danger },
          ]}
        >
          <Icon name="alert-circle" size={16} color={p.danger} />
          <Text style={[s.errorText, { color: p.danger }]}>{errorMessage}</Text>
        </View>
      )}

      {/* 2. Main Tracker Toggle Card */}
      <View
        style={[
          s.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <View style={s.cardHead}>
          <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
            <Icon
              name="calendar-clock"
              size={20}
              color={trackerEnabled ? p.brandPrimary : p.textSecondary}
            />
          </View>
          <View style={s.cardHeadText}>
            <Text style={[s.cardTitle, { color: p.textPrimary }]}>
              Optional Fap Tracker
            </Text>
            <Text style={[s.cardSub, { color: p.textSecondary }]}>
              {trackerEnabled
                ? "Tracker is active and recording personal check-ins"
                : "Tracker is currently disabled"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={`Fap Tracker is ${trackerEnabled ? "enabled" : "disabled"}. Tap to toggle.`}
            accessibilityState={{ checked: trackerEnabled }}
            onPress={() => void handleToggleTracker(!trackerEnabled)}
            style={[
              s.toggleTrack,
              {
                backgroundColor: trackerEnabled ? p.brandPrimary : p.surfaceMuted,
              },
            ]}
          >
            <View
              style={[
                s.toggleThumb,
                trackerEnabled ? s.toggleThumbOn : s.toggleThumbOff,
                { backgroundColor: "#ffffff" },
              ]}
            />
          </Pressable>
        </View>

        {/* Protection Uncoupling Notice */}
        <View
          style={[
            s.noticeBox,
            { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
          ]}
        >
          <Icon name="information-outline" size={16} color={p.textSecondary} />
          <Text style={[s.noticeText, { color: p.textSecondary }]}>
            This tracker is completely optional and personal. Your website DNS
            filtering and app restrictions operate with full strength whether
            this tracker is enabled or disabled.
          </Text>
        </View>
      </View>

      {/* 3. Summary & Quick Action Card (if enabled) */}
      {trackerEnabled && (
        <>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
              Tracker Summary
            </Text>
          </View>
          <View
            style={[
              s.card,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <View style={s.row}>
              <View style={s.rowText}>
                <Text style={[s.rowLabel, { color: p.textSecondary }]}>
                  Recorded Check-Ins
                </Text>
                <Text style={[s.rowValue, { color: p.textPrimary }]}>
                  {trackerEventsCount}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Fap Tracker Hub"
                onPress={() => open("fap-tracker")}
                style={({ pressed }) => [
                  s.openBtn,
                  {
                    backgroundColor: p.brandPrimary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={s.openBtnText}>Open Tracker</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {/* 4. Privacy Guarantee */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Privacy & Storage
        </Text>
      </View>
      <View
        style={[
          s.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <View style={s.privacyRow}>
          <Icon name="shield-lock-outline" size={18} color={p.brandPrimary} />
          <Text style={[s.privacyText, { color: p.textSecondary }]}>
            All check-ins are stored in your encrypted local SQLCipher database
            on this phone. No personal logs or timestamps are ever sent to any
            remote server or analytics service.
          </Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cardHeadText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: "center",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  toggleThumbOff: {
    alignSelf: "flex-start",
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noticeText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowText: {
    gap: 2,
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rowValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  openBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  openBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  privacyText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
