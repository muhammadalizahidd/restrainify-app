import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../auth";
import { SignInScreen } from "../components/SignInScreen";

export interface WelcomeScreenProps {
  onSignupSuccess: () => void;
  /** Kept for the onboarding flow's wiring; there is a single Google sign-in, so it is no longer shown. */
  onGoToLogin?: () => void;
}

/**
 * ONB-01: Welcome & Entry Screen
 *
 * The app logo and one action: continue with Google. The design lives in SignInScreen.
 */
export function WelcomeScreen({ onSignupSuccess }: WelcomeScreenProps) {
  const { signInWithGoogle, error: authError, clearError } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (authError) {
      Alert.alert("Google Sign-In", authError);
    }
  }, [authError]);

  const handleGoogle = async () => {
    clearError();
    setGoogleLoading(true);
    try {
      const success = await signInWithGoogle();
      if (success) {
        onSignupSuccess();
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return <SignInScreen onGoogle={() => void handleGoogle()} loading={googleLoading} error={authError} />;
}
