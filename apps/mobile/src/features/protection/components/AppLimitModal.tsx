import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { offlineProtection } from "../../../native/OfflineProtection";

export const ALLOWANCES = [
  { label: "15 minutes", minutes: 15 },
  { label: "30 minutes", minutes: 30 },
  { label: "45 minutes", minutes: 45 },
  { label: "1 hour", minutes: 60 },
  { label: "1.5 hours", minutes: 90 },
  { label: "2 hours", minutes: 120 },
];

const DAYS_OF_WEEK = [
  { label: "M", dayIndex: 1, name: "Monday" },
  { label: "T", dayIndex: 2, name: "Tuesday" },
  { label: "W", dayIndex: 3, name: "Wednesday" },
  { label: "T", dayIndex: 4, name: "Thursday" },
  { label: "F", dayIndex: 5, name: "Friday" },
  { label: "S", dayIndex: 6, name: "Saturday" },
  { label: "S", dayIndex: 7, name: "Sunday" },
];

export interface AppLimitContentProps {
  packageName: string;
  label: string;
  onBack?: () => void;
  onClose: () => void;
  open?: (route: string, params?: Record<string, unknown>) => void;
}

/**
 * AppLimitContent renders the complete Limit & Schedule configuration:
 * 1. Header (Back button, Eyebrow 'LIMIT & SCHEDULE', Title, Close 'X')
 * 2. Daily limit toggle & allowance pills (15m, 30m, 45m, 1h, 1.5h, 2h)
 * 3. Restriction schedules (Night block, active days, inline schedule editor)
 * 4. Strict Mode cooldown warning banner
 */
