import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { useAuth } from "../context/AuthContext";

export interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * DeleteAccountModal renders a centered, beautifully proportioned dialog
 * for permanently deleting the server account and cloud data.
 *
 * Adheres to the shared modal design system:
 * - Centered dialog (maxWidth: 375, borderRadius: 24, borderWidth: 1.2, elevation: 24)
 * - Pinned header with icon, title, subtitle, and close button
 * - Scrollable body with danger warning, account details, confirmation input, and actions
 * - Requires typing "DELETE" to prevent accidental data loss.
 */
export function DeleteAccountModal({ visible, onClose }: DeleteAccountModalProps) {
  const { palette: p } = useOffline();
  const { user, deleteAccount } = useAuth();
  const { height: windowHeight } = useWindowDimensions();

  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmation.trim().toUpperCase() === "DELETE";

  const handleClose = () => {
    setConfirmation("");
    setErrorMessage(null);
    onClose();
  };

  const handleDelete = () => {
    setErrorMessage(null);

    if (!isConfirmed) {
      setErrorMessage('Please type "DELETE" to confirm.');
      return;
    }

    Alert.alert(
      "Permanently Delete Account?",
      "This action cannot be undone. Your server account credentials and cloud backup will be erased.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAccount();
              handleClose();
              Alert.alert(
                "Account Deleted",
                "Your account has been deleted. Local protection will continue operating in offline mode."
              );
            } catch (err) {
              setErrorMessage(
                err instanceof Error ? err.message : "Failed to delete account"
              );
            } finally {
              setIsDeleting(false);
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
      onRequestClose={handleClose}
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
                  <Icon name="account-remove-outline" size={20} color={p.danger} />
                </View>
                <View>
                  <Text style={[s.headerTitle, { color: p.textPrimary }]}>
                    Delete account
                  </Text>
                  <Text style={[s.headerSubtitle, { color: p.textSecondary }]}>
                    Permanent server account removal
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                onPress={handleClose}
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
              keyboardShouldPersistTaps="handled"
            >
              {/* Danger Warning Banner */}
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
                    This deletes your account
                  </Text>
                </View>
                <Text style={[s.noticeBody, { color: p.textSecondary }]}>
                  Server account deletion permanently removes your profile, cloud sync
                  records, and backed-up settings from the server. Local protection will
                  continue operating in offline mode.
                </Text>
              </View>

              {/* Connected Google Account Information */}
              <View style={s.fieldWrap}>
                <Text style={[s.fieldLabel, { color: p.textSecondary }]}>
                  Connected Google account
                </Text>
                <View
                  style={[
                    s.staticField,
                    {
                      backgroundColor: p.surfaceMuted,
                      borderColor: p.borderSubtle,
                    },
                  ]}
                >
                  <Icon name="google" size={16} color={p.textSecondary} />
                  <Text
                    style={[s.staticFieldText, { color: p.textPrimary }]}
                    numberOfLines={1}
                  >
                    {user?.email || "Google OAuth Account"}
                  </Text>
                </View>
              </View>

              {/* Confirmation Input */}
              <View style={s.fieldWrap}>
                <Text style={[s.fieldLabel, { color: p.textSecondary }]}>
                  Type &quot;DELETE&quot; to confirm
                </Text>
                <TextInput
                  accessibilityLabel="Type DELETE to confirm"
                  value={confirmation}
                  onChangeText={(v) => {
                    setConfirmation(v);
                    setErrorMessage(null);
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="DELETE"
                  placeholderTextColor={p.textMuted}
                  style={[
                    s.input,
                    {
                      backgroundColor: p.surfacePrimary,
                      borderColor: isConfirmed ? p.danger : p.borderSubtle,
                      color: p.textPrimary,
                    },
                  ]}
                />
              </View>

              {errorMessage && (
                <Text style={[s.errorText, { color: p.danger }]}>
                  {errorMessage}
                </Text>
              )}

              {/* Permanently Delete Account Red Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Permanently delete account"
                disabled={!isConfirmed || isDeleting}
                onPress={handleDelete}
                style={({ pressed }) => [
                  s.dangerButton,
                  {
                    backgroundColor: isConfirmed ? p.danger : p.borderSubtle,
                    opacity: !isConfirmed ? 0.6 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.dangerButtonText}>
                    Permanently delete account
                  </Text>
                )}
              </Pressable>

              {/* Cancel Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                onPress={handleClose}
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
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  staticField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  staticFieldText: {
    fontSize: 12.5,
    fontWeight: "600",
    flex: 1,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1.2,
    paddingHorizontal: 14,
    fontSize: 13.5,
    fontWeight: "700",
    letterSpacing: 1,
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
