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
          : "Burst Mode: temporary high protection"
      }
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        {
          backgroundColor: p.surfacePrimary,
          borderColor: isActive ? "#EF4444" : p.borderSubtle,
        },
        pressed && s.cardPressed,
      ]}
    >
      {/* Icon */}
      <View
        style={[
          s.iconWrap,
          {
            backgroundColor: isActive
              ? "rgba(239, 68, 68, 0.18)"
              : "rgba(239, 68, 68, 0.10)",
          },
        ]}
      >
        <Icon
          name="lightning-bolt"
          color="#EF4444"
          size={20}
        />
      </View>

      {/* Copy */}
      <View style={s.textWrap}>
        <Text style={[s.title, { color: p.textPrimary }]}>
          {isActive ? "Burst is active" : "Burst Mode"}
        </Text>
        <Text style={[s.subtitle, { color: p.textSecondary }]}>
          {isActive
            ? `${remainingMinutes}m cooldown remaining`
            : burstConfiguredMinutes > 0
            ? `${burstConfiguredMinutes}m temporary high protection`
            : "Temporary high protection"}
        </Text>
      </View>

      {/* Action Badge */}
      <View
        style={[
          s.actionBadge,
          {
            backgroundColor: "#EF4444",
          },
        ]}
      >
        <Text style={s.actionBadgeText}>
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
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 70,
    marginTop: 8,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 10.5,
    marginTop: 3,
    lineHeight: 14,
  },
  actionBadge: {
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBadgeText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});
