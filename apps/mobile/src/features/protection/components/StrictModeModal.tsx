import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  Alert,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, duration } from "../../../components/OfflineUI";

export interface StrictModeModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * StrictModeModal renders a centered, beautifully proportioned dialog
 * for toggling Strict Mode on and off.
 *
 * Adheres to the shared modal design system:
 * - Centered dialog (maxWidth: 375, borderRadius: 24, borderWidth: 1.2, elevation: 24)
 * - Pinned header with icon, title, subtitle, and close button
 * - Clean switch toggle to turn Strict Mode ON and OFF
 * - Truthful invariant enforcement: active lock cooldowns cannot be bypassed.
 */
export function StrictModeModal({ visible, onClose }: StrictModeModalProps) {
  const { snapshot: data, palette: p, command } = useOffline();
  const { height: windowHeight } = useWindowDimensions();
  const [isToggling, setIsToggling] = useState(false);

  if (!data) return null;

  const isStrictActive = data.strictRemainingMs > 0;
  const configuredMinutes = data.settings.strictMinutes || 30;

  const handleToggleStrict = async (value: boolean) => {
    if (value) {
      if (isStrictActive) return;

      Alert.alert(
        "Activate Strict Mode?",
        `Protection settings will be locked against weakening changes for ${configuredMinutes} minutes.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Lock Protection",
            style: "default",
            onPress: async () => {
              setIsToggling(true);
              try {
                if (data.settings.strictMinutes === 0) {
                  await command("setting", { key: "strictMinutes", value: 30 });
                }
                await command("strict");
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Failed to activate Strict Mode";
                Alert.alert("Activation Notice", msg);
              } finally {
                setIsToggling(false);
              }
            },
          },
        ]
      );
    } else {
      if (isStrictActive) {
        Alert.alert(
          "Strict Mode Active",
          `Protection changes are locked until the active cooldown ends (${duration(data.strictRemainingMs)} remaining to prevent bypass).`
        );
      }
    }
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
                      backgroundColor: p.surfaceMuted,
                      borderColor: p.borderSubtle,
                    },
                  ]}
                >
                  <Icon
                    name={isStrictActive ? "lock-alert-outline" : "lock-outline"}
                    size={20}
                    color={p.brandPrimary}
                  />
                </View>
                <View>
                  <Text style={[s.headerTitle, { color: p.textPrimary }]}>
                    Strict Mode
                  </Text>
                  <Text style={[s.headerSubtitle, { color: p.textSecondary }]}>
                    Anti-bypass change protection
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
              {/* Primary Toggle Card */}
              <View
                style={[
                  s.toggleCard,
                  {
                    backgroundColor: p.surfacePrimary,
                    borderColor: p.borderSubtle,
                  },
                ]}
              >
                <View style={s.toggleRow}>
                  <View
                    style={[
                      s.toggleIconBox,
                      {
                        backgroundColor: p.surfaceMuted,
                      },
                    ]}
                  >
                    <Icon
                      name={isStrictActive ? "lock-alert-outline" : "lock-check-outline"}
                      size={22}
                      color={p.brandPrimary}
                    />
                  </View>
                  <View style={s.toggleCopy}>
                    <Text style={[s.toggleTitle, { color: p.textPrimary }]}>
                      Strict Mode Lock
                    </Text>
                    <Text style={[s.toggleSubtitle, { color: p.textSecondary }]}>
                      {isStrictActive
                        ? `${duration(data.strictRemainingMs)} remaining on active lock`
                        : `Ready · ${configuredMinutes}m change friction`}
                    </Text>
                  </View>

                  <Switch
                    accessibilityLabel="Toggle Strict Mode"
                    disabled={isToggling}
                    value={isStrictActive}
                    onValueChange={handleToggleStrict}
                    trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Status Notice Banner */}
              {isStrictActive ? (
                <View
                  style={[
                    s.noticeBanner,
                    {
                      backgroundColor: p.surfaceMuted,
                      borderColor: p.borderSubtle,
                    },
                  ]}
                >
                  <View style={s.noticeHeader}>
                    <Icon name="clock-outline" size={18} color={p.brandPrimary} />
                    <Text style={[s.noticeTitle, { color: p.textPrimary }]}>
                      Lock active
                    </Text>
                  </View>
                  <Text style={[s.noticeBody, { color: p.textSecondary }]}>
                    Settings cannot be weakened or modified until the {duration(data.strictRemainingMs)} cooldown has elapsed.
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    s.noticeBanner,
                    {
                      backgroundColor: p.surfaceMuted,
                      borderColor: p.borderSubtle,
                    },
                  ]}
                >
                  <View style={s.noticeHeader}>
                    <Icon name="shield-check-outline" size={18} color={p.brandPrimary} />
                    <Text style={[s.noticeTitle, { color: p.textPrimary }]}>
                      Protect your intentions
                    </Text>
                  </View>
                  <Text style={[s.noticeBody, { color: p.textSecondary }]}>
                    Switching Strict Mode on locks protection settings so they cannot be weakened or turned off impulsively.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* 3. Pinned Footer */}
            <View style={[s.footerRow, { borderTopColor: p.borderSubtle }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                onPress={onClose}
                style={[s.doneBtn, { backgroundColor: p.brandPrimary }]}
              >
                <Text style={[s.doneBtnText, { color: p.backgroundPrimary }]}>
                  Done
                </Text>
              </Pressable>
            </View>
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
    paddingTop: 16,
    paddingBottom: 20,
    gap: 14,
  },
  toggleCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleCopy: {
    flex: 1,
    minWidth: 0,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  toggleSubtitle: {
    fontSize: 11,
    marginTop: 2,
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
    fontSize: 13,
    fontWeight: "700",
  },
  noticeBody: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  footerRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneBtn: {
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
