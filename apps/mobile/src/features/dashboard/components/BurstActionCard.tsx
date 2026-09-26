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
          borderColor: isActive ? p.warning : p.borderSubtle,
        },
        pressed && s.cardPressed,
      ]}
    >
      {/* Icon */}
      <View style={[s.iconWrap, { backgroundColor: p.surfaceMuted }]}>
        <Icon name="lightning-bolt" color={p.textSecondary} size={22} />
      </View>

      {/* Copy */}
      <View style={s.textWrap}>
        <Text style={[s.title, { color: p.textPrimary }]}>
          {isActive ? "Burst is active" : "Burst Mode"}
        </Text>
        <Text style={[s.subtitle, { color: p.textSecondary }]}>
          {isActive
            ? `${remainingMinutes}m remaining`
            : burstConfiguredMinutes > 0
            ? `${burstConfiguredMinutes}m`
            : "Ready"}
        </Text>
      </View>

      {/* Action Badge */}
      <View style={[s.actionBadge, { backgroundColor: p.brandPrimary }]}>
        <Text style={[s.actionBadgeText, { color: p.backgroundPrimary }]}>
          {isActive ? `${remainingMinutes}M` : "Start"}
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
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  actionBadge: {
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  actionBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});
