import { Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface JournalQuickActionsProps {
  open: (route: string) => void;
}

/**
 * JournalQuickActions renders the 2-action card row at the top of the Recovery Journal:
 * 1. Log an urge -> opens JOUR-02
 * 2. Log a relapse -> opens JOUR-03
 */
export function JournalQuickActions({ open }: JournalQuickActionsProps) {
  const { palette: p } = useOffline();

  return (
    <View style={s.grid}>
      {/* 1. Log an urge */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log an urge. Record whether you resisted it."
        onPress={() => open("log-urge")}
        style={({ pressed }) => [
          s.card,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
          <Icon name="chart-timeline-variant" size={18} color={p.brandPrimary} />
        </View>
        <Text style={[s.title, { color: p.textPrimary }]}>Log an urge</Text>
        <Text style={[s.sub, { color: p.textSecondary }]}>
          Record whether you resisted it.
        </Text>
      </Pressable>

      {/* 2. Log a relapse */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log a relapse. Date, time and optional trigger."
        onPress={() => open("log-relapse")}
        style={({ pressed }) => [
          s.card,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <View style={[s.iconBox, { backgroundColor: p.dangerSurface }]}>
          <Icon name="alert-circle-outline" size={18} color={p.danger} />
        </View>
        <Text style={[s.title, { color: p.textPrimary }]}>Log a relapse</Text>
        <Text style={[s.sub, { color: p.textSecondary }]}>
          Date, time and optional trigger.
        </Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
  },
  sub: {
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },
});
