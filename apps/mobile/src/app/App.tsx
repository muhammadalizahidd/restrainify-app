import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/space-grotesk";
import { ProtectionProvider } from "./providers/ProtectionProvider";
import { AuthProvider } from "../features/auth";
import { SyncProvider } from "../features/sync";
import { AppNavigator } from "./navigation/AppNavigator";
import { AppDialogHost } from "../components/AppDialog";

export function App() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  // Bundled fonts load in a few milliseconds; stay white like the launch screen so there is no flash.
  // If loading ever fails the app still starts with the system font rather than a blank screen.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />;
  }

  return (
    <SafeAreaProvider>
      <ProtectionProvider>
        <AuthProvider>
          <SyncProvider>
            <AppNavigator />
          </SyncProvider>
        </AuthProvider>
        {/* Every pop-up in the app (appAlert) renders here, above all screens. */}
        <AppDialogHost />
      </ProtectionProvider>
    </SafeAreaProvider>
  );
}
