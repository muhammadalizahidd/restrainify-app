import { ProtectionProvider } from "./providers/ProtectionProvider";
import { AuthProvider } from "../features/auth";
import { SyncProvider } from "../features/sync";
import { AppNavigator } from "./navigation/AppNavigator";

export function App() {
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
