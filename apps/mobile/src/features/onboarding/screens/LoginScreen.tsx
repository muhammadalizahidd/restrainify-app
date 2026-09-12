import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { useAuth } from "../../auth";

export interface LoginScreenProps {
  onLoginSuccess: () => void;
  onGoToSignup: () => void;
  onGoToPasswordRecovery?: () => void;
}

/**
 * ONB-03: Login Screen
 *
 * Returning user authentication via Google OAuth.
 * Requirement coverage: FR-AUTH-003, FR-AUTH-004
 * OAuth-only: authenticates exclusively via Google OAuth.
 */
export function LoginScreen({
  onLoginSuccess,
  onGoToSignup,
}: LoginScreenProps) {
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
        onLoginSuccess();
      }
    } finally {
      setGoogleLoading(false);
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

      {/* OAuth Card */}
      <View style={[s.formCard, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}>
        <Text style={[s.formTitle, { color: p.textPrimary }]}>
          Sign in with Google
        </Text>
        <Text style={[s.cardSubtitle, { color: p.textSecondary }]}>
          Connect your Google account to restore your cloud backup, streak history, and protection rules.
        </Text>

        {!!authError && (
          <Text style={[s.errorText, { color: p.danger }]}>{authError}</Text>
        )}

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

      {/* Signup link */}
      <Pressable
        accessibilityRole="button"
        onPress={onGoToSignup}
        style={s.linkRow}
      >
        <Text style={[s.linkText, { color: p.textSecondary }]}>
          {"New to Restrainify? "}
        </Text>
        <Text style={[s.linkAction, { color: p.brandPrimary }]}>Get started</Text>
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
  formTitle: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  cardSubtitle: { fontSize: 13, lineHeight: 18 },
  errorText: { fontSize: 12, fontWeight: "500" },
  googleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 50, borderRadius: 14, borderWidth: 1 },
  googleBtnText: { fontSize: 13, fontWeight: "700" },
  linkRow: { flexDirection: "row", justifyContent: "center", paddingVertical: 4 },
  linkText: { fontSize: 13 },
  linkAction: { fontSize: 13, fontWeight: "700" },
});
