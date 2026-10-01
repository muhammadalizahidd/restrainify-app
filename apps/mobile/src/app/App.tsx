import { View, useColorScheme } from "react-native";
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
import { themes } from "../design";

export function App() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });
  const scheme = useColorScheme();

  // Bundled fonts load in a few milliseconds; hold on the theme background so there is no flash.
  // If loading ever fails the app still starts with the system font rather than a blank screen.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: themes[scheme === "dark" ? "dark" : "light"].backgroundPrimary }} />;
  }

  return (
    <ProtectionProvider>
      <AuthProvider>
        <SyncProvider>
          <AppNavigator />
        </SyncProvider>
      </AuthProvider>
    </ProtectionProvider>
  );
}
