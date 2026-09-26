import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useOffline } from "../../app/providers/OfflineProvider";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { PasswordRecoveryScreen } from "./screens/PasswordRecoveryScreen";
import { AccessibilitySetupScreen } from "./screens/AccessibilitySetupScreen";

export type OnboardingStep =
  | "welcome"
  | "login"
  | "recovery"
  | "accessibility";

export interface OnboardingFlowProps {
  onComplete: () => void;
  initialStep?: OnboardingStep;
}

/**
 * OnboardingFlow: Streamlined 2-Step Orchestrator
 *
 * 1. Google Auth (WelcomeScreen)
 * 2. Android Accessibility Service setup (AccessibilitySetupScreen)
 * -> Direct entry to main dashboard
 */
export function OnboardingFlow({
  onComplete,
  initialStep = "welcome",
}: OnboardingFlowProps) {
  const { palette: p, command } = useOffline();
  const [step, setStep] = useState<OnboardingStep>(initialStep);

  const handleLoginSuccess = async () => {
    // Existing user returning: complete onboarding and jump into main app
    try {
      await command("onboard");
    } catch {
      // Offline runtime fallback
    }
    onComplete();
  };

  return (
    <View style={[s.container, { backgroundColor: p.backgroundPrimary }]}>
      {step === "welcome" && (
        <WelcomeScreen
          onSignupSuccess={() => setStep("accessibility")}
          onGoToLogin={() => setStep("login")}
        />
      )}

      {step === "login" && (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onGoToSignup={() => setStep("welcome")}
          onGoToPasswordRecovery={() => setStep("recovery")}
        />
      )}

      {step === "recovery" && (
        <PasswordRecoveryScreen
          onBackToLogin={() => setStep("login")}
        />
      )}

      {step === "accessibility" && (
        <AccessibilitySetupScreen
          onComplete={onComplete}
          onBack={() => setStep("welcome")}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
});
