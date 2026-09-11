import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";

export interface ProtectionReadyScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

interface ProtectionAuditItem {
  id: string;
  name: string;
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  icon: IconName;
  detail: string;
}

/**
 * ONB-10: Protection Ready Screen (Setup Step 6/6)
 *
 * Truthful verification summary displaying exactly which protections
 * are configured and active based on the real native snapshot.
 * Adheres strictly to Product Rule PR-04 (Truthful Status Representation).
 *
 * Frontend → Backend mapping:
 *   Reads snapshot.settings and snapshot.capabilities
 *   Primary CTA: command("onboard") → OfflineRuntime.kt:68 (sets onboardingComplete: true)
 */
export function ProtectionReadyScreen({
  onComplete,
  onBack,
}: ProtectionReadyScreenProps) {
  const { palette: p, snapshot, command } = useOffline();
  const [completing, setCompleting] = useState(false);

  // Compute truthful status for each protection layer
  const auditItems: ProtectionAuditItem[] = useMemo(() => {
    const websiteActive = Boolean(
      snapshot?.settings?.websiteEnabled && snapshot?.capabilities?.vpn
    );
    const visualActive = Boolean(
      snapshot?.settings?.accessibilityConsent && snapshot?.capabilities?.accessibility
    );
    const ruleCount = snapshot?.settings?.rules?.length ?? 0;
    const appsActive = ruleCount > 0;
    const recoveryActive = Boolean(snapshot?.settings?.recoveryEnabled);

    return [
      {
        id: "website",
        name: "Website Protection",
        active: websiteActive,
        activeLabel: "Active (DNS Filter)",
        inactiveLabel: snapshot?.settings?.websiteEnabled
          ? "VPN Permission Needed"
          : "Not configured",
        icon: "shield-check-outline",
        detail: "Adult domains and harmful DNS requests blocked locally.",
      },
      {
        id: "visual",
        name: "Visual Protection",
        active: visualActive,
        activeLabel: "Active (On-Device AI)",
        inactiveLabel: snapshot?.settings?.accessibilityConsent
          ? "Accessibility Needed"
          : "Not enabled",
        icon: "eye-off-outline",
        detail: "Real-time on-device screen blurring for explicit content.",
      },
      {
        id: "apps",
        name: "App & Feed Controls",
        active: appsActive,
        activeLabel: `${ruleCount} ${ruleCount === 1 ? "app" : "apps"} protected`,
        inactiveLabel: "No apps selected",
        icon: "clock-outline",
        detail: "Short-form video limits and scheduled app cooldowns.",
      },
      {
        id: "recovery",
        name: "Recovery Tracking",
        active: recoveryActive,
        activeLabel: `Active (From ${snapshot?.settings?.recoveryStart || "today"})`,
        inactiveLabel: "Tracking disabled",
        icon: "fire",
        detail: "Streak counter and milestone tracking on your dashboard.",
      },
    ];
  }, [snapshot]);

  const activeCount = auditItems.filter((i) => i.active).length;
  const totalCount = auditItems.length;

  const handleFinish = async () => {
    setCompleting(true);
    try {
      await command("onboard");
      onComplete();
    } catch {
      onComplete();
    } finally {
      setCompleting(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: p.backgroundPrimary }]}>
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
        <View style={[s.stepBadge, { backgroundColor: p.surfaceMuted }]}>
          <Text style={[s.stepText, { color: p.brandPrimary }]}>Step 6 of 6</Text>
        </View>
        <View style={s.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.title, { color: p.textPrimary }]}>
          Protection Ready
        </Text>
        <Text style={[s.subtitle, { color: p.textSecondary }]}>
          Here is the truthful status of your defense setup. You can adjust any of these from Settings at any time.
        </Text>

        {/* Readiness Metric Banner */}
        <View
          style={[
            s.metricBanner,
            {
              backgroundColor: p.surfacePrimary,
              borderColor: activeCount >= 3 ? p.brandPrimary : p.borderSubtle,
            },
          ]}
        >
          <View
            style={[
              s.metricBadge,
              {
                backgroundColor:
                  activeCount > 0 ? p.brandPrimary : p.surfaceMuted,
              },
            ]}
          >
            <Text style={[s.metricBadgeText, { color: p.backgroundPrimary }]}>
              {activeCount}/{totalCount}
            </Text>
          </View>
          <View style={s.metricInfo}>
            <Text style={[s.metricTitle, { color: p.textPrimary }]}>
              {activeCount === totalCount
                ? "Full Protection Configured"
                : `${activeCount} of ${totalCount} protections active`}
            </Text>
            <Text style={[s.metricDesc, { color: p.textSecondary }]}>
              {activeCount === 0
                ? "Restrainify is in observational mode."
                : activeCount < totalCount
                ? "Remaining protections can be enabled in Settings."
                : "Your defense barriers are ready for daily operation."}
            </Text>
          </View>
        </View>

        {/* Status Audit Items */}
        <View style={s.auditList}>
          {auditItems.map((item) => (
            <View
              key={item.id}
              style={[
                s.auditCard,
                {
                  backgroundColor: p.surfacePrimary,
                  borderColor: item.active ? p.borderSubtle : p.borderSubtle,
                },
              ]}
            >
              <View style={s.cardTopRow}>
                <View
                  style={[
                    s.iconWrap,
                    {
                      backgroundColor: p.surfaceMuted,
                    },
                  ]}
                >
                  <Icon
                    name={item.icon}
                    size={22}
                    color={item.active ? p.brandPrimary : p.textSecondary}
                  />
                </View>

                <View style={s.cardTextWrap}>
                  <Text style={[s.cardName, { color: p.textPrimary }]}>
                    {item.name}
                  </Text>
                  <View style={s.statusPillWrap}>
                    <View
                      style={[
                        s.statusPill,
                        {
                          backgroundColor: item.active
                            ? p.surfaceMuted
                            : p.warningSurface,
                        },
                      ]}
                    >
                      <View
                        style={[
                          s.statusDot,
                          {
                            backgroundColor: item.active
                              ? p.success
                              : p.warning,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          s.statusLabel,
                          {
                            color: item.active
                              ? p.success
                              : p.warning,
                          },
                        ]}
                      >
                        {item.active ? item.activeLabel : item.inactiveLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <Text style={[s.cardDetail, { color: p.textSecondary }]}>
                {item.detail}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.bottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View
        style={[
          s.footerArea,
          {
            backgroundColor: p.backgroundPrimary,
            borderTopColor: p.borderSubtle,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start using Restrainify"
          disabled={completing}
          onPress={handleFinish}
          style={[
            s.primaryBtn,
            {
              backgroundColor: p.brandPrimary,
              opacity: completing ? 0.7 : 1,
            },
          ]}
        >
          {completing ? (
            <ActivityIndicator size="small" color={p.backgroundPrimary} />
          ) : (
            <Text style={[s.primaryBtnText, { color: p.backgroundPrimary }]}>
              Start using Restrainify
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepText: {
    fontSize: 12,
    fontWeight: "700",
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  metricBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
  },
  metricBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  metricBadgeText: {
    fontSize: 18,
    fontWeight: "800",
  },
  metricInfo: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  metricDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  auditList: {
    gap: 12,
  },
  auditCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTextWrap: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "700",
  },
  statusPillWrap: {
    flexDirection: "row",
    marginTop: 4,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardDetail: {
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
  },
  bottomSpacer: {
    height: 24,
  },
  footerArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
