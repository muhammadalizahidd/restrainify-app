import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../components/AppText";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, GradientFill, SurfaceGradient } from "../../../components/OfflineUI";

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
          style={[s.backBtn, { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle }]}
        ><SurfaceGradient />
          <Icon name="arrow-left" size={20} color={p.textPrimary} />
        </Pressable>
        <View style={s.titleWrap}>
          <Text style={[s.title, { color: p.textPrimary }]}>
            Sign in
          </Text>
        </View>
      </View>

      <View style={[s.formCard, { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle }]}><SurfaceGradient />
        <View style={s.infoWrap}>
          <View style={[s.infoIcon, { overflow: "hidden", backgroundColor: "transparent" }]}><SurfaceGradient tone="muted" />
            <Icon name="shield-account-outline" size={32} color={p.brandPrimary} />
          </View>
          <Text style={[s.infoTitle, { color: p.textPrimary }]}>
            No password required
          </Text>
          <Text style={[s.infoBody, { color: p.textSecondary }]}>
            Restrainify uses your Google account. There are no passwords to manage.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
            onPress={onBackToLogin}
            style={({ pressed }) => [
              s.primaryBtn,
              { overflow: "hidden", backgroundColor: "transparent", opacity: pressed ? 0.8 : 1 },
            ]}
          ><GradientFill />
            <Text style={[s.primaryBtnText, { color: p.actionText }]}>
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
