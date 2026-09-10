import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Button, Icon } from "../../../components/OfflineUI";
import { formatTrackerTime } from "../utils/fapTrackerUtils";

export interface LogTrackerEventScreenProps {
  open: (route: string) => void;
  onBack?: () => void;
}

/**
 * LogTrackerEventScreen implements JOUR-05: Log Tracker Event
 * from the Restrainify UI Architecture specification.
 *
 * It provides a minimalist event timestamp recorder for the opt-in Fap Tracker.
 */
export function LogTrackerEventScreen({ onBack }: LogTrackerEventScreenProps) {
  const { snapshot: data, palette: p, command } = useOffline();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!data) return null;

  const isTrackerEnabled = data.settings.trackerEnabled;

  const handleSaveEvent = async () => {
    setError(null);

    if (!isTrackerEnabled) {
      Alert.alert(
        "Fap Tracker is disabled",
        "Enable the tracker first to record tracker events.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await command("event", {
        kind: "tracker",
        timestamp: Date.now(),
        note: "",
        resisted: false,
      });

      if (ok) {
        onBack?.();
      } else {
        setError("Unable to save event. Please try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeDisplay = `Now (${formatTrackerTime(Date.now())})`;

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
            Log tracker event
          </Text>
          <Text style={[s.headerSub, { color: p.textSecondary }]}>
            Fap Tracker
          </Text>
        </View>
      </View>

      {/* 2. Date & Time Field */}
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
            {timeDisplay}
          </Text>
          <Icon name="clock-outline" size={16} color={p.textSecondary} />
        </View>
      </View>

      {/* Validation Error Banner */}
      {!!error && (
        <View
          style={[
            s.errorBanner,
            { backgroundColor: p.dangerSurface, borderColor: p.danger },
          ]}
        >
          <Icon name="alert-circle-outline" size={16} color={p.danger} />
          <Text style={[s.errorText, { color: p.danger }]}>{error}</Text>
        </View>
      )}

      {/* 3. Action Button: Save Event */}
      <View style={s.buttonWrap}>
        <Button
          title={isSubmitting ? "Saving..." : "Save event"}
          icon="check"
          onPress={() => void handleSaveEvent()}
        />
      </View>

      {/* 4. Helper Text */}
      <Text style={[s.helperText, { color: p.textSecondary }]}>
        V1 keeps this intentionally minimal: an event and its timestamp.
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
    marginBottom: 12,
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
  fieldGroup: {
    marginTop: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
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
    marginTop: 12,
    lineHeight: 16,
  },
});
