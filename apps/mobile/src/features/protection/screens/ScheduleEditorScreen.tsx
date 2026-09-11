import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface ScheduleEditorScreenProps {
  packageName?: string;
  label?: string;
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

const DAYS_OF_WEEK = [
  { label: "M", dayIndex: 1, name: "Monday" },
  { label: "T", dayIndex: 2, name: "Tuesday" },
  { label: "W", dayIndex: 3, name: "Wednesday" },
  { label: "T", dayIndex: 4, name: "Thursday" },
  { label: "F", dayIndex: 5, name: "Friday" },
  { label: "S", dayIndex: 6, name: "Saturday" },
  { label: "S", dayIndex: 7, name: "Sunday" },
];

/**
 * ScheduleEditorScreen implements SET-APP-03: Schedule Editor
 * from the Restrainify UI Architecture specification.
 *
 * Configures start time, end time, and active repeat days for an app restriction window.
 *
 * Backend mapping:
 * - Persists `startMinute`, `endMinute`, `days` to `command("rule", ...)`
 * - Invariant: `require(start in 0..1439 && end in 0..1439 && start != end)` (OfflineRuntime.kt:108)
 * - Invariant: `assertCanWeaken()` enforces Strict Mode protection
 */
export function ScheduleEditorScreen({
  packageName = "com.instagram.android",
  label = "Instagram",
  onBack,
}: ScheduleEditorScreenProps) {
  const { snapshot: data, palette: p, command } = useOffline();

  const existingRule = data?.settings.rules.find(
    (r) => r.packageName === packageName
  );

  const [startTime, setStartTime] = useState("22:00");
  const [endTime, setEndTime] = useState("08:00");
  const [selectedDays, setSelectedDays] = useState<number[]>(
    existingRule?.days ?? [1, 2, 3, 4, 5, 6, 7]
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!data) return null;

  const isCooldownActive =
    data.burstRemainingMs > 0 || data.strictRemainingMs > 0;

  const parseTimeToMinutes = (timeStr: string): number | null => {
    const trimmed = timeStr.trim();
    // Support 24-hour format HH:MM or 12-hour format HH:MM AM/PM
    const match24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
    if (match24) {
      const hours = parseInt(match24[1]!, 10);
      const minutes = parseInt(match24[2]!, 10);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return hours * 60 + minutes;
      }
    }

    const match12 = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed);
    if (match12) {
      let hours = parseInt(match12[1]!, 10);
      const minutes = parseInt(match12[2]!, 10);
      const period = match12[3]!.toUpperCase();
      if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes <= 59) {
        if (period === "PM" && hours < 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;
        return hours * 60 + minutes;
      }
    }

    return null;
  };

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(dayIndex)) {
        if (prev.length === 1) return prev; // At least one day must be selected
        return prev.filter((d) => d !== dayIndex);
      } else {
        return [...prev, dayIndex].sort();
      }
    });
  };

  const handleSaveSchedule = async () => {
    setErrorMessage(null);
    const startMinute = parseTimeToMinutes(startTime);
    const endMinute = parseTimeToMinutes(endTime);

    if (startMinute === null) {
      setErrorMessage("Please enter a valid start time (e.g. 22:00 or 10:00 PM).");
      return;
    }
    if (endMinute === null) {
      setErrorMessage("Please enter a valid end time (e.g. 08:00 or 8:00 AM).");
      return;
    }
    if (startMinute === endMinute) {
      setErrorMessage("Start time and end time cannot be identical.");
      return;
    }
    if (selectedDays.length === 0) {
      setErrorMessage("Please select at least one active day.");
      return;
    }

    if (isCooldownActive) {
      Alert.alert(
        "Strict Mode Active",
        "Modifying restriction schedules is locked until the cooldown ends."
      );
      return;
    }

    try {
      await command("rule", {
        packageName,
        enabled: true,
        limitMinutes: existingRule?.limitMinutes || 45,
        startMinute,
        endMinute,
        days: selectedDays,
        feedMode: existingRule?.feedMode || "off",
        burst: existingRule?.burst ?? true,
      });

      if (onBack) onBack();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save schedule";
      setErrorMessage(msg);
    }
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
            App restriction window
          </Text>
          <Text style={[styles.headerTitle, { color: p.textPrimary }]}>
            Schedule · {label}
          </Text>
        </View>
      </View>

      {/* 2. Start and End Time Inputs */}
      <View style={styles.timeInputsGrid}>
        <View style={styles.fieldWrap}>
          <Text style={[styles.fieldLabel, { color: p.textSecondary }]}>
            Starts
          </Text>
          <TextInput
            accessibilityLabel="Start time"
            value={startTime}
            onChangeText={setStartTime}
            placeholder="10:00 PM"
            placeholderTextColor={p.textMuted}
            style={[
              styles.timeInput,
              {
                backgroundColor: p.surfacePrimary,
                borderColor: p.borderSubtle,
                color: p.textPrimary,
              },
            ]}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.fieldLabel, { color: p.textSecondary }]}>
            Ends
          </Text>
          <TextInput
            accessibilityLabel="End time"
            value={endTime}
            onChangeText={setEndTime}
            placeholder="8:00 AM"
            placeholderTextColor={p.textMuted}
            style={[
              styles.timeInput,
              {
                backgroundColor: p.surfacePrimary,
                borderColor: p.borderSubtle,
                color: p.textPrimary,
              },
            ]}
          />
        </View>
      </View>

      {/* 3. Repeat Days Section */}
      <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
        Repeat
      </Text>

      <View style={styles.daysGrid}>
        {DAYS_OF_WEEK.map((item) => {
          const isSelected = selectedDays.includes(item.dayIndex);
          return (
            <Pressable
              key={item.dayIndex}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              accessibilityState={{ selected: isSelected }}
              onPress={() => toggleDay(item.dayIndex)}
              style={[
                styles.dayButton,
                {
                  backgroundColor: isSelected
                    ? p.brandPrimary
                    : p.surfacePrimary,
                  borderColor: isSelected ? p.brandPrimary : p.borderSubtle,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayButtonText,
                  {
                    color: isSelected
                      ? p.backgroundPrimary
                      : p.textPrimary,
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 4. Error Message */}
      {errorMessage && (
        <View
          style={[
            styles.errorBanner,
            { backgroundColor: p.dangerSurface, borderColor: p.danger },
          ]}
        >
          <Text style={[styles.errorText, { color: p.danger }]}>
            {errorMessage}
          </Text>
        </View>
      )}

      {/* 5. Save Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save schedule"
        onPress={() => void handleSaveSchedule()}
        style={[styles.accentButton, { backgroundColor: p.brandPrimary }]}
      >
        <Text style={[styles.accentButtonText, { color: p.backgroundPrimary }]}>
          Save schedule
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
  timeInputsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  fieldWrap: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  timeInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
    paddingHorizontal: 2,
  },
  daysGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  dayButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
  },
  accentButton: {
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  accentButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
