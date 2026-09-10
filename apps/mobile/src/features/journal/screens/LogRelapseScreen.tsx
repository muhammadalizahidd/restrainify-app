import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Button, Icon } from "../../../components/OfflineUI";
import { formatEventTime, validateUrgeInput } from "../utils/journalUtils";

export interface LogRelapseScreenProps {
  open: (route: string) => void;
  onBack?: () => void;
}

/**
 * LogRelapseScreen implements JOUR-03: Log a Relapse
 * from the Restrainify UI Architecture specification.
 *
 * It allows the user to record a relapse event with:
 * - History preservation notice
 * - Formatted date & time display
 * - Optional trigger/context note (up to 500 characters)
 * - Explicit confirmation modal before streak recalculation
 *
 * Invariant:
 * - Resets recovery.current streak calculation via Policy.recovery()
 * - Strictly preserves recovery.longest and historical clean day records
 * - Never modifies or weakens protection settings
 */
export function LogRelapseScreen({ onBack }: LogRelapseScreenProps) {
  const { snapshot: data, palette: p, command } = useOffline();

  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!data) return null;

  const recoveryStart = data.settings.recoveryStart;
  const isTrackingEnabled = data.settings.recoveryEnabled;

  const submitRelapse = async () => {
    const timestamp = Date.now();
    const validation = validateUrgeInput(note, timestamp, recoveryStart);
    if (!validation.isValid) {
      setValidationError(validation.error ?? "Invalid input.");
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await command("event", {
        kind: "relapse",
        timestamp,
        note: note.trim(),
        resisted: false,
      });

      if (ok) {
        onBack?.();
      } else {
        setValidationError("Unable to save relapse event. Please try again.");
      }
    } catch (e) {
      setValidationError(
        e instanceof Error ? e.message : "Failed to record relapse."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePromptLogRelapse = () => {
    setValidationError(null);

    if (!isTrackingEnabled) {
      Alert.alert(
        "Recovery tracking is off",
        "Enable recovery tracking in settings to record relapse events.",
        [{ text: "OK" }]
      );
      return;
    }

    // Confirmation dialog before streak recalculation
    Alert.alert(
      "Record a relapse?",
      "Your current streak will be recalculated. Your history and longest streak will stay.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Record",
          style: "destructive",
          onPress: () => void submitRelapse(),
        },
      ]
    );
  };

  const currentTimeDisplay = `Today · ${formatEventTime(Date.now())}`;

  return (
    <View style={s.container}>
      {/* 1. Subscreen Header */}
      <View style={s.headerRow}>
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
        <View style={s.titleWrap}>
          <Text style={[s.headerTitle, { color: p.textPrimary }]}>
            Log a relapse
          </Text>
          <Text style={[s.headerSub, { color: p.textSecondary }]}>
            Manual recovery event
          </Text>
        </View>
      </View>

      {/* 2. History Preservation Notice Banner */}
      <View
        style={[
          s.noticeCard,
          { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
        ]}
      >
        <View style={[s.noticeIconBox, { backgroundColor: p.surfacePrimary }]}>
          <Icon name="history" size={18} color={p.brandPrimary} />
        </View>
        <View style={s.noticeTextWrap}>
          <Text style={[s.noticeTitle, { color: p.textPrimary }]}>
            Your history stays intact
          </Text>
          <Text style={[s.noticeSub, { color: p.textSecondary }]}>
            Logging a relapse resets the current streak calculation but does not erase previous recovery progress.
          </Text>
        </View>
      </View>

      {/* 3. Date & Time Field */}
      <View style={s.fieldGroup}>
        <Text style={[s.fieldLabel, { color: p.textSecondary }]}>
          Date & time
        </Text>
        <View
          style={[
            s.staticField,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          <Text style={[s.fieldText, { color: p.textPrimary }]}>
            {currentTimeDisplay}
          </Text>
          <Icon name="clock-outline" size={16} color={p.textSecondary} />
        </View>
      </View>

      {/* 4. Trigger / Context Note */}
      <View style={s.fieldGroup}>
        <View style={s.labelRow}>
          <Text style={[s.fieldLabel, { color: p.textSecondary }]}>
            What triggered it? · optional
          </Text>
          <Text style={[s.charCount, { color: p.textSecondary }]}>
            {note.length}/500
          </Text>
        </View>
        <TextInput
          accessibilityLabel="What triggered the relapse"
          placeholder="A short note — e.g. scrolling late at night"
          placeholderTextColor={p.textSecondary}
          value={note}
          onChangeText={setNote}
          maxLength={500}
          multiline
          numberOfLines={3}
          style={[
            s.textArea,
            {
              backgroundColor: p.surfacePrimary,
              borderColor: p.borderSubtle,
              color: p.textPrimary,
            },
          ]}
        />
      </View>

      {/* Validation Error Banner */}
      {!!validationError && (
        <View
          style={[
            s.errorBanner,
            { backgroundColor: p.dangerSurface, borderColor: p.danger },
          ]}
        >
          <Icon name="alert-circle-outline" size={16} color={p.danger} />
          <Text style={[s.errorText, { color: p.danger }]}>
            {validationError}
          </Text>
        </View>
      )}

      {/* 5. Danger Action Button */}
      <View style={s.buttonWrap}>
        <Button
          title={isSubmitting ? "Logging..." : "Log relapse"}
          tone="danger"
          icon="alert-circle-outline"
          onPress={handlePromptLogRelapse}
        />
      </View>

      {/* 6. Protection Separation Reassurance */}
      <Text style={[s.helperText, { color: p.textSecondary }]}>
        Protection settings are not changed by logging a relapse.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  titleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  noticeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  noticeSub: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  fieldGroup: {
    marginTop: 10,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
  },
  charCount: {
    fontSize: 10,
    fontWeight: "500",
  },
  staticField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  fieldText: {
    fontSize: 13,
    fontWeight: "600",
  },
  textArea: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: "top",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  buttonWrap: {
    marginTop: 18,
  },
  helperText: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 16,
  },
});
