import { useEffect, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

type BreathingPhase = "Inhale" | "Hold" | "Exhale" | "Pause";

const PHASES: { phase: BreathingPhase; seconds: number; instruction: string }[] = [
  { phase: "Inhale", seconds: 4, instruction: "Breathe in slowly through your nose…" },
  { phase: "Hold", seconds: 4, instruction: "Hold gently with relaxed shoulders…" },
  { phase: "Exhale", seconds: 4, instruction: "Release slowly through your mouth…" },
  { phase: "Pause", seconds: 4, instruction: "Rest empty before your next breath…" },
];

export function PatternInterruptGrid() {
  const { palette: p } = useOffline();
  const [activeMode, setActiveMode] = useState<"none" | "walk" | "breathe">("none");
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(4);

  // Box-breathing 4-4-4-4 timer
  useEffect(() => {
    if (activeMode !== "breathe") return;

    const interval = setInterval(() => {
      setPhaseSecondsLeft((prev) => {
        if (prev <= 1) {
          setPhaseIndex((idx) => (idx + 1) % PHASES.length);
          return PHASES[(phaseIndex + 1) % PHASES.length]!.seconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeMode, phaseIndex]);

  const currentPhase = PHASES[phaseIndex]!;

  return (
    <View style={s.container}>
      {/* Section Header */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Interrupt the pattern
        </Text>
        <Text style={[s.sectionSide, { color: p.textSecondary }]}>
          OPTIONAL
        </Text>
      </View>

      {/* 2 Action Cards */}
      <View style={s.gridRow}>
        {/* Walk Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take a short walk: Change your physical context"
          onPress={() => setActiveMode(activeMode === "walk" ? "none" : "walk")}
          style={({ pressed }) => [
            s.card,
            {
              backgroundColor:
                activeMode === "walk" ? p.surfaceMuted : p.surfacePrimary,
              borderColor:
                activeMode === "walk" ? p.brandPrimary : p.borderSubtle,
            },
            pressed && s.cardPressed,
          ]}
        >
          <View
            style={[
              s.cardIconWrap,
              { backgroundColor: "rgba(50, 137, 85, 0.12)" },
            ]}
          >
            <Icon name="walk" size={18} color={p.success} />
          </View>
          <Text style={[s.cardTitle, { color: p.textPrimary }]}>
            Take a short walk
          </Text>
          <Text style={[s.cardSubtitle, { color: p.textSecondary }]}>
            Change your physical context.
          </Text>
        </Pressable>

        {/* Breathe Card */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Breathe for a minute: Give the urge room to pass"
          onPress={() => {
            if (activeMode === "breathe") {
              setActiveMode("none");
            } else {
              setPhaseIndex(0);
              setPhaseSecondsLeft(4);
              setActiveMode("breathe");
            }
          }}
          style={({ pressed }) => [
            s.card,
            {
              backgroundColor:
                activeMode === "breathe" ? p.surfaceMuted : p.surfacePrimary,
              borderColor:
                activeMode === "breathe" ? p.brandPrimary : p.borderSubtle,
            },
            pressed && s.cardPressed,
          ]}
        >
          <View
            style={[
              s.cardIconWrap,
              { backgroundColor: "rgba(49, 111, 203, 0.12)" },
            ]}
          >
            <Icon name="weather-windy" size={18} color={p.brandPrimary} />
          </View>
          <Text style={[s.cardTitle, { color: p.textPrimary }]}>
            Breathe for a minute
          </Text>
          <Text style={[s.cardSubtitle, { color: p.textSecondary }]}>
            Give the urge room to pass.
          </Text>
        </Pressable>
      </View>

      {/* Walk Grounding Modal Guide */}
      {activeMode === "walk" && (
        <View
          style={[
            s.expandedGuide,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          <Text style={[s.guideTitle, { color: p.textPrimary }]}>
            Step away right now
          </Text>
          <Text style={[s.guideBody, { color: p.textSecondary }]}>
            Put this phone on a table face down. Stand up, walk into another
            room or step outside for 2 minutes. The physical change in location
            breaks the dopamine loop immediately.
          </Text>
        </View>
      )}

      {/* Interactive Box-Breathing Visual Pacer */}
      {activeMode === "breathe" && (
        <View
          style={[
            s.breathingBox,
            { backgroundColor: p.surfacePrimary, borderColor: p.brandPrimary },
          ]}
        >
          <View
            style={[
              s.pacerRing,
              {
                borderColor: p.brandPrimary,
                backgroundColor:
                  currentPhase.phase === "Inhale"
                    ? "rgba(49, 111, 203, 0.18)"
                    : currentPhase.phase === "Exhale"
                    ? "rgba(49, 111, 203, 0.04)"
                    : "rgba(49, 111, 203, 0.10)",
              },
            ]}
          >
            <Text style={[s.pacerPhase, { color: p.brandPrimary }]}>
              {currentPhase.phase.toUpperCase()}
            </Text>
            <Text style={[s.pacerCountdown, { color: p.textPrimary }]}>
              {phaseSecondsLeft}
            </Text>
          </View>
          <Text style={[s.pacerInstruction, { color: p.textSecondary }]}>
            {currentPhase.instruction}
          </Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginVertical: 8,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionSide: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  gridRow: {
    flexDirection: "row",
    gap: 8,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  cardSubtitle: {
    fontSize: 9.5,
    lineHeight: 13,
  },
  expandedGuide: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    marginTop: 4,
  },
  guideTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  guideBody: {
    fontSize: 10.5,
    lineHeight: 15,
  },
  breathingBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  pacerRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  pacerPhase: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  pacerCountdown: {
    fontSize: 28,
    fontWeight: "700",
  },
  pacerInstruction: {
    fontSize: 11,
    textAlign: "center",
    maxWidth: 240,
  },
});
