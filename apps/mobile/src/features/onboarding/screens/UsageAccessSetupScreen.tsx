import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/AppText";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, GradientFill, SurfaceGradient, type IconName } from "../../../components/OfflineUI";
import { offlineProtection } from "../../../native/OfflineProtection";

export interface UsageAccessSetupScreenProps {
  onComplete: () => void;
  onBack?: () => void;
  /** False when another onboarding step follows, so this screen must not finish onboarding itself. */
  isFinalStep?: boolean;
}

const BENEFITS: { icon: IconName; text: string }[] = [
  { icon: "timer-outline", text: "Daily time limits for any app" },
  { icon: "calendar-clock", text: "Schedules and quiet hours that hold" },
  { icon: "chart-line-variant", text: "See your screen time drop day by day" },
];

/**
 * Final onboarding step: Android's Usage access, which app limits, schedules and screen-time stats need.
 * Same layout as the Accessibility step, with the disclosure kept visible. Android grants it only from its own
 * settings page, so "Allow usage access" opens that page; the screen updates once access is on.
 */
export function UsageAccessSetupScreen({ onComplete, onBack, isFinalStep = true }: UsageAccessSetupScreenProps) {
  const { palette: p, snapshot, command, run, refresh } = useOffline();
  const [opening, setOpening] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      void refresh();
    }, 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Truthful check: has Android granted Usage access to Restrainify?
  const isGranted = Boolean(snapshot?.capabilities?.usage);

  const handleAllow = async () => {
    setOpening(true);
    try {
      await run(() => offlineProtection.settings("usage"));
    } catch (err) {
      console.warn("Failed to open usage access settings:", err);
    } finally {
      setOpening(false);
    }
  };

  const handleFinish = async () => {
    if (!isFinalStep) {
      onComplete();
      return;
    }
    setCompleting(true);
    try {
      await command("onboard");
    } catch {
      // Offline fallback
    } finally {
      setCompleting(false);
      onComplete();
    }
  };

  return (
    <View style={[s.container, { backgroundColor: p.backgroundPrimary }]}>
      <View style={s.topBar}>
        {/* Once access is granted there is nothing to go back to; dropping the button keeps the "all set" state centred. */}
        {onBack && !isGranted ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[s.backBtn, { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle }]}
          >
            <SurfaceGradient />
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        ) : (
          <View style={s.backPlaceholder} />
        )}
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={[s.heroTile, { overflow: "hidden", backgroundColor: "transparent" }]}>
            <GradientFill />
            <Icon name={isGranted ? "check" : "timer-sand"} size={38} color={p.actionText} />
          </View>
          <Text accessibilityRole="header" style={[s.title, { color: p.textPrimary }]}>
            {isGranted ? (isFinalStep ? "You're all set" : "Usage access is on") : "Allow usage access"}
          </Text>
          <Text style={[s.subtitle, { color: p.textSecondary }]}>
            {isGranted
              ? isFinalStep
                ? "Your protection is on. Welcome to Restrainify."
                : "Next, a quick look at your six protections."
              : "Restrainify needs it to apply your app limits and show your screen time."}
          </Text>
        </View>

        {!isGranted && (
          <>
            <View style={s.benefits}>
              {BENEFITS.map((item) => (
                <View
                  key={item.text}
                  style={[s.benefitRow, { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle }]}
                >
                  <SurfaceGradient />
                  <View style={[s.benefitIcon, { overflow: "hidden", backgroundColor: "transparent" }]}>
                    <SurfaceGradient tone="muted" />
                    <Icon name={item.icon} size={20} color={p.brandPrimary} />
                  </View>
                  <Text style={[s.benefitText, { color: p.textPrimary }]}>{item.text}</Text>
                </View>
              ))}
            </View>

            <View style={s.privacy}>
              <Icon name="lock-outline" size={16} color={p.textMuted} />
              <Text style={[s.privacyText, { color: p.textMuted }]}>
                Restrainify checks how long each app is open, only to apply your daily limits and show your screen time.
                This stays on your phone and is never shared.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={s.bottomBar}>
        {!isGranted ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Allow usage access"
              disabled={opening}
              onPress={() => void handleAllow()}
              style={({ pressed }) => [
                s.primaryBtn,
                { overflow: "hidden", backgroundColor: "transparent", opacity: opening ? 0.7 : pressed ? 0.88 : 1 },
              ]}
            >
              <GradientFill />
              {opening ? (
                <ActivityIndicator size="small" color={p.actionText} />
              ) : (
                <Text style={[s.primaryBtnText, { color: p.actionText }]}>Allow usage access</Text>
              )}
            </Pressable>
            <Text style={[s.hint, { color: p.textMuted }]}>Next, find Restrainify in the list and switch it on.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Maybe later"
              disabled={completing}
              onPress={() => void handleFinish()}
              hitSlop={8}
              style={s.laterBtn}
            >
              <Text style={[s.laterText, { color: p.textSecondary }]}>Maybe later</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue"
            disabled={completing}
            onPress={() => void handleFinish()}
            style={({ pressed }) => [
              s.primaryBtn,
              { overflow: "hidden", backgroundColor: "transparent", opacity: completing ? 0.7 : pressed ? 0.88 : 1 },
            ]}
          >
            <GradientFill />
            {completing ? (
              <ActivityIndicator size="small" color={p.actionText} />
            ) : (
              <Text style={[s.primaryBtnText, { color: p.actionText }]}>Continue</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  backPlaceholder: { width: 40, height: 40 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 24, flexGrow: 1, justifyContent: "center" },
  hero: { alignItems: "center", gap: 10 },
  heroTile: { width: 88, height: 88, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.8, textAlign: "center" },
  subtitle: { fontSize: 16, lineHeight: 23, textAlign: "center" },
  benefits: { gap: 12 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 18, padding: 14 },
  benefitIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  benefitText: { flex: 1, fontSize: 15, fontWeight: "600", lineHeight: 20 },
  privacy: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 4 },
  privacyText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  bottomBar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20, gap: 10 },
  primaryBtn: { minHeight: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  primaryBtnText: { fontSize: 16, fontWeight: "700" },
  hint: { fontSize: 12.5, textAlign: "center" },
  laterBtn: { alignSelf: "center", paddingVertical: 8, paddingHorizontal: 16 },
  laterText: { fontSize: 14, fontWeight: "600" },
});
