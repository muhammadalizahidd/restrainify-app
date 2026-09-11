import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { InputField } from "./WelcomeScreen";
import { signInWithEmail, signInWithGoogle } from "../../auth/authService";

export interface LoginScreenProps {
  onLoginSuccess: () => void;
  onGoToSignup: () => void;
  onGoToPasswordRecovery: () => void;
}

/**
 * ONB-03: Login Screen
 *
 * Returning user authentication with email/password and Google OAuth.
 * Requirement coverage: FR-AUTH-003, FR-AUTH-004
 *
 * Frontend → Backend mapping:
 *   authService.signInWithEmail(email, password) → stubbed
 *   On success → command("onboard") via parent to complete onboarding
 */
export function LoginScreen({
  onLoginSuccess,
  onGoToSignup,
  onGoToPasswordRecovery,
}: LoginScreenProps) {
  const { palette: p } = useOffline();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    setSubmitting(true);
    const result = await signInWithEmail(email.trim(), password);
    setSubmitting(false);
    if (result.success) {
      onLoginSuccess();
    } else {
      setError(result.error ?? "Login failed");
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
      {/* Header */}
      <View style={s.headerArea}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to sign up"
          onPress={onGoToSignup}
          style={[s.backBtn, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}
        >
          <Icon name="arrow-left" size={20} color={p.textPrimary} />
        </Pressable>
        <View style={s.titleWrap}>
          <Text style={[s.kicker, { color: p.textSecondary }]}>
            RETURNING USER
          </Text>
          <Text style={[s.title, { color: p.textPrimary }]}>Welcome back</Text>
        </View>
      </View>

      {/* Login form */}
      <View style={[s.formCard, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}>
        <InputField
          value={email}
          onChange={(v) => { setEmail(v); setError(""); }}
          placeholder="you@example.com"
          palette={p}
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <InputField
          value={password}
          onChange={(v) => { setPassword(v); setError(""); }}
          placeholder="Your password"
          palette={p}
          label="Password"
          secure
        />

        {!!error && (
          <Text style={[s.errorText, { color: p.danger }]}>{error}</Text>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log in"
          disabled={submitting}
          onPress={() => void handleLogin()}
          style={({ pressed }) => [
            s.primaryBtn,
            { backgroundColor: p.brandPrimary, opacity: submitting ? 0.5 : pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={[s.primaryBtnText, { color: p.backgroundPrimary }]}>
            {submitting ? "Logging in..." : "Log in"}
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

      {/* Password recovery */}
      <Pressable
        accessibilityRole="button"
        onPress={onGoToPasswordRecovery}
        style={s.linkRow}
      >
        <Text style={[s.linkAction, { color: p.brandPrimary }]}>
          Forgot your password?
        </Text>
      </Pressable>

      {/* Signup link */}
      <Pressable
        accessibilityRole="button"
        onPress={onGoToSignup}
        style={s.linkRow}
      >
        <Text style={[s.linkText, { color: p.textSecondary }]}>
          {"Don't have an account? "}
        </Text>
        <Text style={[s.linkAction, { color: p.brandPrimary }]}>Sign up</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 16 },
  headerArea: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  titleWrap: { flex: 1 },
  kicker: { fontSize: 9.5, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5, marginTop: 2 },
  formCard: { borderRadius: 22, borderWidth: 1, padding: 18, gap: 14 },
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
});
