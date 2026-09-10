import { ProtectionProvider } from "./providers/ProtectionProvider";
import { AppNavigator } from "./navigation/AppNavigator";

export function App() {
  return (
    <ProtectionProvider><AppNavigator /></ProtectionProvider>
  );
}
