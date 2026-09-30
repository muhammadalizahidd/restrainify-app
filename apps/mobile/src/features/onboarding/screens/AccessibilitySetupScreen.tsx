import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../../../components/AppText";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, GradientFill, SurfaceGradient } from "../../../components/OfflineUI";
import { offlineProtection } from "../../../native/OfflineProtection";

export interface AccessibilitySetupScreenProps {
  onComplete: () => void;
  onBack?: () => void;
}

/**
 * AccessibilitySetupScreen: Streamlined Step 2 of 2 Onboarding
 *
 * Replaces the multi-step questionnaire with a direct, transparent permission
 * step explaining why Android Accessibility is required for on-device app and
 * short-form feed restriction.
 */
export function AccessibilitySetupScreen({
  onComplete,
  onBack,
}: AccessibilitySetupScreenProps) {
  const { palette: p, snapshot, command, run, refresh } = useOffline();
  const [enabling, setEnabling] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      void refresh();
    }, 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Truthful check: Is the Android Accessibility Service running?
  const isAccessibilityActive = Boolean(snapshot?.capabilities?.accessibility);

  const handleOpenSettings = async () => {
    setEnabling(true);
    try {
      // 1. Record explicit affirmative consent required by native bridge
      await command("setting", { key: "accessibilityConsent", value: true });
      // 2. Open Android system accessibility settings
      await run(() => offlineProtection.settings("accessibility"));
    } catch (err) {
      console.warn("Failed to launch accessibility settings:", err);
    } finally {
      setEnabling(false);
    }
  };

  const handleFinish = async () => {
    setCompleting(true);
    try {
      // Mark onboarding as complete in encrypted Room storage
      await command("onboard");
    } catch {
      // Offline fallback
    } finally {
      setCompleting(false);
      onComplete();
    }
  };

  const privacyGuarantees = [
    {
      icon: "shield-lock-outline" as const,
      title: "100% On-Device & Private",
      desc: "All screen and app checks happen locally. Zero browsing data, keystrokes, or images ever leave your phone.",
    },
  ];

  return (
    <View style={[s.container, { backgroundColor: p.backgroundPrimary }]}>
      {/* Top Bar */}
      <View style={s.topBar}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[s.backBtn, { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle }]}
          ><SurfaceGradient />
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        ) : (
          <View style={s.backPlaceholder} />
        )}
        <View style={s.backPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.title, { color: p.textPrimary }]}>
          Enable Protection
        </Text>
        <Text style={[s.subtitle, { color: p.textSecondary }]}>
          Restrainify uses the Android Accessibility Service to detect when distraction-heavy apps and short-form feeds open, enforcing your limits automatically.
        </Text>

        {/* Live Status Card */}
        <View
          style={[
            s.statusCard,
            {
              backgroundColor: isAccessibilityActive
                ? p.successSurface
                : p.surfacePrimary,
              borderColor: isAccessibilityActive ? p.success : p.borderSubtle,
            },
          ]}
        >
          <View style={s.statusHeader}>
            <View
              style={[
                s.statusIconWrap,
                {
                  backgroundColor: isAccessibilityActive
                    ? p.success
                    : p.surfaceMuted,
                },
              ]}
            >
              <Icon
                name={isAccessibilityActive ? "check" : "cog-outline"}
                size={22}
                color={isAccessibilityActive ? p.actionText : p.textSecondary}
              />
            </View>
            <View style={s.statusTextGroup}>
              <Text style={[s.statusTitle, { color: p.textPrimary }]}>
                {isAccessibilityActive
                  ? "Accessibility Service Active"
                  : "Permission Required"}
              </Text>
            </View>
          </View>

          {!isAccessibilityActive && (
            <View style={[s.instructionBox, { overflow: "hidden", backgroundColor: "transparent" }]}><SurfaceGradient tone="muted" />
              <Text style={[s.instructionText, { color: p.textSecondary }]}>
                1. Tap <Text style={{ fontWeight: "700", color: p.textPrimary }}>Enable in Settings</Text> below.{"\n"}
                2. Find <Text style={{ fontWeight: "700", color: p.textPrimary }}>Restrainify</Text> under Installed Services.{"\n"}
                3. Switch it <Text style={{ fontWeight: "700", color: p.textPrimary }}>ON</Text> and return to this screen.
              </Text>
            </View>
          )}
        </View>

        {/* Privacy & Capability Highlights */}
        <View style={s.guaranteesContainer}>
          {privacyGuarantees.map((item) => (
            <View
              key={item.title}
              style={[s.guaranteeCard, { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle }]}
            ><SurfaceGradient />
              <View style={[s.guaranteeIconFrame, { overflow: "hidden", backgroundColor: "transparent" }]}><SurfaceGradient tone="muted" />
                <Icon name={item.icon} size={20} color={p.brandPrimary} />
              </View>
              <View style={s.guaranteeContent}>
                <Text style={[s.guaranteeTitle, { color: p.textPrimary }]}>
                  {item.title}
                </Text>
                <Text style={[s.guaranteeDesc, { color: p.textSecondary }]}>
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Action Area */}
      <View style={[s.bottomBar, { backgroundColor: p.backgroundPrimary, borderTopColor: p.borderSubtle }]}>
        {!isAccessibilityActive ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enable Accessibility in Settings"
              disabled={enabling}
              onPress={() => void handleOpenSettings()}
              style={({ pressed }) => [
                s.primaryBtn,
                { overflow: "hidden",
                  backgroundColor: "transparent",
                  opacity: enabling ? 0.6 : pressed ? 0.85 : 1,
                },
              ]}
            ><GradientFill />
              {enabling ? (
                <ActivityIndicator size="small" color={p.actionText} />
              ) : (
                <>
                  <Icon name="cog-outline" size={18} color={p.actionText} />
                  <Text style={[s.primaryBtnText, { color: p.actionText }]}>
                    Enable in Settings
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Set up later in Settings"
              disabled={completing}
              onPress={() => void handleFinish()}
              style={({ pressed }) => [
                s.secondaryBtn,
                { overflow: "hidden", backgroundColor: "transparent", opacity: pressed ? 0.8 : 1 },
              ]}
            ><SurfaceGradient tone="muted" />
              <Text style={[s.secondaryBtnText, { color: p.textPrimary }]}>
                Set up later in Settings
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enter Restrainify"
            disabled={completing}
            onPress={() => void handleFinish()}
            style={({ pressed }) => [
              s.primaryBtn,
              { overflow: "hidden",
                backgroundColor: "transparent",
                opacity: completing ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          ><GradientFill />
            {completing ? (
              <ActivityIndicator size="small" color={p.actionText} />
            ) : (
              <>
                <Icon name="arrow-right" size={18} color={p.actionText} />
                <Text style={[s.primaryBtnText, { color: p.actionText }]}>
                  Enter Restrainify
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backPlaceholder: {
    width: 38,
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  stepText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  statusCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTextGroup: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  statusSubtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
  },
  instructionBox: {
    borderRadius: 12,
    padding: 12,
  },
  instructionText: {
    fontSize: 12,
    lineHeight: 18,
  },
  guaranteesContainer: {
    gap: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  guaranteeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  guaranteeIconFrame: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  guaranteeContent: {
    flex: 1,
  },
  guaranteeTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  guaranteeDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  bottomBar: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    borderRadius: 14,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
