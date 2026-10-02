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
  declineTitle: string;
  declineDetail: string;
  intentKind: string;
}

const DISCLOSURE_CONFIGS: Record<PermissionDisclosureType, DisclosureConfig> = {
  usage: {
    title: "Usage access",
    description:
      "Restrainify reads how long you use each app so it can enforce your daily limits and show your screen time. This stays on your phone and is not sent anywhere.",
    supportsTitle: "What it is used for",
    supportsDetail: "Daily limits, schedules and your screen-time stats",
    accessTitle: "What Restrainify reads",
    accessDetail: "How long each app is open. Stored only on your phone",
    declineTitle: "If you decline",
    declineDetail:
      "App controls remain incomplete; other protection continues",
    intentKind: "usage",
  },
  accessibility: {
    title: "Allow app restriction access",
    description:
      "To block the apps, feeds and websites you choose, Restrainify uses Android's Accessibility service. It reads which app is open, the on-screen labels that show a Reels, Shorts or similar feed, and the web address in supported browsers. During a Burst lock it also looks for Android's uninstall and settings screens. None of this is saved or sent anywhere.",
    supportsTitle: "What it is used for",
    supportsDetail: "Blocking feeds, apps and sites you choose, limits, schedules and Burst",
    accessTitle: "What Restrainify reads",
    accessDetail: "The open app, on-screen labels and browser addresses. Checked on your phone, never saved or uploaded",
    declineTitle: "If you decline",
    declineDetail:
      "On-device overlays cannot display; website protection continues",
    intentKind: "accessibility",
  },
  vpn: {
    title: "Turn on website protection",
    description:
      "To block adult and distracting websites, Restrainify sets up a filter on your phone (Android calls it a VPN). It only handles website name lookups, not the rest of your internet traffic. Lookups that are not blocked are sent, encrypted, to Cloudflare's family-safe DNS service to get the answer. Restrainify does not keep a history of them.",
    supportsTitle: "What it is used for",
    supportsDetail: "Blocking adult sites and your own block list",
    accessTitle: "What is sent",
    accessDetail: "The website names your apps look up, sent encrypted to Cloudflare. Not stored by Restrainify",
    declineTitle: "If you decline",
    declineDetail:
      "Website blocking stays off. App controls keep working",
    intentKind: "vpn",
  },
  visual: {
    title: "Turn on the Visual filter",
    description:
      "The Visual filter looks at what is on screen in Instagram, TikTok, YouTube, Snapchat and Facebook and covers explicit content. It captures the screen and checks it with AI that is stored on your phone. Images are checked in memory and are never saved or sent anywhere. It needs Android 14 or newer and you can turn it off any time.",
    supportsTitle: "What it is used for",
    supportsDetail: "Covering explicit reels and videos in supported apps",
    accessTitle: "What Restrainify reads",
    accessDetail: "Screen images from those apps, checked on your phone and then discarded",
    declineTitle: "If you decline",
    declineDetail: "The Visual filter stays off. Everything else keeps working",
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
        await command("setting", { key: "accessibilityConsent", value: true });
      }
      await offlineProtection.settings(config.intentKind);
    } catch (error) {
      if (config.intentKind === "vpn") {
        Alert.alert("Website protection", error instanceof Error ? error.message : "Could not turn on website protection.");
      }
      // Otherwise: graceful fallback on non-Android / development test environments
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
          <View style={[styles.row, { borderBottomColor: p.borderSubtle }]}>
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
