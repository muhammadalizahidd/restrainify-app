import { Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface WebsiteSetupScreenProps {
  onNext: (enabled: boolean) => void;
  onBack: () => void;
}

/**
 * ONB-06: Website Setup Screen (Setup Step 2/6)
 *
 * Plain-language capability explanation before requesting VPN permission.
 * Requirement coverage: FR-ONB-002, FR-ONB-003
 *
 * Frontend → Backend mapping:
 *   "Enable" path:
 *     command("setting", { key: "websiteEnabled", value: true })
 *     → OfflineRuntime.kt:73
 *     offlineProtection.startVpn()
 *     → DnsVpnService activation
 *   "Skip" path: advances without enabling
 */
export function WebsiteSetupScreen({
  onNext,
  onBack,
}: WebsiteSetupScreenProps) {
  const { palette: p } = useOffline();

  const points = [
    {
      icon: "shield-outline" as const,
      title: "How it works",
      body: "Restrainify creates a local VPN on your device to filter DNS requests. Known adult and pornographic domains are blocked before they can load.",
    },
    {
      icon: "cellphone-lock" as const,
      title: "Your data stays here",
      body: "All filtering happens on your phone. No browsing data is uploaded, stored remotely, or shared with anyone.",
    },
    {
      icon: "format-list-checks" as const,
      title: "Customizable rules",
      body: "You can add your own blocked or allowed domains later from Settings. SafeSearch enforcement and proxy resistance are also available.",
    },
    {
      icon: "alert-circle-outline" as const,
      title: "What happens without it",
      body: "Without website protection enabled, adult websites will not be filtered. You can enable it later from Settings at any time.",
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
            STEP 2 OF 6
          </Text>
          <Text style={[s.title, { color: p.textPrimary }]}>
            Website protection
          </Text>
        </View>
      </View>

      {/* Explanation cards */}
      <View style={[s.card, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}>
        {points.map((pt, i) => (
          <View
            key={pt.title}
            style={[
              s.pointRow,
              i < points.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.borderSubtle },
            ]}
          >
            <View style={[s.pointIcon, { backgroundColor: p.surfaceMuted }]}>
              <Icon name={pt.icon} size={20} color={p.brandPrimary} />
            </View>
            <View style={s.pointCopy}>
              <Text style={[s.pointTitle, { color: p.textPrimary }]}>
                {pt.title}
              </Text>
              <Text style={[s.pointBody, { color: p.textSecondary }]}>
                {pt.body}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Actions */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enable website protection"
        onPress={() => onNext(true)}
        style={({ pressed }) => [
          s.primaryBtn,
          { backgroundColor: p.brandPrimary, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Icon name="shield-check" size={18} color={p.backgroundPrimary} />
        <Text style={[s.primaryBtnText, { color: p.backgroundPrimary }]}>
          Enable website protection
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
  card: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  pointRow: { flexDirection: "row", gap: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: "flex-start" },
  pointIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 2 },
  pointCopy: { flex: 1 },
  pointTitle: { fontSize: 13, fontWeight: "700" },
  pointBody: { fontSize: 11.5, lineHeight: 17, marginTop: 3 },
  primaryBtn: { flexDirection: "row", gap: 8, minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontSize: 14, fontWeight: "700" },
  secondaryBtn: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { fontSize: 13, fontWeight: "700" },
});
