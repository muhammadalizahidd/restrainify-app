import { useState } from "react";
import { StyleSheet, Text, View, Pressable, Alert } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";

export interface ResetLocalDataScreenProps {
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

interface ResetScopeItem {
  icon: IconName;
  title: string;
  subtitle: string;
  status: string;
}

/**
 * ResetLocalDataScreen implements STATE-DATA-02: Reset Local Data
 * from the Restrainify UI Architecture specification.
 *
 * Provides device-only data reset (clearing Room events, daily counters, and configuration)
 * without deleting server account credentials.
 *
 * Backend mapping:
 * - Mutates: `command("reset", { confirmed: true })` (OfflineRuntime.kt:148)
 * - CRITICAL INVARIANT: `assertCanWeaken()` enforces that local data cannot be reset
 *   while an active Strict Mode lock or Burst cooldown is running.
 */
export function ResetLocalDataScreen({ onBack }: ResetLocalDataScreenProps) {
  const { snapshot: data, palette: p, command } = useOffline();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!data) return null;

  const isCooldownActive =
    data.burstRemainingMs > 0 || data.strictRemainingMs > 0;

  const items: ResetScopeItem[] = [
    {
      icon: "history",
      title: "Recovery data on this device",
      subtitle: "Local records, streaks and urges included in reset",
      status: "Included",
    },
    {
      icon: "cog-outline",
      title: "Local app settings",
      subtitle: "Applicable local rules and preferences included",
      status: "Included",
    },
    {
      icon: "account-check-outline",
      title: "Account itself",
      subtitle: "Server account is not automatically deleted by this action",
      status: "Remains",
    },
  ];

  const handleResetLocalData = () => {
    setErrorMessage(null);

    if (isCooldownActive) {
      Alert.alert(
        "Reset Prohibited by Strict Mode",
        "Local data reset is locked while a protection cooldown is running to prevent bypass."
      );
      return;
    }

    Alert.alert(
      "Confirm Local Data Reset",
      "Are you sure you want to permanently erase all local tracking and configuration on this device?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Local Data",
          style: "destructive",
          onPress: async () => {
            try {
              const ok = await command("reset", { confirmed: true });
              if (ok) {
                Alert.alert(
                  "Local Data Reset",
                  "Local storage has been reset to defaults.",
                  [{ text: "OK", onPress: onBack }]
                );
              }
            } catch (err: unknown) {
              const msg =
                err instanceof Error ? err.message : "Reset failed";
              setErrorMessage(msg);
            }
          },
        },
      ]
    );
  };

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
            Local reset confirmation
          </Text>
          <Text style={[styles.headerTitle, { color: p.textPrimary }]}>
            Delete local data
          </Text>
        </View>
      </View>

      {/* 2. Warning Notice */}
      <View
        style={[
          styles.noticeBanner,
          {
            backgroundColor: p.dangerSurface,
            borderColor: p.danger,
          },
        ]}
      >
        <View style={styles.noticeHeader}>
          <Icon name="trash-can-outline" size={20} color={p.danger} />
          <Text style={[styles.noticeTitle, { color: p.danger }]}>
            Delete local Restrainify data?
          </Text>
        </View>
        <Text style={[styles.noticeBody, { color: p.textSecondary }]}>
          This resets applicable product data stored in encrypted storage on this
          device. It is not the same as deleting your server account.
        </Text>
      </View>

      {/* 3. Scope Breakdown List */}
      <View
        style={[
          styles.listCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {items.map((item, idx) => (
          <View
            key={item.title}
            style={[
              styles.itemRow,
              idx < items.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: p.borderSubtle,
              },
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
              <Icon name={item.icon} size={20} color={p.brandPrimary} />
            </View>

            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: p.textPrimary }]}>
                {item.title}
              </Text>
              <Text style={[styles.itemDetail, { color: p.textSecondary }]}>
                {item.subtitle}
              </Text>
            </View>

            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor:
                    item.status === "Remains"
                      ? p.successSurface
                      : p.surfaceMuted,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      item.status === "Remains"
                        ? p.success
                        : p.textSecondary,
                  },
                ]}
              >
                {item.status}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* 4. Strict Mode Warning if Cooldown Active */}
      {isCooldownActive && (
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
              Protected by Strict Mode
            </Text>
          </View>
          <Text style={[styles.noticeBody, { color: p.textSecondary }]}>
            Local data reset cannot be executed during an active cooldown.
          </Text>
        </View>
      )}

      {errorMessage && (
        <Text style={[styles.errorText, { color: p.danger }]}>
          {errorMessage}
        </Text>
      )}

      {/* 5. Delete Local Data Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete local data"
        onPress={handleResetLocalData}
        style={[
          styles.dangerButton,
          {
            backgroundColor: isCooldownActive ? p.borderSubtle : p.danger,
            opacity: isCooldownActive ? 0.6 : 1,
          },
        ]}
      >
        <Text style={styles.dangerButtonText}>Delete local data</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel"
        onPress={onBack}
        style={styles.cancelButton}
      >
        <Text style={[styles.cancelButtonText, { color: p.textSecondary }]}>
          Cancel
        </Text>
      </Pressable>
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
  listCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  itemRow: {
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
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemDetail: {
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
  errorText: {
    fontSize: 13,
    fontWeight: "500",
  },
  dangerButton: {
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  dangerButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  cancelButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
