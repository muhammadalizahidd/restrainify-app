import { AppProviders } from "./providers/AppProviders";
import { RootNavigator } from "./navigation/RootNavigator";

export function App() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
