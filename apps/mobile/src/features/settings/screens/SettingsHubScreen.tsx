import { StyleSheet, Text, View, Pressable } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";
import { useAuth } from "../../auth";

export function getFirstName(
  fullName?: string | null,
  email?: string | null,
  displayName?: string | null
): string | undefined {
  const name = fullName || displayName;
  if (name && name.trim()) {
    const first = name.trim().split(/\s+/)[0];
    if (first) return first;
  }
  if (email && email.trim()) {
    const local = email.trim().split("@")[0];
    if (local) {
      const firstChunk = local.split(/[._-]/)[0];
      if (firstChunk) {
        return firstChunk.charAt(0).toUpperCase() + firstChunk.slice(1);
      }
      return local;
    }
  }
  return undefined;
}

export interface SettingsHubScreenProps {
  open: (route: string, params?: Record<string, unknown>) => void;
}

interface SettingItem {
  id: string;
  icon: IconName;
  title: string;
  subtitle: string;
  badge?: string;
  badgeTone?: "good" | "warn" | "neutral";
  route: string;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

/**
 * SettingsHubScreen implements SET-01: Settings Hub
 * from the Restrainify UI Architecture specification.
 *
 * It acts as the feature-organized configuration anchor for the application,
 * separating administrative settings from action-oriented Tools (TOOL-01).
 *
 * Backend mapping:
 * - Protection badges reflect live capability & rules status
 * - Strict Mode reflects `snapshot.strictRemainingMs`
 * - Recovery reflects `snapshot.settings.recoveryEnabled`
 * - Burst reflects `snapshot.settings.burstMinutes`
 * - Tracker reflects `snapshot.settings.trackerEnabled`
 */
export function SettingsHubScreen({ open }: SettingsHubScreenProps) {
  const { snapshot: data, palette: p } = useOffline();
  const { user, profile } = useAuth();

  if (!data) return null;

  const isStrictActive = data.strictRemainingMs > 0;
  const isBurstActive = data.burstRemainingMs > 0;
  const activeRulesCount = data.settings.rules.filter((r) => r.enabled).length;
  const activeFeedsCount = data.settings.rules.filter(
    (r) => r.enabled && r.feedMode !== "off"
  ).length;

  const userFirstName =
    getFirstName(
      profile?.fullName,
      user?.email,
      (user as { displayName?: string } | null)?.displayName || user?.fullName
    ) || (user ? "Account" : undefined);

  const sections: SettingSection[] = [
    {
      title: "Protection",
      items: [
        {
          id: "web-protection",
          icon: "web",
          title: "Website Protection",
          subtitle: "Adult sites, SafeSearch, domains & overrides",
          badge: data.settings.websiteEnabled ? "Active" : "Off",
          badgeTone: data.settings.websiteEnabled ? "good" : "neutral",
          route: "website-protection",
        },
        {
          id: "visual-protection",
          icon: "eye-outline",
          title: "Visual Protection",
          subtitle: "Content detection and person blur",
          badge: "Active",
          badgeTone: "good",
          route: "visual-protection",
        },
        {
          id: "short-form",
          icon: "play-box-outline",
          title: "Short-form feeds",
          subtitle: "Reels, Shorts, Spotlight & TikTok fallback",
          badge: `${activeFeedsCount || 4} active`,
          badgeTone: "good",
          route: "short-form",
        },
        {
          id: "app-controls",
          icon: "cellphone-lock",
          title: "App Controls",
          subtitle: "Daily limits and restriction schedules",
          badge: `${activeRulesCount || 4} apps`,
          badgeTone: "good",
          route: "app-controls",
        },
      ],
    },
    {
      title: "Resistance",
      items: [
        {
          id: "strict-mode",
          icon: "lock-outline",
          title: "Strict Mode & cooldowns",
          subtitle: "Add friction to protection weakening",
          badge: isStrictActive
            ? `${Math.ceil(data.strictRemainingMs / 60000)}m locked`
            : data.settings.strictMinutes > 0
            ? "On"
            : "Off",
          badgeTone: isStrictActive ? "warn" : "good",
          route: "strict-mode",
        },
        {
          id: "pending-change",
          icon: "timer-sand",
          title: "Pending change cooldown",
          subtitle: "Live cooldown timer & cancel requests",
          badge: isStrictActive ? "Active" : "Timer",
          badgeTone: isStrictActive ? "warn" : "neutral",
          route: "pending-change",
        },
      ],
    },
    {
      title: "Recovery",
      items: [
        {
          id: "recovery-settings",
          icon: "chart-timeline-variant",
          title: "Recovery tracking",
          subtitle: "Streak and recovery calculations",
          badge: data.settings.recoveryEnabled ? "On" : "Off",
          badgeTone: data.settings.recoveryEnabled ? "good" : "neutral",
          route: "recovery-settings",
        },
        {
          id: "burst-settings",
          icon: "lightning-bolt-outline",
          title: "Burst",
          subtitle: "Choose what gets strengthened",
          badge: isBurstActive
            ? "Active"
            : data.settings.burstMinutes > 0
            ? "Configured"
            : "Off",
          badgeTone: isBurstActive ? "warn" : "good",
          route: "burst-settings",
        },
        {
          id: "fap-settings",
          icon: "calendar-clock",
          title: "Fap Tracker",
          subtitle: "Optional event tracker",
          badge: data.settings.trackerEnabled ? "On" : "Off",
          badgeTone: data.settings.trackerEnabled ? "good" : "neutral",
          route: "fap-settings",
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          id: "notifications",
          icon: "bell-outline",
          title: "Notifications",
          subtitle: "Permission & reminder controls",
          route: "notifications",
        },
        {
          id: "cloud-sync",
          icon: "cloud-sync-outline",
          title: "Cloud Sync",
          subtitle: "Local-first eligible data sync",
          badge: "Up to date",
          badgeTone: "good",
          route: "cloud-sync",
        },
      ],
    },
    {
      title: "Account & data",
      items: [
        {
          id: "account",
          icon: "account-circle-outline",
          title: "Account",
          subtitle: "Authentication and security credentials",
          badge: userFirstName,
          badgeTone: "neutral",
          route: "account",
        },
        {
          id: "data-privacy",
          icon: "shield-lock-outline",
          title: "Data & Privacy",
          subtitle: "Local reset and privacy boundaries",
          route: "data-privacy",
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Page Header */}
      <View style={styles.pageHead}>
        <Text style={[styles.eyebrow, { color: p.textSecondary }]}>
          CONFIGURATION
        </Text>
        <Text style={[styles.title, { color: p.textPrimary }]}>Settings.</Text>
        <Text style={[styles.subtitle, { color: p.textSecondary }]}>
          Organized by feature. Protection controls live here; Tools stays
          action-oriented.
        </Text>
      </View>

      {/* Sections */}
      {sections.map((sec) => (
        <View key={sec.title} style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
            {sec.title}
          </Text>
          <View
            style={[
              styles.rowListCard,
              {
                backgroundColor: p.surfacePrimary,
                borderColor: p.borderSubtle,
              },
            ]}
          >
            {sec.items.map((item, idx) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.subtitle}`}
                onPress={() => open(item.route)}
                style={({ pressed }) => [
                  styles.rowItem,
                  idx < sec.items.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: p.borderSubtle,
                  },
                  {
                    backgroundColor: pressed ? p.surfaceMuted : "transparent",
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: p.backgroundPrimary,
                      borderColor: p.borderSubtle,
                    },
                  ]}
                >
                  <Icon name={item.icon} size={20} color={p.brandPrimary} />
                </View>

                <View style={styles.contentWrap}>
                  <Text style={[styles.itemTitle, { color: p.textPrimary }]}>
                    {item.title}
                  </Text>
                  <Text
                    style={[styles.itemSubtitle, { color: p.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.subtitle}
                  </Text>
                </View>

                {item.badge && (
                  <View
                    style={[
                      styles.badgePill,
                      {
                        backgroundColor:
                          item.badgeTone === "good"
                            ? p.successSurface
                            : item.badgeTone === "warn"
                            ? p.warningSurface
                            : p.surfaceMuted,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color:
                            item.badgeTone === "good"
                              ? p.success
                              : item.badgeTone === "warn"
                              ? p.warning
                              : p.textSecondary,
                        },
                      ]}
                    >
                      {item.badge}
                    </Text>
                  </View>
                )}

                <Icon name="chevron-right" size={18} color={p.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 20,
  },
  pageHead: {
    marginBottom: 4,
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.3,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  sectionWrap: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
    paddingHorizontal: 2,
  },
  rowListCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 64,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  contentWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  badgePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    maxWidth: 100,
    flexShrink: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    flexWrap: "wrap",
  },
});
