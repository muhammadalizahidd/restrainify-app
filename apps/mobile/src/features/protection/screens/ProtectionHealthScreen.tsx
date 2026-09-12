import { useState } from "react";
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";
import { offlineProtection } from "../../../native/OfflineProtection";

export interface ProtectionHealthScreenProps {
  open?: (route: string) => void;
  onBack?: () => void;
}

interface CapabilityRowProps {
  icon: IconName;
  title: string;
  subtitle: string;
  statusText: string;
  statusTone: "good" | "warn" | "neutral";
  onPress?: () => void;
}

function CapabilityRow({
  icon,
  title,
  subtitle,
  statusText,
  statusTone,
  onPress,
}: CapabilityRowProps) {
  const { palette: p } = useOffline();

  const badgeBg =
    statusTone === "good"
      ? p.successSurface
      : statusTone === "warn"
      ? p.warningSurface
      : p.surfaceMuted;

  const badgeColor =
    statusTone === "good"
      ? p.success
      : statusTone === "warn"
      ? p.warning
      : p.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${statusText}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        s.row,
        { borderBottomColor: p.borderSubtle },
        pressed && onPress && s.rowPressed,
      ]}
    >
      <View style={[s.rowIconWrap, { backgroundColor: p.surfaceMuted }]}>
        <Icon name={icon} size={18} color={p.brandPrimary} />
      </View>

      <View style={s.rowTextWrap}>
        <Text style={[s.rowTitle, { color: p.textPrimary }]}>{title}</Text>
        <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
          {subtitle}
        </Text>
      </View>

      <View style={s.rowSideWrap}>
        <View style={[s.statusPill, { backgroundColor: badgeBg }]}>
          <Text style={[s.statusPillText, { color: badgeColor }]}>
            {statusText}
          </Text>
        </View>
        {onPress && (
          <Icon name="chevron-right" size={18} color={p.textSecondary} />
        )}
      </View>
    </Pressable>
  );
}

/**
 * ProtectionHealthScreen implements TOOL-02 from the Restrainify Orbit / Clarity
 * screen architecture, providing truthful live capability diagnostic states
 * and direct 1-tap Android intent repairs.
 */
