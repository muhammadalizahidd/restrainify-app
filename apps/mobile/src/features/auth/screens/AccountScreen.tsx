import { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { useAuth } from "../context/AuthContext";
import { useSync } from "../../sync/context/SyncContext";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { ResetLocalDataModal } from "../../settings/components/ResetLocalDataModal";
import { DeleteAccountModal } from "../components/DeleteAccountModal";

export interface AccountScreenProps {
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * AccountScreen implements the refined Settings & Account Screen.
 *
 * Requirements fulfilled:
 * 1. Replaced the settings page with this Account Settings experience.
 * 2. Removed technical jargon: eliminated Session & Identity Provider.
 * 3. Cloud Synchronization: converted action buttons into an intuitive toggle Switch.
 * 4. Terms and conditions button: directly opens https://restrainify.com/privacy in browser.
 * 5. Log out button: styled in prominent red danger styling.
 * 6. Delete local data: triggers a centered pop-up modal.
 * 7. Delete account: triggers a centered pop-up modal.
 */
export function AccountScreen({ open, onBack }: AccountScreenProps) {
  const { palette: p } = useOffline();
  const {
    status,
    user,
    profile,
    error,
    clearError,
    signInWithGoogle,
    signOut,
  } = useAuth();
  const { syncState, setCloudSyncEnabled } = useSync();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [resetLocalModalVisible, setResetLocalModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);

  const isAuthenticated = status === "authenticated" && Boolean(user);
  const isLoading = status === "loading" || Boolean(busyAction);

  const handleSignIn = async () => {
    setBusyAction("signin");
    try {
      await signInWithGoogle();
    } finally {
      setBusyAction(null);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign out of Google Account?",
      "Cloud synchronization will stop. Your local protection settings and encrypted history will stay on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => {
            setBusyAction("signout");
            void signOut().finally(() => setBusyAction(null));
          },
        },
      ]
    );
  };

  const handleOpenPrivacyPolicy = async () => {
    const url = "https://restrainify.com/privacy";
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Unable to Open Link",
        "Please visit https://restrainify.com/privacy in your web browser."
      );
    }
  };

  const displayName = profile?.fullName || user?.fullName || "Google Account";
  const avatarLetter = (displayName || "A")[0]?.toUpperCase() ?? "A";

  return (
    <View style={s.container}>
      {/* 1. Header Row */}
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
            Preferences & Profile
          </Text>
          <Text style={[s.headerTitle, { color: p.textPrimary }]}>Settings</Text>
        </View>
      </View>

      {/* Error / Notice Alert */}
      {error && (
        <View
          accessibilityRole="alert"
          style={[s.errorCard, { backgroundColor: p.dangerSurface, borderColor: p.danger }]}
        >
          <Text style={[s.errorTitle, { color: p.danger }]}>Account notice</Text>
          <Text style={[s.errorDetail, { color: p.textPrimary }]}>{error}</Text>
          <Pressable
            onPress={clearError}
            style={[s.dismissButton, { borderColor: p.borderSubtle, backgroundColor: p.surfacePrimary }]}
          >
            <Text style={[s.dismissText, { color: p.textPrimary }]}>Dismiss</Text>
          </Pressable>
        </View>
      )}

      {isAuthenticated && user ? (
        <>
          {/* 2. User Profile Card */}
          <View
            style={[
              s.profileCard,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <View style={[s.avatarFrame, { backgroundColor: p.brandPrimary }]}>
              <Text style={s.avatarLetter}>{avatarLetter}</Text>
            </View>
            <View style={s.profileCopy}>
              <Text style={[s.profileName, { color: p.textPrimary }]}>
                {displayName}
              </Text>
              <Text style={[s.profileEmail, { color: p.textSecondary }]}>
                {user.email || "No email available"} · Google Account
              </Text>
            </View>
          </View>

          {/* 3. Synchronization & Cloud Backup (With Switch Toggle) */}
          <View style={s.sectionWrap}>
            <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
              Cloud Synchronization
            </Text>
            <View
              style={[
                s.syncCard,
                { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
              ]}
            >
              <View style={s.syncHeaderRow}>
                <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
                  <Icon
                    name={
                      syncState.status === "syncing"
                        ? "sync"
                        : syncState.status === "offline"
                        ? "cloud-off-outline"
                        : syncState.status === "error"
                        ? "alert-circle-outline"
                        : "cloud-check-outline"
                    }
                    size={22}
                    color={
                      syncState.status === "error"
                        ? p.danger
                        : syncState.status === "syncing"
                        ? p.brandPrimary
                        : p.success
                    }
                  />
                </View>
                <View style={s.copyBox}>
                  <Text style={[s.rowTitle, { color: p.textPrimary }]}>
                    {syncState.status === "syncing"
                      ? "Syncing in progress…"
                      : syncState.status === "offline"
                      ? "Offline mode"
                      : syncState.status === "error"
                      ? "Sync attention required"
                      : "Cloud Backup"}
                  </Text>
                  <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
                    {syncState.lastSyncedAt
                      ? `Last synced: ${new Date(syncState.lastSyncedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : "Ready to sync"}
                    {syncState.pendingCount > 0
                      ? ` · ${syncState.pendingCount} pending`
                      : ""}
                  </Text>
                </View>

                {/* Cloud Sync Toggle */}
                <Switch
                  accessibilityLabel="Toggle cloud synchronization"
                  value={syncState.cloudSyncEnabled}
                  onValueChange={(val) => void setCloudSyncEnabled(val)}
                  trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {syncState.lastError && (
                <Text style={{ color: p.danger, fontSize: 11, marginTop: 2 }}>
                  Notice: {syncState.lastError}
                </Text>
              )}

              <Text style={[s.syncExplainer, { color: p.textSecondary }]}>
                Recovery streaks, milestones, focus coins, and custom domain rules synchronize
                automatically when online. Protection rules remain 100% active offline.
              </Text>
            </View>
          </View>

          {/* 4. Account Actions Section */}
          <View style={s.sectionWrap}>
            <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Account</Text>
            <View style={s.buttonStack}>
              {/* Terms and conditions button (Above Logout) */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Terms and conditions"
                onPress={() => void handleOpenPrivacyPolicy()}
                style={({ pressed }) => [
                  s.termsBtn,
                  { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
                  pressed && { backgroundColor: p.surfaceMuted },
                ]}
              >
                <View style={[s.termsIconBox, { backgroundColor: p.surfaceMuted }]}>
                  <Icon name="file-document-outline" size={19} color={p.brandPrimary} />
                </View>
                <View style={s.termsCopy}>
                  <Text style={[s.termsTitle, { color: p.textPrimary }]}>
                    Terms and conditions
                  </Text>
                  <Text style={[s.termsSubtitle, { color: p.textSecondary }]}>
                    Privacy policy, data protection & offline security
                  </Text>
                </View>
                <Icon name="open-in-new" size={17} color={p.textMuted} />
              </Pressable>

              {/* Red Logout Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign out of Google Account"
                disabled={isLoading}
                onPress={handleSignOut}
                style={({ pressed }) => [
                  s.logoutBtn,
                  { backgroundColor: p.dangerSurface, borderColor: p.danger },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Icon name="logout" size={17} color={p.danger} />
                <Text style={[s.logoutBtnText, { color: p.danger }]}>
                  {busyAction === "signout" ? "Signing out…" : "Log out"}
                </Text>
              </Pressable>

              {/* Data & Account Deletion Actions */}
              <View
                style={[
                  s.actionCard,
                  { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete local data"
                  onPress={() => setResetLocalModalVisible(true)}
                  style={({ pressed }) => [
                    s.actionRow,
                    {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: p.borderSubtle,
                    },
                    pressed && { backgroundColor: p.surfaceMuted },
                  ]}
                >
                  <View style={[s.actionIconBox, { backgroundColor: p.dangerSurface }]}>
                    <Icon name="trash-can-outline" size={18} color={p.danger} />
                  </View>
                  <View style={s.actionCopy}>
                    <Text style={[s.actionTitle, { color: p.textPrimary }]}>
                      Delete local data
                    </Text>
                    <Text style={[s.actionSubtitle, { color: p.textSecondary }]}>
                      Resets on-device records and preferences
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={18} color={p.textMuted} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete account"
                  onPress={() => setDeleteAccountModalVisible(true)}
                  style={({ pressed }) => [
                    s.actionRow,
                    pressed && { backgroundColor: p.surfaceMuted },
                  ]}
                >
                  <View style={[s.actionIconBox, { backgroundColor: p.dangerSurface }]}>
                    <Icon name="account-remove-outline" size={18} color={p.danger} />
                  </View>
                  <View style={s.actionCopy}>
                    <Text style={[s.actionTitle, { color: p.danger }]}>
                      Delete account
                    </Text>
                    <Text style={[s.actionSubtitle, { color: p.textSecondary }]}>
                      Permanent server account removal
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={18} color={p.textMuted} />
                </Pressable>
              </View>
            </View>
          </View>
        </>
      ) : (
        <>
          {/* Offline Mode / Connect Google Account Section */}
          <View
            style={[
              s.offlineCard,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <View style={[s.offlineIconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="cloud-off-outline" size={32} color={p.textSecondary} />
            </View>
            <Text style={[s.offlineTitle, { color: p.textPrimary }]}>
              Operating in Offline Mode
            </Text>
            <Text style={[s.offlineBody, { color: p.textSecondary }]}>
              Your recovery progress is stored securely on this phone. Sign in with Google to
              back up your streak, milestones, and focus coins across device updates.
            </Text>

            <GoogleSignInButton
              label="Connect with Google"
              loading={isLoading}
              onPress={() => void handleSignIn()}
            />
          </View>

          {/* Terms and conditions & Delete local data */}
          <View style={s.sectionWrap}>
            <View style={s.buttonStack}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Terms and conditions"
                onPress={() => void handleOpenPrivacyPolicy()}
                style={({ pressed }) => [
                  s.termsBtn,
                  { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
                  pressed && { backgroundColor: p.surfaceMuted },
                ]}
              >
                <View style={[s.termsIconBox, { backgroundColor: p.surfaceMuted }]}>
                  <Icon name="file-document-outline" size={19} color={p.brandPrimary} />
                </View>
                <View style={s.termsCopy}>
                  <Text style={[s.termsTitle, { color: p.textPrimary }]}>
                    Terms and conditions
                  </Text>
                  <Text style={[s.termsSubtitle, { color: p.textSecondary }]}>
                    Privacy policy, data protection & offline security
                  </Text>
                </View>
                <Icon name="open-in-new" size={17} color={p.textMuted} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete local data"
                onPress={() => setResetLocalModalVisible(true)}
                style={({ pressed }) => [
                  s.termsBtn,
                  { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
                  pressed && { backgroundColor: p.surfaceMuted },
                ]}
              >
                <View style={[s.actionIconBox, { backgroundColor: p.dangerSurface }]}>
                  <Icon name="trash-can-outline" size={18} color={p.danger} />
                </View>
                <View style={s.actionCopy}>
                  <Text style={[s.actionTitle, { color: p.textPrimary }]}>
                    Delete local data
                  </Text>
                  <Text style={[s.actionSubtitle, { color: p.textSecondary }]}>
                    Resets on-device records and preferences
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color={p.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* Privacy Guarantees */}
          <View style={s.sectionWrap}>
            <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
              Your privacy is guaranteed
            </Text>
            <View
              style={[
                s.guaranteesCard,
                { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
              ]}
            >
              <View style={s.guaranteeRow}>
                <Icon name="check" size={16} color={p.success} />
                <Text style={[s.guaranteeText, { color: p.textSecondary }]}>
                  No full URLs or browsing histories leave your phone.
                </Text>
              </View>
              <View style={s.guaranteeRow}>
                <Icon name="check" size={16} color={p.success} />
                <Text style={[s.guaranteeText, { color: p.textSecondary }]}>
                  No screenshots, text, or visual frames are uploaded.
                </Text>
              </View>
              <View style={s.guaranteeRow}>
                <Icon name="check" size={16} color={p.success} />
                <Text style={[s.guaranteeText, { color: p.textSecondary }]}>
                  All protection features operate offline indefinitely.
                </Text>
              </View>
            </View>
          </View>
        </>
      )}



      {/* Pop-up Modals for Destructive Confirmations */}
      <ResetLocalDataModal
        visible={resetLocalModalVisible}
        onClose={() => setResetLocalModalVisible(false)}
      />

      <DeleteAccountModal
        visible={deleteAccountModalVisible}
        onClose={() => setDeleteAccountModalVisible(false)}
      />
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
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: 2,
  },
  errorCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  errorDetail: {
    fontSize: 11,
  },
  dismissButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  dismissText: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginTop: 2,
  },
  avatarFrame: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  profileEmail: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionWrap: {
    gap: 8,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    fontWeight: "700",
    marginLeft: 4,
  },
  syncCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  syncHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  copyBox: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
  },
  rowSubtitle: {
    fontSize: 10.5,
    fontWeight: "500",
    marginTop: 2,
  },
  syncExplainer: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  buttonStack: {
    gap: 10,
  },
  termsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  termsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  termsCopy: {
    flex: 1,
  },
  termsTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  termsSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.2,
    borderRadius: 16,
    paddingVertical: 14,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  actionCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  actionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  actionSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
  },
  dangerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  offlineCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    textAlign: "center",
    gap: 10,
  },
  offlineIconBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  offlineTitle: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  offlineBody: {
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: "center",
    marginBottom: 10,
  },
  guaranteesCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  guaranteeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  guaranteeText: {
    fontSize: 11,
    fontWeight: "500",
    flex: 1,
  },

});
