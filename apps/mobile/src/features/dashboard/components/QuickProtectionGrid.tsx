import { StyleSheet, View, Pressable } from "react-native";
import { Text } from "../../../components/AppText";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName, SurfaceGradient } from "../../../components/OfflineUI";
import { DEFAULT_FEED_PACKAGES, isSameSocialApp } from "../../protection/utils/socialPackages";
import { hasVisualAccessibility, isVisualBlockingOn } from "../../protection/utils/visualBlocking";

export interface QuickProtectionGridProps {
  onNavigate: (route: string) => void;
  onOpenWebFilter?: () => void;
  onOpenVisualAi?: () => void;
  onOpenStrictLock?: () => void;
  onOpenShortForm?: () => void;
  onOpenAppControls?: () => void;
  onOpenUninstallLock?: () => void;
  webHealthy: boolean;
  appHealthy: boolean;
}

interface QuickCardItem {
  id: string;
  title: string;
  icon: IconName;
  route: string;
  active: boolean;
}

/**
 * QuickProtectionGrid renders protection action buttons with unified card styling:
 * two columns, three rows: Site Blocker · Explicit Content Filter / In-App Blocker · App Limits /
 * Settings Lock · Uninstall Lock. Cards are kept compact so the last row peeks above the fold and
 * hints that there is more to scroll to. Icons sit at the same height in every card and every name
 * starts on the same line, whether it takes one or two lines.
 *
 * All buttons share the exact same card box format, mini icon header, and pop-up modal triggers.
 */
export function QuickProtectionGrid({
  onNavigate,
  onOpenWebFilter,
  onOpenVisualAi,
  onOpenStrictLock,
  onOpenShortForm,
  onOpenAppControls,
  onOpenUninstallLock,
  webHealthy,
}: QuickProtectionGridProps) {
  const { palette: p, snapshot: data } = useOffline();

  const isStrictActive = (data?.strictRemainingMs ?? 0) > 0;
  const activeFeedsCount = DEFAULT_FEED_PACKAGES.filter((pkg) => {
    const rule = data?.settings.rules?.find((r) => isSameSocialApp(r.packageName, pkg));
    return rule ? rule.enabled && rule.feedMode !== "off" : false;
  }).length;
  const controlledAppsCount = data?.settings.rules.filter((r) => r.enabled).length ?? 0;

  const row1Items: QuickCardItem[] = [
    {
      id: "web",
      title: "Site Blocker",
      icon: "web",
      route: "website-protection",
      active: webHealthy,
    },
    {
      id: "short",
      title: "In-App Blocker",
      icon: "play-box-outline",
      route: "short-form",
      active: activeFeedsCount > 0,
    },
    {
      id: "apps",
      title: "App Limits",
      icon: "cellphone-cog",
      route: "app-controls",
      active: controlledAppsCount > 0,
    },
  ];

  const row2Items: QuickCardItem[] = [
    {
      id: "strict",
      title: "Settings Lock",
      icon: "lock-outline",
      route: "strict-mode",
      active: isStrictActive,
    },
    {
      id: "visual",
      title: "Explicit Content Filter",
      icon: "eye-off-outline",
      route: "visual-protection",
      active: hasVisualAccessibility(data) && isVisualBlockingOn(data),
    },
    {
      id: "uninstall",
      title: "Uninstall Lock",
      icon: "shield-lock-outline",
      route: "home",
      active: (data?.uninstallRemainingMs ?? 0) > 0,
    },
  ];
  // Display order: what gets blocked first, then limits, then the locks that protect everything else.
  const ORDER = ["web", "visual", "short", "apps", "strict", "uninstall"];
  const allItems = [...row1Items, ...row2Items].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));


  const handleCardPress = (item: QuickCardItem) => {
    if (item.id === "web" && onOpenWebFilter) {
      onOpenWebFilter();
    } else if (item.id === "short" && onOpenShortForm) {
      onOpenShortForm();
    } else if (item.id === "apps" && onOpenAppControls) {
      onOpenAppControls();
    } else if (item.id === "strict" && onOpenStrictLock) {
      onOpenStrictLock();
    } else if (item.id === "visual" && onOpenVisualAi) {
      onOpenVisualAi();
    } else if (item.id === "uninstall" && onOpenUninstallLock) {
      onOpenUninstallLock();
    } else {
      onNavigate(item.route);
    }
  };

  const renderCard = (item: QuickCardItem) => (
    <Pressable
      key={item.id}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={() => handleCardPress(item)}
      style={({ pressed }) => [
        s.card,
        { overflow: "hidden",
          backgroundColor: "transparent",
          borderColor: p.borderSubtle,
        },
        pressed && s.cardPressed,
      ]}
    ><SurfaceGradient />
      <View style={[s.miniIcon, { overflow: "hidden", backgroundColor: "transparent" }]}><SurfaceGradient tone="muted" />
        {/* Same colour for every icon; whether a protection is on is shown by the dot, not the icon. */}
        <Icon name={item.icon} size={20} color={p.brandPrimary} />
      </View>
      {item.active && <View accessibilityLabel="On" style={[s.activeDot, { backgroundColor: p.toggleActive, borderColor: p.surfacePrimary }]} />}
      <Text numberOfLines={2} style={[s.cardTitle, { color: p.textPrimary }]}>
        {item.title}
      </Text>
    </Pressable>
  );

  return (
    <View style={s.container}>
      <View style={s.sectionTitleRow}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Your protection
        </Text>
      </View>

      {/* Two columns give the longer names room; pairs keep both cards in a row the same size. */}
      {[0, 2, 4].map((start, index) => (
        <View key={start} style={[s.gridRow, index > 0 && { marginTop: 8 }]}>
          {allItems.slice(start, start + 2).map(renderCard)}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  gridRow: {
    flexDirection: "row",
    gap: 8,
  },
  // Top-aligned with a fixed name area, so icons and names line up across cards
  // even when one name wraps to two lines.
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  activeDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  miniIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    // Room for two lines in every card.
    height: 36,
    fontWeight: "700",
    textAlign: "center",
  },
});
