import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface ProgressImpactCardProps {
  blockedSitesCount: number;
  visualEventsCount?: number;
  burstCount: number;
}

/**
 * ProgressImpactCard displays monthly protection impact metrics in a compact
 * 2-column box layout:
 * 1. Adult sites blocked
 * 2. Burst interventions completed
 */
export function ProgressImpactCard({
  blockedSitesCount,
  burstCount,
}: ProgressImpactCardProps) {
  const { palette: p } = useOffline();

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

      {/* 2-Column Compact Box Grid */}
      <View style={s.grid}>
        {/* Box 1: Adult sites blocked */}
        <View
          style={[
            s.box,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          <View style={s.boxTopRow}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="web" size={16} color={p.brandPrimary} />
            </View>
            <Text style={[s.boxValue, { color: p.textPrimary }]}>
              {blockedSitesCount}
            </Text>
          </View>
          <Text style={[s.boxTitle, { color: p.textPrimary }]}>
            Adult sites blocked
          </Text>
          <Text style={[s.boxSub, { color: p.textSecondary }]}>
            Stopped before loading
          </Text>
        </View>

        {/* Box 2: Burst interventions */}
        <View
          style={[
            s.box,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          <View style={s.boxTopRow}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="lightning-bolt-outline" size={16} color={p.brandPrimary} />
            </View>
            <Text style={[s.boxValue, { color: p.textPrimary }]}>
              {burstCount}
            </Text>
          </View>
          <Text style={[s.boxTitle, { color: p.textPrimary }]}>
            Burst interventions
          </Text>
          <Text style={[s.boxSub, { color: p.textSecondary }]}>
            High-protection sessions
          </Text>
        </View>
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
  grid: {
    flexDirection: "row",
    gap: 10,
  },
  box: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    gap: 3,
  },
  boxTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  boxValue: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  boxTitle: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  boxSub: {
    fontSize: 10,
    lineHeight: 13,
  },
});
