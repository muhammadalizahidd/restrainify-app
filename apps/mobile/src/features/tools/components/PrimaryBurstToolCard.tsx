import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface PrimaryBurstToolCardProps {
  burstRemainingMs: number;
  open: (route: string) => void;
}

/**
 * PrimaryBurstToolCard displays the hero intervention card on TOOL-01 (Tools Action Hub).
 *
 * Backend mapping:
 * - snapshot.burstRemainingMs -> OfflineRuntime.kt:47 (remaining cooldown from SystemClock)
 * - Navigation -> opens BURST-01 ("burst") to view active countdown or trigger crisis mode
 */
export function PrimaryBurstToolCard({
  burstRemainingMs,
  open,
}: PrimaryBurstToolCardProps) {
  const { palette: p } = useOffline();
  const isBurstActive = burstRemainingMs > 0;

  const formatRemaining = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <LinearGradient
      colors={[p.heroStart, p.heroMiddle, p.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.7 }}
      style={s.card}
    >
      <View style={s.topRow}>
        <View style={s.iconBox}>
          <Icon name="lightning-bolt-outline" size={20} color="#FFFFFF" />
        </View>
        <View style={s.badge}>
          <Text style={s.badgeText}>
            {isBurstActive ? "ACTIVE INTERVENTION" : "HIGH PROTECTION"}
          </Text>
        </View>
      </View>

      <Text style={s.title}>Burst</Text>
      <Text style={s.subtitle}>
        {isBurstActive
          ? "High protection is temporarily locking configured triggering apps, sites and feeds."
          : "One tap activates your temporary high-protection state. No confirmation screen."}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isBurstActive
            ? `Burst active, ${formatRemaining(burstRemainingMs)} remaining. Tap to view.`
            : "Activate Burst now"
        }
        onPress={() => open("burst")}
        style={({ pressed }) => [
          s.actionBtn,
          { opacity: pressed ? 0.88 : 1 },
        ]}
      >
        <Text style={s.btnText}>
          {isBurstActive
            ? `View active Burst (${formatRemaining(burstRemainingMs)}) →`
            : "Activate now →"}
        </Text>
      </Pressable>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 22,
    overflow: "hidden",
    marginTop: 4,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: "#DBEAFF",
    marginTop: 4,
    maxWidth: "96%",
  },
  actionBtn: {
    alignSelf: "flex-start",
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
  },
  btnText: {
    color: "#15336C",
    fontSize: 12,
    fontWeight: "700",
  },
});
