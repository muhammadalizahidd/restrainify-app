import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { InputField } from "./WelcomeScreen";
import { sendPasswordReset, validateEmail } from "../../auth/authService";

export interface PasswordRecoveryScreenProps {
  onBackToLogin: () => void;
}

/**
 * ONB-04: Password Recovery Screen
 *
 * Sends a password reset link to the provided email address.
 * Security: always shows success regardless of whether the email exists.
 * Requirement coverage: FR-AUTH-005
 *
 * Frontend → Backend mapping:
 *   authService.sendPasswordReset(email) → stubbed (always success)
 */
export function PasswordRecoveryScreen({
  onBackToLogin,
}: PasswordRecoveryScreenProps) {
  const { palette: p } = useOffline();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSend = async () => {
    setError("");
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    setSubmitting(true);
    const result = await sendPasswordReset(email.trim());
    setSubmitting(false);
    if (result.success) {
      setSent(true);
    } else {
      setError(result.error ?? "Could not send reset link");
    }
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.headerArea}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to login"
          onPress={onBackToLogin}
          style={[s.backBtn, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}
        >
          <Icon name="arrow-left" size={20} color={p.textPrimary} />
        </Pressable>
        <View style={s.titleWrap}>
          <Text style={[s.kicker, { color: p.textSecondary }]}>
            ACCOUNT RECOVERY
          </Text>
          <Text style={[s.title, { color: p.textPrimary }]}>
            Reset password
          </Text>
        </View>
      </View>

      <View style={[s.formCard, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}>
        {sent ? (
          /* Success state */
          <View style={s.sentWrap}>
            <View style={[s.sentIcon, { backgroundColor: p.successSurface }]}>
              <Icon name="email-check-outline" size={28} color={p.success} />
            </View>
            <Text style={[s.sentTitle, { color: p.textPrimary }]}>
              Check your email
            </Text>
            <Text style={[s.sentBody, { color: p.textSecondary }]}>
              If an account exists for {email.trim()}, a password reset link has
              been sent. Check your inbox and spam folder.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onBackToLogin}
              style={({ pressed }) => [
                s.primaryBtn,
                { backgroundColor: p.brandPrimary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[s.primaryBtnText, { color: p.backgroundPrimary }]}>
                Back to login
              </Text>
            </Pressable>
          </View>
        ) : (
          /* Input state */
          <>
            <Text style={[s.explanation, { color: p.textSecondary }]}>
              Enter the email address associated with your account. We will send
              a link to reset your password.
            </Text>

            <InputField
              value={email}
              onChange={(v) => { setEmail(v); setError(""); }}
              placeholder="you@example.com"
              palette={p}
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              error={error}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send reset link"
              disabled={submitting}
              onPress={() => void handleSend()}
              style={({ pressed }) => [
                s.primaryBtn,
                { backgroundColor: p.brandPrimary, opacity: submitting ? 0.5 : pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[s.primaryBtnText, { color: p.backgroundPrimary }]}>
                {submitting ? "Sending..." : "Send reset link"}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Back to login */}
      {!sent && (
        <Pressable
          accessibilityRole="button"
          onPress={onBackToLogin}
          style={s.linkRow}
        >
          <Text style={[s.linkAction, { color: p.brandPrimary }]}>
            Back to login
          </Text>
        </Pressable>
      )}
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
  explanation: { fontSize: 13, lineHeight: 20 },
  primaryBtn: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontSize: 14, fontWeight: "700" },
  sentWrap: { alignItems: "center", gap: 12, paddingVertical: 8 },
  sentIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  sentTitle: { fontSize: 18, fontWeight: "700" },
  sentBody: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  linkRow: { flexDirection: "row", justifyContent: "center", paddingVertical: 4 },
  linkAction: { fontSize: 13, fontWeight: "700" },
});
