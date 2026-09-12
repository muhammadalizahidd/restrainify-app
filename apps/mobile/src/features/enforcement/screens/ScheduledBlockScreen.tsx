import { StyleSheet, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { EnforcementBlockCard } from "../components/EnforcementBlockCard";

export interface ScheduledBlockScreenProps {
  packageName?: string;
  appName?: string;
  scheduleText?: string;
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * ScheduledBlockScreen implements STATE-05: Scheduled Block Overlay
 * from the Restrainify UI Architecture specification.
 *
 * Displays a non-impulsive blocking screen when an app is opened during
 * an active recurring scheduled restriction window.
 *
 * Backend mapping:
 * - Governed by `snapshot.settings.rules` (startMinute, endMinute, days)
 * - Evaluated natively via `Policy.scheduled()` and `RestrictionService.kt:54`
 * - Directs to `app-limit` (SET-APP-02) to inspect or modify configured schedule.
 */
export function ScheduledBlockScreen({
  packageName = "com.zhiliaoapp.musically",
  appName = "TikTok",
  scheduleText = "10:00 PM to 8:00 AM",
  open,
  onBack,
}: ScheduledBlockScreenProps) {
  const { snapshot: data, palette: p } = useOffline();

  // Find app-specific rule to format actual schedule window if present
  const matchingRule = data?.settings.rules.find(
    (r) => r.packageName === packageName
  );

  let formattedWindow = scheduleText;
  if (matchingRule && matchingRule.startMinute >= 0 && matchingRule.endMinute >= 0) {
    const startH = Math.floor(matchingRule.startMinute / 60);
    const startM = matchingRule.startMinute % 60;
    const endH = Math.floor(matchingRule.endMinute / 60);
    const endM = matchingRule.endMinute % 60;
    const formatTime = (h: number, m: number) => {
      const period = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
    };
    formattedWindow = `${formatTime(startH, startM)} to ${formatTime(endH, endM)}`;
  }

  const handleViewSchedule = () => {
    if (open) {
      open("app-limit", { packageName, label: appName });
    }
  };

  const handleReturn = () => {
    if (open) {
      open("home");
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: p.backgroundPrimary }]}>
      <EnforcementBlockCard
        icon="lock-outline"
        iconTone="primary"
        eyebrow="Scheduled restriction"
        title={`${appName} is blocked right now.`}
        description={`Your schedule runs from ${formattedWindow}. This restriction is separate from a daily usage limit.`}
        secondaryButton={{
          label: "View schedule",
          onPress: handleViewSchedule,
        }}
        cancelLink={{
          label: "Return",
          onPress: handleReturn,
        }}
        footerNote="Scheduled restrictions help protect sleep and focus windows."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
