import { useState } from "react";
import { Alert, Linking, Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../components/AppText";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, ToggleSwitch, GradientFill, SurfaceGradient } from "../../../components/OfflineUI";
import { offlineProtection } from "../../../native/OfflineProtection";
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
  const { palette: p, snapshot, command, dark } = useOffline();
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
  const [usageAccessModalVisible, setUsageAccessModalVisible] = useState(false);

  const isAuthenticated = status === "authenticated" && Boolean(user);
  const isLoading = status === "loading" || Boolean(busyAction);

  const isUsageGranted = Boolean(snapshot?.capabilities.usage);

  const renderPermissionsSection = () => (
    <View style={s.sectionWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Device permission and access"
        onPress={() => setUsageAccessModalVisible(true)}
        style={({ pressed }) => [
          s.permissionSettingCard,
          { overflow: "hidden",
            backgroundColor: "transparent",
            borderColor: isUsageGranted ? p.borderSubtle : p.warning,
          },
          pressed && { backgroundColor: p.surfaceMuted },
        ]}
      ><SurfaceGradient />
        <View
          style={[
            s.termsIconBox,
            {
              backgroundColor: isUsageGranted
                ? p.surfaceMuted
                : p.warningSurface,
            },
          ]}
        >
          <Icon
            name={isUsageGranted ? "shield-check-outline" : "shield-alert-outline"}
            size={20}
            color={isUsageGranted ? p.brandPrimary : p.warning}
          />
        </View>
        <View style={s.termsCopy}>
          <Text style={[s.termsTitle, { color: p.textPrimary }]}>
            Device permissions & access
          </Text>
        </View>
        <View
          style={[
            s.permStatusPill,
            {
              backgroundColor: isUsageGranted
                ? p.surfaceMuted
                : p.warningSurface,
            },
          ]}
        >
          <Text
            style={[
              s.permStatusText,
              {
                color: isUsageGranted ? p.success : p.warning,
              },
            ]}
          >
            {isUsageGranted ? "Granted" : "Grant needed"}
          </Text>
        </View>
        <Icon name="chevron-right" size={17} color={p.textMuted} />
      </Pressable>
    </View>
  );

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

  const renderAppearance = () => (
      <View style={s.sectionWrap}>
        <View style={[s.syncCard, { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle }]}><SurfaceGradient />
          <View style={s.syncHeaderRow}>
            <View style={[s.iconBox, { overflow: "hidden", backgroundColor: "transparent" }]}><SurfaceGradient tone="muted" />
              <Icon name={dark ? "weather-night" : "white-balance-sunny"} size={22} color={p.toggleActive} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Dark mode</Text>
            </View>
            <ToggleSwitch
              accessibilityLabel="Dark mode"
              value={dark}
              onValueChange={(enabled) => void command("setting", { key: "theme", value: enabled ? "dark" : "light" })}
            />
          </View>
        </View>
      </View>
  );

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
              { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
            ]}
          ><SurfaceGradient />
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={s.titleWrap}>
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
            style={[s.dismissButton, { overflow: "hidden", borderColor: p.borderSubtle, backgroundColor: "transparent" }]}
          ><SurfaceGradient />
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
              { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
            ]}
          ><SurfaceGradient />
            <View style={[s.avatarFrame, { overflow: "hidden", backgroundColor: "transparent" }]}><GradientFill />
              <Text style={[s.avatarLetter, { color: p.actionText }]}>
                {avatarLetter}
              </Text>
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

          {renderAppearance()}

          {/* 3. Synchronization & Cloud Backup (With Switch Toggle) */}
          <View style={s.sectionWrap}>
            <View
              style={[
                s.syncCard,
                { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
              ]}
            ><SurfaceGradient />
              <View style={s.syncHeaderRow}>
                <View style={[s.iconBox, { overflow: "hidden", backgroundColor: "transparent" }]}><SurfaceGradient tone="muted" />
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
                    motion={syncState.status === "syncing" ? "spin" : "none"}
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
                      ? "Syncing…"
                      : syncState.status === "offline"
                      ? "Offline mode"
                      : syncState.status === "error"
                      ? "Sync attention required"
                      : "Cloud Backup"}
                  </Text>
                  {syncState.lastSyncedAt ? (
                    <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
                      {`Last synced: ${new Date(syncState.lastSyncedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`}
                    </Text>
                  ) : null}
                </View>

                {/* Cloud Sync Toggle */}
                <ToggleSwitch
                  accessibilityLabel="Toggle cloud synchronization"
                  disabled={syncState.status === "syncing"}
                  value={syncState.cloudSyncEnabled}
                  onValueChange={(value) => void setCloudSyncEnabled(value)}
                />
              </View>

              {syncState.status === "error" && syncState.lastError ? (
                <Text style={{ color: p.danger, fontSize: 11, marginTop: 2 }}>
                  {syncState.lastError}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Device & Protection Permissions */}
          {renderPermissionsSection()}

          {/* 4. Account Actions Section */}
          <View style={s.sectionWrap}>
            <View style={s.buttonStack}>
              {/* Terms and conditions button (Above Logout) */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Terms and conditions"
                onPress={() => void handleOpenPrivacyPolicy()}
                style={({ pressed }) => [
                  s.termsBtn,
                  { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
                  pressed && { backgroundColor: p.surfaceMuted },
                ]}
              ><SurfaceGradient />
                <View style={[s.termsIconBox, { overflow: "hidden", backgroundColor: "transparent" }]}><SurfaceGradient tone="muted" />
                  <Icon name="file-document-outline" size={19} color={p.brandPrimary} />
                </View>
                <View style={s.termsCopy}>
                  <Text style={[s.termsTitle, { color: p.textPrimary }]}>
                    Terms and conditions
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
                  { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
                  pressed && { opacity: 0.8 },
                ]}
              ><SurfaceGradient tone="muted" />
                <Icon name="logout" size={17} color={p.textPrimary} />
                <Text style={[s.logoutBtnText, { color: p.textPrimary }]}>
                  {busyAction === "signout" ? "Signing out…" : "Log out"}
                </Text>
              </Pressable>

              {/* Data & Account Deletion Actions */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete local data"
                onPress={() => setResetLocalModalVisible(true)}
                style={({ pressed }) => [
                  s.termsBtn,
                  { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
                  pressed && { opacity: 0.85 },
                ]}
              ><SurfaceGradient />
                <View style={[s.actionIconBox, { backgroundColor: p.dangerSurface }]}>
                  <Icon name="trash-can-outline" size={18} color={p.danger} />
                </View>
                <View style={s.actionCopy}>
                  <Text style={[s.actionTitle, { color: p.textPrimary }]}>
                    Delete local data
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color={p.textMuted} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete account"
                onPress={() => setDeleteAccountModalVisible(true)}
                style={({ pressed }) => [
                  s.termsBtn,
                  { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
                  pressed && { opacity: 0.85 },
                ]}
              ><SurfaceGradient />
                <View style={[s.actionIconBox, { backgroundColor: p.dangerSurface }]}>
                  <Icon name="account-remove-outline" size={18} color={p.danger} />
                </View>
                <View style={s.actionCopy}>
                  <Text style={[s.actionTitle, { color: p.danger }]}>
                    Delete account
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color={p.textMuted} />
              </Pressable>
            </View>
          </View>
        </>
      ) : (
        <>
          {/* Offline Mode / Connect Google Account Section */}
          <View
            style={[
              s.offlineCard,
              { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
            ]}
          ><SurfaceGradient />
            <View style={[s.offlineIconBox, { overflow: "hidden", backgroundColor: "transparent" }]}><SurfaceGradient tone="muted" />
              <Icon name="cloud-off-outline" size={32} color={p.textSecondary} />
            </View>
            <Text style={[s.offlineTitle, { color: p.textPrimary }]}>
              Back up your progress
            </Text>
            <Text style={[s.offlineBody, { color: p.textSecondary }]}>
              Sign in with Google to keep your streak and coins safe.
            </Text>

            <GoogleSignInButton
              label="Connect with Google"
              loading={isLoading}
              onPress={() => void handleSignIn()}
            />
          </View>

          {renderAppearance()}

          {/* Device & Protection Permissions */}
          {renderPermissionsSection()}

          {/* Terms and conditions & Delete local data */}
          <View style={s.sectionWrap}>
            <View style={s.buttonStack}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Terms and conditions"
                onPress={() => void handleOpenPrivacyPolicy()}
                style={({ pressed }) => [
                  s.termsBtn,
                  { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
                  pressed && { backgroundColor: p.surfaceMuted },
                ]}
              ><SurfaceGradient />
                <View style={[s.termsIconBox, { overflow: "hidden", backgroundColor: "transparent" }]}><SurfaceGradient tone="muted" />
                  <Icon name="file-document-outline" size={19} color={p.brandPrimary} />
                </View>
                <View style={s.termsCopy}>
                  <Text style={[s.termsTitle, { color: p.textPrimary }]}>
                    Terms and conditions
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
                  { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
                  pressed && { backgroundColor: p.surfaceMuted },
                ]}
              ><SurfaceGradient />
                <View style={[s.actionIconBox, { backgroundColor: p.dangerSurface }]}>
                  <Icon name="trash-can-outline" size={18} color={p.danger} />
                </View>
                <View style={s.actionCopy}>
                  <Text style={[s.actionTitle, { color: p.textPrimary }]}>
                    Delete local data
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color={p.textMuted} />
              </Pressable>
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

      {/* Pop-up showing Grant Usage Access option */}
      <Modal
        visible={usageAccessModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUsageAccessModalVisible(false)}
      >
        <View style={s.permModalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setUsageAccessModalVisible(false)}
          />
          <View
            style={[
              s.permDialogCard,
              { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
            ]}
          ><SurfaceGradient />
            {/* Header */}
            <View style={[s.permDialogHeader, { borderBottomColor: p.borderSubtle }]}>
              <View style={s.permDialogTitleWrap}>
                <View
                  style={[
                    s.permDialogIconBox,
                    { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
                  ]}
                ><SurfaceGradient tone="muted" />
                  <Icon name="shield-check" size={20} color={p.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.permDialogTitle, { color: p.textPrimary }]}>
                    Device permissions
                  </Text>
                  <Text style={[s.permDialogSubtitle, { color: p.textSecondary }]}>
                    Android Usage Access
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close permissions dialog"
                onPress={() => setUsageAccessModalVisible(false)}
                style={[s.permDialogClose, { overflow: "hidden", backgroundColor: "transparent" }]}
              ><SurfaceGradient tone="muted" />
                <Icon name="close" size={17} color={p.textSecondary} />
              </Pressable>
            </View>

            {/* Content Body */}
            <View style={s.permDialogBody}>
              <View
                style={[
                  s.usageAccessCard,
                  {
                    backgroundColor: isUsageGranted ? p.surfaceMuted : p.warningSurface,
                    borderColor: isUsageGranted ? p.borderSubtle : p.warning,
                  },
                ]}
              >
                <View style={s.usageAccessHeader}>
                  <View
                    style={[
                      s.usageStatusIconBox,
                      {
                        backgroundColor: isUsageGranted
                          ? p.successSurface
                          : p.warningSurface,
                      },
                    ]}
                  >
                    <Icon
                      name={isUsageGranted ? "shield-check" : "shield-alert"}
                      size={22}
                      color={isUsageGranted ? p.success : p.warning}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[s.usageAccessTitle, { color: p.textPrimary }]}>
                      {isUsageGranted ? "Usage Access Active" : "Usage Access Required"}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.usagePill,
                      {
                        backgroundColor: isUsageGranted
                          ? p.successSurface
                          : p.warningSurface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.usagePillText,
                        { color: isUsageGranted ? p.success : p.warning },
                      ]}
                    >
                      {isUsageGranted ? "Granted" : "Not granted"}
                    </Text>
                  </View>
                </View>

                <Text style={[s.usageAccessExplainer, { color: p.textSecondary }]}>
                  Restrainify needs Android Usage Stats access to accurately enforce your
                  configured app limits and measure screen time. Your personal data and
                  browsing never leave this device.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Grant Usage Access"
                  onPress={() => {
                    void offlineProtection.settings("usage");
                  }}
                  style={[
                    s.grantUsageBtn,
                    { backgroundColor: isUsageGranted ? p.actionFill : p.warning },
                  ]}
                >
                  <Text
                    style={[
                      s.grantUsageBtnText,
                      { color: isUsageGranted ? p.actionText : "#FFFFFF" },
                    ]}
                  >
                    {isUsageGranted ? "Open Android Usage Settings" : "Grant Usage Access"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Footer */}
            <View style={[s.permDialogFooter, { borderTopColor: p.borderSubtle }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                onPress={() => setUsageAccessModalVisible(false)}
                style={[s.permDoneBtn, { overflow: "hidden", backgroundColor: "transparent" }]}
              ><GradientFill />
                <Text style={[s.permDoneBtnText, { color: p.actionText }]}>
                  Done
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 12,
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
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  titleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -1,
    marginTop: 2,
  },
  errorCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 6,
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
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
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
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    fontWeight: "700",
    marginLeft: 4,
  },
  syncCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
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
    gap: 12,
  },
  termsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  termsIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
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
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
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
    width: 38,
    height: 38,
    borderRadius: 11,
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
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  offlineCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    textAlign: "center",
    gap: 12,
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
  permissionSettingCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  permStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  permStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  permModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  permDialogCard: {
    width: "100%",
    maxWidth: 375,
    borderRadius: 24,
    borderWidth: 1.2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 24,
  },
  permDialogHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  permDialogTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  permDialogIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  permDialogTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  permDialogSubtitle: {
    fontSize: 10.5,
    fontWeight: "500",
    marginTop: 1,
  },
  permDialogClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  permDialogBody: {
    padding: 16,
  },
  usageAccessCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  usageAccessHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  usageStatusIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  usageAccessTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  usageAccessSub: {
    fontSize: 11,
  },
  usagePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  usagePillText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  usageAccessExplainer: {
    fontSize: 12,
    lineHeight: 17,
  },
  grantUsageBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  grantUsageBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  permDialogFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  permDoneBtn: {
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  permDoneBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
