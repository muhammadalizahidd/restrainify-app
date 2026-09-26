import { useCallback, useEffect, useRef } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { offlineProtection } from "../../../native/OfflineProtection";
import { EnforcementBlockCard } from "../components/EnforcementBlockCard";

export type PermissionDeniedType = "usage" | "accessibility" | "vpn";

export interface PermissionDeniedScreenProps {
  permissionType?: PermissionDeniedType;
  returnRoute?: string;
  returnModal?: string;
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
  returnRoute,
  returnModal,
  open,
  onBack,
}: PermissionDeniedScreenProps) {
  const { palette: p, snapshot, refresh } = useOffline();
  const config = DENIED_CONFIGS[permissionType] ?? DENIED_CONFIGS.usage;
  const exitedRef = useRef(false);

  const isGranted = Boolean(
    permissionType === "accessibility"
      ? snapshot?.capabilities?.accessibility
      : permissionType === "usage"
        ? snapshot?.capabilities?.usage
        : permissionType === "vpn"
          ? snapshot?.capabilities?.vpn
          : false
  );

  const handleExit = useCallback(() => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    if (returnModal && open) {
      open(returnRoute ?? "home", { modal: returnModal });
    } else if (returnRoute && open) {
      open(returnRoute);
    } else if (onBack) {
      onBack();
    } else if (open) {
      open("home");
    }
  }, [returnModal, returnRoute, onBack, open]);

  useEffect(() => {
    if (isGranted) {
      handleExit();
    }
  }, [isGranted, handleExit]);

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refresh();
      }
    });
    const timer = setInterval(() => {
      void refresh();
    }, 500);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [refresh]);

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
