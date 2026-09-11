import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface RecoverySettingsScreenProps {
  open: (route: string) => void;
  onBack: () => void;
}

/**
 * RecoverySettingsScreen implements SET-REC-01: Recovery Settings
 * from the Restrainify UI Architecture specification.
 *
 * It allows the user to:
 * 1. Toggle Recovery tracking on/off
 * 2. View and edit the Recovery Baseline start date (locked if relapses have been recorded)
 * 3. Understand that recovery tracking is uncoupled from device protection
 *
 * Backend mapping:
 * - snapshot.settings.recoveryEnabled -> OfflineRuntime.kt:36
 * - Toggle recoveryEnabled -> command("setting", { key: "recoveryEnabled", value }) (OfflineRuntime.kt:73-77)
 * - snapshot.settings.recoveryStart -> OfflineRuntime.kt:38
 * - Update baseline -> command("setting", { key: "recoveryStart", value }) (OfflineRuntime.kt:80-84)
 *   CRITICAL INVARIANT: require(dao.eventsOfKind("relapse").isEmpty())
 *   If any relapse event exists, updating the baseline throws an exception in Kotlin.
 *   The UI enforces this by locking the baseline date editor and showing a badge.
 */
export function RecoverySettingsScreen({
  open,
  onBack,
}: RecoverySettingsScreenProps) {
  const { snapshot: data, palette: p, command } = useOffline();
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [dateInput, setDateInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!data) return null;

  const recoveryEnabled = data.settings.recoveryEnabled;
  const recoveryStart = data.settings.recoveryStart;
  const hasRelapse = data.events.some((e) => e.kind === "relapse");
  const isCooldownActive =
    data.burstRemainingMs > 0 || data.strictRemainingMs > 0;

  const handleToggleRecovery = async (value: boolean) => {
    setErrorMessage(null);
    if (!value && isCooldownActive) {
      Alert.alert(
        "Settings Locked",
        "Recovery tracking cannot be disabled while an active Burst or Strict cooldown is running."
      );
      return;
    }
    try {
      const ok = await command("setting", {
        key: "recoveryEnabled",
        value,
      });
      if (!ok) {
        setErrorMessage("Failed to update recovery setting.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      setErrorMessage(msg);
    }
  };

  const handleSaveDate = async () => {
    setErrorMessage(null);
    const trimmed = dateInput.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      setErrorMessage("Please enter date as YYYY-MM-DD (e.g. 2026-01-15).");
      return;
    }

    const parsed = new Date(`${trimmed}T00:00:00Z`);
    if (isNaN(parsed.getTime())) {
      setErrorMessage("Invalid date.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0]!;
    if (trimmed > todayStr) {
      setErrorMessage("Start date cannot be in the future.");
      return;
    }

    try {
      const ok = await command("setting", {
        key: "recoveryStart",
        value: trimmed,
      });
      if (ok) {
        setIsEditingDate(false);
        setDateInput("");
      } else {
        setErrorMessage("Failed to update baseline date.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save baseline";
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
          Recovery Settings
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

      {/* 2. Recovery Tracking Primary Card */}
      <View
        style={[
          s.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <View style={s.cardHead}>
          <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
            <Icon
              name="chart-timeline-variant"
              size={20}
              color={recoveryEnabled ? p.brandPrimary : p.textSecondary}
            />
          </View>
          <View style={s.cardHeadText}>
            <Text style={[s.cardTitle, { color: p.textPrimary }]}>
              Recovery Tracking
            </Text>
            <Text style={[s.cardSub, { color: p.textSecondary }]}>
              Calculates clean streak days and maintains recovery journal logs
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={`Recovery tracking is ${recoveryEnabled ? "enabled" : "disabled"}. Tap to toggle.`}
            accessibilityState={{ checked: recoveryEnabled }}
            onPress={() => void handleToggleRecovery(!recoveryEnabled)}
            style={[
              s.toggleTrack,
              {
                backgroundColor: recoveryEnabled ? p.brandPrimary : p.surfaceMuted,
              },
            ]}
          >
            <View
              style={[
                s.toggleThumb,
                recoveryEnabled ? s.toggleThumbOn : s.toggleThumbOff,
                { backgroundColor: "#ffffff" },
              ]}
            />
          </Pressable>
        </View>

        <View
          style={[
            s.noticeBox,
            { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
          ]}
        >
          <Icon name="information-outline" size={16} color={p.textSecondary} />
          <Text style={[s.noticeText, { color: p.textSecondary }]}>
            Recovery tracking operates independently of website and app
            restrictions. Turning this off does not weaken your active DNS or
            app protection.
          </Text>
        </View>
      </View>

      {/* 3. Recovery Baseline Card */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Recovery Baseline
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
              Streak Start Date
            </Text>
            <Text style={[s.rowValue, { color: p.textPrimary }]}>
              {recoveryStart}
            </Text>
          </View>
          {hasRelapse ? (
            <View
              style={[s.lockedBadge, { backgroundColor: p.surfaceMuted }]}
            >
              <Icon name="lock" size={13} color={p.textSecondary} />
              <Text style={[s.lockedBadgeText, { color: p.textSecondary }]}>
                Locked
              </Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit recovery baseline date"
              onPress={() => {
                setDateInput(recoveryStart);
                setIsEditingDate(!isEditingDate);
              }}
              style={({ pressed }) => [
                s.actionBtn,
                {
                  backgroundColor: p.surfaceMuted,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[s.actionBtnText, { color: p.brandPrimary }]}>
                {isEditingDate ? "Cancel" : "Change"}
              </Text>
            </Pressable>
          )}
        </View>

        {hasRelapse ? (
          <View
            style={[
              s.lockNotice,
              { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
            ]}
          >
            <Icon name="shield-lock-outline" size={16} color={p.textSecondary} />
            <Text style={[s.lockNoticeText, { color: p.textSecondary }]}>
              A relapse has been recorded in your journal. To preserve the
              integrity of your recovery milestones, the baseline date is
              locked. Current streak is calculated from your last relapse.
            </Text>
          </View>
        ) : isEditingDate ? (
          <View style={s.editBox}>
            <Text style={[s.inputHelp, { color: p.textSecondary }]}>
              Enter date as YYYY-MM-DD (e.g. 2026-01-01)
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save new baseline date"
              onPress={() => void handleSaveDate()}
              style={({ pressed }) => [
                s.saveBtn,
                {
                  backgroundColor: p.brandPrimary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={s.saveBtnText}>Save Baseline</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={[s.baselineHelp, { color: p.textSecondary }]}>
            Your streak counts consecutive clean days from this date onward.
          </Text>
        )}
      </View>

      {/* 4. Quick Link to Progress & Journal */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Related Views
        </Text>
      </View>
      <View
        style={[
          s.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Progress Overview"
          onPress={() => open("progress")}
          style={({ pressed }) => [
            s.linkRow,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Icon name="chart-bar" size={18} color={p.brandPrimary} />
          <Text style={[s.linkRowText, { color: p.textPrimary }]}>
            View Progress & Milestones
          </Text>
          <Icon name="chevron-right" size={16} color={p.textSecondary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Recovery Journal"
          onPress={() => open("journal")}
          style={({ pressed }) => [
            s.linkRow,
            {
              borderTopWidth: 1,
              borderTopColor: p.borderSubtle,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Icon name="notebook-outline" size={18} color={p.brandPrimary} />
          <Text style={[s.linkRowText, { color: p.textPrimary }]}>
            View Recovery Journal
          </Text>
          <Icon name="chevron-right" size={16} color={p.textSecondary} />
        </Pressable>
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
    fontSize: 16,
    fontWeight: "700",
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lockedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  lockNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  lockNoticeText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  baselineHelp: {
    fontSize: 11,
    lineHeight: 16,
  },
  editBox: {
    gap: 8,
  },
  inputHelp: {
    fontSize: 11,
  },
  saveBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  linkRowText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
});
