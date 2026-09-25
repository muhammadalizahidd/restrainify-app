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
  ActivityIndicator,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface BurstUninstallConsentModalProps {
  visible: boolean;
  minutes: number;
  onActivateWithProtection: () => void;
  onActivateWithoutProtection: () => void;
  onClose: () => void;
  loading?: boolean;
}

/**
 * BurstUninstallConsentModal renders an opt-in consent dialog
 * requesting Device Administrator activation strictly for the duration
 * of an active Burst intervention.
 */
export function BurstUninstallConsentModal({
  visible,
  minutes,
  onActivateWithProtection,
  onActivateWithoutProtection,
  onClose,
  loading = false,
}: BurstUninstallConsentModalProps) {
  const { palette: p } = useOffline();
  const { height: windowHeight } = useWindowDimensions();

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
                maxHeight: Math.round(windowHeight * 0.85),
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
                  <Icon name="shield-lock-outline" size={20} color={p.brandPrimary} />
                </View>
                <View>
                  <Text style={[s.headerEyebrow, { color: p.brandPrimary }]}>
                    BURST INTERVENTION
                  </Text>
                  <Text style={[s.headerTitle, { color: p.textPrimary }]}>
                    Uninstall Protection
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                disabled={loading}
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
              {/* Main Explanation Card */}
              <View
                style={[
                  s.infoBox,
                  {
                    backgroundColor: p.surfaceMuted,
                    borderColor: p.borderSubtle,
                  },
                ]}
              >
                <Text style={[s.primaryText, { color: p.textPrimary }]}>
                  To support you during moments of strong urges, Restrainify can
                  temporarily lock app uninstallation for the duration of this
                  Burst session ({minutes}m).
                </Text>
                <Text style={[s.secondaryText, { color: p.textSecondary }]}>
                  Android requires activating Device Administrator to enforce this lock.
                  When your countdown finishes, Device Administrator will be automatically
                  deactivated.
                </Text>
              </View>

              {/* Guarantees List */}
              <View style={s.guaranteesList}>
                <View style={s.guaranteeRow}>
                  <Icon name="clock-check-outline" size={18} color={p.brandPrimary} />
                  <Text style={[s.guaranteeText, { color: p.textSecondary }]}>
                    <Text style={{ fontWeight: "700", color: p.textPrimary }}>
                      Auto-revoked at 0:00:
                    </Text>{" "}
                    Status is immediately revoked the millisecond your timer expires.
                  </Text>
                </View>

                <View style={s.guaranteeRow}>
                  <Icon name="shield-check-outline" size={18} color={p.brandPrimary} />
                  <Text style={[s.guaranteeText, { color: p.textSecondary }]}>
                    <Text style={{ fontWeight: "700", color: p.textPrimary }}>
                      No invasive controls:
                    </Text>{" "}
                    Restrainify uses zero enterprise policies (no wipe, lock, or camera limits).
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={s.actionsWrap}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Activate and Start Burst"
                  disabled={loading}
                  onPress={onActivateWithProtection}
                  style={({ pressed }) => [
                    s.primaryBtn,
                    {
                      backgroundColor: p.brandPrimary,
                      opacity: loading ? 0.6 : pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={p.backgroundPrimary} />
                  ) : (
                    <>
                      <Icon
                        name="shield-lock"
                        size={18}
                        color={p.backgroundPrimary}
                      />
                      <Text
                        style={[s.primaryBtnText, { color: p.backgroundPrimary }]}
                      >
                        Activate & Start Burst
                      </Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Start Without Protection"
                  disabled={loading}
                  onPress={onActivateWithoutProtection}
                  style={({ pressed }) => [
                    s.secondaryBtn,
                    {
                      backgroundColor: p.surfaceMuted,
                      borderColor: p.borderSubtle,
                      opacity: loading ? 0.6 : pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[s.secondaryBtnText, { color: p.textPrimary }]}
                  >
                    Start Without Protection
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  disabled={loading}
                  onPress={onClose}
                  style={({ pressed }) => [
                    s.cancelBtn,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[s.cancelBtnText, { color: p.textSecondary }]}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
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
  headerEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    letterSpacing: -0.3,
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
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 16,
  },
  infoBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  primaryText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  secondaryText: {
    fontSize: 13,
    lineHeight: 19,
  },
  guaranteesList: {
    gap: 12,
  },
  guaranteeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  guaranteeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  actionsWrap: {
    gap: 10,
    paddingTop: 4,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: "500",
  },
});
