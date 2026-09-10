import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Body, Button, Heading, Icon, Label, Panel, ui } from "../../../components/OfflineUI";
import { useAuth } from "../context/AuthContext";
import { useSync } from "../../sync";
import { GoogleSignInButton } from "../components/GoogleSignInButton";

export function AccountScreen() {
  const { status, user, profile, error, clearError, signInWithGoogle, signOut, deleteAccount } =
    useAuth();
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
      "This will permanently delete your user profile and backed-up settings from the server. Local operational data on this phone will be unlinked.",
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

  return (
    <View style={ui.stack}>
      <Heading
        title="Account & Sync"
        subtitle="Manage your connected Google account and cloud backup."
      />

      {error && (
        <Panel>
          <Body strong>Account notice</Body>
          <Body>{error}</Body>
          <Button title="Dismiss" tone="secondary" onPress={clearError} />
        </Panel>
      )}

      {isAuthenticated && user ? (
        <>
          <Label>CONNECTED IDENTITY</Label>
          <Panel>
            <View style={[ui.row, { gap: 12 }]}>
              <Icon name="google" size={26} />
              <View style={{ flex: 1 }}>
                <Body strong>{profile?.fullName || user.fullName || "Google Account"}</Body>
                <Body>{user.email || "No email available"}</Body>
              </View>
            </View>
            <Body>
              Connected via Google OAuth. Authenticated session tokens are held in your device's
              hardware-backed secure keystore.
            </Body>
          </Panel>

          <Label>SYNCHRONIZATION & CLOUD BACKUP</Label>
          <Panel>
            <View style={[ui.row, { gap: 10 }]}>
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
                size={24}
              />
              <View style={{ flex: 1 }}>
                <Body strong>
                  {syncState.status === "syncing"
                    ? "Syncing in progress…"
                    : syncState.status === "offline"
                    ? "Offline mode"
                    : syncState.status === "error"
                    ? "Sync attention required"
                    : "Cloud backup up to date"}
                </Body>
                <Body>
                  {syncState.lastSyncedAt
                    ? `Last synced: ${new Date(syncState.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "Ready to sync"}
                  {syncState.pendingCount > 0 ? ` · ${syncState.pendingCount} pending local change${syncState.pendingCount > 1 ? "s" : ""}` : ""}
                </Body>
              </View>
            </View>
            {syncState.lastError && (
              <Text style={{ color: "#d9534f", fontSize: 12 }}>
                Notice: {syncState.lastError}
              </Text>
            )}
            <Body>
              Recovery streaks, milestones, focus coins, and custom domain rules synchronize automatically when online. Protection rules remain 100% active offline.
            </Body>
            <View style={[ui.row, { gap: 10, marginTop: 4 }]}>
              <Button
                title={syncState.status === "syncing" ? "Syncing…" : "Sync now"}
                tone="primary"
                disabled={syncState.status === "syncing" || !syncState.cloudSyncEnabled}
                onPress={() => void syncNow()}
              />
              <Button
                title={syncState.cloudSyncEnabled ? "Disable sync" : "Enable sync"}
                tone="secondary"
                onPress={() => void setCloudSyncEnabled(!syncState.cloudSyncEnabled)}
              />
            </View>
          </Panel>

          <Panel>
            <Button
              title={busyAction === "signout" ? "Signing out…" : "Sign out"}
              tone="secondary"
              disabled={isLoading}
              onPress={handleSignOut}
            />
          </Panel>

          <Label>DANGER ZONE</Label>
          <Panel>
            <Body strong>Delete server account</Body>
            <Body>
              Permanently remove your account and all cloud-stored synchronization records from the Next.js and Supabase backend.
            </Body>
            <Button
              title={busyAction === "delete" ? "Deleting…" : "Delete account"}
              tone="danger"
              disabled={isLoading}
              onPress={handleDeleteAccount}
            />
          </Panel>
        </>
      ) : (
        <>
          <Label>OFFLINE MODE</Label>
          <Panel>
            <View style={[ui.row, { gap: 10 }]}>
              <Icon name="shield-lock-outline" size={24} />
              <View style={{ flex: 1 }}>
                <Body strong>Local Storage Only</Body>
                <Body>You are currently using Restrainify without an account. Your data stays on this device.</Body>
              </View>
            </View>
            <Body>
              Connecting a Google account enables encrypted cloud backup for your recovery milestones and multi-device coordination.
            </Body>
            <GoogleSignInButton
              label="Connect with Google"
              loading={isLoading}
              onPress={() => void handleSignIn()}
            />
          </Panel>

          <Panel>
            <Body strong>Your privacy is guaranteed</Body>
            <Body>
              • No full URLs or browsing histories leave your phone.
            </Body>
            <Body>
              • No screenshots, text, or visual frames are uploaded.
            </Body>
            <Body>
              • You can continue using all protection features offline indefinitely.
            </Body>
          </Panel>
        </>
      )}
    </View>
  );
}
