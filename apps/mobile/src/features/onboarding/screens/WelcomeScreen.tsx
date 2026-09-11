import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import {
  signUpWithEmail,
  signInWithGoogle,
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
} from "../../auth/authService";

export interface WelcomeScreenProps {
  onSignupSuccess: () => void;
  onGoToLogin: () => void;
}

/**
 * ONB-01: Welcome & Entry Screen
 *
 * Value proposition, email/password signup, and Google OAuth entry point.
 * Requirement coverage: FR-ONB-008, FR-AUTH-001, FR-AUTH-002
 *
 * Frontend → Backend mapping:
 *   authService.signUpWithEmail(email, password) → stubbed
 *   authService.signInWithGoogle() → stubbed with "coming soon" alert
 */
export function WelcomeScreen({
  onSignupSuccess,
  onGoToLogin,
}: WelcomeScreenProps) {
  const { palette: p } = useOffline();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const emailErr = validateEmail(email);
    if (emailErr) next.email = emailErr;
    const passErr = validatePassword(password);
    if (passErr) next.password = passErr;
    const confirmErr = validatePasswordConfirm(password, confirm);
    if (confirmErr) next.confirm = confirmErr;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const result = await signUpWithEmail(email.trim(), password);
    setSubmitting(false);
    if (result.success) {
      onSignupSuccess();
    } else {
      setErrors({ form: result.error ?? "Signup failed" });
    }
  };

  const handleGoogle = async () => {
    const result = await signInWithGoogle();
    if (!result.success) {
      Alert.alert(
        "Google Sign-In",
        result.error ?? "Google sign-in is not available yet.",
      );
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

      {/* Signup form */}
      <View style={[s.formCard, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}>
        <Text style={[s.formTitle, { color: p.textPrimary }]}>
          Create your account
        </Text>

        {/* Email */}
        <View style={s.fieldWrap}>
          <Text style={[s.fieldLabel, { color: p.textSecondary }]}>Email</Text>
          <View style={[s.inputRow, { borderColor: errors.email ? p.danger : p.borderSubtle, backgroundColor: p.backgroundPrimary }]}>
            <Icon name="email-outline" size={18} color={p.textMuted} />
            <Text
              style={[s.input, { color: p.textPrimary }]}
              accessibilityLabel="Email address"
            >
              {/* Using a Pressable-wrapped TextInput-like view for consistency */}
            </Text>
          </View>
          {/* Actual TextInput */}
          <InputField
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            palette={p}
            error={errors.email}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Password */}
        <View style={s.fieldWrap}>
          <InputField
            value={password}
            onChange={setPassword}
            placeholder="Minimum 8 characters"
            palette={p}
            error={errors.password}
            secure
            label="Password"
          />
        </View>

        {/* Confirm Password */}
        <View style={s.fieldWrap}>
          <InputField
            value={confirm}
            onChange={setConfirm}
            placeholder="Re-enter your password"
            palette={p}
            error={errors.confirm}
            secure
            label="Confirm password"
          />
        </View>

        {/* Form-level error */}
        {errors.form && (
          <Text style={[s.errorText, { color: p.danger }]}>{errors.form}</Text>
        )}

        {/* Signup button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create account"
          disabled={submitting}
          onPress={() => void handleSignup()}
          style={({ pressed }) => [
            s.primaryBtn,
            { backgroundColor: p.brandPrimary, opacity: submitting ? 0.5 : pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={[s.primaryBtnText, { color: p.backgroundPrimary }]}>
            {submitting ? "Creating account..." : "Create account"}
          </Text>
        </Pressable>

        {/* Divider */}
        <View style={s.dividerRow}>
          <View style={[s.dividerLine, { backgroundColor: p.borderSubtle }]} />
          <Text style={[s.dividerText, { color: p.textMuted }]}>or</Text>
          <View style={[s.dividerLine, { backgroundColor: p.borderSubtle }]} />
        </View>

        {/* Google OAuth */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          onPress={() => void handleGoogle()}
          style={({ pressed }) => [
            s.googleBtn,
            { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Icon name="google" size={18} color={p.textPrimary} />
          <Text style={[s.googleBtnText, { color: p.textPrimary }]}>
            Continue with Google
          </Text>
        </Pressable>
      </View>

      {/* Login link */}
      <Pressable
        accessibilityRole="button"
        onPress={onGoToLogin}
        style={s.linkRow}
      >
        <Text style={[s.linkText, { color: p.textSecondary }]}>
          Already have an account?{" "}
        </Text>
        <Text style={[s.linkAction, { color: p.brandPrimary }]}>Log in</Text>
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
  formTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
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
