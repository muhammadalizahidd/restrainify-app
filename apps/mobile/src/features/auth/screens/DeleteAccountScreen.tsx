import { useState } from "react";
import { StyleSheet, Text, View, Pressable, TextInput, Alert } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface DeleteAccountScreenProps {
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * DeleteAccountScreen implements SET-ACCOUNT-02: Delete Account
 * from the Restrainify UI Architecture specification.
 *
 * Provides an authenticated destructive action for removing server-side credentials
 * while clearly educating the user that account deletion is separate from deleting
 * local on-device records.
 */
export function DeleteAccountScreen({ onBack }: DeleteAccountScreenProps) {
  const { palette: p } = useOffline();
  const [email, setEmail] = useState("ali@example.com");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDeleteAccount = () => {
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both your email and password to confirm.");
      return;
    }

    Alert.alert(
      "Permanently Delete Account?",
      "This action cannot be undone. Your server account credentials will be erased.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Account Deleted",
              "Your account has been deleted. Local protection will continue operating in offline mode.",
              [{ text: "OK", onPress: onBack }]
            );
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
            Authenticated destructive action
          </Text>
          <Text style={[styles.headerTitle, { color: p.textPrimary }]}>
            Delete account
          </Text>
        </View>
      </View>

      {/* 2. Danger Notice */}
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
          <Icon name="alert-circle-outline" size={20} color={p.danger} />
          <Text style={[styles.noticeTitle, { color: p.danger }]}>
            This deletes your account
          </Text>
        </View>
        <Text style={[styles.noticeBody, { color: p.textSecondary }]}>
          Server/account deletion is distinct from logging out or deleting
          local-only product data stored on this device.
        </Text>
      </View>

      {/* 3. Confirmation Form */}
      <View style={styles.formWrap}>
        <View style={styles.fieldWrap}>
          <Text style={[styles.fieldLabel, { color: p.textSecondary }]}>
            Confirm your email
          </Text>
          <TextInput
            accessibilityLabel="Confirm your email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[
              styles.input,
              {
                backgroundColor: p.surfacePrimary,
                borderColor: p.borderSubtle,
                color: p.textPrimary,
              },
            ]}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.fieldLabel, { color: p.textSecondary }]}>
            Password
          </Text>
          <TextInput
            accessibilityLabel="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={p.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: p.surfacePrimary,
                borderColor: p.borderSubtle,
                color: p.textPrimary,
              },
            ]}
          />
        </View>

        {errorMessage && (
          <Text style={[styles.errorText, { color: p.danger }]}>
            {errorMessage}
          </Text>
        )}
      </View>

      {/* 4. Action Buttons */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Permanently delete account"
        onPress={handleDeleteAccount}
        style={[styles.dangerButton, { backgroundColor: p.danger }]}
      >
        <Text style={styles.dangerButtonText}>
          Permanently delete account
        </Text>
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
  formWrap: {
    gap: 14,
    marginTop: 4,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
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
    marginTop: 8,
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
