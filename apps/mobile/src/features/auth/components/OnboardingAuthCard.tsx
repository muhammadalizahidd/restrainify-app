import { View } from "react-native";
import { Body, Button, Heading, Icon, Panel, ui } from "../../../components/OfflineUI";
import { useAuth } from "../context/AuthContext";
import { GoogleSignInButton } from "./GoogleSignInButton";

interface OnboardingAuthCardProps {
  onContinue: () => void;
  onSkip: () => void;
}

export function OnboardingAuthCard({ onContinue, onSkip }: OnboardingAuthCardProps) {
  const { status, user, error, signInWithGoogle, clearError } = useAuth();
  const isAuthenticated = status === "authenticated" && Boolean(user);
  const isLoading = status === "loading";

  const handleSignIn = async () => {
    const success = await signInWithGoogle();
    if (success) {
      onContinue();
    }
  };

  return (
    <View style={ui.stack}>
      <Heading
        title="Back up your progress & sync"
        subtitle="Highly recommended · Safe cloud backup for your recovery journey."
      />

      <Panel>
        <Body strong>Why connect an account?</Body>
        <Body>
          • <Body strong>Streak & Recovery Backup:</Body> If you switch or lose your phone, your
          recovery milestones and custom rules are safe.
        </Body>
        <Body>
          • <Body strong>Cross-Device Sync:</Body> Connect your dashboard and boundaries across your
          devices.
        </Body>
        <Body>
          • <Body strong>Zero Privacy Compromise:</Body> Restrainify never stores browsing history,
          typed messages, or screen frames on the cloud.
        </Body>
      </Panel>

      {error && (
        <Panel>
          <Body strong>Sign-in issue</Body>
          <Body>{error}</Body>
          <Button title="Dismiss" tone="secondary" onPress={clearError} />
        </Panel>
      )}

      {isAuthenticated && user ? (
        <Panel>
          <View style={[ui.row, { gap: 10 }]}>
            <Icon name="check-circle" size={24} />
            <View style={{ flex: 1 }}>
              <Body strong>Connected with Google</Body>
              <Body>{user.email || user.fullName || "Account connected"}</Body>
            </View>
          </View>
          <Button title="Continue to setup" onPress={onContinue} />
        </Panel>
      ) : (
        <View style={ui.stack}>
          <GoogleSignInButton
            label="Continue with Google"
            loading={isLoading}
            onPress={() => void handleSignIn()}
          />
          <Button
            title="Skip for now"
            tone="secondary"
            onPress={onSkip}
            disabled={isLoading}
          />
          <Body>
            Login is optional. You can always connect your Google account later in Settings, and all
            local protection features work completely offline.
          </Body>
        </View>
      )}
    </View>
  );
}
