import { Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface UrgeOutcomeSelectorProps {
  resisted: boolean;
  onSelect: (resisted: boolean) => void;
}

/**
 * UrgeOutcomeSelector provides a 2-choice card selector for JOUR-02:
 * 1. "I resisted it" -> resisted = true
 * 2. "I didn't" -> resisted = false
 */
export function UrgeOutcomeSelector({
  resisted,
  onSelect,
}: UrgeOutcomeSelectorProps) {
  const { palette: p } = useOffline();

  return (
    <View style={s.container}>
      {/* Option 1: I resisted it */}
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: resisted }}
        accessibilityLabel="I resisted it. I made a different choice."
        onPress={() => onSelect(true)}
        style={[
          s.card,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: resisted ? p.brandPrimary : p.borderSubtle,
            borderWidth: resisted ? 2 : 1,
          },
        ]}
      >
        <View style={[s.iconBox, { backgroundColor: p.successSurface }]}>
          <Icon name="check" size={18} color={p.success} />
        </View>
        <View style={s.textWrap}>
          <Text style={[s.title, { color: p.textPrimary }]}>
            I resisted it
          </Text>
          <Text style={[s.sub, { color: p.textSecondary }]}>
            I made a different choice.
          </Text>
        </View>
        <View
          style={[
            s.checkRing,
            {
              borderColor: resisted ? p.brandPrimary : p.borderSubtle,
              backgroundColor: resisted ? p.brandPrimary : "transparent",
            },
          ]}
        >
          {resisted && <Icon name="check" size={12} color="#FFFFFF" />}
        </View>
      </Pressable>

      {/* Option 2: I didn't */}
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: !resisted }}
        accessibilityLabel="I didn't resist. Record it without deleting the progress before it."
        onPress={() => onSelect(false)}
        style={[
          s.card,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: !resisted ? p.danger : p.borderSubtle,
            borderWidth: !resisted ? 2 : 1,
          },
        ]}
      >
        <View style={[s.iconBox, { backgroundColor: p.dangerSurface }]}>
          <Icon name="alert-circle-outline" size={18} color={p.danger} />
        </View>
        <View style={s.textWrap}>
          <Text style={[s.title, { color: p.textPrimary }]}>
            I didn't
          </Text>
          <Text style={[s.sub, { color: p.textSecondary }]}>
            Record it without deleting the progress before it.
          </Text>
        </View>
        <View
          style={[
            s.checkRing,
            {
              borderColor: !resisted ? p.danger : p.borderSubtle,
              backgroundColor: !resisted ? p.danger : "transparent",
            },
          ]}
        >
          {!resisted && <Icon name="check" size={12} color="#FFFFFF" />}
        </View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 10,
    marginTop: 14,
    marginBottom: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    gap: 12,
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
    fontSize: 14,
    fontWeight: "700",
  },
  sub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  checkRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
});
