import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface BurstSettingsScreenProps {
  open: (route: string) => void;
  onBack: () => void;
}

const DURATION_PRESETS = [15, 30, 45, 60];

/**
 * BurstSettingsScreen implements SET-BURST-01: Burst Settings
 * from the Restrainify UI Architecture specification.
 *
 * It allows the user to configure:
 * 1. Default Burst intervention duration (15m, 30m, 45m, 60m)
 * 2. Paused Apps review (navigates to AppsScreen to toggle which apps are paused during Burst)
 * 3. Cooldown protection invariant (changes cannot be weakened during active cooldown)
 *
 * Backend mapping:
 * - snapshot.settings.burstMinutes -> OfflineRuntime.kt:37
 * - Update duration -> command("setting", { key: "burstMinutes", value }) (OfflineRuntime.kt:78)
 *   Enforces: assertCanWeaken(), value in 1..1440
 * - snapshot.settings.rules -> OfflineRuntime.kt:38, 115-118
 *   Counts rules where rule.enabled && rule.burst
 * - snapshot.burstRemainingMs / strictRemainingMs -> OfflineRuntime.kt:47-48
 */
export function BurstSettingsScreen({
  open,
  onBack,
}: BurstSettingsScreenProps) {
  const { snapshot: data, palette: p, command } = useOffline();
  const [customInput, setCustomInput] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!data) return null;

  const currentMinutes = data.settings.burstMinutes || 15;
  const burstAppsCount = data.settings.rules.filter(
    (r) => r.enabled && r.burst
  ).length;
  const isCooldownActive =
    data.burstRemainingMs > 0 || data.strictRemainingMs > 0;

  const handleSelectDuration = async (minutes: number) => {
    setErrorMessage(null);
    if (isCooldownActive) {
      Alert.alert(
        "Cooldown Active",
        "Burst duration cannot be modified while an active cooldown is running."
      );
      return;
    }
    if (minutes < 1 || minutes > 1440) {
      setErrorMessage("Duration must be between 1 and 1440 minutes.");
      return;
    }

    try {
      const ok = await command("setting", {
        key: "burstMinutes",
        value: minutes,
      });
      if (!ok) {
        setErrorMessage("Failed to update Burst duration.");
      } else {
        setIsCustomMode(false);
        setCustomInput("");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update duration";
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
          Burst Settings
        </Text>
      </View>

      {/* Cooldown Warning if active */}
      {isCooldownActive && (
        <View
          style={[
            s.warningBanner,
            { backgroundColor: p.warningSurface, borderColor: p.warning },
          ]}
        >
          <Icon name="shield-lock-outline" size={16} color={p.warning} />
          <Text style={[s.warningText, { color: p.warning }]}>
            An active cooldown is running. Protection settings are locked
            against weakening until the timer expires.
          </Text>
        </View>
      )}

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

      {/* 2. Burst Duration Selector Card */}
      <View
        style={[
          s.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <View style={s.cardHead}>
          <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
            <Icon name="timer-outline" size={20} color={p.brandPrimary} />
          </View>
          <View style={s.cardHeadText}>
            <Text style={[s.cardTitle, { color: p.textPrimary }]}>
              Intervention Duration
            </Text>
            <Text style={[s.cardSub, { color: p.textSecondary }]}>
              How long high-risk surfaces remain locked when Burst is activated
            </Text>
          </View>
        </View>

        {/* Duration Pills */}
        <View style={s.presetGrid}>
          {DURATION_PRESETS.map((dur) => {
            const isSelected = currentMinutes === dur;
            return (
              <Pressable
                key={dur}
                accessibilityRole="button"
                accessibilityLabel={`${dur} minutes duration`}
                disabled={isCooldownActive}
                onPress={() => void handleSelectDuration(dur)}
                style={({ pressed }) => [
                  s.presetPill,
                  {
                    backgroundColor: isSelected
                      ? p.brandPrimary
                      : p.surfaceMuted,
                    borderColor: isSelected
                      ? p.brandPrimary
                      : p.borderSubtle,
                    opacity: isCooldownActive ? 0.5 : pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    s.presetText,
                    {
                      color: isSelected ? "#ffffff" : p.textPrimary,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {dur}m
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Custom duration toggle */}
        {isCustomMode ? (
          <View style={s.customBox}>
            <Text style={[s.inputLabel, { color: p.textSecondary }]}>
              Custom Duration (1 to 1440 minutes):
            </Text>
            <View style={s.customRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save custom duration"
                onPress={() => {
                  const val = Number(customInput.trim());
                  if (isNaN(val) || val < 1 || val > 1440) {
                    setErrorMessage("Enter a number between 1 and 1440.");
                    return;
                  }
                  void handleSelectDuration(val);
                }}
                style={({ pressed }) => [
                  s.saveBtn,
                  {
                    backgroundColor: p.brandPrimary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={s.saveBtnText}>Apply Custom</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel custom duration"
                onPress={() => {
                  setIsCustomMode(false);
                  setCustomInput("");
                }}
                style={({ pressed }) => [
                  s.cancelBtn,
                  {
                    backgroundColor: p.surfaceMuted,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[s.cancelBtnText, { color: p.textPrimary }]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Set custom duration"
            disabled={isCooldownActive}
            onPress={() => setIsCustomMode(true)}
            style={({ pressed }) => [
              s.customLink,
              { opacity: isCooldownActive ? 0.4 : pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[s.customLinkText, { color: p.brandPrimary }]}>
              {DURATION_PRESETS.includes(currentMinutes)
                ? "Or specify a custom duration"
                : `Current custom: ${currentMinutes} min (change)`}
            </Text>
          </Pressable>
        )}
      </View>

      {/* 3. Paused Apps Selection Card */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Surfaces Paused During Burst
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
          accessibilityLabel={`Burst Apps: ${burstAppsCount} selected. Tap to manage.`}
          onPress={() => open("apps")}
          style={({ pressed }) => [
            s.drilldownRow,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
            <Icon name="cellphone-lock" size={20} color={p.brandPrimary} />
          </View>
          <View style={s.cardHeadText}>
            <Text style={[s.cardTitle, { color: p.textPrimary }]}>
              Apps & Feeds Paused
            </Text>
            <Text style={[s.cardSub, { color: p.textSecondary }]}>
              {burstAppsCount > 0
                ? `${burstAppsCount} apps will be locked down during Burst`
                : "No apps configured yet. Tap to configure."}
            </Text>
          </View>
          <View
            style={[
              s.badge,
              {
                backgroundColor:
                  burstAppsCount > 0 ? p.brandPrimary : p.surfaceMuted,
              },
            ]}
          >
            <Text
              style={[
                s.badgeText,
                { color: burstAppsCount > 0 ? "#ffffff" : p.textSecondary },
              ]}
            >
              {burstAppsCount}
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color={p.textSecondary} />
        </Pressable>

        <View
          style={[
            s.noticeBox,
            { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
          ]}
        >
          <Icon name="information-outline" size={16} color={p.textSecondary} />
          <Text style={[s.noticeText, { color: p.textSecondary }]}>
            Burst pauses only the apps and feeds you explicitly designate. It
            does not touch communication tools, phone, or essential utilities.
          </Text>
        </View>
      </View>

      {/* 4. Active Burst Cooldown Card (if active) */}
      {data.burstRemainingMs > 0 && (
        <View
          style={[
            s.card,
            { backgroundColor: p.dangerSurface, borderColor: p.danger },
          ]}
        >
          <View style={s.activeRow}>
            <Icon name="lightning-bolt" size={20} color={p.danger} />
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, { color: p.danger }]}>
                Burst is Active
              </Text>
              <Text style={[s.cardSub, { color: p.danger }]}>
                {Math.ceil(data.burstRemainingMs / 60000)} minutes remaining in
                cooldown.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View active Burst session"
              onPress={() => open("burst")}
              style={[s.viewBurstBtn, { backgroundColor: p.danger }]}
            >
              <Text style={s.viewBurstBtnText}>View</Text>
            </Pressable>
          </View>
        </View>
      )}
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
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
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
  presetGrid: {
    flexDirection: "row",
    gap: 8,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  presetText: {
    fontSize: 14,
  },
  customBox: {
    gap: 8,
    paddingTop: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  customRow: {
    flexDirection: "row",
    gap: 8,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  customLink: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  customLinkText: {
    fontSize: 12,
    fontWeight: "600",
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
  drilldownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
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
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  viewBurstBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewBurstBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
});
