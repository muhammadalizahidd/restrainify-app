import { StyleSheet, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { offlineProtection } from "../../../native/OfflineProtection";
import { EnforcementBlockCard } from "../components/EnforcementBlockCard";

export type PermissionDeniedType = "usage" | "accessibility" | "vpn";

export interface PermissionDeniedScreenProps {
  permissionType?: PermissionDeniedType;
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

interface DeniedConfig {
  title: string;
  description: string;
  intentKind: string;
}

const DENIED_CONFIGS: Record<PermissionDeniedType, DeniedConfig> = {
  usage: {
    title: "App controls need attention.",
    description:
      "Usage access is not available, so Restrainify will not pretend app limits are active.",
    intentKind: "usage",
  },
  accessibility: {
    title: "App restrictions paused.",
    description:
      "Accessibility access is not granted. Restrainify cannot detect high-risk apps or display Burst cooling overlays until enabled.",
    intentKind: "accessibility",
  },
  vpn: {
    title: "Website filtering inactive.",
    description:
      "Local DNS VPN permission was declined. Restrainify cannot filter adult domains on this device without this capability.",
    intentKind: "vpn",
  },
};

/**
 * PermissionDeniedScreen implements STATE-02: Permission Denied Fallback
 * from the Restrainify UI Architecture specification.
 *
 * Truthfully informs the user that a capability is offline rather than
 * displaying artificial success indicators.
 *
 * Backend mapping:
 * - Directs user back to settings repair: `offlineProtection.settings(kind)`
 * - Respects partial protection: returns to `home` without discarding local tracking.
 */
export function PermissionDeniedScreen({
  permissionType = "usage",
  open,
  onBack,
}: PermissionDeniedScreenProps) {
  const { palette: p } = useOffline();
  const config = DENIED_CONFIGS[permissionType] ?? DENIED_CONFIGS.usage;

  const handleFixSetup = async () => {
    try {
      await offlineProtection.settings(config.intentKind);
    } catch {
      // Graceful fallback
    }
  };

  const handleContinuePartial = () => {
    if (open) {
      open("home");
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: p.backgroundPrimary }]}>
      <EnforcementBlockCard
        icon="alert-circle-outline"
        iconTone="warn"
        eyebrow="Setup incomplete"
        title={config.title}
        description={config.description}
        primaryButton={{
          label: "Fix setup",
          onPress: handleFixSetup,
        }}
        cancelLink={{
          label: "Continue with partial protection",
          onPress: handleContinuePartial,
        }}
        footerNote="Restrainify always reports true protection status. We never fake security."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