export function ProtectionHealthScreen({
  open,
  onBack,
}: ProtectionHealthScreenProps) {
  const { snapshot: data, palette: p, refresh, reconciling } = useOffline();
  const [checking, setChecking] = useState(false);

  if (!data) return null;

  // Live truthful capability evaluations
  const webHealthy = data.capabilities.vpn && !data.capabilities.vpnError;
  const appHealthy =
    data.capabilities.accessibility && data.settings.accessibilityConsent;
  const usageHealthy = data.capabilities.usage;
  const isFullyProtected = webHealthy && appHealthy;

  // Trigger manual live capability refresh
  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await refresh();
    } finally {
      setTimeout(() => setChecking(false), 400);
    }
  };

  return (
    <View style={s.container}>
      {/* 1. Subscreen Back Header */}
      <View style={s.backHeader}>
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
            Protection Health
          </Text>
          <Text style={[s.headerSubtitle, { color: p.textSecondary }]}>
            Truthful, repairable status
          </Text>
        </View>
      </View>

      {/* 2. Dynamic Notice Banner */}
      <View
        style={[
          s.noticeBanner,
          {
            backgroundColor: isFullyProtected ? p.successSurface : p.warningSurface,
            borderColor: isFullyProtected ? p.success : p.warning,
          },
        ]}
      >
        <View style={s.noticeIconWrap}>
          <Icon
            name={isFullyProtected ? "shield-check" : "shield-alert-outline"}
            color={isFullyProtected ? p.success : p.warning}
            size={22}
          />
        </View>
        <View style={s.noticeCopy}>
          <Text
            style={[
              s.noticeTitle,
              { color: isFullyProtected ? p.success : p.warning },
            ]}
          >
            {isFullyProtected ? "Fully protected" : "Protection needs attention"}
          </Text>
          <Text
            style={[
              s.noticeDetail,
              { color: isFullyProtected ? p.success : p.warning },
            ]}
          >
            {reconciling
              ? "Reconciling live device capabilities…"
              : isFullyProtected
              ? "Current capability checks show all required protection services are healthy."
              : !appHealthy
              ? "App restriction service needs Android Accessibility permission and consent."
              : !webHealthy
              ? data.capabilities.vpnError ?? "Website filtering service is disconnected."
              : "Some permissions require your attention to ensure complete protection."}
          </Text>
          {!isFullyProtected && open && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View diagnostic & repair paths"
              onPress={() => open("degraded-state")}
              style={{ marginTop: 8 }}
            >
              <Text style={{ color: p.warning, fontWeight: "700", fontSize: 12 }}>
                View diagnostic & repair paths →
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* 3. Core Protection Live State Section */}
      <View style={s.sectionWrap}>
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
            Core protection
          </Text>
          <Text style={[s.sectionSubtitle, { color: p.textSecondary }]}>
            LIVE DEVICE STATE
          </Text>
        </View>

        <View
          style={[
            s.cardList,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          <CapabilityRow
            icon="web"
            title="Website Protection"
            subtitle="Adult-domain filtering is running"
            statusText={webHealthy ? "Active" : "Degraded"}
            statusTone={webHealthy ? "good" : "warn"}
            onPress={open ? () => open("web") : undefined}
          />

          <CapabilityRow
            icon="eye-off-outline"
            title="Visual Protection"
            subtitle="Local on-device visual analysis"
            statusText="Offline edition"
            statusTone="neutral"
            onPress={open ? () => open("visual") : undefined}
          />

          <CapabilityRow
            icon="cellphone-lock"
            title="App Controls"
            subtitle="Usage access & enforcement"
            statusText={appHealthy ? "Active" : "Needs access"}
            statusTone={appHealthy ? "good" : "warn"}
            onPress={open ? () => open("apps") : undefined}
          />

          <CapabilityRow
            icon="video-outline"
            title="Short-form feeds"
            subtitle="Reels, Shorts & TikTok fallback"
            statusText="4 active"
            statusTone="good"
            onPress={open ? () => open("social") : undefined}
          />

          <CapabilityRow
            icon="lock-outline"
            title="Strict Mode"
            subtitle="Configured disable friction is active"
            statusText={data.settings.strictMinutes > 0 ? "Active" : "Off"}
            statusTone={data.settings.strictMinutes > 0 ? "good" : "neutral"}
            onPress={open ? () => open("settings") : undefined}
          />
        </View>
      </View>

      {/* 4. Device Health Section */}
      <View style={s.sectionWrap}>
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
            Device health
          </Text>
        </View>

        <View
          style={[
            s.cardList,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          <CapabilityRow
            icon="battery-charging"
            title="Battery management"
            subtitle="Background protection not restricted"
            statusText="Healthy"
            statusTone="good"
            onPress={() => void offlineProtection.settings("battery")}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Run live health check"
            onPress={handleCheckNow}
            style={({ pressed }) => [
              s.row,
              { borderBottomColor: "transparent" },
              pressed && s.rowPressed,
            ]}
          >
            <View style={[s.rowIconWrap, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="refresh" size={18} color={p.brandPrimary} />
            </View>

            <View style={s.rowTextWrap}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>
                Run a health check
              </Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
                {checking || reconciling
                  ? "Verifying live capabilities…"
                  : "Refresh current device capability states"}
              </Text>
            </View>

            <View style={s.rowSideWrap}>
              {checking || reconciling ? (
                <ActivityIndicator size="small" color={p.brandPrimary} />
              ) : (
                <View style={[s.statusPill, { backgroundColor: p.surfaceMuted }]}>
                  <Text style={[s.statusPillText, { color: p.textPrimary }]}>
                    Check now
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>
      </View>

      {/* 5. Frictionless Intent Repair Actions (When Degraded) */}
      {!appHealthy && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Accessibility settings to repair protection"
          onPress={() => void offlineProtection.settings("accessibility")}
          style={[s.actionButton, { backgroundColor: p.brandPrimary }]}
        >
          <Text style={s.actionButtonText}>
            Repair Accessibility Access →
          </Text>
        </Pressable>
      )}

      {!usageHealthy && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enable Usage Access in Android Settings"
          onPress={() => void offlineProtection.settings("usage")}
          style={[s.actionButtonSecondary, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}
        >
          <Text style={[s.actionButtonSecondaryText, { color: p.textPrimary }]}>
            Grant Usage Access →
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 24,
  },
  backHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  noticeBanner: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  noticeIconWrap: {
    marginTop: 1,
  },
  noticeCopy: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 16,
  },
  noticeDetail: {
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 4,
    opacity: 0.9,
  },
  sectionWrap: {
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
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: "600",
  },
  cardList: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 58,
  },
  rowPressed: {
    opacity: 0.8,
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  rowTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  rowSubtitle: {
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },
  rowSideWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusPill: {
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  actionButtonSecondary: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  actionButtonSecondaryText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
});
