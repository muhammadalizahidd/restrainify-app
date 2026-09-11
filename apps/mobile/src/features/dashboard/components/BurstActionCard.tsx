import { StyleSheet, Text, View, Pressable } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface BurstActionCardProps {
  burstRemainingMs: number;
  burstConfiguredMinutes: number;
  onPress: () => void;
  busy?: boolean;
}

/**
 * BurstActionCard renders the soft danger card at the bottom of Home:
 * - Icon: shield-alert in danger tone
 * - Text: "Need help right now?"
 * - Subtext: "Activate Burst immediately." (or remaining cooldown)
 * - Pill badge: "BURST"
 */
export function BurstActionCard({
  burstRemainingMs,
  burstConfiguredMinutes,
  onPress,
  busy = false,
}: BurstActionCardProps) {
  const { palette: p } = useOffline();
  const isActive = burstRemainingMs > 0;
  const remainingMinutes = Math.ceil(burstRemainingMs / 60000);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        isActive
          ? `Burst active: ${remainingMinutes} minutes remaining`
          : "Need help right now? Activate Burst immediately"
      }
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        {
          backgroundColor: p.dangerSurface,
          borderColor: isActive ? p.danger : "rgba(182, 78, 85, 0.22)",
        },
        pressed && s.cardPressed,
      ]}
    >
      {/* Icon */}
      <View
        style={[
          s.iconWrap,
          {
            backgroundColor: "rgba(182, 78, 85, 0.12)",
          },
        ]}
      >
        <Icon
          name={isActive ? "lightning-bolt" : "shield-alert-outline"}
          color={p.danger}
          size={20}
        />
      </View>

      {/* Copy */}
      <View style={s.textWrap}>
        <Text style={[s.title, { color: p.textPrimary }]}>
          {isActive ? "Burst is active" : "Need help right now?"}
        </Text>
        <Text style={[s.subtitle, { color: p.textSecondary }]}>
          {isActive
            ? `${remainingMinutes}m cooldown remaining`
            : burstConfiguredMinutes > 0
            ? `${burstConfiguredMinutes}m high protection cooldown`
            : "Activate Burst immediately."}
        </Text>
      </View>

      {/* Pill */}
      <View style={[s.pill, { backgroundColor: p.danger }]}>
        <Text style={s.pillText}>
          {isActive ? `${remainingMinutes}M` : "BURST"}
        </Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderRadius: 19,
    padding: 14,
    marginTop: 14,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 15,
  },
  subtitle: {
    fontSize: 9.5,
    lineHeight: 13,
    marginTop: 3,
  },
  pill: {
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  pillText: {
    color: "#FFFFFF",
    fontSize: 8.5,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
});
