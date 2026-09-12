import { Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface PasswordRecoveryScreenProps {
  onBackToLogin: () => void;
}

/**
 * ONB-04: Password Recovery Screen
 *
 * Informs the user that Restrainify uses Google OAuth exclusively,
 * eliminating passwords and password reset flows.
 */
export function PasswordRecoveryScreen({
  onBackToLogin,
}: PasswordRecoveryScreenProps) {
  const { palette: p } = useOffline();

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.headerArea}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
          onPress={onBackToLogin}
          style={[s.backBtn, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}
        >
          <Icon name="arrow-left" size={20} color={p.textPrimary} />
        </Pressable>
        <View style={s.titleWrap}>
          <Text style={[s.kicker, { color: p.textSecondary }]}>
            ACCOUNT ACCESS
          </Text>
          <Text style={[s.title, { color: p.textPrimary }]}>
            Google OAuth
          </Text>
        </View>
      </View>

      <View style={[s.formCard, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}>
        <View style={s.infoWrap}>
          <View style={[s.infoIcon, { backgroundColor: p.surfaceMuted }]}>
            <Icon name="shield-account-outline" size={32} color={p.brandPrimary} />
          </View>
          <Text style={[s.infoTitle, { color: p.textPrimary }]}>
            No password required
          </Text>
          <Text style={[s.infoBody, { color: p.textSecondary }]}>
            Restrainify exclusively uses Google OAuth for authentication. There are no passwords to manage or reset. Simply continue with your Google account.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
            onPress={onBackToLogin}
            style={({ pressed }) => [
              s.primaryBtn,
              { backgroundColor: p.brandPrimary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[s.primaryBtnText, { color: p.backgroundPrimary }]}>
              Back to sign in
            </Text>
          </Pressable>
        </View>
      </View>
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
  formCard: { borderRadius: 22, borderWidth: 1, padding: 22 },
  infoWrap: { alignItems: "center", gap: 14, paddingVertical: 8 },
  infoIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  infoTitle: { fontSize: 18, fontWeight: "700" },
  infoBody: { fontSize: 13, lineHeight: 20, textAlign: "center", maxWidth: 280 },
  primaryBtn: { width: "100%", minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
  primaryBtnText: { fontSize: 14, fontWeight: "700" },
});
