import { StyleSheet, Text, View, Pressable, Switch, Alert } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { offlineProtection } from "../../../native/OfflineProtection";
import { ResolverConfigCard } from "../components/ResolverConfigCard";

export interface WebsiteProtectionScreenProps {
  open: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * WebsiteProtectionScreen implements SET-WEB-01: Website Protection Screen
 * from the Restrainify UI Architecture specification.
 *
 * It manages DNS-level adult content blocking, upstream resolver mode (local VPN vs private DNS),
 * SafeSearch enforcement, proxy resistance, and links to custom domain rules.
 */
export function WebsiteProtectionScreen({ open, onBack }: WebsiteProtectionScreenProps) {
  const { snapshot: data, palette: p, command, run } = useOffline();

  if (!data) return null;

  const isCooldownActive = data.burstRemainingMs > 0 || data.strictRemainingMs > 0;
  const isWebsiteActive = data.settings.websiteEnabled;
  const dnsMode = data.settings.dnsMode || "vpn";
  const isVpnConnected = data.capabilities.vpn && !data.capabilities.vpnError;
  const privateDnsDetected = data.capabilities.privateDns;
  const domainCount = data.settings.domains.length;
  const activeOverridesCount = data.settings.domains.filter((d) => d.allow && d.enabled).length;

  const safeSearch = data.settings.safeSearch ?? true;
  const proxyResistance = data.settings.proxyResistance ?? true;
  const socialWebsites = data.settings.socialWebsites ?? false;

  // Truthful status calculation adhering to FR-WEB-010 and Domain1 test contracts
  let noticeTitle: string;
  let noticeBody: string;
  let isHealthy: boolean;

  if (!isWebsiteActive) {
    noticeTitle = "Website protection needs setup";
    noticeBody = "Enable website protection below to begin filtering explicit websites on this device.";
    isHealthy = false;
  } else if (dnsMode === "vpn") {
    if (isVpnConnected) {
      noticeTitle = "Website protection active";
      noticeBody = "Known adult domains are being blocked using Cloudflare Families, SafeSearch enforcement, and your local blocklist.";
      isHealthy = true;
    } else if (data.capabilities.vpnError) {
      noticeTitle = "VPN connection degraded";
      noticeBody = data.capabilities.vpnError;
      isHealthy = false;
    } else {
      noticeTitle = "Local DNS VPN ready";
      noticeBody = "Local DNS VPN is prepared. Tap connect below if it is not currently active.";
      isHealthy = false;
    }
  } else {
    // dnsMode === "private"
    if (privateDnsDetected) {
      noticeTitle = `Private DNS active (${privateDnsDetected})`;
      noticeBody = "Android system-wide encrypted DNS is filtering adult domains. Custom local domain overrides require Local DNS VPN.";
      isHealthy = true;
    } else {
      noticeTitle = "Private DNS setup needed";
      noticeBody = "Set your Android Private DNS provider hostname to family.cloudflare-dns.com in system settings.";
      isHealthy = false;
    }
  }

  const handleToggleSetting = async (
    key: "safeSearch" | "proxyResistance" | "socialWebsites",
    value: boolean
  ) => {
    if (!value && isCooldownActive) {
      Alert.alert(
        "Settings Locked",
        "Protection settings cannot be weakened while Strict Mode or Burst is active."
      );
      return;
    }
    await command("setting", { key, value });
  };

  const handleToggleWebsiteProtection = async (value: boolean) => {
    if (!value && isCooldownActive) {
      Alert.alert(
        "Settings Locked",
        "Website protection cannot be disabled while Strict Mode or Burst is active."
      );
      return;
    }
    if (!value) {
      await run(offlineProtection.stopVpn);
      await command("setting", { key: "websiteEnabled", value: false });
    } else {
      await command("setting", { key: "websiteEnabled", value: true });
      if (dnsMode === "vpn") {
        await run(offlineProtection.startVpn);
      }
    }
  };

  const handleSwitchDnsMode = async (mode: "vpn" | "private") => {
    if (mode === dnsMode) return;
    if (isCooldownActive) {
      Alert.alert(
        "Settings Locked",
        "Resolver mode cannot be changed while Strict Mode or Burst is active."
      );
      return;
    }
    if (mode === "private") {
      await run(offlineProtection.stopVpn);
      await command("setting", { key: "dnsMode", value: "private" });
    } else {
      await command("setting", { key: "dnsMode", value: "vpn" });
      if (isWebsiteActive) {
        await run(offlineProtection.startVpn);
      }
    }
  };

  return (
    <View style={s.container}>
      {/* 1. Subscreen Header */}
      <View style={s.headerRow}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[
              s.backButton,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={s.titleWrap}>
          <Text style={[s.headerKicker, { color: p.textSecondary }]}>
            Domains & search safety
          </Text>
          <Text style={[s.headerTitle, { color: p.textPrimary }]}>
            Website Protection
          </Text>
        </View>
      </View>

      {/* 2. Notice Banner */}
      <View
        style={[
          s.noticeCard,
          {
            backgroundColor: isHealthy ? p.successSurface : isWebsiteActive ? p.warningSurface : p.surfaceMuted,
            borderColor: isHealthy ? p.success : isWebsiteActive ? p.warning : p.borderSubtle,
          },
        ]}
      >
        <View style={s.noticeHeader}>
          <Icon
            name="web"
            size={20}
            color={isHealthy ? p.success : isWebsiteActive ? p.warning : p.textSecondary}
          />
          <Text
            style={[
              s.noticeTitle,
              { color: isHealthy ? p.success : isWebsiteActive ? p.warning : p.textPrimary },
            ]}
          >
            {noticeTitle}
          </Text>
        </View>
        <Text style={[s.noticeBody, { color: p.textSecondary }]}>
          {noticeBody}
        </Text>
      </View>

      {/* 3. Protection Controls Section */}
      <View style={s.sectionWrap}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Protection</Text>
        <View
          style={[
            s.rowList,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          {/* Row 1: Adult domain protection */}
          <View style={[s.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.borderSubtle }]}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="shield-check" size={20} color={isWebsiteActive ? p.brandPrimary : p.textMuted} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Adult-domain protection</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>Maintained protection database</Text>
            </View>
            <Switch
              accessibilityLabel="Toggle adult domain protection"
              value={isWebsiteActive}
              onValueChange={handleToggleWebsiteProtection}
              trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Row 2: SafeSearch */}
          <View style={[s.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.borderSubtle }]}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="magnify" size={20} color={safeSearch ? p.brandPrimary : p.textMuted} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>SafeSearch</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>Safer-search enforcement where reliable</Text>
            </View>
            <Switch
              accessibilityLabel="Toggle SafeSearch"
              value={safeSearch}
              onValueChange={(val) => void handleToggleSetting("safeSearch", val)}
              trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Row 3: Proxy / bypass sites */}
          <View style={[s.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.borderSubtle }]}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="lock-outline" size={20} color={proxyResistance ? p.brandPrimary : p.textMuted} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Proxy / bypass sites</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>Block known bypass domains where feasible</Text>
            </View>
            <Switch
              accessibilityLabel="Toggle Proxy resistance"
              value={proxyResistance}
              onValueChange={(val) => void handleToggleSetting("proxyResistance", val)}
              trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Row 4: Social websites */}
          <View style={s.row}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="video-outline" size={20} color={socialWebsites ? p.brandPrimary : p.textMuted} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Social websites</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>Supported social website blocking</Text>
            </View>
            <Switch
              accessibilityLabel="Toggle Social websites"
              value={socialWebsites}
              onValueChange={(val) => void handleToggleSetting("socialWebsites", val)}
              trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* 4. Upstream Resolver Mode Section */}
      <ResolverConfigCard
        dnsMode={dnsMode}
        isWebsiteActive={isWebsiteActive}
        isVpnConnected={isVpnConnected}
        privateDnsDetected={privateDnsDetected}
        onSwitchDnsMode={handleSwitchDnsMode}
        onReconnectVpn={async () => void run(offlineProtection.startVpn)}
        onOpenPrivateDnsSettings={async () => void run(() => offlineProtection.settings("dns"))}
        onCopyHostname={(hostname) => offlineProtection.copyToClipboard(hostname)}
      />

      {/* 5. Your Rules Section */}
      <View style={s.sectionWrap}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Your rules</Text>
        <View
          style={[
            s.rowList,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          {/* Row 1: Blocked & allowed websites */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Blocked and allowed websites: ${domainCount} rules`}
            onPress={() => open("domain-manager")}
            style={({ pressed }) => [
              s.row,
              { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.borderSubtle },
              pressed && { backgroundColor: p.surfaceMuted },
            ]}
          >
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="web" size={20} color={p.brandPrimary} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Blocked & allowed websites</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>Manual domain rules</Text>
            </View>
            <View style={s.rightBadgeWrap}>
              <Text style={[s.badgeText, { color: p.textSecondary }]}>{domainCount} rules</Text>
              <Icon name="chevron-right" size={18} color={p.textMuted} />
            </View>
          </Pressable>

          {/* Row 2: Scoped overrides */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Scoped overrides: ${activeOverridesCount} active`}
            onPress={() => open("overrides")}
            style={({ pressed }) => [
              s.row,
              pressed && { backgroundColor: p.surfaceMuted },
            ]}
          >
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="cog-outline" size={20} color={p.brandPrimary} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Scoped overrides</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>Time- or target-scoped exceptions</Text>
            </View>
            <View style={s.rightBadgeWrap}>
              <Text style={[s.badgeText, { color: p.textSecondary }]}>
                {activeOverridesCount > 0 ? `${activeOverridesCount} active` : "Ready"}
              </Text>
              <Icon name="chevron-right" size={18} color={p.textMuted} />
            </View>
          </Pressable>
        </View>
      </View>

      {/* 6. Protection Database Status Section */}
      <View style={s.sectionWrap}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Protection database</Text>
        <View
          style={[
            s.card,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          <View style={s.dbRow}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="refresh" size={20} color={p.brandPrimary} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.dbTitle, { color: p.textPrimary }]}>
                Definitions update automatically
              </Text>
              <Text style={[s.dbSubtitle, { color: p.textSecondary }]}>
                A bad update must never replace a known working protection state.
              </Text>
            </View>
            <View style={[s.pillGood, { backgroundColor: p.successSurface }]}>
              <Text style={[s.pillGoodText, { color: p.success }]}>Current</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  titleWrap: {
    flex: 1,
  },
  headerKicker: {
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginTop: 2,
  },
  noticeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    marginTop: 6,
    gap: 8,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  noticeBody: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  sectionWrap: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.2,
    marginBottom: 8,
    marginHorizontal: 2,
  },
  rowList: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  copyBox: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 17,
  },
  rowSubtitle: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  rightBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  dbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dbTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  dbSubtitle: {
    fontSize: 9.5,
    fontWeight: "500",
    marginTop: 3,
    lineHeight: 14,
  },
  pillGood: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  pillGoodText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
});
