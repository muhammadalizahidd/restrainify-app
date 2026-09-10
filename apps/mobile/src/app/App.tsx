import { ProtectionProvider } from "./providers/ProtectionProvider";
import { AuthProvider } from "../features/auth";
import { AppNavigator } from "./navigation/AppNavigator";

export function App() {
  return (
    <ProtectionProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ProtectionProvider>
  );
}
