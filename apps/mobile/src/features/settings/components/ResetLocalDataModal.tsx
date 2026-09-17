import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";

export interface ResetLocalDataModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ResetScopeItem {
  icon: IconName;
  title: string;
  subtitle: string;
  status: string;
}

/**
 * ResetLocalDataModal renders a centered, beautifully proportioned dialog
 * for resetting local on-device records and configuration.
 *
 * Adheres to the shared modal design system:
 * - Centered dialog (maxWidth: 375, borderRadius: 24, borderWidth: 1.2, elevation: 24)
 * - Pinned header with icon, title, subtitle, and close button
 * - Scrollable body with warning banner, scope breakdown list, strict mode check, and action buttons
 * - Invariant: Blocks reset if Strict Mode or Burst cooldown is currently active.
 */
export function ResetLocalDataModal({ visible, onClose }: ResetLocalDataModalProps) {
  const { snapshot: data, palette: p, command } = useOffline();
  const { height: windowHeight } = useWindowDimensions();
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCooldownActive = Boolean(
    data && (data.burstRemainingMs > 0 || data.strictRemainingMs > 0)
  );

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

  const handleReset = () => {
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
            setIsResetting(true);
            try {
              const ok = await command("reset", { confirmed: true });
              if (ok) {
                onClose();
                Alert.alert(
                  "Local Data Reset",
                  "Local storage has been reset to defaults."
                );
              }
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Reset failed";
              setErrorMessage(msg);
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.keyboardCenter}
        >
          <View
            style={[
              s.dialogCard,
              {
                maxHeight: Math.round(windowHeight * 0.82),
                backgroundColor: p.surfacePrimary,
                borderColor: p.borderSubtle,
              },
            ]}
          >
            {/* 1. Pinned Header */}
            <View style={[s.headerRow, { borderBottomColor: p.borderSubtle }]}>
              <View style={s.headerTitleWrap}>
                <View
                  style={[
                    s.headerIconBox,
                    {
                      backgroundColor: p.dangerSurface,
                      borderColor: p.danger,
                    },
                  ]}
                >
                  <Icon name="trash-can-outline" size={20} color={p.danger} />
                </View>
                <View>
                  <Text style={[s.headerTitle, { color: p.textPrimary }]}>
                    Delete local data
                  </Text>
                  <Text style={[s.headerSubtitle, { color: p.textSecondary }]}>
                    Local reset confirmation
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => [
                  s.closeButton,
                  { backgroundColor: pressed ? p.surfaceMuted : "transparent" },
                ]}
              >
                <Icon name="close" size={20} color={p.textSecondary} />
              </Pressable>
            </View>

            {/* 2. Scrollable Body */}
            <ScrollView
              style={s.dialogScroll}
              contentContainerStyle={s.dialogScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Warning Banner */}
              <View
                style={[
                  s.noticeBanner,
                  {
                    backgroundColor: p.dangerSurface,
                    borderColor: p.danger,
                  },
                ]}
              >
                <View style={s.noticeHeader}>
                  <Icon name="alert-circle-outline" size={18} color={p.danger} />
                  <Text style={[s.noticeTitle, { color: p.danger }]}>
                    Delete local Restrainify data?
                  </Text>
                </View>
                <Text style={[s.noticeBody, { color: p.textSecondary }]}>
                  This resets applicable product data stored in encrypted storage on this
                  device. It is not the same as deleting your server account.
                </Text>
              </View>

              {/* Scope Breakdown Card */}
              <View
                style={[
                  s.listCard,
                  { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
                ]}
              >
                {items.map((item, idx) => (
                  <View
                    key={item.title}
                    style={[
                      s.itemRow,
                      idx < items.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: p.borderSubtle,
                      },
                    ]}
                  >
                    <View
                      style={[
                        s.iconBox,
                        {
                          backgroundColor: p.backgroundPrimary,
                          borderColor: p.borderSubtle,
                        },
                      ]}
                    >
                      <Icon name={item.icon} size={18} color={p.brandPrimary} />
                    </View>

                    <View style={s.itemInfo}>
                      <Text style={[s.itemTitle, { color: p.textPrimary }]}>
                        {item.title}
                      </Text>
                      <Text style={[s.itemDetail, { color: p.textSecondary }]}>
                        {item.subtitle}
                      </Text>
                    </View>

                    <View
                      style={[
                        s.badgePill,
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
                          s.badgeText,
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

              {/* Strict Mode Notice if Cooldown Active */}
              {isCooldownActive && (
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
                    <Icon name="lock-outline" size={18} color={p.warning} />
                    <Text style={[s.noticeTitle, { color: p.warning }]}>
                      Protected by Strict Mode
                    </Text>
                  </View>
                  <Text style={[s.noticeBody, { color: p.textSecondary }]}>
                    Local data reset cannot be executed while an active cooldown or lock is running.
                  </Text>
                </View>
              )}

              {errorMessage && (
                <Text style={[s.errorText, { color: p.danger }]}>
                  {errorMessage}
                </Text>
              )}

              {/* Delete Local Data Red Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete local data"
                disabled={isCooldownActive || isResetting}
                onPress={handleReset}
                style={({ pressed }) => [
                  s.dangerButton,
                  {
                    backgroundColor: isCooldownActive ? p.borderSubtle : p.danger,
                    opacity: isCooldownActive ? 0.6 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                {isResetting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.dangerButtonText}>Delete local data</Text>
                )}
              </Pressable>

              {/* Cancel Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                onPress={onClose}
                style={({ pressed }) => [
                  s.cancelButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[s.cancelButtonText, { color: p.textSecondary }]}>
                  Cancel
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 14, 26, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  keyboardCenter: {
    width: "100%",
    maxWidth: 375,
    alignItems: "center",
    justifyContent: "center",
  },
  dialogCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1.2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  dialogScroll: {
    flexShrink: 1,
  },
  dialogScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 12,
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
    fontSize: 13.5,
    fontWeight: "700",
  },
  noticeBody: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  listCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 58,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  itemDetail: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  badgePill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dangerButton: {
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  dangerButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  cancelButton: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
