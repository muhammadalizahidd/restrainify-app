import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { offlineProtection } from "../../../native/OfflineProtection";
import { EnforcementBlockCard } from "../components/EnforcementBlockCard";

export type PermissionDisclosureType = "usage" | "accessibility" | "vpn";

export interface PermissionDisclosureScreenProps {
  permissionType?: PermissionDisclosureType;
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

interface DisclosureConfig {
  title: string;
  description: string;
  supportsTitle: string;
  supportsDetail: string;
  accessTitle: string;
  accessDetail: string;
  declineTitle: string;
  declineDetail: string;
  intentKind: string;
}

const DISCLOSURE_CONFIGS: Record<PermissionDisclosureType, DisclosureConfig> = {
  usage: {
    title: "Usage access",
    description:
      "Restrainify needs this capability to measure supported app usage and enforce the daily limits you choose.",
    supportsTitle: "What it supports",
    supportsDetail: "Per-app usage, limits and schedules",
    accessTitle: "What Restrainify can access",
    accessDetail: "App usage information allowed by Android",
    declineTitle: "If you decline",
    declineDetail:
      "App controls remain incomplete; other protection continues",
    intentKind: "usage",
  },
  accessibility: {
    title: "App restriction access",
    description:
      "Restrainify uses Android Accessibility to detect when restricted applications open and display intentional cooling overlays.",
    supportsTitle: "What it supports",
    supportsDetail: "Burst crisis mode, short-form blocks & scheduled limits",
    accessTitle: "What Restrainify can access",
    accessDetail: "Active foreground window packageName and feed view IDs",
    declineTitle: "If you decline",
    declineDetail:
      "On-device overlays cannot display; website protection continues",
    intentKind: "accessibility",
  },
  vpn: {
    title: "Website filtering setup",
    description:
      "Restrainify runs a local on-device DNS loopback to block adult websites and trigger domains before they load.",
    supportsTitle: "What it supports",
    supportsDetail: "Domain blocklists, custom rules, and scoped overrides",
    accessTitle: "What Restrainify can access",
    accessDetail: "DNS hostname queries resolved entirely on your device",
    declineTitle: "If you decline",
    declineDetail:
      "Website filtering cannot run; app controls continue independently",
    intentKind: "vpn",
  },
};

/**
 * PermissionDisclosureScreen implements STATE-01: Pre-Permission Disclosure
 * from the Restrainify UI Architecture specification.
 *
 * Explains why Android will prompt the user, what scope is accessed,
 * and what happens if the user declines before firing the OS intent.
 *
 * Backend mapping:
 * - `offlineProtection.settings(kind)` opens the corresponding Android Settings activity.
 */
export function PermissionDisclosureScreen({
  permissionType = "usage",
  open,
  onBack,
}: PermissionDisclosureScreenProps) {
  const { palette: p } = useOffline();
  const config = DISCLOSURE_CONFIGS[permissionType] ?? DISCLOSURE_CONFIGS.usage;

  const handleContinue = async () => {
    try {
      await offlineProtection.settings(config.intentKind);
    } catch {
      // Graceful fallback on non-Android / development test environments
    }
  };

  const handleDecline = () => {
    if (open) {
      open("permission-denied", { permissionType });
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: p.backgroundPrimary }]}>
      <EnforcementBlockCard
        icon="shield-check"
        iconTone="primary"
        eyebrow="Before Android asks"
        title={config.title}
        description={config.description}
        primaryButton={{
          label: "Continue to Android settings",
          onPress: handleContinue,
        }}
        cancelLink={{
          label: "Not now",
          onPress: handleDecline,
        }}
      >
        <View
          style={[
            styles.rowList,
            {
              backgroundColor: p.surfacePrimary,
              borderColor: p.borderSubtle,
            },
          ]}
        >
          {/* Row 1: What it supports */}
          <View style={[styles.row, { borderBottomColor: p.borderSubtle }]}>
            <View
              style={[styles.rowIconWrap, { backgroundColor: p.surfaceMuted }]}
            >
              <Icon name="cellphone-cog" size={18} color={p.brandPrimary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: p.textPrimary }]}>
                {config.supportsTitle}
              </Text>
              <Text style={[styles.rowDetail, { color: p.textSecondary }]}>
                {config.supportsDetail}
              </Text>
            </View>
          </View>

          {/* Row 2: What Restrainify can access */}
          <View style={[styles.row, { borderBottomColor: p.borderSubtle }]}>
            <View
              style={[styles.rowIconWrap, { backgroundColor: p.surfaceMuted }]}
            >
              <Icon name="eye-outline" size={18} color={p.brandPrimary} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: p.textPrimary }]}>
                {config.accessTitle}
              </Text>
              <Text style={[styles.rowDetail, { color: p.textSecondary }]}>
                {config.accessDetail}
              </Text>
            </View>
          </View>

          {/* Row 3: If you decline */}
          <View style={styles.row}>
            <View
              style={[styles.rowIconWrap, { backgroundColor: p.warningSurface }]}
            >
              <Icon name="alert-circle-outline" size={18} color={p.warning} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: p.textPrimary }]}>
                {config.declineTitle}
              </Text>
              <Text style={[styles.rowDetail, { color: p.textSecondary }]}>
                {config.declineDetail}
              </Text>
            </View>
          </View>
        </View>
      </EnforcementBlockCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rowList: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  rowDetail: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
});
