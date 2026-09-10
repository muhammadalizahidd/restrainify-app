import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { MomentumHeroCard } from "../components/MomentumHeroCard";
import { DashboardMetrics } from "../components/DashboardMetrics";
import { QuickProtectionGrid } from "../components/QuickProtectionGrid";
import { AttentionTrendCard } from "../components/AttentionTrendCard";
import { BurstActionCard } from "../components/BurstActionCard";

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
  const { snapshot: data, palette: p, command, busy, reconciling } = useOffline();

  if (!data) return null;

  // Truthful health signals
  const webHealthy = data.capabilities.vpn && !data.capabilities.vpnError;
  const appHealthy = data.capabilities.accessibility && data.settings.accessibilityConsent;
  const isFullyProtected = webHealthy && appHealthy;

  // Date formatting for eyebrow
  const dateFormatted = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={s.container}>
      {/* 1. App Header: Logo + Brand Wordmark + User Avatar */}
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
          accessibilityLabel="Open settings and account"
          onPress={() => open("settings")}
          style={[s.avatarButton, { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle }]}
        >
          <Text style={[s.avatarText, { color: p.textPrimary }]}>A</Text>
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
                : "Protection needs attention"}
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
        onClaimReward={() => void command("reward")}
        rewardClaimed={data.reward.claimed}
        rewardBalance={data.reward.balance}
        busy={busy}
      />

      {/* 4. Today, At a Glance Metrics */}
      <DashboardMetrics
        todayUsageMs={data.usage.todayMs}
        yesterdayUsageMs={data.usage.week.at(-2)?.ms ?? 0}
        hasUsagePermission={data.capabilities.usage}
        isWebHealthy={webHealthy}
        isAppHealthy={appHealthy}
        reconciling={reconciling}
        onOpenProtectionHealth={() => open("permissions")}
      />

      {/* 5. Quick Protection Action Grid */}
      <QuickProtectionGrid
        onNavigate={open}
        webHealthy={webHealthy}
        appHealthy={appHealthy}
      />

      {/* 6. Attention Trend 7-Day Chart */}
      <AttentionTrendCard
        todayUsageMs={data.usage.todayMs}
        weekUsage={data.usage.week}
        hasUsagePermission={data.capabilities.usage}
        onOpenPermissions={() => open("permissions")}
      />

      {/* 7. Immediate Crisis Burst Action */}
      <BurstActionCard
        burstRemainingMs={data.burstRemainingMs}
        burstConfiguredMinutes={data.settings.burstMinutes}
        busy={busy}
        onPress={() => {
          if (data.burstRemainingMs > 0 || !data.settings.burstMinutes) {
            open("burst");
          } else {
            void command("burst");
          }
        }}
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
});
