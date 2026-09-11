import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { useAuth } from "../context/AuthContext";
import { useSync } from "../../sync";
import { GoogleSignInButton } from "../components/GoogleSignInButton";

export interface AccountScreenProps {
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * AccountScreen implements SET-ACCOUNT-01: Account & Profile Screen
 * adhering to the Orbit / Clarity design system and truthful native capability state.
 *
 * Connects real Google OAuth authentication, hardware keystore token persistence,
 * and encrypted cloud sync while upholding the invariant that local protection
 * operates independently of cloud connectivity.
 */
export function AccountScreen({ onBack }: AccountScreenProps) {
  const { palette: p } = useOffline();
  const {
    status,
    user,
    profile,
    error,
    clearError,
    signInWithGoogle,
    signOut,
    deleteAccount,
  } = useAuth();
  const { syncState, syncNow, setCloudSyncEnabled } = useSync();
  const [busyAction, setBusyAction] = useState<string | null>(null);

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
          onPress: () => {
            setBusyAction("signout");
            void signOut().finally(() => setBusyAction(null));
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account & Cloud Data?",
      "Permanently deleting your account removes your server profile and backed-up settings from the server. Local operational data on this phone will be unlinked.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: () => {
            setBusyAction("delete");
            void deleteAccount().finally(() => setBusyAction(null));
          },
        },
      ]
    );
  };

  const displayName = profile?.fullName || user?.fullName || "Google Account";
  const avatarLetter = (displayName || "A")[0]?.toUpperCase() ?? "A";

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
          <Text style={[s.headerTitle, { color: p.textPrimary }]}>Account</Text>
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
                {user.email || "No email available"} · Google OAuth
              </Text>
            </View>
          </View>

          {/* 3. Security & Cloud Session Section */}
          <View style={s.sectionWrap}>
            <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Security</Text>
            <View
              style={[
                s.rowList,
                { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
              ]}
            >
              {/* Row 1: Session */}
              <View
                style={[
                  s.row,
                  { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.borderSubtle },
                ]}
              >
                <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
                  <Icon name="shield-check-outline" size={20} color={p.brandPrimary} />
                </View>
                <View style={s.copyBox}>
                  <Text style={[s.rowTitle, { color: p.textPrimary }]}>Session</Text>
                  <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
                    Tokens secured in hardware Keystore
                  </Text>
                </View>
                <View style={[s.pillGood, { backgroundColor: p.successSurface }]}>
                  <Text style={[s.pillGoodText, { color: p.success }]}>Active</Text>
                </View>
              </View>

              {/* Row 2: Provider */}
              <View style={s.row}>
                <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
                  <Icon name="google" size={20} color={p.brandPrimary} />
                </View>
                <View style={s.copyBox}>
                  <Text style={[s.rowTitle, { color: p.textPrimary }]}>Identity Provider</Text>
                  <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
                    Google Sign-In
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 4. Synchronization & Cloud Backup Section */}
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
                      : "Cloud backup up to date"}
                  </Text>
                  <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
                    {syncState.lastSyncedAt
                      ? `Last synced: ${new Date(syncState.lastSyncedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : "Ready to sync"}
                    {syncState.pendingCount > 0
                      ? ` · ${syncState.pendingCount} pending local change${
                          syncState.pendingCount > 1 ? "s" : ""
                        }`
                      : ""}
                  </Text>
                </View>
              </View>

              {syncState.lastError && (
                <Text style={{ color: p.danger, fontSize: 11, marginTop: 4 }}>
                  Notice: {syncState.lastError}
                </Text>
              )}

              <Text style={[s.syncExplainer, { color: p.textSecondary }]}>
                Recovery streaks, milestones, focus coins, and custom domain rules synchronize
                automatically when online. Protection rules remain 100% active offline.
              </Text>

              <View style={s.syncBtnRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sync now"
                  disabled={syncState.status === "syncing" || !syncState.cloudSyncEnabled}
                  onPress={() => void syncNow()}
                  style={({ pressed }) => [
                    s.syncBtnPrimary,
                    { backgroundColor: p.brandPrimary },
                    (syncState.status === "syncing" || !syncState.cloudSyncEnabled) && {
                      opacity: 0.5,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={s.syncBtnPrimaryText}>
                    {syncState.status === "syncing" ? "Syncing…" : "Sync now"}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={syncState.cloudSyncEnabled ? "Disable sync" : "Enable sync"}
                  onPress={() => void setCloudSyncEnabled(!syncState.cloudSyncEnabled)}
                  style={({ pressed }) => [
                    s.syncBtnSecondary,
                    { borderColor: p.borderSubtle, backgroundColor: p.surfaceMuted },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[s.syncBtnSecondaryText, { color: p.textPrimary }]}>
                    {syncState.cloudSyncEnabled ? "Disable sync" : "Enable sync"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* 5. Account Actions Section */}
          <View style={s.sectionWrap}>
            <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Account</Text>
            <View style={s.buttonStack}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign out of Google Account"
                disabled={isLoading}
                onPress={handleSignOut}
                style={({ pressed }) => [
                  s.actionBtn,
                  { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
                  pressed && { backgroundColor: p.surfaceMuted },
                ]}
              >
                <Text style={[s.actionBtnText, { color: p.textPrimary }]}>
                  {busyAction === "signout" ? "Signing out…" : "Log out"}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete server account and cloud data"
                disabled={isLoading}
                onPress={handleDeleteAccount}
                style={({ pressed }) => [
                  s.dangerBtn,
                  { backgroundColor: p.dangerSurface, borderColor: p.danger },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[s.dangerBtnText, { color: p.danger }]}>
                  {busyAction === "delete" ? "Deleting…" : "Delete account"}
                </Text>
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
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <View style={[s.offlineHeaderRow]}>
              <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
                <Icon name="shield-lock-outline" size={24} color={p.brandPrimary} />
              </View>
              <View style={s.copyBox}>
                <Text style={[s.profileName, { color: p.textPrimary }]}>
                  Local Storage Only
                </Text>
                <Text style={[s.profileEmail, { color: p.textSecondary }]}>
                  Restrainify is operating in private offline mode.
                </Text>
              </View>
            </View>

            <Text style={[s.offlineCopy, { color: p.textSecondary }]}>
              Connecting a Google account enables encrypted cloud backup for your recovery
              milestones and multi-device coordination.
            </Text>

            <GoogleSignInButton
              label="Connect with Google"
              loading={isLoading}
              onPress={() => void handleSignIn()}
            />
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

      {/* 6. Local Protection Invariant Note */}
      <View style={[s.footnoteCard, { backgroundColor: p.surfaceMuted }]}>
        <Text style={[s.footnoteText, { color: p.textSecondary }]}>
          Temporary auth or network issues do not automatically switch off existing local protection.
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
  syncExplainer: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  syncBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  syncBtnPrimary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  syncBtnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  syncBtnSecondary: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  syncBtnSecondaryText: {
    fontSize: 12,
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
  offlineCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginTop: 6,
    gap: 14,
  },
  offlineHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  offlineCopy: {
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "500",
  },
  guaranteesCard: {
    borderRadius: 20,
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
