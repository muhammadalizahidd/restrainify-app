import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { useAuth } from "../../auth";

export interface WelcomeScreenProps {
  onSignupSuccess: () => void;
  onGoToLogin: () => void;
}

/**
 * ONB-01: Welcome & Entry Screen
 *
 * Value proposition, OAuth entry point, and privacy guarantees.
 * OAuth-only: authenticates exclusively via Google OAuth.
 */
export function WelcomeScreen({
  onSignupSuccess,
  onGoToLogin,
}: WelcomeScreenProps) {
  const { palette: p } = useOffline();
  const { signInWithGoogle, error: authError, clearError } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (authError) {
      Alert.alert("Google Sign-In", authError);
    }
  }, [authError]);

  const handleGoogle = async () => {
    clearError();
    setGoogleLoading(true);
    try {
      const success = await signInWithGoogle();
      if (success) {
        onSignupSuccess();
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={s.container}>
      {/* Brand header */}
      <View style={s.brandArea}>
        <View style={[s.brandRow]}>
          <Icon name="shield-check" size={28} color={p.brandPrimary} />
          <Text style={[s.brandName, { color: p.textPrimary }]}>
            Restrainify
          </Text>
        </View>
        <Text style={[s.headline, { color: p.textPrimary }]}>
          More room for real life.
        </Text>
        <Text style={[s.subheadline, { color: p.textSecondary }]}>
          Build boundaries around the apps and websites that pull you away.
        </Text>
      </View>

      {/* OAuth Card */}
      <View style={[s.formCard, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}>
        <Text style={[s.formTitle, { color: p.textPrimary }]}>
          Get started with Google
        </Text>
        <Text style={[s.cardSubtitle, { color: p.textSecondary }]}>
          Connect your Google account to back up your streaks, recovery milestones, and protection boundaries.
        </Text>

        <View style={s.benefitsList}>
          <View style={s.benefitRow}>
            <Icon name="cloud-check-outline" size={18} color={p.success} />
            <Text style={[s.benefitText, { color: p.textSecondary }]}>
              Encrypted cloud backup for recovery streaks
            </Text>
          </View>
          <View style={s.benefitRow}>
            <Icon name="devices" size={18} color={p.brandPrimary} />
            <Text style={[s.benefitText, { color: p.textSecondary }]}>
              Sync custom rules across your devices
            </Text>
          </View>
          <View style={s.benefitRow}>
            <Icon name="shield-lock-outline" size={18} color={p.brandPrimary} />
            <Text style={[s.benefitText, { color: p.textSecondary }]}>
              Private by design: zero browsing history stored
            </Text>
          </View>
        </View>

        {!!authError && (
          <Text style={[s.errorText, { color: p.danger }]}>{authError}</Text>
        )}

        {/* Google OAuth Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          disabled={googleLoading}
          onPress={() => void handleGoogle()}
          style={({ pressed }) => [
            s.googleBtn,
            {
              backgroundColor: p.brandPrimary,
              borderColor: p.brandPrimary,
              opacity: googleLoading ? 0.6 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color={p.backgroundPrimary} />
          ) : (
            <>
              <Icon name="google" size={18} color={p.backgroundPrimary} />
              <Text style={[s.googleBtnText, { color: p.backgroundPrimary }]}>
                Continue with Google
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Returning user link */}
      <Pressable
        accessibilityRole="button"
        onPress={onGoToLogin}
        style={s.linkRow}
      >
        <Text style={[s.linkText, { color: p.textSecondary }]}>
          Already set up?{" "}
        </Text>
        <Text style={[s.linkAction, { color: p.brandPrimary }]}>Sign in</Text>
      </Pressable>

      {/* Privacy note */}
      <View style={[s.privacyCard, { backgroundColor: p.surfaceMuted }]}>
        <Icon name="lock-outline" size={14} color={p.textMuted} />
        <Text style={[s.privacyText, { color: p.textMuted }]}>
          Your protection data stays encrypted on this device.
        </Text>
      </View>
    </View>
  );
}

// ---------- Shared Input Component ----------

interface InputFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  palette: Record<string, string>;
  error?: string;
  secure?: boolean;
  label?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address" | "number-pad";
}

/**
 * Reusable form input for onboarding screens.
 * Kept in-file because it is only used by auth/onboarding screens,
 * not the main app UI which uses OfflineUI.Field.
 */
export function InputField({
  value,
  onChange,
  placeholder,
  palette: p,
  error,
  secure = false,
  label,
  autoCapitalize = "none",
  keyboardType = "default",
}: InputFieldProps) {
  return (
    <View style={s.fieldWrap}>
      {label && (
        <Text style={[s.fieldLabel, { color: p.textSecondary }]}>{label}</Text>
      )}
      <TextInput
        accessibilityLabel={label ?? placeholder}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={p.textMuted}
        secureTextEntry={secure}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        maxLength={253}
        style={[
          s.textInput,
          {
            borderColor: error ? p.danger : p.borderSubtle,
            backgroundColor: p.backgroundPrimary,
            color: p.textPrimary,
          },
        ]}
      />
      {error && (
        <Text style={[s.fieldError, { color: p.danger }]}>{error}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 16 },
  brandArea: { gap: 8, marginBottom: 8 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandName: { fontSize: 22, fontWeight: "700", letterSpacing: -0.6 },
  headline: { fontSize: 28, fontWeight: "700", letterSpacing: -1, marginTop: 12 },
  subheadline: { fontSize: 14, lineHeight: 21 },
  formCard: { borderRadius: 22, borderWidth: 1, padding: 18, gap: 14 },
  formTitle: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  cardSubtitle: { fontSize: 13, lineHeight: 18 },
  benefitsList: { gap: 10, marginVertical: 4 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  benefitText: { fontSize: 12.5, lineHeight: 17, flex: 1 },
  fieldWrap: { gap: 5 },
  fieldLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 48 },
  input: { flex: 1, fontSize: 14 },
  textInput: { borderWidth: 1, borderRadius: 12, minHeight: 48, paddingHorizontal: 14, fontSize: 14 },
  fieldError: { fontSize: 11, fontWeight: "500" },
  errorText: { fontSize: 12, fontWeight: "500" },
  primaryBtn: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontSize: 14, fontWeight: "700" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 11, fontWeight: "500" },
  googleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 50, borderRadius: 14, borderWidth: 1 },
  googleBtnText: { fontSize: 13, fontWeight: "700" },
  linkRow: { flexDirection: "row", justifyContent: "center", paddingVertical: 4 },
  linkText: { fontSize: 13 },
  linkAction: { fontSize: 13, fontWeight: "700" },
  privacyCard: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, padding: 12 },
  privacyText: { fontSize: 10.5, lineHeight: 15, flex: 1 },
});
