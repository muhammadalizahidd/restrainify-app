import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";

export interface GoalSelectionScreenProps {
  onNext: (goals: string[]) => void;
  onBack: () => void;
  initialGoals?: string[];
}

interface GoalOption {
  id: string;
  icon: IconName;
  title: string;
  description: string;
}

const GOALS: GoalOption[] = [
  {
    id: "websites",
    icon: "web",
    title: "Adult websites",
    description: "Block known pornographic and adult domains using local DNS filtering.",
  },
  {
    id: "visual",
    icon: "eye-outline",
    title: "Visual content",
    description: "Detect and blur explicit or suggestive images using on-device AI.",
  },
  {
    id: "feeds",
    icon: "play-box-outline",
    title: "Short-form feeds",
    description: "Restrict Reels, Shorts, Spotlight, and similar scroll-driven feeds.",
  },
  {
    id: "apps",
    icon: "timer-outline",
    title: "App usage",
    description: "Set daily time limits and schedules for high-risk applications.",
  },
];

/**
 * ONB-05: Goal Selection Screen (Setup Step 1/6)
 *
 * The user chooses which categories of content and behavior
 * Restrainify should help them control. At least one goal
 * must be selected to proceed.
 *
 * Requirement coverage: FR-ONB-001
 *
 * Frontend → Backend mapping:
 *   command("setting", { key: "goals", value: [...] })
 *   → OfflineRuntime.kt "goals" handler (new)
 */
export function GoalSelectionScreen({
  onNext,
  onBack,
  initialGoals = [],
}: GoalSelectionScreenProps) {
  const { palette: p } = useOffline();
  const [selected, setSelected] = useState<Set<string>>(new Set(initialGoals));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canProceed = selected.size > 0;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.headerArea}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={[s.backBtn, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}
        >
          <Icon name="arrow-left" size={20} color={p.textPrimary} />
        </Pressable>
        <View style={s.titleWrap}>
          <Text style={[s.kicker, { color: p.textSecondary }]}>
            STEP 1 OF 6
          </Text>
          <Text style={[s.title, { color: p.textPrimary }]}>
            What would you like help with?
          </Text>
        </View>
      </View>

      <Text style={[s.subtitle, { color: p.textSecondary }]}>
        Choose at least one area. You can change these later in Settings.
      </Text>

      {/* Goal cards */}
      {GOALS.map((goal) => {
        const active = selected.has(goal.id);
        return (
          <Pressable
            key={goal.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={goal.title}
            onPress={() => toggle(goal.id)}
            style={[
              s.goalCard,
              {
                backgroundColor: active ? p.successSurface : p.surfacePrimary,
                borderColor: active ? p.success : p.borderSubtle,
              },
            ]}
          >
            <View style={[s.goalIcon, { backgroundColor: active ? p.success : p.surfaceMuted }]}>
              <Icon
                name={goal.icon}
                size={20}
                color={active ? "#FFFFFF" : p.brandPrimary}
              />
            </View>
            <View style={s.goalCopy}>
              <Text style={[s.goalTitle, { color: p.textPrimary }]}>
                {goal.title}
              </Text>
              <Text style={[s.goalDesc, { color: p.textSecondary }]}>
                {goal.description}
              </Text>
            </View>
            <Icon
              name={active ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
              size={22}
              color={active ? p.success : p.textMuted}
            />
          </Pressable>
        );
      })}

      {/* Continue button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue to website setup"
        disabled={!canProceed}
        onPress={() => onNext(Array.from(selected))}
        style={({ pressed }) => [
          s.primaryBtn,
          {
            backgroundColor: p.brandPrimary,
            opacity: !canProceed ? 0.4 : pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={[s.primaryBtnText, { color: p.backgroundPrimary }]}>
          Continue
        </Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 12 },
  headerArea: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  backBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  titleWrap: { flex: 1 },
  kicker: { fontSize: 9.5, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: "700" },
  title: { fontSize: 20, fontWeight: "700", letterSpacing: -0.4, marginTop: 2 },
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  goalCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, borderWidth: 1.5, padding: 14 },
  goalIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  goalCopy: { flex: 1 },
  goalTitle: { fontSize: 13, fontWeight: "700" },
  goalDesc: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  primaryBtn: { minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryBtnText: { fontSize: 14, fontWeight: "700" },
});
