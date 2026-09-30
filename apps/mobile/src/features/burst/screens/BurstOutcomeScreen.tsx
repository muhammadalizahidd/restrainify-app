import { useState } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator } from "react-native";
import { Text } from "../../../components/AppText";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, GradientFill, SurfaceGradient } from "../../../components/OfflineUI";

export interface BurstOutcomeScreenProps {
  open: (route: string) => void;
  onBack?: () => void;
}

/**
 * BurstOutcomeScreen implements BURST-02 from Restrainify UI Architecture.
 * Records the outcome of an urge intervention without erasing clean streak history.
 */
export function BurstOutcomeScreen({ open, onBack }: BurstOutcomeScreenProps) {
  const { snapshot: data, palette: p, command, busy } = useOffline();
  const [saving, setSaving] = useState(false);

  const handleOutcome = async (resisted: boolean) => {
    setSaving(true);
    try {
      if (resisted) {
        if (data?.settings.burstId) {
          try {
            await command("resist", { id: data.settings.burstId });
          } catch {
            // Fallback to recording urge event directly
            await command("event", {
              kind: "urge",
              note: "Resisted during Burst intervention",
              resisted: true,
            });
          }
        } else {
          await command("event", {
            kind: "urge",
            note: "Resisted during Burst intervention",
            resisted: true,
          });
        }
      } else {
        await command("event", {
          kind: "urge",
          note: "Did not resist urge",
          resisted: false,
        });
      }
      open("home");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.container}>
      {/* Back Button */}
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={[s.backButton, { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle }]}
        ><SurfaceGradient />
          <Icon name="arrow-left" size={20} color={p.textPrimary} />
        </Pressable>
      )}

      {/* Hero check ring & headline */}
      <View style={s.heroWrap}>
        <View
          style={[
            s.readyRing,
            { backgroundColor: p.successSurface, borderColor: p.success },
          ]}
        >
          <Icon name="check" size={36} color={p.success} />
        </View>


        <Text style={[s.title, { color: p.textPrimary }]}>How did it go?</Text>

      </View>

      {/* Button Stack */}
      <View style={s.buttonStack}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="I resisted the urge"
          disabled={saving || busy}
          onPress={() => void handleOutcome(true)}
          style={({ pressed }) => [
            s.primaryBtn,
            { overflow: "hidden", backgroundColor: "transparent" },
            pressed && s.btnPressed,
          ]}
        ><GradientFill />
          {saving ? (
            <ActivityIndicator color={p.actionText} size="small" />
          ) : (
            <Text style={[s.primaryBtnText, { color: p.actionText }]}>
              I resisted the urge
            </Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="I didn't resist"
          disabled={saving || busy}
          onPress={() => void handleOutcome(false)}
          style={({ pressed }) => [
            s.secondaryBtn,
            { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
            pressed && s.btnPressed,
          ]}
        ><SurfaceGradient />
          <Text style={[s.secondaryBtnText, { color: p.textPrimary }]}>
            I didn’t
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingVertical: 12,
    gap: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroWrap: {
    alignItems: "center",
    paddingTop: 18,
    gap: 10,
  },
  readyRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -1.2,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    maxWidth: 290,
  },
  buttonStack: {
    gap: 10,
    marginTop: 12,
  },
  primaryBtn: {
    borderRadius: 16,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryBtn: {
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
