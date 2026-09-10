import { StyleSheet, Text, View, Pressable, Alert } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface AccountScreenProps {
  open: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * AccountScreen implements SET-ACCOUNT-01: Account & Profile Screen
 * from the Restrainify UI Architecture specification.
 *
 * It provides local account identity, security credential management,
 * and authenticated destructive actions, emphasizing that local protection
 * operates independently of cloud connectivity.
 */
export function AccountScreen({ onBack }: AccountScreenProps) {
  const { palette: p } = useOffline();

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Logging out does not disable local website or app protection on this device.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: () => onBack?.() },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Permanently deleting your account removes your server profile. Local protection configuration remains until device reset.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Deletion",
          style: "destructive",
          onPress: () => onBack?.(),
        },
      ]
    );
  };

  return (
    <View style={s.container}>
      {/* 1. Subscreen Header */}
      <View style={s.headerRow}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[
              s.backButton,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={s.titleWrap}>
          <Text style={[s.headerKicker, { color: p.textSecondary }]}>
            Authentication & lifecycle
          </Text>
          <Text style={[s.headerTitle, { color: p.textPrimary }]}>
            Account
          </Text>
        </View>
      </View>

      {/* 2. User Profile Card */}
      <View
        style={[
          s.profileCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <View style={[s.avatarFrame, { backgroundColor: p.brandPrimary }]}>
          <Text style={s.avatarLetter}>A</Text>
        </View>
        <View style={s.profileCopy}>
          <Text style={[s.profileName, { color: p.textPrimary }]}>Ali</Text>
          <Text style={[s.profileEmail, { color: p.textSecondary }]}>
            ali@example.com · Google + email
          </Text>
        </View>
      </View>

      {/* 3. Security Section */}
      <View style={s.sectionWrap}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Security</Text>
        <View
          style={[
            s.rowList,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          {/* Row 1: Password */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Password: Manage email-account password"
            style={({ pressed }) => [
              s.row,
              { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.borderSubtle },
              pressed && { backgroundColor: p.surfaceMuted },
            ]}
          >
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="key-outline" size={20} color={p.brandPrimary} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Password</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
                Manage email-account password
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={p.textMuted} />
          </Pressable>

          {/* Row 2: Session */}
          <View style={s.row}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="cloud-outline" size={20} color={p.brandPrimary} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Session</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
                Signed in securely
              </Text>
            </View>
            <View style={[s.pillGood, { backgroundColor: p.successSurface }]}>
              <Text style={[s.pillGoodText, { color: p.success }]}>Current</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 4. Account Actions Section */}
      <View style={s.sectionWrap}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Account</Text>
        <View style={s.buttonStack}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={handleLogout}
            style={({ pressed }) => [
              s.actionBtn,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
              pressed && { backgroundColor: p.surfaceMuted },
            ]}
          >
            <Text style={[s.actionBtnText, { color: p.textPrimary }]}>Log out</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Permanently delete account"
            onPress={handleDeleteAccount}
            style={({ pressed }) => [
              s.dangerBtn,
              { backgroundColor: p.dangerSurface, borderColor: p.danger },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[s.dangerBtnText, { color: p.danger }]}>Delete account</Text>
          </Pressable>
        </View>
      </View>

      {/* 5. Local Protection Invariant Note */}
      <View style={[s.footnoteCard, { backgroundColor: p.surfaceMuted }]}>
        <Text style={[s.footnoteText, { color: p.textSecondary }]}>
          Temporary auth/network issues do not automatically switch off existing local protection.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  titleWrap: {
    flex: 1,
  },
  headerKicker: {
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginTop: 2,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginTop: 6,
  },
  avatarFrame: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  profileCopy: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: "700",
  },
  profileEmail: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },
  sectionWrap: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.2,
    marginBottom: 8,
    marginHorizontal: 2,
  },
  rowList: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  copyBox: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 17,
  },
  rowSubtitle: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  pillGood: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  pillGoodText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  buttonStack: {
    gap: 10,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  dangerBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  footnoteCard: {
    borderRadius: 16,
    padding: 13,
    marginTop: 10,
    marginBottom: 12,
  },
  footnoteText: {
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "500",
  },
});
