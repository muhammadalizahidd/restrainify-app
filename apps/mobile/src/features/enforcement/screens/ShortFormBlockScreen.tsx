import { StyleSheet, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { EnforcementBlockCard } from "../components/EnforcementBlockCard";

export interface ShortFormBlockScreenProps {
  packageName?: string;
  appName?: string;
  feedName?: string;
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * ShortFormBlockScreen implements STATE-06: Short-Form Feed Block
 * from the Restrainify UI Architecture specification.
 *
 * Appears when a user navigates into an addictive short-form video feed
 * (e.g. Instagram Reels, YouTube Shorts, Snapchat Spotlight) without
 * blocking the entire utility application (messaging, feed posts, search).
 *
 * Backend mapping:
 * - Governed by `feedMode: "experimental"` in `snapshot.settings.rules`
 * - Detected via native accessibility view hierarchy in `RestrictionService.kt:76-84`
 */
export function ShortFormBlockScreen({
  appName = "Instagram",
  feedName = "Reels",
  open,
  onBack,
}: ShortFormBlockScreenProps) {
  const { palette: p } = useOffline();

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
        icon="video-outline"
        iconTone="primary"
        eyebrow="Feed restricted"
        title={`${appName} ${feedName} is protected.`}
        description={`The risky short-form surface is blocked while the rest of ${appName} can remain usable on supported versions.`}
        primaryButton={{
          label: `Return to ${appName}`,
          onPress: handleReturn,
        }}
        footerNote="Feed-level restriction operates on-device without reading message or account data."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
