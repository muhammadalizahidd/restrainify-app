import { useState } from "react";
import { StyleSheet, Text, View, Pressable, ActivityIndicator, Alert } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { BurstOrbTimer } from "../components/BurstOrbTimer";
import { PatternInterruptGrid } from "../components/PatternInterruptGrid";
import { ActiveRestrictionsList } from "../components/ActiveRestrictionsList";

export interface BurstActiveScreenProps {
  open: (route: string) => void;
  onBack?: () => void;
}

const PRESET_MINUTES = [5, 10, 15, 30];

/**
 * BurstActiveScreen implements BURST-01 from Restrainify UI Architecture.
 * High-urgency intervention mode providing immediate crisis stabilization,
 * countdown orb, pattern interrupt grounding, and strict anti-bypass friction.
 */
export function BurstActiveScreen({ open, onBack }: BurstActiveScreenProps) {
  const { snapshot: data, palette: p, command, busy } = useOffline();
  const [selectedMinutes, setSelectedMinutes] = useState<number>(
    data?.settings.burstMinutes || 15
  );
  const [activating, setActivating] = useState(false);

  if (!data) return null;

  const isActive = data.burstRemainingMs > 0;
  const burstApps = data.settings.rules.filter(
    (rule) => rule.enabled && rule.burst
  );
  const hasAccessibility =
    data.capabilities.accessibility && data.settings.accessibilityConsent;
  const isResisted = data.events.some(
    (event) => event.id === data.settings.burstId && event.resisted
  );

  // Activate Burst with backend validation
  const handleActivate = async () => {
    if (!hasAccessibility) {
      Alert.alert(
        "Accessibility Access Required",
        "Burst needs Android Accessibility to pause triggering apps and feeds. Please enable it in Protection setup.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Setup", onPress: () => open("permissions") },
        ]
      );
      return;
    }

    if (burstApps.length === 0) {
      Alert.alert(
        "No Burst Apps Selected",
        "Select at least one app to restrict during Burst.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Choose Apps", onPress: () => open("apps") },
        ]
      );
      return;
    }

    setActivating(true);
    try {
      // Ensure configured duration is saved first if changed
      if (data.settings.burstMinutes !== selectedMinutes) {
        await command("setting", {
          key: "burstMinutes",
          value: selectedMinutes,
        });
      }
      await command("burst");
    } finally {
      setActivating(false);
    }
  };

  // Mark urge resisted during cooldown
  const handleResist = async () => {
    if (data.settings.burstId) {
      await command("resist", { id: data.settings.burstId });
    }
    open("burst-outcome");
  };

  return (
    <View style={s.container}>
      {/* 1. Header with back navigation */}
      <View style={s.headerRow}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[s.backButton, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}
          >
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={s.headerTitleWrap}>
          <Text style={[s.headerTitle, { color: p.textPrimary }]}>
            {isActive ? "Burst active" : "Emergency Pause"}
          </Text>
          <Text style={[s.headerSubtitle, { color: p.textSecondary }]}>
            Temporary high protection
          </Text>
        </View>
      </View>

      {/* 2. Main Hero Section */}
      {isActive ? (
        <View style={s.heroSection}>
          <Text style={[s.heroEyebrow, { color: p.brandPrimary }]}>
            HIGH PROTECTION IS ACTIVE
          </Text>

          {/* Glowing concentric countdown orb */}
          <BurstOrbTimer
            burstRemainingMs={data.burstRemainingMs}
            onComplete={() => open("burst-outcome")}
          />

          <Text style={[s.heroHeadline, { color: p.textPrimary }]}>
            Make the next few minutes easier.
          </Text>
          <Text style={[s.heroSubcopy, { color: p.textSecondary }]}>
            Configured triggering apps, sites and feeds are temporarily held at a
            stronger protection state.
          </Text>
        </View>
      ) : (
        <View style={s.unconfiguredSection}>
          <View
            style={[
              s.unconfiguredIconWrap,
              { backgroundColor: "rgba(182, 78, 85, 0.12)" },
            ]}
          >
            <Icon name="shield-alert" size={32} color={p.danger} />
          </View>
          <Text style={[s.heroHeadline, { color: p.textPrimary }]}>
            Ready when you need it.
          </Text>
          <Text style={[s.heroSubcopy, { color: p.textSecondary }]}>
            One tap immediately locks down triggering apps and websites to give
            urges space to dissolve.
          </Text>

          {/* Cooldown duration selector */}
          <View style={s.selectorSection}>
            <Text style={[s.selectorLabel, { color: p.textSecondary }]}>
              COOLDOWN DURATION
            </Text>
            <View style={s.pillsRow}>
              {PRESET_MINUTES.map((mins) => {
                const isSelected = selectedMinutes === mins;
                return (
                  <Pressable
                    key={mins}
                    accessibilityRole="button"
                    accessibilityLabel={`${mins} minutes cooldown`}
                    onPress={() => setSelectedMinutes(mins)}
                    style={[
                      s.durationPill,
                      {
                        backgroundColor: isSelected
                          ? p.brandPrimary
                          : p.surfacePrimary,
                        borderColor: isSelected
                          ? p.brandPrimary
                          : p.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.durationText,
                        { color: isSelected ? "#FFFFFF" : p.textPrimary },
                      ]}
                    >
                      {mins}m
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Apps configured pill */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Configure Burst apps"
            onPress={() => open("apps")}
            style={[
              s.appsLinkRow,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <View style={s.appsLinkLeft}>
              <Icon name="cellphone-lock" size={18} color={p.brandPrimary} />
              <Text style={[s.appsLinkText, { color: p.textPrimary }]}>
                {burstApps.length > 0
                  ? `${burstApps.length} apps selected for Burst`
                  : "Choose apps to pause during Burst"}
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={p.textSecondary} />
          </Pressable>

          {/* Immediate Activation Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Activate Burst now"
            disabled={activating || busy}
            onPress={() => void handleActivate()}
            style={({ pressed }) => [
              s.activateBtn,
              { backgroundColor: p.danger },
              pressed && s.btnPressed,
            ]}
          >
            {activating || busy ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={s.btnContentRow}>
                <Icon name="lightning-bolt" size={20} color="#FFFFFF" />
                <Text style={s.activateBtnText}>Activate Burst Now</Text>
              </View>
            )}
          </Pressable>
        </View>
      )}

      {/* 3. Active Enforcement Layers */}
      {isActive && (
        <ActiveRestrictionsList burstAppsCount={burstApps.length} />
      )}

      {/* 4. Interrupt The Pattern (Walk / 4-4-4-4 Breathing Pacer) */}
      <PatternInterruptGrid />

      {/* 5. Urge Resolution & Preview Actions */}
      <View style={s.actionStack}>
        {isActive && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="I resisted this urge"
            disabled={isResisted || busy}
            onPress={() => void handleResist()}
            style={({ pressed }) => [
              s.resistBtn,
              {
                backgroundColor: isResisted ? p.surfaceMuted : p.brandPrimary,
              },
              pressed && s.btnPressed,
            ]}
          >
            <Text
              style={[
                s.resistBtnText,
                { color: isResisted ? p.textSecondary : "#FFFFFF" },
              ]}
            >
              {isResisted ? "Urge marked as resisted ✓" : "I resisted this urge"}
            </Text>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Preview completion state"
          onPress={() => open("burst-outcome")}
          style={({ pressed }) => [
            s.outcomeLinkBtn,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            pressed && s.btnPressed,
          ]}
        >
          <Text style={[s.outcomeLinkText, { color: p.textPrimary }]}>
            Preview completion state
          </Text>
        </Pressable>
      </View>

      {/* 6. Anti-Bypass Helper Notice */}
      <Text style={[s.antiBypassHelper, { color: p.textSecondary }]}>
        Burst cannot be weakened inside Restrainify while its configured cooldown
        is active.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 12,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  heroSection: {
    alignItems: "center",
    paddingTop: 8,
    gap: 4,
  },
  heroEyebrow: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroHeadline: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.8,
    textAlign: "center",
    marginTop: 6,
  },
  heroSubcopy: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    maxWidth: 290,
    marginTop: 4,
  },
  unconfiguredSection: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  unconfiguredIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  selectorSection: {
    width: "100%",
    gap: 6,
    marginTop: 8,
  },
  selectorLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  durationPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  durationText: {
    fontSize: 13,
    fontWeight: "700",
  },
  appsLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  appsLinkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appsLinkText: {
    fontSize: 12,
    fontWeight: "600",
  },
  activateBtn: {
    width: "100%",
    borderRadius: 16,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  btnContentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activateBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  actionStack: {
    gap: 8,
    marginTop: 6,
  },
  resistBtn: {
    borderRadius: 16,
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  resistBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  outcomeLinkBtn: {
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
  },
  outcomeLinkText: {
    fontSize: 12,
    fontWeight: "600",
  },
  antiBypassHelper: {
    fontSize: 9.5,
    textAlign: "center",
    lineHeight: 14,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
