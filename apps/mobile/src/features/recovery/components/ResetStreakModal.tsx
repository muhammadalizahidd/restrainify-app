import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface ResetStreakModalProps {
  visible: boolean;
  onClose: () => void;
  currentStreak: number;
  longestStreak: number;
  cleanDays: number;
}

/**
 * ResetStreakModal renders a centered, reassurance-first confirmation dialog
 * for recording a relapse and resetting the active streak.
 *
 * Behavioral recovery principles:
 * 1. Combats the "Abstinence Violation Effect": Clearly reinforces that past clean days
 *    and longest streaks are never erased by a single setback.
 * 2. Provides optional trigger reflection (up to 500 chars) for habit awareness.
 * 3. Safely records an immutable "relapse" event through the offline-first Policy engine.
 */
export function ResetStreakModal({
  visible,
  onClose,
  currentStreak,
  longestStreak,
  cleanDays,
}: ResetStreakModalProps) {
  const { snapshot: data, palette: p, command } = useOffline();
  const { height: windowHeight } = useWindowDimensions();
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isRecoveryEnabled = data?.settings?.recoveryEnabled ?? true;

  const handleReset = async () => {
    setErrorMessage(null);

    if (!isRecoveryEnabled) {
      Alert.alert(
        "Recovery tracking disabled",
        "Enable recovery tracking in Settings to log streaks and recovery events.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await command("event", {
        kind: "relapse",
        timestamp: Date.now(),
        note: note.trim(),
        resisted: false,
      });

      if (ok) {
        setNote("");
        onClose();
        Alert.alert(
          "Streak reset",
          "Your current streak has been reset to 0. Remember: your recovery history and past clean days are fully preserved. A new day begins now.",
          [{ text: "Continue" }]
        );
      } else {
        setErrorMessage("Unable to reset streak. Please try again.");
      }
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "Failed to record setback event."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    setNote("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.overlay}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityLabel="Dismiss dialog backdrop"
          accessibilityRole="button"
        />

        <View
          style={[
            s.dialogCard,
            {
              backgroundColor: p.surfacePrimary,
              borderColor: p.borderSubtle,
              maxHeight: Math.min(windowHeight * 0.88, 580),
            },
          ]}
        >
          {/* 1. Dialog Pinned Header */}
          <View
            style={[
              s.dialogHeader,
              { borderBottomColor: p.borderSubtle },
            ]}
          >
            <View
              style={[
                s.headerIconBox,
                {
                  backgroundColor: p.dangerSurface,
                  borderColor: p.danger,
                },
              ]}
            >
              <Icon name="restore" size={20} color={p.danger} />
            </View>

            <View style={s.headerTextWrap}>
              <Text style={[s.headerTitle, { color: p.textPrimary }]}>
                Reset streak
              </Text>
              <Text style={[s.headerSub, { color: p.textSecondary }]}>
                Record setback · Fresh start
              </Text>
            </View>

            <Pressable
              onPress={handleClose}
              disabled={isSubmitting}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              style={[
                s.closeBtn,
                {
                  backgroundColor: p.surfaceMuted,
                  opacity: isSubmitting ? 0.4 : 1,
                },
              ]}
            >
              <Icon name="close" size={18} color={p.textSecondary} />
            </Pressable>
          </View>

          {/* 2. Scrollable Content Area */}
          <ScrollView
            style={s.dialogScroll}
            contentContainerStyle={s.dialogScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Error Banner */}
            {errorMessage && (
              <View
                style={[
                  s.errorBanner,
                  {
                    backgroundColor: p.dangerSurface,
                    borderColor: p.danger,
                  },
                ]}
              >
                <Icon name="alert-circle-outline" size={16} color={p.danger} />
                <Text style={[s.errorText, { color: p.danger }]}>
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Reassurance Notice */}
            <View
              style={[
                s.reassuranceCard,
                {
                  backgroundColor: "rgba(37, 76, 145, 0.08)",
                  borderColor: "rgba(37, 76, 145, 0.22)",
                },
              ]}
            >
              <View style={s.reassuranceHeader}>
                <Icon name="shield-check" size={18} color={p.brandPrimary} />
                <Text style={[s.reassuranceTitle, { color: p.brandPrimary }]}>
                  History is never erased
                </Text>
              </View>
              <Text style={[s.reassuranceBody, { color: p.textSecondary }]}>
                Restrainify follows a restorative recovery model. A difficult day
                resets your current consecutive streak, but your total clean days
                and personal best remain part of your story.
              </Text>
            </View>

            {/* Metric Impact Breakdown */}
            <View
              style={[
                s.metricsBox,
                {
                  backgroundColor: p.backgroundPrimary,
                  borderColor: p.borderSubtle,
                },
              ]}
            >
              <View style={s.metricRow}>
                <View style={s.metricLabelWrap}>
                  <Text style={[s.metricLabel, { color: p.textPrimary }]}>
                    Current streak
                  </Text>
                  <Text style={[s.metricSub, { color: p.textSecondary }]}>
                    Will reset to start day 0
                  </Text>
                </View>
                <View style={s.metricValueWrap}>
                  <Text style={[s.metricOldValue, { color: p.textMuted }]}>
                    {currentStreak}d
                  </Text>
                  <Icon name="arrow-right" size={14} color={p.danger} />
                  <Text style={[s.metricNewValue, { color: p.danger }]}>
                    0d
                  </Text>
                </View>
              </View>

              <View
                style={[
                  s.metricDivider,
                  { backgroundColor: p.borderSubtle },
                ]}
              />

              <View style={s.metricRow}>
                <View style={s.metricLabelWrap}>
                  <Text style={[s.metricLabel, { color: p.textPrimary }]}>
                    Longest streak
                  </Text>
                  <Text style={[s.metricSub, { color: p.textSecondary }]}>
                    Your personal record
                  </Text>
                </View>
                <View
                  style={[
                    s.statusPill,
                    { backgroundColor: p.successSurface },
                  ]}
                >
                  <Text style={[s.statusPillText, { color: p.success }]}>
                    {longestStreak}d preserved
                  </Text>
                </View>
              </View>

              <View
                style={[
                  s.metricDivider,
                  { backgroundColor: p.borderSubtle },
                ]}
              />

              <View style={s.metricRow}>
                <View style={s.metricLabelWrap}>
                  <Text style={[s.metricLabel, { color: p.textPrimary }]}>
                    Clean days (30d)
                  </Text>
                  <Text style={[s.metricSub, { color: p.textSecondary }]}>
                    Rolling recovery momentum
                  </Text>
                </View>
                <View
                  style={[
                    s.statusPill,
                    { backgroundColor: p.surfaceMuted },
                  ]}
                >
                  <Text style={[s.statusPillText, { color: p.textSecondary }]}>
                    {cleanDays}d logged
                  </Text>
                </View>
              </View>
            </View>

            {/* Optional Reflection Note Input */}
            <View style={s.noteSection}>
              <View style={s.noteHeaderRow}>
                <Text style={[s.noteLabel, { color: p.textSecondary }]}>
                  Context or trigger (optional)
                </Text>
                <Text style={[s.noteCounter, { color: p.textMuted }]}>
                  {note.length}/500
                </Text>
              </View>
              <TextInput
                accessibilityLabel="Trigger note"
                value={note}
                onChangeText={(t) => setNote(t.slice(0, 500))}
                placeholder="What triggered this setback? (e.g. fatigue, late night browsing)"
                placeholderTextColor={p.textMuted}
                multiline
                numberOfLines={3}
                style={[
                  s.noteInput,
                  {
                    backgroundColor: p.backgroundPrimary,
                    borderColor: p.borderSubtle,
                    color: p.textPrimary,
                  },
                ]}
              />
            </View>
          </ScrollView>

          {/* 3. Action Buttons Footer */}
          <View
            style={[
              s.dialogFooter,
              { borderTopColor: p.borderSubtle },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel streak reset"
              onPress={handleClose}
              disabled={isSubmitting}
              style={[
                s.cancelBtn,
                {
                  backgroundColor: p.surfaceMuted,
                  opacity: isSubmitting ? 0.45 : 1,
                },
              ]}
            >
              <Text style={[s.cancelBtnText, { color: p.textPrimary }]}>
                Cancel
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm streak reset"
              onPress={handleReset}
              disabled={isSubmitting}
              style={[
                s.resetBtn,
                {
                  backgroundColor: p.danger,
                  opacity: isSubmitting ? 0.65 : 1,
                },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="restore" size={16} color="#FFFFFF" />
                  <Text style={s.resetBtnText}>Reset streak</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 375,
    borderRadius: 24,
    borderWidth: 1.2,
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    overflow: "hidden",
  },
  dialogHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dialogScroll: {
    flexGrow: 0,
  },
  dialogScrollContent: {
    padding: 20,
    gap: 14,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  reassuranceCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  reassuranceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reassuranceTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  reassuranceBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  metricsBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  metricLabelWrap: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  metricSub: {
    fontSize: 11,
    marginTop: 1,
  },
  metricValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricOldValue: {
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  metricNewValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  metricDivider: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  noteSection: {
    gap: 6,
  },
  noteHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  noteCounter: {
    fontSize: 11,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 74,
    fontSize: 13,
    textAlignVertical: "top",
  },
  dialogFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  resetBtn: {
    flex: 1.3,
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  resetBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
