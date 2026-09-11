import { StyleSheet, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { EnforcementBlockCard } from "../components/EnforcementBlockCard";

export interface AppLimitReachedScreenProps {
  packageName?: string;
  appName?: string;
  limitMinutes?: number;
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * AppLimitReachedScreen implements STATE-04: App Limit Reached
 * from the Restrainify UI Architecture specification.
 *
 * Displays an intentional cooldown interruption when an application's
 * configured daily foreground allowance has been exhausted.
 *
 * Backend mapping:
 * - Reads app rule limit and usage from `snapshot.settings.rules` and `snapshot.usage.apps`
 * - Requesting an override routes to `pending-change` (STATE-STRICT-02) to enforce anti-impulse cooldown.
 */
export function AppLimitReachedScreen({
  packageName = "com.instagram.android",
  appName = "Instagram",
  limitMinutes = 45,
  open,
  onBack,
}: AppLimitReachedScreenProps) {
  const { snapshot: data, palette: p } = useOffline();

  // Find app-specific rule from authoritative snapshot if available
  const matchingRule = data?.settings.rules.find(
    (r) => r.packageName === packageName
  );
  const activeLimit = matchingRule?.limitMinutes && matchingRule.limitMinutes > 0
    ? matchingRule.limitMinutes
    : limitMinutes;

  const handleRequestOverride = () => {
    if (open) {
      open("pending-change", {
        reason: `Daily usage override for ${appName} (${activeLimit}m limit reached)`,
      });
    }
  };

  const handleReturn = () => {
    if (open) {
      open("home");
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: p.backgroundPrimary }]}>
      <EnforcementBlockCard
        icon="clock-outline"
        iconTone="primary"
        eyebrow="Daily limit reached"
        title={`${appName} is restricted.`}
        value={`${activeLimit}m`}
        description={`You used your full ${activeLimit} minute allowance. It becomes available again when your daily limit resets.`}
        secondaryButton={{
          label: "Request an override",
          onPress: handleRequestOverride,
        }}
        cancelLink={{
          label: "Return",
          onPress: handleReturn,
        }}
        footerNote="Overrides require a cooling delay when Strict Mode is configured."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
