import { StyleSheet, Text, View, Pressable } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { offlineProtection } from "../../../native/OfflineProtection";

export interface ProtectionHealthScreenProps {
  open?: (route: string) => void;
  onBack?: () => void;
}

/**
 * ProtectionHealthScreen (permissions / protection-health)
 *
 * Streamlined to focus exclusively on Android Usage Access permission.
 * All extraneous diagnostic cards (battery, website protection, visual protection,
 * strict mode, and full-matrix checks) have been removed.
 */
export function ProtectionHealthScreen({
  onBack,
}: ProtectionHealthScreenProps) {
  const { snapshot: data, palette: p } = useOffline();

  if (!data) return null;

  const usageHealthy = Boolean(data.capabilities.usage);

  return (
    <View style={s.container}>
      {/* 1. Subscreen Back Header */}
      <View style={s.backHeader}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[
              s.backButton,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={s.headerTitleWrap}>
          <Text style={[s.headerTitle, { color: p.textPrimary }]}>
            Device Permissions
          </Text>
          <Text style={[s.headerSubtitle, { color: p.textSecondary }]}>
            Android Usage Access
          </Text>
        </View>
      </View>

      {/* 2. Focused Usage Access Grant Option Card */}
      <View
        style={[
          s.card,
          {
            backgroundColor: usageHealthy ? p.surfacePrimary : p.warningSurface,
            borderColor: usageHealthy ? p.borderSubtle : p.warning,
          },
        ]}
      >
        <View style={s.cardHeader}>
          <View
            style={[
              s.iconBox,
              {
                backgroundColor: usageHealthy
                  ? p.successSurface
                  : p.warningSurface,
              },
            ]}
          >
            <Icon
              name={usageHealthy ? "shield-check" : "shield-alert"}
              size={24}
              color={usageHealthy ? p.success : p.warning}
            />
          </View>
          <View style={s.cardHeaderTextWrap}>
            <Text style={[s.cardTitle, { color: p.textPrimary }]}>
              {usageHealthy ? "Usage access is active" : "Usage access required"}
            </Text>
            <Text style={[s.cardSubtitle, { color: p.textSecondary }]}>
              {usageHealthy
                ? "Accurate screentime tracking active"
                : "System permission needed for limits"}
            </Text>
          </View>
          <View
            style={[
              s.statusPill,
              {
                backgroundColor: usageHealthy
                  ? p.successSurface
                  : p.warningSurface,
              },
            ]}
          >
            <Text
              style={[
                s.statusPillText,
                { color: usageHealthy ? p.success : p.warning },
              ]}
            >
              {usageHealthy ? "Granted" : "Action required"}
            </Text>
          </View>
        </View>

        <Text style={[s.bodyCopy, { color: p.textSecondary }]}>
          Restrainify needs Android Usage Stats access to accurately enforce your
          configured app limits and measure screen time. Your personal data and
          browsing never leave this device.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Grant Android Usage Access"
          onPress={() => void offlineProtection.settings("usage")}
          style={[
            s.grantButton,
            { backgroundColor: usageHealthy ? p.brandPrimary : p.warning },
          ]}
        >
          <Text
            style={[
              s.grantButtonText,
              { color: usageHealthy ? p.backgroundPrimary : "#FFFFFF" },
            ]}
          >
            {usageHealthy ? "Open Android Usage Settings" : "Grant Usage Access"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 24,
  },
  backHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardHeaderTextWrap: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 11.5,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  bodyCopy: {
    fontSize: 13,
    lineHeight: 18,
  },
  grantButton: {
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  grantButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
