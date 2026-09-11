import { useState } from "react";
import { StyleSheet, Text, View, Pressable, Switch, Alert } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface AppLimitScreenProps {
  packageName?: string;
  label?: string;
  open: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

const ALLOWANCES = [
  { label: "15 minutes", minutes: 15 },
  { label: "30 minutes", minutes: 30 },
  { label: "45 minutes", minutes: 45 },
  { label: "1 hour", minutes: 60 },
  { label: "1.5 hours", minutes: 90 },
  { label: "2 hours", minutes: 120 },
];

/**
 * AppLimitScreen implements SET-APP-02: App Limit & Schedule
 * from the Restrainify UI Architecture specification.
 *
 * Configures per-app daily usage allowance dropdown and scheduled restriction windows.
 *
 * Backend mapping:
 * - Reads & updates rule: `command("rule", ...)` (OfflineRuntime.kt:100-119)
 * - Strict Mode protection warning: `snapshot.strictRemainingMs`
 */
export function AppLimitScreen({
  packageName = "com.instagram.android",
  label = "Instagram",
  open,
  onBack,
}: AppLimitScreenProps) {
  const { snapshot: data, palette: p, command } = useOffline();

  const existingRule = data?.settings.rules.find(
    (r) => r.packageName === packageName
  );

  const [limitEnabled, setLimitEnabled] = useState(existingRule?.enabled ?? true);
  const [selectedMinutes, setSelectedMinutes] = useState(
    existingRule?.limitMinutes || 45
  );

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
  };

  const handleSelectAllowance = async (minutes: number) => {
    if (minutes > selectedMinutes && isCooldownActive) {
      open("pending-change", {
        reason: `Increasing daily allowance from ${selectedMinutes}m to ${minutes}m`,
      });
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

  const hasSchedule =
    existingRule &&
    existingRule.startMinute >= 0 &&
    existingRule.endMinute >= 0;

  return (
    <View style={styles.container}>
      {/* 1. Header */}
      <View style={styles.headerRow}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[
              styles.backButton,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={styles.titleWrap}>
          <Text style={[styles.headerKicker, { color: p.textSecondary }]}>
            Limit & schedule
          </Text>
          <Text style={[styles.headerTitle, { color: p.textPrimary }]}>
            {label}
          </Text>
        </View>
      </View>

      {/* 2. Daily Limit Section */}
      <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
        Daily limit
      </Text>

      <View
        style={[
          styles.limitCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <Text style={[styles.toggleTitle, { color: p.textPrimary }]}>
              Limit {label} daily
            </Text>
            <Text style={[styles.toggleSubtitle, { color: p.textSecondary }]}>
              Current limit · {selectedMinutes} minutes
            </Text>
          </View>
          <Switch
            accessibilityLabel={`Limit ${label} daily`}
            value={limitEnabled}
            onValueChange={(val) => void handleToggleLimit(val)}
            trackColor={{ true: p.success, false: p.borderSubtle }}
          />
        </View>

        <View style={styles.allowanceSection}>
          <Text style={[styles.fieldLabel, { color: p.textSecondary }]}>
            Daily allowance
          </Text>
          <View style={styles.allowancePills}>
            {ALLOWANCES.map((item) => {
              const isSelected = selectedMinutes === item.minutes;
              return (
                <Pressable
                  key={item.minutes}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => void handleSelectAllowance(item.minutes)}
                  style={[
                    styles.allowancePill,
                    {
                      backgroundColor: isSelected
                        ? p.brandPrimary
                        : p.backgroundPrimary,
                      borderColor: isSelected ? p.brandPrimary : p.borderSubtle,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.allowancePillText,
                      {
                        color: isSelected
                          ? p.backgroundPrimary
                          : p.textPrimary,
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

      {/* 3. Restriction Schedules Section */}
      <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
        Restriction schedules
      </Text>

      <View
        style={[
          styles.schedulesCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit schedule"
          onPress={() =>
            open("schedule-editor", {
              packageName,
              label,
            })
          }
          style={({ pressed }) => [
            styles.scheduleItemRow,
            { backgroundColor: pressed ? p.surfaceMuted : "transparent" },
          ]}
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: p.backgroundPrimary,
                borderColor: p.borderSubtle,
              },
            ]}
          >
            <Icon name="clock-outline" size={20} color={p.brandPrimary} />
          </View>

          <View style={styles.scheduleInfo}>
            <Text style={[styles.scheduleTitle, { color: p.textPrimary }]}>
              Night block
            </Text>
            <Text style={[styles.scheduleDetail, { color: p.textSecondary }]}>
              {hasSchedule
                ? `${Math.floor(existingRule.startMinute / 60)}:00 → ${Math.floor(existingRule.endMinute / 60)}:00`
                : "10:00 PM → 8:00 AM"}
            </Text>
          </View>

          <View
            style={[
              styles.badgePill,
              { backgroundColor: p.surfaceMuted },
            ]}
          >
            <Text style={[styles.badgeText, { color: p.textPrimary }]}>
              Every day
            </Text>
          </View>

          <Icon name="chevron-right" size={18} color={p.textMuted} />
        </Pressable>
      </View>

      {/* 4. Add Schedule Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add schedule"
        onPress={() =>
          open("schedule-editor", {
            packageName,
            label,
          })
        }
        style={[
          styles.secondaryButton,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
          },
        ]}
      >
        <Text style={[styles.secondaryButtonText, { color: p.textPrimary }]}>
          + Add schedule
        </Text>
      </Pressable>

      {/* 5. Strict Mode Notice */}
      <View
        style={[
          styles.noticeBanner,
          {
            backgroundColor: p.warningSurface,
            borderColor: p.warning,
          },
        ]}
      >
        <View style={styles.noticeHeader}>
          <Icon name="lock-outline" size={20} color={p.warning} />
          <Text style={[styles.noticeTitle, { color: p.warning }]}>
            Strict Mode can protect changes
          </Text>
        </View>
        <Text style={[styles.noticeBody, { color: p.textSecondary }]}>
          Weakening this limit may become a pending cooldown request instead of
          taking effect instantly.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  headerKicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
    paddingHorizontal: 2,
  },
  limitCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleTextWrap: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  toggleSubtitle: {
    fontSize: 12,
  },
  allowanceSection: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  allowancePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  allowancePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  allowancePillText: {
    fontSize: 12,
  },
  schedulesCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  scheduleItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 64,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleInfo: {
    flex: 1,
    gap: 2,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  scheduleDetail: {
    fontSize: 12,
    lineHeight: 16,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  noticeBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  noticeBody: {
    fontSize: 12,
    lineHeight: 17,
  },
});
