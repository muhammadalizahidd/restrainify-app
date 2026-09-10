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
import { UrgeOutcomeSelector } from "../components/UrgeOutcomeSelector";
import { validateUrgeInput } from "../utils/journalUtils";

export interface LogUrgeScreenProps {
  open: (route: string) => void;
  onBack?: () => void;
}

/**
 * LogUrgeScreen implements JOUR-02: Log an Urge
 * from the Restrainify UI Architecture specification.
 *
 * It allows the user to record an urge occurrence with a 2-choice outcome
 * ("I resisted it" vs "I didn't"), optional trigger note, and timestamp.
 * Saves directly into the encrypted Room database via command("event").
 */
export function LogUrgeScreen({ onBack }: LogUrgeScreenProps) {
  const { snapshot: data, palette: p, command } = useOffline();

  const [resisted, setResisted] = useState(true);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!data) return null;

  const recoveryStart = data.settings.recoveryStart;
  const isTrackingEnabled = data.settings.recoveryEnabled;

  const handleSave = async () => {
    setValidationError(null);

    // If recovery tracking is disabled, prompt user to enable it
    if (!isTrackingEnabled) {
      Alert.alert(
        "Recovery tracking is off",
        "Enable recovery tracking in settings to record urge events.",
        [{ text: "OK" }]
      );
      return;
    }

    const timestamp = Date.now();
    const validation = validateUrgeInput(note, timestamp, recoveryStart);
    if (!validation.isValid) {
      setValidationError(validation.error ?? "Invalid input.");
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await command("event", {
        kind: "urge",
        timestamp,
        note: note.trim(),
        resisted,
      });

      if (ok) {
        onBack?.();
      } else {
        setValidationError("Unable to save urge event. Please try again.");
      }
    } catch (e) {
      setValidationError(
        e instanceof Error ? e.message : "Failed to record urge event."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Log an urge
          </Text>
          <Text style={[s.headerSub, { color: p.textSecondary }]}>
            Recovery events
          </Text>
        </View>
      </View>

      {/* 2. Page Head */}
      <View style={s.pageHead}>
        <Text style={[s.eyebrow, { color: p.textSecondary }]}>
          Quick recovery event
        </Text>
        <Text style={[s.pageTitle, { color: p.textPrimary }]}>
          How did this urge go?
        </Text>
        <Text style={[s.pageSub, { color: p.textSecondary }]}>
          Keep it simple. The outcome matters more than writing an essay.
        </Text>
      </View>

      {/* 3. 2-Choice Outcome Selector */}
      <UrgeOutcomeSelector resisted={resisted} onSelect={setResisted} />

      {/* 4. Timestamp Display */}
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
          <Text style={[s.fieldText, { color: p.textPrimary }]}>Now</Text>
          <Icon name="clock-outline" size={16} color={p.textSecondary} />
        </View>
      </View>

      {/* 5. Trigger Note Input */}
      <View style={s.fieldGroup}>
        <View style={s.labelRow}>
          <Text style={[s.fieldLabel, { color: p.textSecondary }]}>
            Trigger or note · optional
          </Text>
          <Text style={[s.charCount, { color: p.textSecondary }]}>
            {note.length}/500
          </Text>
        </View>
        <TextInput
          accessibilityLabel="Trigger or note input"
          placeholder="What was happening right before the urge?"
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

      {/* 6. Save Button */}
      <View style={s.buttonWrap}>
        <Button
          title={isSubmitting ? "Saving..." : "Save urge event"}
          icon="check"
          onPress={() => void handleSave()}
        />
      </View>
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
  pageHead: {
    marginTop: 6,
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -1,
  },
  pageSub: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
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
    marginTop: 16,
    paddingBottom: 16,
  },
});
