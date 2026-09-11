import { Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface JournalFapCardProps {
  enabled: boolean;
  open: (route: string) => void;
}

/**
 * JournalFapCard displays the bottom navigation tile to the Fap Tracker (JOUR-04).
 * Emphasizes that tracker state is independent of protection enforcement.
 */
export function JournalFapCard({ enabled, open }: JournalFapCardProps) {
  const { palette: p } = useOffline();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Fap Tracker: ${enabled ? "Enabled" : "Disabled"}. Separate from protection. Tap to view tracker.`}
      onPress={() => open("fap-tracker")}
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
        <Icon name="notebook-outline" size={18} color={p.brandPrimary} />
      </View>
      <View style={s.textWrap}>
        <Text style={[s.title, { color: p.textPrimary }]}>Fap Tracker</Text>
        <Text style={[s.sub, { color: p.textSecondary }]}>
          {enabled ? "Enabled · separate from protection" : "Disabled · tap to configure"}
        </Text>
      </View>
      <Icon name="chevron-right" size={18} color={p.textSecondary} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    marginTop: 18,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
  },
  sub: {
    fontSize: 10,
    marginTop: 2,
  },
});
