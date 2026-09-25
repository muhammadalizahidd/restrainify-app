import { StyleSheet, Text, View, Pressable } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";
import { DEFAULT_FEED_PACKAGES, isSameSocialApp } from "../../protection/utils/socialPackages";

export interface QuickProtectionGridProps {
  onNavigate: (route: string) => void;
  onOpenWebFilter?: () => void;
  onOpenVisualAi?: () => void;
  onOpenStrictLock?: () => void;
  onOpenShortForm?: () => void;
  onOpenAppControls?: () => void;
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
 * - Row 1 (Core content filters): Web filter · Short feed · App controls
 * - Row 2 (Resistance & Vision): Strict lock · Visual AI
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
  webHealthy,
}: QuickProtectionGridProps) {
  const { palette: p, snapshot: data } = useOffline();

  const isStrictActive = (data?.strictRemainingMs ?? 0) > 0;
  const activeFeedsCount = DEFAULT_FEED_PACKAGES.filter((pkg) => {
    const rule = data?.settings.rules?.find((r) => isSameSocialApp(r.packageName, pkg));
    return rule ? rule.enabled && rule.feedMode !== "off" : true;
  }).length;
  const controlledAppsCount = data?.settings.rules.length || 4;

  const row1Items: QuickCardItem[] = [
    {
      id: "web",
      title: "Web filter",
      icon: "web",
      route: "website-protection",
      active: webHealthy,
    },
    {
      id: "short",
      title: "Short feeds",
      icon: "play-box-outline",
      route: "short-form",
      active: activeFeedsCount > 0,
    },
    {
      id: "apps",
      title: "App controls",
      icon: "cellphone-cog",
      route: "app-controls",
      active: controlledAppsCount > 0,
    },
  ];

  const row2Items: QuickCardItem[] = [
    {
      id: "strict",
      title: "Strict lock",
      icon: "lock-outline",
      route: "strict-mode",
      active: isStrictActive,
    },
    {
      id: "visual",
      title: "Visual filter",
      icon: "eye-off-outline",
      route: "visual-protection",
      active: false, // Offline edition truthful status
    },
  ];

  const activeTotal =
    (webHealthy ? 1 : 0) +
    (activeFeedsCount > 0 ? 1 : 0) +
    (controlledAppsCount > 0 ? 1 : 0) +
    (isStrictActive ? 1 : 0);

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
        {
          backgroundColor: p.surfacePrimary,
          borderColor: p.borderSubtle,
        },
        pressed && s.cardPressed,
      ]}
    >
      <View style={[s.miniIcon, { backgroundColor: p.surfaceMuted }]}>
        <Icon
          name={item.icon}
          size={20}
          color={item.active ? p.brandPrimary : p.textSecondary}
        />
      </View>
      <Text style={[s.cardTitle, { color: p.textPrimary }]}>
        {item.title}
      </Text>
    </Pressable>
  );

  return (
    <View style={s.container}>
      {/* Section Header */}
      <View style={s.sectionTitleRow}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Your protection
        </Text>
        <Text style={[s.sectionSide, { color: p.textSecondary }]}>
          {activeTotal} active
        </Text>
      </View>

      {/* Row 1: Core Content Filters (Web filter, Short feed, App controls) */}
      <View style={s.gridRow}>
        {row1Items.map(renderCard)}
      </View>

      {/* Row 2: Resistance & Local Safeguards (Strict lock, Visual AI) */}
      <View style={[s.gridRow, { marginTop: 8 }]}>
        {row2Items.map(renderCard)}
      </View>
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
  sectionSide: {
    fontSize: 12,
    fontWeight: "600",
  },
  gridRow: {
    flexDirection: "row",
    gap: 8,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 112,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  miniIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 3,
    lineHeight: 14,
  },
});
