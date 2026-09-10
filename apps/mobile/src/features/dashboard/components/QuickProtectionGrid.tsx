import { StyleSheet, Text, View, Pressable } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";

export interface QuickProtectionGridProps {
  onNavigate: (route: string) => void;
  webHealthy: boolean;
  appHealthy: boolean;
}

interface QuickCardItem {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  route: string;
  active: boolean;
}

/**
 * QuickProtectionGrid renders the 3-column action cards for:
 * 1. Web filter
 * 2. Visual AI
 * 3. Strict lock
 */
export function QuickProtectionGrid({
  onNavigate,
  webHealthy,
  appHealthy,
}: QuickProtectionGridProps) {
  const { palette: p } = useOffline();

  const items: QuickCardItem[] = [
    {
      id: "web",
      title: "Web filter",
      subtitle: "Blocks triggers",
      icon: "web",
      route: "website-protection",
      active: webHealthy,
    },
    {
      id: "visual",
      title: "Visual AI",
      subtitle: "Local blur",
      icon: "eye-off-outline",
      route: "visual-protection",
      active: false, // Offline edition truthful status
    },
    {
      id: "strict",
      title: "Strict lock",
      subtitle: "Anti-bypass",
      icon: "lock-outline",
      route: "strict-mode",
      active: appHealthy,
    },
  ];

  const activeTotal = (webHealthy ? 1 : 0) + (appHealthy ? 1 : 0);

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

      {/* 3-Column Grid */}
      <View style={s.gridRow}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}: ${item.subtitle}`}
            onPress={() => onNavigate(item.route)}
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
                size={18}
                color={item.active ? p.brandPrimary : p.textSecondary}
              />
            </View>
            <Text style={[s.cardTitle, { color: p.textPrimary }]}>
              {item.title}
            </Text>
            <Text style={[s.cardSubtitle, { color: p.textSecondary }]}>
              {item.subtitle}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionSide: {
    fontSize: 10,
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
    minHeight: 104,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  miniIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 9,
    textAlign: "center",
    marginTop: 3,
    lineHeight: 12,
  },
});
