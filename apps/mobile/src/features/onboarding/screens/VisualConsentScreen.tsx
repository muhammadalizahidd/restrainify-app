import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface VisualConsentScreenProps {
  onNext: (consented: boolean) => void;
  onBack: () => void;
}

/**
 * ONB-07: Visual Consent Screen (Setup Step 3/6)
 *
 * On-device privacy disclosure with explicit affirmative consent
 * before visual protection can be activated.
 * Requirement coverage: FR-ONB-004, NFR-COMP-001, NFR-COMP-002
 *
 * Frontend → Backend mapping:
 *   "Enable" path (after affirmative consent toggle):
 *     command("setting", { key: "accessibilityConsent", value: true })
 *     → OfflineRuntime.kt:73
 *     offlineProtection.settings("accessibility")
 *     → Opens Android Accessibility Settings
 *   "Skip" path: advances without enabling
 */
export function VisualConsentScreen({
  onNext,
  onBack,
}: VisualConsentScreenProps) {
  const { palette: p } = useOffline();
  const [consented, setConsented] = useState(false);

  const disclosures = [
    {
      icon: "cellphone" as const,
      text: "Visual protection uses on-device AI to detect and blur explicit or suggestive content while you use protected apps.",
    },
    {
      icon: "chip" as const,
      text: "All screen analysis runs entirely on your phone. The AI model operates locally without sending data anywhere.",
    },
    {
      icon: "image-off-outline" as const,
      text: "No screenshots, images, or screen captures are stored, uploaded, or shared. Frames are processed in memory and immediately discarded.",
    },
    {
      icon: "cog-outline" as const,
      text: "This feature requires Android Accessibility Service permission. You will be asked to enable it in your device settings.",
    },
  ];

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
            STEP 3 OF 6
          </Text>
          <Text style={[s.title, { color: p.textPrimary }]}>
            Visual protection
          </Text>
        </View>
      </View>

      {/* Privacy disclosure */}
      <View style={[s.card, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Privacy disclosure
        </Text>
        {disclosures.map((d) => (
          <View key={d.icon} style={s.disclosureRow}>
            <Icon name={d.icon} size={18} color={p.brandPrimary} />
            <Text style={[s.disclosureText, { color: p.textSecondary }]}>
              {d.text}
            </Text>
          </View>
        ))}
      </View>

      {/* Affirmative consent toggle */}
      <View style={[s.consentCard, { backgroundColor: consented ? p.successSurface : p.surfacePrimary, borderColor: consented ? p.success : p.borderSubtle }]}>
        <View style={s.consentRow}>
          <View style={s.consentCopy}>
            <Text style={[s.consentTitle, { color: p.textPrimary }]}>
              I understand and consent
            </Text>
            <Text style={[s.consentDesc, { color: p.textSecondary }]}>
              I have read the privacy disclosure above and want to enable
              on-device visual protection.
            </Text>
          </View>
          <Switch
            accessibilityLabel="I understand and consent to visual protection"
            value={consented}
            onValueChange={setConsented}
            trackColor={{ true: p.success, false: p.borderSubtle }}
          />
        </View>
      </View>

      {/* Actions */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enable visual protection"
        disabled={!consented}
        onPress={() => onNext(true)}
        style={({ pressed }) => [
          s.primaryBtn,
          {
            backgroundColor: p.brandPrimary,
            opacity: !consented ? 0.4 : pressed ? 0.8 : 1,
          },
        ]}
      >
        <Icon name="eye-check-outline" size={18} color={p.backgroundPrimary} />
        <Text style={[s.primaryBtnText, { color: p.backgroundPrimary }]}>
          Enable visual protection
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip for now"
        onPress={() => onNext(false)}
        style={({ pressed }) => [
          s.secondaryBtn,
          { backgroundColor: p.surfaceMuted, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={[s.secondaryBtnText, { color: p.textPrimary }]}>
          Skip for now
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
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700" },
  disclosureRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  disclosureText: { flex: 1, fontSize: 12, lineHeight: 18 },
  consentCard: { borderRadius: 18, borderWidth: 1.5, padding: 14 },
  consentRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  consentCopy: { flex: 1 },
  consentTitle: { fontSize: 13, fontWeight: "700" },
  consentDesc: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  primaryBtn: { flexDirection: "row", gap: 8, minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontSize: 14, fontWeight: "700" },
  secondaryBtn: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { fontSize: 13, fontWeight: "700" },
});
