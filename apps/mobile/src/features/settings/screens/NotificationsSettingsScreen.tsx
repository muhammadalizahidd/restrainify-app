import { useState } from "react";
import { StyleSheet, Text, View, Pressable, Switch } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";

export interface NotificationsSettingsScreenProps {
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

interface NotificationToggleItem {
  id: string;
  icon: IconName;
  title: string;
  subtitle: string;
  value: boolean;
}

/**
 * NotificationsSettingsScreen implements SET-NOT-01: Notifications
 * from the Restrainify UI Architecture specification.
 *
 * Provides granular toggles for recovery nudges, protection health alerts,
 * and daily reward check-ins, while emphasizing that core device protection
 * does not depend on notification permissions.
 */
export function NotificationsSettingsScreen({
  onBack,
}: NotificationsSettingsScreenProps) {
  const { palette: p } = useOffline();

  const [toggles, setToggles] = useState<NotificationToggleItem[]>([
    {
      id: "recovery",
      icon: "chart-timeline-variant",
      title: "Recovery reminders",
      subtitle: "Gentle daily recovery check-ins",
      value: true,
    },
    {
      id: "health",
      icon: "shield-check-outline",
      title: "Protection health alerts",
      subtitle: "Tell me when protection needs repair",
      value: true,
    },
    {
      id: "reward",
      icon: "gift-outline",
      title: "Daily reward",
      subtitle: "Reminder to claim your daily reward",
      value: false,
    },
  ]);

  const toggleItem = (id: string) => {
    setToggles((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, value: !item.value } : item
      )
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. Header */}
      <View style={styles.headerRow}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[
              styles.backButton,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={styles.titleWrap}>
          <Text style={[styles.headerKicker, { color: p.textSecondary }]}>
            User-controlled alerts
          </Text>
          <Text style={[styles.headerTitle, { color: p.textPrimary }]}>
            Notifications
          </Text>
        </View>
      </View>

      {/* 2. Platform Independence Banner */}
      <View
        style={[
          styles.noticeBanner,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
          },
        ]}
      >
        <View style={styles.noticeHeader}>
          <Icon name="bell-ring-outline" size={20} color={p.brandPrimary} />
          <Text style={[styles.noticeTitle, { color: p.textPrimary }]}>
            Notification permission allowed
          </Text>
        </View>
        <Text style={[styles.noticeBody, { color: p.textSecondary }]}>
          Core protection stays available even if notifications are denied,
          except where a foreground notification is technically required by the
          platform to keep services alive.
        </Text>
      </View>

      {/* 3. Notification Controls Section */}
      <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
        Notification controls
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {toggles.map((item, idx) => (
          <View
            key={item.id}
            style={[
              styles.toggleRow,
              idx < toggles.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: p.borderSubtle,
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

            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: p.textPrimary }]}>
                {item.title}
              </Text>
              <Text style={[styles.toggleSubtitle, { color: p.textSecondary }]}>
                {item.subtitle}
              </Text>
            </View>

            <Switch
              accessibilityLabel={item.title}
              value={item.value}
              onValueChange={() => toggleItem(item.id)}
              trackColor={{ true: p.success, false: p.borderSubtle }}
            />
          </View>
        ))}
      </View>

      {/* 4. Helper Note */}
      <Text style={[styles.helperText, { color: p.textSecondary }]}>
        These options demonstrate the V1 UI infrastructure. The exact
        notification catalog and schedule are configured locally without
        external ad tracking.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  headerKicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  noticeBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  noticeBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
    paddingHorizontal: 2,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  toggleRow: {
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
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  toggleSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
});
