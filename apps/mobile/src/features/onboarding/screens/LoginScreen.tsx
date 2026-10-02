import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../auth";
import { SignInScreen } from "../components/SignInScreen";

export interface LoginScreenProps {
  onLoginSuccess: () => void;
  onGoToSignup?: () => void;
  onGoToPasswordRecovery?: () => void;
}

/**
 * ONB-03: Login Screen
 *
 * Returning user authentication via Google OAuth. It shares the single sign-in design with the Welcome screen.
 * Requirement coverage: FR-AUTH-003, FR-AUTH-004
 */
export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
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
        onLoginSuccess();
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return <SignInScreen onGoogle={() => void handleGoogle()} loading={googleLoading} error={authError} />;
}
