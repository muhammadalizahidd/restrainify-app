import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useOffline } from "../../app/providers/OfflineProvider";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { PasswordRecoveryScreen } from "./screens/PasswordRecoveryScreen";
import { GoalSelectionScreen } from "./screens/GoalSelectionScreen";
import { WebsiteSetupScreen } from "./screens/WebsiteSetupScreen";
import { VisualConsentScreen } from "./screens/VisualConsentScreen";
import { AppsFeedsSelectionScreen } from "./screens/AppsFeedsSelectionScreen";
import { RecoveryBaselineScreen } from "./screens/RecoveryBaselineScreen";
import { ProtectionReadyScreen } from "./screens/ProtectionReadyScreen";

export type OnboardingStep =
  | "welcome"
  | "login"
  | "recovery"
  | "goals"
  | "website"
  | "visual"
  | "apps"
  | "baseline"
  | "ready";

export interface OnboardingFlowProps {
  onComplete: () => void;
  initialStep?: OnboardingStep;
}

/**
 * OnboardingFlow: Step Machine Orchestrator for Domain 4
 *
 * Coordinates the full authentication and 6-step onboarding wizard:
 * 1. Entry / Auth: Welcome (ONB-01), Login (ONB-03), Password Recovery (ONB-04)
 * 2. Setup Wizard:
 *    - Step 1/6: Goal Selection (ONB-05)
 *    - Step 2/6: Website Setup (ONB-06)
 *    - Step 3/6: Visual Consent (ONB-07)
 *    - Step 4/6: Apps & Feeds Selection (ONB-08)
 *    - Step 5/6: Recovery Baseline (ONB-09)
 *    - Step 6/6: Protection Ready (ONB-10)
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
          onSignupSuccess={() => setStep("goals")}
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

      {step === "goals" && (
        <GoalSelectionScreen
          onNext={() => setStep("website")}
          onBack={() => setStep("welcome")}
        />
      )}

      {step === "website" && (
        <WebsiteSetupScreen
          onNext={() => setStep("visual")}
          onBack={() => setStep("goals")}
        />
      )}

      {step === "visual" && (
        <VisualConsentScreen
          onNext={() => setStep("apps")}
          onBack={() => setStep("website")}
        />
      )}

      {step === "apps" && (
        <AppsFeedsSelectionScreen
          onNext={() => setStep("baseline")}
          onBack={() => setStep("visual")}
        />
      )}

      {step === "baseline" && (
        <RecoveryBaselineScreen
          onNext={() => setStep("ready")}
          onBack={() => setStep("apps")}
        />
      )}

      {step === "ready" && (
        <ProtectionReadyScreen
          onComplete={onComplete}
          onBack={() => setStep("baseline")}
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
