import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useOffline } from "../../app/providers/OfflineProvider";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { PasswordRecoveryScreen } from "./screens/PasswordRecoveryScreen";
import { AccessibilitySetupScreen } from "./screens/AccessibilitySetupScreen";
import { UsageAccessSetupScreen } from "./screens/UsageAccessSetupScreen";
import { FeatureTourScreen } from "./screens/FeatureTourScreen";

export type OnboardingStep =
  | "welcome"
  | "login"
  | "recovery"
  | "accessibility"
  | "usage"
  | "tour";

export interface OnboardingFlowProps {
  onComplete: () => void;
  initialStep?: OnboardingStep;
}

/**
 * OnboardingFlow
 *
 * 1. Google sign-in or guest (WelcomeScreen)
 * 2. Android Accessibility Service setup (AccessibilitySetupScreen)
 * 3. Usage access, for app limits and screen time (UsageAccessSetupScreen)
 * 4. A short, skippable tour of the six protections (FeatureTourScreen), which finishes onboarding.
 *    It only ever shows here, so it appears once: on first launch.
 * -> Main dashboard
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
          onContinueAsGuest={() => setStep("accessibility")}
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
          onComplete={() => setStep("usage")}
          onBack={() => setStep("welcome")}
          isFinalStep={false}
        />
      )}

      {step === "usage" && (
        <UsageAccessSetupScreen
          onComplete={() => setStep("tour")}
          onBack={() => setStep("accessibility")}
          isFinalStep={false}
        />
      )}

      {step === "tour" && (
        <FeatureTourScreen
          onDone={async () => {
            try {
              await command("onboard");
            } catch {
              // Offline runtime fallback
            }
            onComplete();
          }}
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
