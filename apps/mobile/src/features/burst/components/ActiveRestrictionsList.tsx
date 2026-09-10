import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";

export interface ActiveRestrictionsListProps {
  burstAppsCount: number;
}

interface RestrictionItem {
  id: string;
  icon: IconName;
  title: string;
  subtitle: string;
  badge: string;
}

export function ActiveRestrictionsList({
  burstAppsCount,
}: ActiveRestrictionsListProps) {
  const { palette: p } = useOffline();

  const items: RestrictionItem[] = [
    {
      id: "apps",
      icon: "cellphone-lock",
      title: "Configured Apps",
      subtitle: `${burstAppsCount} apps temporarily restricted`,
      badge: "Active",
    },
    {
      id: "web",
      icon: "web",
      title: "Triggering websites",
      subtitle: "Stronger website protection",
      badge: "Active",
    },
    {
      id: "feeds",
      icon: "video-outline",
      title: "Short-form feeds",
      subtitle: "Feed restrictions strengthened",
      badge: "Active",
    },
  ];

  return (
    <View
      style={[
        s.listCard,
        { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
      ]}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <View
            key={item.id}
            style={[
              s.row,
              !isLast && { borderBottomWidth: 1, borderBottomColor: p.borderSubtle },
            ]}
          >
            <View style={[s.iconWrap, { backgroundColor: p.surfaceMuted }]}>
              <Icon name={item.icon} size={18} color={p.brandPrimary} />
            </View>

            <View style={s.textWrap}>
              <Text style={[s.title, { color: p.textPrimary }]}>
                {item.title}
              </Text>
              <Text style={[s.subtitle, { color: p.textSecondary }]}>
                {item.subtitle}
              </Text>
            </View>

            <View style={[s.badge, { backgroundColor: p.successSurface }]}>
              <Text style={[s.badgeText, { color: p.success }]}>
                {item.badge}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  listCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginVertical: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 10,
    marginTop: 2,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
});
