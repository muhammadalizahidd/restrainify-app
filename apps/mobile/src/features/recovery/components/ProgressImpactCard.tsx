import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface ProgressImpactCardProps {
  blockedSitesCount: number;
  visualEventsCount?: number;
  burstCount: number;
}

/**
 * ProgressImpactCard displays monthly protection impact metrics:
 * 1. Adult sites blocked
 * 2. Risky visuals covered (privacy-respecting local counter)
 * 3. Burst interventions completed
 */
export function ProgressImpactCard({
  blockedSitesCount,
  visualEventsCount = 128,
  burstCount,
}: ProgressImpactCardProps) {
  const { palette: p } = useOffline();

  const rows = [
    {
      icon: "web" as const,
      title: "Adult sites blocked",
      subtitle: "Attempts stopped before loading",
      value: String(blockedSitesCount),
    },
    {
      icon: "eye-outline" as const,
      title: "Risky visuals covered",
      subtitle: "On-device filtering events",
      value: String(visualEventsCount),
    },
    {
      icon: "lightning-bolt-outline" as const,
      title: "Burst interventions",
      subtitle: "Immediate high-protection sessions",
      value: String(burstCount),
    },
  ];

  return (
    <View style={s.container}>
      {/* Section Header */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Protection impact
        </Text>
        <Text style={[s.sectionBadge, { color: p.textSecondary }]}>
          THIS MONTH
        </Text>
      </View>

      {/* Rows Container */}
      <View
        style={[
          s.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {rows.map((row, idx) => (
          <View
            key={row.title}
            style={[
              s.row,
              idx > 0 && { borderTopWidth: 1, borderTopColor: p.borderSubtle },
            ]}
          >
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name={row.icon} size={18} color={p.brandPrimary} />
            </View>
            <View style={s.rowText}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>
                {row.title}
              </Text>
              <Text style={[s.rowSub, { color: p.textSecondary }]}>
                {row.subtitle}
              </Text>
            </View>
            <Text style={[s.rowValue, { color: p.textPrimary }]}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionBadge: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  rowSub: {
    fontSize: 10,
    marginTop: 2,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "800",
  },
});
