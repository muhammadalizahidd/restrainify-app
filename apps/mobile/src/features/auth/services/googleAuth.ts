import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";

let isConfigured = false;

export function configureGoogleSignIn(webClientId?: string) {
  try {
    GoogleSignin.configure({
      webClientId: webClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
      scopes: ["profile", "email"],
    });
    isConfigured = true;
  } catch (e) {
    console.warn("Failed to configure GoogleSignin:", e);
  }
}

export async function promptGoogleSignIn(): Promise<{ idToken: string } | null> {
  if (!isConfigured) {
    configureGoogleSignIn();
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    const res = response as {
      type?: string;
      data?: { idToken?: string | null };
      idToken?: string | null;
    };

    if (res.type === "success" && res.data?.idToken) {
      return { idToken: res.data.idToken };
    }

    if (res.idToken) {
      return { idToken: res.idToken };
    }

    if (res.type === "cancelled") {
      return null;
    }

    throw new Error("No ID token returned from Google Sign-In");
  } catch (error: unknown) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : undefined;
    const rawMessage = error instanceof Error ? error.message : String(error);

    if (code === String(statusCodes.SIGN_IN_CANCELLED) || code === "13" || code === "12501") {
      return null;
    }

    if (code === "10" || rawMessage.includes("DEVELOPER_ERROR")) {
      throw new Error(
        "Google Sign-In DEVELOPER_ERROR (code 10): The signing SHA-1 fingerprint or package name does not match the Android OAuth Client in Google Cloud Console, or the Web Client ID is misconfigured.",
        { cause: error }
      );
    }

    if (code === "7" || rawMessage.includes("NETWORK_ERROR")) {
      throw new Error(
        "Google Sign-In NETWORK_ERROR: A network error occurred while contacting Google Play Services. Please check device internet connection.",
        { cause: error }
      );
    }

    throw error;
  }
}

export async function promptGoogleSignOut(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Best-effort sign out from Google Play Services SDK
  }
}
