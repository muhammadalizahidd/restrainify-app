import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface RecoveryBaselineScreenProps {
  onNext: (startDate: string) => void;
  onBack: () => void;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function subDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDate(d);
}

/**
 * ONB-09: Recovery Baseline Screen (Setup Step 5/6)
 *
 * Sets the initial streak milestone truthfully without wiping prior recovery history.
 * Requirement coverage: FR-ONB-006
 *
 * Frontend → Backend mapping:
 *   command("setting", { key: "recoveryStart", value: dateString })
 *     → OfflineRuntime.kt:80-84 (validated !isAfter(today))
 *   command("setting", { key: "recoveryEnabled", value: boolean })
 *     → OfflineRuntime.kt:71-77
 *   command("setting", { key: "trackerEnabled", value: boolean })
 *     → OfflineRuntime.kt:71-77
 */
export function RecoveryBaselineScreen({
  onNext,
  onBack,
}: RecoveryBaselineScreenProps) {
  const { palette: p, command } = useOffline();

  const todayIso = useMemo(() => formatDate(new Date()), []);

  // "today" vs "past"
  const [mode, setMode] = useState<"today" | "past">("today");
  const [pastPreset, setPastPreset] = useState<number>(7); // days ago
  const [customDays, setCustomDays] = useState<string>("");
  const [useCustomDays, setUseCustomDays] = useState(false);

  // Feature toggles
  const [recoveryEnabled, setRecoveryEnabled] = useState(true);
  const [trackerEnabled, setTrackerEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedDateIso = useMemo(() => {
    if (mode === "today") return todayIso;
    if (useCustomDays) {
      const parsed = parseInt(customDays, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 3650) {
        return subDays(parsed);
      }
    }
    return subDays(pastPreset);
  }, [mode, todayIso, useCustomDays, customDays, pastPreset]);

  const handleContinue = async () => {
    setSaving(true);
    try {
      if (recoveryEnabled) {
        await command("setting", { key: "recoveryStart", value: selectedDateIso });
      }
      await command("setting", { key: "recoveryEnabled", value: recoveryEnabled });
      await command("setting", { key: "trackerEnabled", value: trackerEnabled });
      onNext(selectedDateIso);
    } catch {
      onNext(selectedDateIso);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: p.backgroundPrimary }]}>
      {/* Header */}
      <View style={s.headerArea}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={[s.backBtn, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}
        >
          <Icon name="arrow-left" size={20} color={p.textPrimary} />
        </Pressable>
        <View style={[s.stepBadge, { backgroundColor: p.surfaceMuted }]}>
          <Text style={[s.stepText, { color: p.brandPrimary }]}>Step 5 of 6</Text>
        </View>
        <View style={s.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.title, { color: p.textPrimary }]}>
          Recovery Baseline
        </Text>
        <Text style={[s.subtitle, { color: p.textSecondary }]}>
          Initialize your recovery start point. A setback does not erase your history. Your progress always counts.
        </Text>

        {/* Option 1: Start fresh today */}
        <Pressable
          style={[
            s.card,
            {
              backgroundColor: mode === "today" ? p.surfaceMuted : p.surfacePrimary,
              borderColor: mode === "today" ? p.brandPrimary : p.borderSubtle,
            },
          ]}
          onPress={() => {
            setMode("today");
            setUseCustomDays(false);
          }}
        >
          <View style={s.cardHeader}>
            <View
              style={[
                s.radioCircle,
                {
                  borderColor: mode === "today" ? p.brandPrimary : p.borderSubtle,
                },
              ]}
            >
              {mode === "today" && (
                <View style={[s.radioDot, { backgroundColor: p.brandPrimary }]} />
              )}
            </View>
            <View style={s.cardHeaderText}>
              <Text style={[s.cardTitle, { color: p.textPrimary }]}>
                Start fresh today
              </Text>
              <Text style={[s.cardDesc, { color: p.textSecondary }]}>
                Begin day 1 from right now ({todayIso})
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Option 2: Prior clean time */}
        <Pressable
          style={[
            s.card,
            {
              backgroundColor: mode === "past" ? p.surfaceMuted : p.surfacePrimary,
              borderColor: mode === "past" ? p.brandPrimary : p.borderSubtle,
              marginTop: 12,
            },
          ]}
          onPress={() => setMode("past")}
        >
          <View style={s.cardHeader}>
            <View
              style={[
                s.radioCircle,
                {
                  borderColor: mode === "past" ? p.brandPrimary : p.borderSubtle,
                },
              ]}
            >
              {mode === "past" && (
                <View style={[s.radioDot, { backgroundColor: p.brandPrimary }]} />
              )}
            </View>
            <View style={s.cardHeaderText}>
              <Text style={[s.cardTitle, { color: p.textPrimary }]}>
                I’ve already been clean
              </Text>
              <Text style={[s.cardDesc, { color: p.textSecondary }]}>
                Honor your existing milestone and keep your momentum
              </Text>
            </View>
          </View>

          {mode === "past" && (
            <View style={s.pastOptions}>
              <View style={s.presetsRow}>
                {[
                  { label: "7 days", days: 7 },
                  { label: "30 days", days: 30 },
                  { label: "90 days", days: 90 },
                ].map((item) => {
                  const active = !useCustomDays && pastPreset === item.days;
                  return (
                    <Pressable
                      key={item.days}
                      style={[
                        s.presetChip,
                        {
                          backgroundColor: active
                            ? p.brandPrimary
                            : p.surfacePrimary,
                          borderColor: active
                            ? p.brandPrimary
                            : p.borderSubtle,
                        },
                      ]}
                      onPress={() => {
                        setUseCustomDays(false);
                        setPastPreset(item.days);
                      }}
                    >
                      <Text
                        style={[
                          s.presetChipText,
                          {
                            color: active ? p.backgroundPrimary : p.textPrimary,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Custom days input */}
              <View style={s.customRow}>
                <Pressable
                  style={[
                    s.customSelectWrap,
                    {
                      borderColor: useCustomDays ? p.brandPrimary : p.borderSubtle,
                      backgroundColor: p.surfacePrimary,
                    },
                  ]}
                  onPress={() => setUseCustomDays(true)}
                >
                  <Text style={[s.customLabel, { color: p.textSecondary }]}>
                    Or enter clean days:
                  </Text>
                  <TextInput
                    style={[
                      s.customInput,
                      {
                        color: p.textPrimary,
                        borderColor: p.borderSubtle,
                        backgroundColor: p.surfaceMuted,
                      },
                    ]}
                    keyboardType="number-pad"
                    placeholder="e.g. 45"
                    placeholderTextColor={p.textSecondary}
                    value={customDays}
                    onChangeText={(val) => {
                      setUseCustomDays(true);
                      setCustomDays(val.replace(/[^0-9]/g, ""));
                    }}
                    onFocus={() => setUseCustomDays(true)}
                  />
                </Pressable>
              </View>

              <View
                style={[
                  s.calculatedBadge,
                  { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
                ]}
              >
                <Icon name="calendar-check" size={16} color={p.brandPrimary} />
                <Text style={[s.calculatedText, { color: p.textPrimary }]}>
                  Baseline date: <Text style={{ fontWeight: "700" }}>{selectedDateIso}</Text>
                </Text>
              </View>
            </View>
          )}
        </Pressable>

        {/* Feature Toggles */}
        <View
          style={[
            s.togglesCard,
            {
              backgroundColor: p.surfacePrimary,
              borderColor: p.borderSubtle,
              marginTop: 20,
            },
          ]}
        >
          <View style={s.toggleRow}>
            <View style={s.toggleInfo}>
              <Text style={[s.toggleTitle, { color: p.textPrimary }]}>
                Track recovery streak
              </Text>
              <Text style={[s.toggleDesc, { color: p.textSecondary }]}>
                Show streak counter on the home dashboard
              </Text>
            </View>
            <Switch
              value={recoveryEnabled}
              onValueChange={setRecoveryEnabled}
              trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
              thumbColor={recoveryEnabled ? p.surfacePrimary : p.textSecondary}
            />
          </View>

          <View style={[s.divider, { backgroundColor: p.borderSubtle }]} />

          <View style={s.toggleRow}>
            <View style={s.toggleInfo}>
              <Text style={[s.toggleTitle, { color: p.textPrimary }]}>
                Enable private tracker
              </Text>
              <Text style={[s.toggleDesc, { color: p.textSecondary }]}>
                Store clean day milestones locally without cloud sync
              </Text>
            </View>
            <Switch
              value={trackerEnabled}
              onValueChange={setTrackerEnabled}
              trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
              thumbColor={trackerEnabled ? p.surfacePrimary : p.textSecondary}
            />
          </View>
        </View>

        <View style={s.bottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View
        style={[
          s.footerArea,
          {
            backgroundColor: p.backgroundPrimary,
            borderTopColor: p.borderSubtle,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue to next step"
          disabled={saving}
          onPress={handleContinue}
          style={[
            s.primaryBtn,
            {
              backgroundColor: p.brandPrimary,
              opacity: saving ? 0.7 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={p.backgroundPrimary} />
          ) : (
            <Text style={[s.primaryBtnText, { color: p.backgroundPrimary }]}>
              Continue
            </Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip recovery setup"
          disabled={saving}
          onPress={() => onNext(todayIso)}
          style={s.skipBtn}
        >
          <Text style={[s.skipBtnText, { color: p.textSecondary }]}>
            Skip for now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepText: {
    fontSize: 12,
    fontWeight: "700",
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardDesc: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  pastOptions: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(150,150,150,0.2)",
    gap: 12,
  },
  presetsRow: {
    flexDirection: "row",
    gap: 10,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  customRow: {
    marginTop: 4,
  },
  customSelectWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  customLabel: {
    fontSize: 13,
  },
  customInput: {
    width: 80,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 0,
  },
  calculatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  calculatedText: {
    fontSize: 12,
  },
  togglesCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  toggleDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  bottomSpacer: {
    height: 24,
  },
  footerArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    gap: 8,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  skipBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