export function AppLimitContent({
  packageName,
  label,
  onBack,
  onClose,
  open,
}: AppLimitContentProps) {
  const { snapshot: data, palette: p, command } = useOffline();

  const existingRule = data?.settings.rules.find(
    (r) => r.packageName === packageName
  );

  const [limitEnabled, setLimitEnabled] = useState(existingRule?.enabled ?? true);
  const [selectedMinutes, setSelectedMinutes] = useState(
    existingRule?.limitMinutes || 30
  );

  // Inline Schedule Editor state
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [startTime, setStartTime] = useState(
    existingRule && existingRule.startMinute >= 0
      ? `${Math.floor(existingRule.startMinute / 60).toString().padStart(2, "0")}:${(existingRule.startMinute % 60).toString().padStart(2, "0")}`
      : "22:00"
  );
  const [endTime, setEndTime] = useState(
    existingRule && existingRule.endMinute >= 0
      ? `${Math.floor(existingRule.endMinute / 60).toString().padStart(2, "0")}:${(existingRule.endMinute % 60).toString().padStart(2, "0")}`
      : "08:00"
  );
  const [selectedDays, setSelectedDays] = useState<number[]>(
    existingRule?.days ?? [1, 2, 3, 4, 5, 6, 7]
  );
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  if (!data) return null;

  const isCooldownActive =
    data.burstRemainingMs > 0 || data.strictRemainingMs > 0;

  const handleToggleLimit = async (value: boolean) => {
    if (!value && isCooldownActive) {
      Alert.alert(
        "Strict Mode Active",
        "Weakening this limit is locked until the configured cooldown ends."
      );
      return;
    }

    if (value && !data.capabilities.accessibility) {
      Alert.alert(
        "Accessibility Service Required",
        `Restrainify needs Accessibility Service enabled to enforce daily limits and show blocking overlays for ${label}.\n\nWould you like to set it up now?`,
        [
          { text: "Not Now", style: "cancel" },
          {
            text: "Set Up Now",
            onPress: async () => {
              setLimitEnabled(true);
              try {
                await command("setting", { key: "accessibilityConsent", value: true });
                await command("rule", {
                  packageName,
                  enabled: true,
                  limitMinutes: selectedMinutes,
                  startMinute: existingRule?.startMinute ?? -1,
                  endMinute: existingRule?.endMinute ?? -1,
                  days: existingRule?.days ?? [1, 2, 3, 4, 5, 6, 7],
                  feedMode: existingRule?.feedMode ?? "off",
                  burst: existingRule?.burst ?? true,
                });
              } catch {}
              if (open) {
                onClose();
                open("permission-disclosure", {
                  permissionType: "accessibility",
                  returnRoute: "home",
                  returnModal: "app-controls",
                });
              } else {
                void offlineProtection.settings("accessibility");
              }
            },
          },
        ]
      );
      return;
    }

    try {
      setLimitEnabled(value);
      await command("rule", {
        packageName,
        enabled: value,
        limitMinutes: selectedMinutes,
        startMinute: existingRule?.startMinute ?? -1,
        endMinute: existingRule?.endMinute ?? -1,
        days: existingRule?.days ?? [1, 2, 3, 4, 5, 6, 7],
        feedMode: existingRule?.feedMode ?? "off",
        burst: existingRule?.burst ?? true,
      });
    } catch (err) {
      setLimitEnabled(!value);
      const msg = err instanceof Error ? err.message : "Failed to update limit";
      Alert.alert("Rule Error", msg);
    }
  };

  const handleSelectAllowance = async (minutes: number) => {
    if (minutes > selectedMinutes && isCooldownActive) {
      Alert.alert(
        "Strict Mode Protected",
        `Increasing daily allowance from ${selectedMinutes}m to ${minutes}m requires waiting for cooldown.`
      );
      return;
    }
    setSelectedMinutes(minutes);
    await command("rule", {
      packageName,
      enabled: limitEnabled,
      limitMinutes: minutes,
      startMinute: existingRule?.startMinute ?? -1,
      endMinute: existingRule?.endMinute ?? -1,
      days: existingRule?.days ?? [1, 2, 3, 4, 5, 6, 7],
      feedMode: existingRule?.feedMode ?? "off",
      burst: existingRule?.burst ?? true,
    });
  };

  const parseTimeToMinutes = (timeStr: string): number | null => {
    const trimmed = timeStr.trim();
    const match24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
    if (match24) {
      const hours = parseInt(match24[1]!, 10);
      const minutes = parseInt(match24[2]!, 10);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return hours * 60 + minutes;
      }
    }
    return null;
  };

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(dayIndex)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== dayIndex);
      } else {
        return [...prev, dayIndex].sort();
      }
    });
  };

  const handleSaveSchedule = async () => {
    setScheduleError(null);
    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);

    if (startMin === null || endMin === null) {
      setScheduleError("Please enter valid 24h times (e.g. 22:00, 08:00).");
      return;
    }

    if (startMin === endMin) {
      setScheduleError("Start time and end time cannot be identical.");
      return;
    }

    if (selectedDays.length === 0) {
      setScheduleError("Select at least one day for the schedule.");
      return;
    }

    try {
      await command("rule", {
        packageName,
        enabled: limitEnabled,
        limitMinutes: selectedMinutes,
        startMinute: startMin,
        endMinute: endMin,
        days: selectedDays,
        feedMode: existingRule?.feedMode ?? "off",
        burst: existingRule?.burst ?? true,
      });
      setIsEditingSchedule(false);
    } catch (e) {
      setScheduleError(e instanceof Error ? e.message : "Failed to save schedule.");
    }
  };

  const handleDeleteLimit = () => {
    if (isCooldownActive) {
      Alert.alert(
        "Strict Mode Active",
        "Removing limits is locked until the configured cooldown ends."
      );
      return;
    }

    Alert.alert(
      "Delete App Limit",
      `Are you sure you want to remove all limits and schedules for ${label}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await command("rule", {
                packageName,
                remove: true,
              });
              if (onBack) {
                onBack();
              } else {
                onClose();
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Failed to delete app limit";
              Alert.alert("Rule Error", msg);
            }
          },
        },
      ]
    );
  };

  const hasSchedule =
    existingRule &&
    existingRule.startMinute >= 0 &&
    existingRule.endMinute >= 0;

  const formatScheduleDisplay = () => {
    if (!hasSchedule) return "10:00 PM → 8:00 AM";
    const startH = Math.floor(existingRule.startMinute / 60);
    const startM = existingRule.startMinute % 60;
    const endH = Math.floor(existingRule.endMinute / 60);
    const endM = existingRule.endMinute % 60;

    const format12 = (h: number, m: number) => {
      const period = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
    };

    return `${format12(startH, startM)} → ${format12(endH, endM)}`;
  };

  const daysLabel =
    existingRule && existingRule.days.length < 7
      ? `${existingRule.days.length} days/wk`
      : "Every day";

  return (
    <View style={s.container}>
      {/* 1. Header Row: Back button + Eyebrow + Title + Close Button */}
      <View style={[s.headerRow, { borderBottomColor: p.borderSubtle }]}>
        <View style={s.headerLeftGroup}>
          {onBack && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to apps list"
              onPress={onBack}
              style={[
                s.backButton,
                { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
              ]}
            >
              <Icon name="arrow-left" size={19} color={p.textPrimary} />
            </Pressable>
          )}
          <View style={s.titleWrap}>
            <Text style={[s.headerEyebrow, { color: p.textSecondary }]}>
              LIMIT & SCHEDULE
            </Text>
            <Text style={[s.headerTitle, { color: p.textPrimary }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        </View>

        <View style={s.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete limits for ${label}`}
            onPress={handleDeleteLimit}
            style={[s.headerDeleteButton, { backgroundColor: p.surfaceMuted }]}
          >
            <Icon name="delete-outline" size={17} color={p.danger} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close modal"
            onPress={onClose}
            style={[s.closeButton, { backgroundColor: p.surfaceMuted }]}
          >
            <Icon name="close" size={17} color={p.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* 2. Scrollable Body Content */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled
        bounces={false}
      >
        {/* Section 1: Daily limit */}
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Daily limit
        </Text>

        <View
          style={[
            s.card,
            { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
          ]}
        >
          <View style={s.toggleRow}>
            <View style={s.toggleTextWrap}>
              <Text style={[s.toggleTitle, { color: p.textPrimary }]}>
                Limit {label} daily
              </Text>
              <Text style={[s.toggleSubtitle, { color: p.textSecondary }]}>
                Current limit · {selectedMinutes} minutes
              </Text>
            </View>
            <Switch
              accessibilityLabel={`Limit ${label} daily`}
              disabled={isCooldownActive && limitEnabled}
              value={limitEnabled}
              onValueChange={(val) => void handleToggleLimit(val)}
              trackColor={{
                true: isCooldownActive ? p.borderSubtle : p.success,
                false: p.borderSubtle,
              }}
              thumbColor={isCooldownActive && limitEnabled ? p.textSecondary : "#FFFFFF"}
            />
          </View>

          <View style={s.allowanceSection}>
            <Text style={[s.fieldLabel, { color: p.textSecondary }]}>
              Daily allowance
            </Text>
            <View style={s.allowanceGrid}>
              {ALLOWANCES.map((item) => {
                const isSelected = selectedMinutes === item.minutes;
                return (
                  <Pressable
                    key={item.minutes}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => void handleSelectAllowance(item.minutes)}
                    style={[
                      s.allowancePill,
                      {
                        backgroundColor: isSelected
                          ? p.brandPrimary
                          : p.surfacePrimary,
                        borderColor: isSelected
                          ? p.brandPrimary
                          : p.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.allowancePillText,
                        {
                          color: isSelected ? p.backgroundPrimary : p.textPrimary,
                          fontWeight: isSelected ? "700" : "500",
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Section 2: Restriction schedules */}
        <Text style={[s.sectionTitle, { color: p.textPrimary, marginTop: 14 }]}>
          Restriction schedules
        </Text>

        <View
          style={[
            s.card,
            { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle schedule editor"
            onPress={() => setIsEditingSchedule((prev) => !prev)}
            style={({ pressed }) => [
              s.scheduleItemRow,
              pressed && { opacity: 0.8 },
            ]}
          >
            <View
              style={[
                s.clockIconBox,
                { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
              ]}
            >
              <Icon name="clock-outline" size={18} color={p.brandPrimary} />
            </View>

            <View style={s.scheduleInfo}>
              <Text style={[s.scheduleTitle, { color: p.textPrimary }]}>
                Night block
              </Text>
              <Text style={[s.scheduleDetail, { color: p.textSecondary }]}>
                {formatScheduleDisplay()}
              </Text>
            </View>

            <View
              style={[
                s.badgePill,
                { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
              ]}
            >
              <Text style={[s.badgeText, { color: p.textPrimary }]}>
                {daysLabel}
              </Text>
            </View>

            <Icon
              name={isEditingSchedule ? "chevron-up" : "chevron-right"}
              size={17}
              color={p.textMuted}
            />
          </Pressable>

          {/* Inline Collapsible Schedule Editor */}
          {isEditingSchedule && (
            <View style={[s.inlineEditor, { borderTopColor: p.borderSubtle }]}>
              {scheduleError && (
                <Text style={[s.errorBanner, { color: p.danger }]}>
                  {scheduleError}
                </Text>
              )}

              <View style={s.timeInputRow}>
                <View style={s.timeInputGroup}>
                  <Text style={[s.inputLabel, { color: p.textSecondary }]}>
                    Start time
                  </Text>
                  <TextInput
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="22:00"
                    placeholderTextColor={p.textMuted}
                    style={[
                      s.textInput,
                      {
                        backgroundColor: p.surfacePrimary,
                        borderColor: p.borderSubtle,
                        color: p.textPrimary,
                      },
                    ]}
                  />
                </View>

                <View style={s.timeInputGroup}>
                  <Text style={[s.inputLabel, { color: p.textSecondary }]}>
                    End time
                  </Text>
                  <TextInput
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="08:00"
                    placeholderTextColor={p.textMuted}
                    style={[
                      s.textInput,
                      {
                        backgroundColor: p.surfacePrimary,
                        borderColor: p.borderSubtle,
                        color: p.textPrimary,
                      },
                    ]}
                  />
                </View>
              </View>

              <Text style={[s.inputLabel, { color: p.textSecondary, marginTop: 10 }]}>
                Active days
              </Text>
              <View style={s.daysRow}>
                {DAYS_OF_WEEK.map((d) => {
                  const active = selectedDays.includes(d.dayIndex);
                  return (
                    <Pressable
                      key={d.dayIndex}
                      accessibilityRole="button"
                      accessibilityLabel={d.name}
                      onPress={() => toggleDay(d.dayIndex)}
                      style={[
                        s.dayChip,
                        {
                          backgroundColor: active
                            ? p.brandPrimary
                            : p.surfacePrimary,
                          borderColor: active
                            ? p.brandPrimary
                            : p.borderSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.dayChipText,
                          {
                            color: active ? p.backgroundPrimary : p.textPrimary,
                            fontWeight: active ? "700" : "500",
                          },
                        ]}
                      >
                        {d.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save schedule changes"
                onPress={() => void handleSaveSchedule()}
                style={[s.saveScheduleButton, { backgroundColor: p.brandPrimary }]}
              >
                <Text
                  style={[
                    s.saveScheduleButtonText,
                    { color: p.backgroundPrimary },
                  ]}
                >
                  Save Schedule
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {!isEditingSchedule && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add or customize schedule"
            onPress={() => setIsEditingSchedule(true)}
            style={[
              s.addScheduleButton,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <Text style={[s.addScheduleButtonText, { color: p.textPrimary }]}>
              + Add schedule
            </Text>
          </Pressable>
        )}

        {/* Section 3: Strict Mode Notice Banner */}
        <View
          style={[
            s.noticeBanner,
            {
              backgroundColor: p.warningSurface,
              borderColor: p.warning,
            },
          ]}
        >
          <View style={s.noticeHeader}>
            <Icon name="lock-outline" size={17} color={p.warning} />
            <Text style={[s.noticeTitle, { color: p.warning }]}>
              Strict Mode can protect changes
            </Text>
          </View>
          <Text style={[s.noticeBody, { color: p.textSecondary }]}>
            Weakening this limit may become a pending cooldown request instead of
            taking effect instantly.
          </Text>
        </View>

        {/* Section 4: Delete App Limit Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete limits for ${label}`}
          onPress={handleDeleteLimit}
          style={({ pressed }) => [
            s.deleteLimitButton,
            {
              backgroundColor: p.surfaceMuted,
              borderColor: p.borderSubtle,
            },
            pressed && { opacity: 0.7, backgroundColor: p.surfacePrimary },
          ]}
        >
          <Icon name="delete-outline" size={18} color={p.danger} />
          <Text style={[s.deleteLimitButtonText, { color: p.danger }]}>
            Delete app limits
          </Text>
        </Pressable>
      </ScrollView>

      {/* 3. Pinned Bottom Footer Action */}
      <View style={[s.footerRow, { borderTopColor: p.borderSubtle }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={onBack ? "Return to app list" : "Done"}
          onPress={onBack ?? onClose}
          style={[s.doneButton, { backgroundColor: p.brandPrimary }]}
        >
          <Text style={[s.doneButtonText, { color: p.backgroundPrimary }]}>
            {onBack ? "Done" : "Save & Close"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export interface AppLimitModalProps {
  visible: boolean;
  packageName: string;
  label: string;
  onClose: () => void;
  open?: (route: string, params?: Record<string, unknown>) => void;
}

/**
 * AppLimitModal wraps AppLimitContent in a centered pop-up modal dialog,
 * matching the Orbit / Clarity design system across Restrainify.
 */
export function AppLimitModal({
  visible,
  packageName,
  label,
  onClose,
  open,
}: AppLimitModalProps) {
  const { palette: p } = useOffline();
  const { height: windowHeight } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.keyboardCenter}
        >
          <View
            style={[
              s.dialogCard,
              {
                backgroundColor: p.surfacePrimary,
                borderColor: p.borderSubtle,
                maxHeight: Math.round(windowHeight * 0.85),
              },
            ]}
          >
            <AppLimitContent
              packageName={packageName}
              label={label}
              onClose={onClose}
              open={open}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.62)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  keyboardCenter: {
    width: "100%",
    maxWidth: 440,
    justifyContent: "center",
  },
  dialogCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
  },
  container: {
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    maxHeight: 460,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  toggleSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
  },
  allowanceSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 8,
  },
  allowanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  allowancePill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  allowancePillText: {
    fontSize: 11,
  },
  scheduleItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  clockIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  scheduleDetail: {
    fontSize: 10.5,
    marginTop: 1,
  },
  badgePill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "600",
  },
  inlineEditor: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  errorBanner: {
    fontSize: 10.5,
    marginBottom: 8,
    fontWeight: "600",
  },
  timeInputRow: {
    flexDirection: "row",
    gap: 10,
  },
  timeInputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: "600",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 12,
  },
  dayChip: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  saveScheduleButton: {
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  saveScheduleButtonText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  addScheduleButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addScheduleButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  noticeBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
    gap: 4,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  noticeBody: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  deleteLimitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
  },
  deleteLimitButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  footerRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneButton: {
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
