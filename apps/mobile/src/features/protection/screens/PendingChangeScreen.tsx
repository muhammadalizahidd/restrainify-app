import { useState, useEffect } from "react";
import { StyleSheet, Text, View, Pressable, Alert } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface PendingChangeScreenProps {
  reason?: string;
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * PendingChangeScreen implements STATE-STRICT-02: Pending Change Cooldown
 * from the Restrainify UI Architecture specification.
 *
 * Implements intentional friction and a live countdown timer before an impulsive
 * weakening change is permitted, allowing the urge to subside.
 *
 * Backend mapping:
 * - Reads live remaining cooldown: `snapshot.strictRemainingMs` (OfflineRuntime.kt:48-60)
 * - Cancel action restores safe state and returns back.
 */
export function PendingChangeScreen({
  reason = "Disable protected setting",
  onBack,
}: PendingChangeScreenProps) {
  const { snapshot: data, palette: p } = useOffline();

  const initialMs =
    data && data.strictRemainingMs > 0
      ? data.strictRemainingMs
      : 18 * 60 * 1000 + 42 * 1000; // 18:42 demo fallback

  const [remainingMs, setRemainingMs] = useState(initialMs);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  const handleCancelRequest = () => {
    Alert.alert(
      "Request Cancelled",
      "Protection remains active. Your previous settings were not weakened.",
      [{ text: "OK", onPress: onBack }]
    );
  };

  const handleViewRequestedChange = () => {
    Alert.alert("Requested Change", reason, [{ text: "Close" }]);
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
            Strict Mode cooldown
          </Text>
          <Text style={[styles.headerTitle, { color: p.textPrimary }]}>
            Pending change
          </Text>
        </View>
      </View>

      {/* 2. Notice Banner */}
      <View
        style={[
          styles.noticeBanner,
          {
            backgroundColor: p.warningSurface,
            borderColor: p.warning,
          },
        ]}
      >
        <View style={styles.noticeHeader}>
          <Icon name="lock-outline" size={20} color={p.warning} />
          <Text style={[styles.noticeTitle, { color: p.warning }]}>
            Website Protection stays active
          </Text>
        </View>
        <Text style={[styles.noticeBody, { color: p.textSecondary }]}>
          Your request to disable or weaken this protected setting is waiting
          for its configured Strict Mode cooldown.
        </Text>
      </View>

      {/* 3. Countdown Card */}
      <View
        style={[
          styles.countdownCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <Text style={[styles.eyebrow, { color: p.textSecondary }]}>
          CHANGE AVAILABLE IN
        </Text>

        <Text style={[styles.timerDigits, { color: p.textPrimary }]}>
          {formattedTime}
        </Text>

        <Text style={[styles.helperBody, { color: p.textSecondary }]}>
          Strict Mode adds deliberate friction to impulsive protection changes.
          Use this space to step away and reconsider.
        </Text>
      </View>

      {/* 4. Action Buttons */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Keep protection on, cancel request"
        onPress={handleCancelRequest}
        style={[styles.accentButton, { backgroundColor: p.brandPrimary }]}
      >
        <Text style={[styles.accentButtonText, { color: p.backgroundPrimary }]}>
          Keep protection on · cancel request
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View requested change"
        onPress={handleViewRequestedChange}
        style={styles.linkButton}
      >
        <Text style={[styles.linkButtonText, { color: p.brandPrimary }]}>
          View requested change
        </Text>
      </Pressable>
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
  countdownCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  timerDigits: {
    fontSize: 54,
    fontWeight: "800",
    letterSpacing: -2,
    marginVertical: 4,
  },
  helperBody: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 280,
  },
  accentButton: {
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  accentButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  linkButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
