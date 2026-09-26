import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
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
 * Provides actionable Android Permission controls:
 * 1. App Restriction Access (Android Accessibility Service) for feed & app overlays
 * 2. Android Usage Access for screentime tracking and limits
 */
export function ProtectionHealthScreen({
  onBack,
}: ProtectionHealthScreenProps) {
  const { snapshot: data, palette: p, command } = useOffline();

  if (!data) return null;

  const usageHealthy = Boolean(data.capabilities.usage);
  const accessibilityHealthy = Boolean(
    data.capabilities.accessibility && data.settings.accessibilityConsent
  );

  return (
    <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
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
            Android System Permissions
          </Text>
        </View>
      </View>

      {/* 2. Focused App Restriction Access (Accessibility Service) Card */}
      <View
        style={[
          s.card,
          {
            backgroundColor: accessibilityHealthy ? p.surfacePrimary : p.warningSurface,
            borderColor: accessibilityHealthy ? p.borderSubtle : p.warning,
          },
        ]}
      >
        <View style={s.cardHeader}>
          <View
            style={[
              s.iconBox,
              {
                backgroundColor: accessibilityHealthy
                  ? p.successSurface
                  : p.warningSurface,
              },
            ]}
          >
            <Icon
              name={accessibilityHealthy ? "shield-check" : "shield-alert"}
              size={24}
              color={accessibilityHealthy ? p.success : p.warning}
            />
          </View>
          <View style={s.cardHeaderTextWrap}>
            <Text style={[s.cardTitle, { color: p.textPrimary }]}>
              {accessibilityHealthy
                ? "App restriction is active"
                : "App restriction access required"}
            </Text>
            <Text style={[s.cardSubtitle, { color: p.textSecondary }]}>
              {accessibilityHealthy
                ? "Intentional cooling overlays active"
                : "Required for app & feed blocking"}
            </Text>
          </View>
          <View
            style={[
              s.statusPill,
              {
                backgroundColor: accessibilityHealthy
                  ? p.successSurface
                  : p.warningSurface,
              },
            ]}
          >
            <Text
              style={[
                s.statusPillText,
                { color: accessibilityHealthy ? p.success : p.warning },
              ]}
            >
              {accessibilityHealthy ? "Granted" : "Action required"}
            </Text>
          </View>
        </View>

        <Text style={[s.bodyCopy, { color: p.textSecondary }]}>
          Restrainify uses Android Accessibility to detect when restricted applications and
          short-form video feeds open and display intentional cooling overlays. Zero personal data
          or keystrokes ever leave this device.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Grant App Restriction Access"
          onPress={async () => {
            try {
              await command("setting", { key: "accessibilityConsent", value: true });
            } catch {}
            void offlineProtection.settings("accessibility");
          }}
          style={[
            s.grantButton,
            { backgroundColor: accessibilityHealthy ? p.brandPrimary : p.warning },
          ]}
        >
          <Text
            style={[
              s.grantButtonText,
              { color: accessibilityHealthy ? p.backgroundPrimary : "#FFFFFF" },
            ]}
          >
            {accessibilityHealthy ? "Open Accessibility Settings" : "Grant App Restriction Access"}
          </Text>
        </Pressable>
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
    </ScrollView>
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
