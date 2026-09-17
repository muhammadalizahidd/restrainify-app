import { useCallback, useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { useAuth } from "../../auth";
import { MomentumHeroCard } from "../components/MomentumHeroCard";
import { QuickProtectionGrid } from "../components/QuickProtectionGrid";
import { AttentionTrendCard } from "../components/AttentionTrendCard";
import { BurstActionCard } from "../components/BurstActionCard";
import { WebFilterModal } from "../../protection/components/WebFilterModal";
import { VisualAiModal } from "../../protection/components/VisualAiModal";
import { StrictModeModal } from "../../protection/components/StrictModeModal";
import { computeProtectionHealth } from "../../protection/utils/healthCalculator";
import { coinsApi } from "../../coins";
import { offlineProtection } from "../../../native/OfflineProtection";

// Metro static image asset for Restrainify mark
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logo = require("../../../../assets/restrainify-logo.png");

export interface OfflineHomeProps {
  open: (route: string) => void;
}

/**
 * OfflineHome implements Restrainify V1 Screen Architecture (MAIN-01)
 * adhering to the Orbit / Clarity design system and truthful native capability state.
 */
export function OfflineHome({ open }: OfflineHomeProps) {
  const { snapshot: data, palette: p, busy, reconciling } = useOffline();
  const { status: authStatus, user, profile, session } = useAuth();

  const isAuth = authStatus === "authenticated" && Boolean(user);
  const avatarLetter = isAuth ? (profile?.fullName || user?.fullName || "A")[0]?.toUpperCase() : "A";

  const [webFilterModalVisible, setWebFilterModalVisible] = useState(false);
  const [visualAiModalVisible, setVisualAiModalVisible] = useState(false);
  const [strictModalVisible, setStrictModalVisible] = useState(false);
  const [dailyCoinsState, setDailyCoinsState] = useState<{
    available: boolean;
    balance: number;
    claimed: boolean;
    claiming: boolean;
  }>({
    available: !data?.reward.claimed,
    balance: data?.reward.balance ?? 0,
    claimed: data?.reward.claimed ?? false,
    claiming: false,
  });

  // Keep local snapshot in sync
  useEffect(() => {
    if (!data) return;
    setDailyCoinsState((prev) => ({
      ...prev,
      balance: prev.balance || data.reward.balance,
      claimed: prev.claimed || data.reward.claimed,
      available: prev.claimed || data.reward.claimed ? false : prev.available,
    }));
  }, [data?.reward.claimed, data?.reward.balance]);

  // Query backend daily coins availability for authenticated users
  useEffect(() => {
    if (!isAuth || !session?.accessToken) return;
    let mounted = true;

    async function checkBackendCoins() {
      try {
        const info = await coinsApi.checkDailyAvailability(session!.accessToken);
        if (mounted) {
          setDailyCoinsState((prev) => ({
            ...prev,
            available: info.available,
            balance: info.totalCoins,
            claimed: info.claimedToday,
          }));
        }
      } catch (err) {
        console.warn("Could not check daily coins from backend:", err);
      }
    }

    void checkBackendCoins();
    return () => {
      mounted = false;
    };
  }, [isAuth, session?.accessToken]);

  const handleClaimReward = useCallback(async () => {
    if (!isAuth || !session?.accessToken) {
      open("account");
      return;
    }

    setDailyCoinsState((prev) => ({ ...prev, claiming: true }));
    try {
      const result = await coinsApi.claimDailyCoins(session.accessToken);
      setDailyCoinsState({
        available: false,
        balance: result.totalCoins,
        claimed: true,
        claiming: false,
      });
      // Synchronize local Room database record so offline snapshot stays in sync
      try {
        await offlineProtection.command("reward_remote", { day: result.claimedDay });
      } catch (e) {
        console.warn("Failed to reconcile local reward record:", e);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to claim daily coins.";
      setDailyCoinsState((prev) => ({ ...prev, claiming: false }));
      Alert.alert("Daily Coins", msg);
    }
  }, [isAuth, session?.accessToken, open]);

  const rewardBalance = isAuth ? dailyCoinsState.balance : (data?.reward.balance ?? 0);
  const rewardClaimed = isAuth ? dailyCoinsState.claimed : (data?.reward.claimed ?? false);

  if (!data) return null;

  // Truthful dynamic health scoring across configured goals & device capabilities
  const health = computeProtectionHealth(data, reconciling);
  const webHealthy = health.webHealthy;
  const appHealthy = health.appHealthy;
  const isFullyProtected = health.isFullyProtected;

  // Date formatting for eyebrow
  const dateFormatted = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={s.container}>
      {/* 1. App Header: Logo + Brand Wordmark + Profile Avatar */}
      <View style={s.appHeader}>
        <View style={s.brandGroup}>
          <View style={[s.logoFrame, { backgroundColor: p.surfacePrimary }]}>
            <Image
              source={logo}
              style={s.logoImage}
              accessibilityLabel="Restrainify logo"
            />
          </View>
          <Text style={[s.brandWordmark, { color: p.textPrimary }]}>
            Restrainify<Text style={s.brandDot}>.</Text>
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open account and profile"
          onPress={() => open("account")}
          style={[s.avatarButton, { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle }]}
        >
          <Text style={[s.avatarText, { color: p.textPrimary }]}>{avatarLetter}</Text>
        </Pressable>
      </View>

      {/* 2. Page Head: Current Date + Headline + Motivation Subrow */}
      <View style={s.pageHead}>
        <Text style={[s.dateEyebrow, { color: p.textSecondary }]}>
          {dateFormatted}
        </Text>
        <Text style={[s.pageTitle, { color: p.textPrimary }]}>
          One day at a time.
        </Text>

        <View style={s.subrow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isFullyProtected
                ? "Protection active"
                : "Protection needs attention"
            }
            onPress={() => open("permissions")}
            style={s.statusIndicatorWrap}
          >
            <View
              style={[
                s.statusDot,
                { backgroundColor: isFullyProtected ? p.success : p.warning },
              ]}
            />
            <Text
              style={[
                s.statusText,
                { color: isFullyProtected ? p.success : p.warning },
              ]}
            >
              {reconciling
                ? "Checking protection…"
                : isFullyProtected
                ? "Protection active"
                : health.healthDetail}
            </Text>
          </Pressable>

          <Text style={[s.motivationQuote, { color: p.textSecondary }]}>
            You’re doing this for you.
          </Text>
        </View>
      </View>

      {/* 3. Momentum Hero Card */}
      <MomentumHeroCard
        currentStreak={data.recovery.current}
        goalDays={21}
        todayUsageMs={data.usage.todayMs}
        yesterdayUsageMs={data.usage.week.at(-2)?.ms ?? 0}
        hasUsagePermission={data.capabilities.usage}
        onOpenScreenTime={() => open("screen-time")}
        onClaimReward={handleClaimReward}
        rewardClaimed={rewardClaimed}
        rewardBalance={rewardBalance}
        busy={busy || dailyCoinsState.claiming}
        isAuth={isAuth}
        onPress={() => open("recovery-progress")}
      />

      {/* Cloud streak backup banner if unauthenticated */}
      {!isAuth && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back up your streak with Google account"
          onPress={() => open("account")}
          style={[s.backupBanner, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}
        >
          <View style={[s.backupIconBox, { backgroundColor: p.surfaceMuted }]}>
            <Icon name="cloud-upload-outline" color={p.brandPrimary} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.backupTitle, { color: p.textPrimary }]}>Back up your streak</Text>
            <Text style={[s.backupSubtitle, { color: p.textSecondary }]}>
              Connect Google account to keep your recovery progress safe.
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={p.textMuted} />
        </Pressable>
      )}

      {/* 4. Quick Protection Action Grid */}
      <QuickProtectionGrid
        onNavigate={open}
        onOpenWebFilter={() => setWebFilterModalVisible(true)}
        onOpenVisualAi={() => setVisualAiModalVisible(true)}
        onOpenStrictLock={() => setStrictModalVisible(true)}
        webHealthy={webHealthy}
        appHealthy={appHealthy}
      />

      {/* 6. Attention Trend 7-Day Chart */}
      <AttentionTrendCard
        todayUsageMs={data.usage.todayMs}
        weekUsage={data.usage.week}
        hasUsagePermission={data.capabilities.usage}
        onOpenPermissions={() => open("permissions")}
        onPress={() => open("screen-time")}
      />

      {/* 7. Immediate Crisis Burst Action */}
      <BurstActionCard
        burstRemainingMs={data.burstRemainingMs}
        burstConfiguredMinutes={data.settings.burstMinutes}
        busy={busy}
        onPress={() => open("burst")}
      />

      {/* 8. Web Filter Popup Modal */}
      <WebFilterModal
        visible={webFilterModalVisible}
        onClose={() => setWebFilterModalVisible(false)}
      />

      {/* 9. Visual AI Popup Modal */}
      <VisualAiModal
        visible={visualAiModalVisible}
        onClose={() => setVisualAiModalVisible(false)}
      />

      {/* 10. Strict Mode Popup Modal */}
      <StrictModeModal
        visible={strictModalVisible}
        onClose={() => setStrictModalVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 4,
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  brandGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoFrame: {
    width: 32,
    height: 36,
    borderRadius: 9,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: 32,
    height: 36,
    transform: [{ scale: 1.45 }],
  },
  brandWordmark: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  brandDot: {
    color: "#789BC4",
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
  },
  pageHead: {
    marginBottom: 16,
  },
  dateEyebrow: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  pageTitle: {
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1.3,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 8,
  },
  subrow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  statusIndicatorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  motivationQuote: {
    fontSize: 11,
    fontWeight: "500",
  },
  backupBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginVertical: 4,
  },
  backupIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  backupTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  backupSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
  },
});
