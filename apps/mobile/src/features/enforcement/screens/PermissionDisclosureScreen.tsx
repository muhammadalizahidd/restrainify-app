import { useCallback, useEffect, useRef } from "react";
import { Alert, AppState, StyleSheet, View } from "react-native";
import { Text } from "../../../components/AppText";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, SurfaceGradient } from "../../../components/OfflineUI";
import { offlineProtection } from "../../../native/OfflineProtection";
import { setVisualBlocking } from "../../protection/utils/visualBlocking";
import { EnforcementBlockCard } from "../components/EnforcementBlockCard";

export type PermissionDisclosureType = "usage" | "accessibility" | "vpn" | "visual";

export interface PermissionDisclosureScreenProps {
  permissionType?: PermissionDisclosureType;
  returnRoute?: string;
  returnModal?: string;
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
  intentKind: string;
}

const DISCLOSURE_CONFIGS: Record<PermissionDisclosureType, DisclosureConfig> = {
  usage: {
    title: "Allow usage access",
    description:
      "Restrainify checks how long you use each app, so it can apply your daily limits and show your screen time. This stays on your phone.",
    supportsTitle: "How it helps",
    supportsDetail: "Daily limits, schedules and screen-time stats",
    accessTitle: "What it uses",
    accessDetail: "How long each app is open. Stored only on your phone",
    intentKind: "usage",
  },
  accessibility: {
    title: "Turn on app protection",
    description:
      "To block the apps, feeds and websites you choose, Restrainify uses Android's Accessibility service. It reads which app is open, the on-screen labels that show a Reels, Shorts or similar feed, and the web address in supported browsers. During an uninstall lock (Burst or independent Uninstall Protection), it also looks for Android's uninstall and settings screens. None of this is saved or sent anywhere.",
    supportsTitle: "What it is used for",
    supportsDetail: "Blocking feeds, apps and sites you choose, limits, schedules, Burst and timed Uninstall Protection",
    accessTitle: "What Restrainify reads",
    accessDetail: "The open app, on-screen labels and browser addresses. Checked on your phone, never saved or uploaded",
    intentKind: "accessibility",
  },
  vpn: {
    title: "Turn on website protection",
    description:
      "Restrainify sets up a private filter on your phone (Android calls it a VPN) to block adult and distracting websites. It only checks website names, which are looked up securely with Cloudflare's family-safe DNS. Restrainify doesn't keep a history.",
    supportsTitle: "How it helps",
    supportsDetail: "Blocking adult sites and your own block list",
    accessTitle: "What it uses",
    accessDetail: "Website names, sent securely to Cloudflare. Not stored by Restrainify",
    intentKind: "vpn",
  },
  visual: {
    title: "Turn on the Visual filter",
    description:
      "The Visual filter uses AI on your phone to cover explicit content in supported apps. Screens are checked privately and are never saved or sent anywhere.",
    supportsTitle: "How it helps",
    supportsDetail: "Covering explicit reels and videos",
    accessTitle: "What it uses",
    accessDetail: "What's on screen in supported apps, checked on your phone and then discarded",
    intentKind: "visual",
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
  returnRoute,
  returnModal,
  open,
  onBack,
}: PermissionDisclosureScreenProps) {
  const { palette: p, command, snapshot, refresh } = useOffline();
  const config = DISCLOSURE_CONFIGS[permissionType] ?? DISCLOSURE_CONFIGS.usage;
  const exitedRef = useRef(false);

  const isGranted = Boolean(
    permissionType === "accessibility"
      ? snapshot?.capabilities?.accessibility && snapshot.settings.accessibilityConsent
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

  const handleContinue = async () => {
    try {
      if (config.intentKind === "visual") {
        // Consent only; the on-device models need no Android permission of their own.
        if (await command("setting", { key: "visualConsent", value: true })) {
          await setVisualBlocking(command, true);
          handleExit();
        }
        return;
      }
      if (config.intentKind === "vpn") {
        // Consent first, then Android shows its own VPN confirmation.
        if (!(await command("setting", { key: "vpnConsent", value: true }))) return;
        if (!snapshot?.settings.websiteEnabled && !(await command("setting", { key: "websiteEnabled", value: true }))) return;
        await offlineProtection.startVpn();
        return;
      }
      if (config.intentKind === "accessibility") {
        if (!(await command("setting", { key: "accessibilityConsent", value: true }))) return;
      }
      await offlineProtection.settings(config.intentKind);
    } catch (error) {
      Alert.alert("Permission access", error instanceof Error ? error.message : "Could not open Android permission settings.");
    }
  };

  const handleDecline = () => {
    if (permissionType === "visual") {
      handleExit();
      return;
    }
    if (open) {
      open("permission-denied", { permissionType, returnRoute, returnModal });
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
          label: "Agree",
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
            { overflow: "hidden",
              backgroundColor: "transparent",
              borderColor: p.borderSubtle,
            },
          ]}
        ><SurfaceGradient />
          {/* Row 1: What it supports */}
          <View style={[styles.row, { borderBottomColor: p.borderSubtle }]}>
            <View
              style={[styles.rowIconWrap, { overflow: "hidden", backgroundColor: "transparent" }]}
            ><SurfaceGradient tone="muted" />
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
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View
              style={[styles.rowIconWrap, { overflow: "hidden", backgroundColor: "transparent" }]}
            ><SurfaceGradient tone="muted" />
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
