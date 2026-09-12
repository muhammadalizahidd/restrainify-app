import { useState } from "react";
import { StyleSheet, Text, View, Pressable, Switch } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { offlineProtection } from "../../../native/OfflineProtection";

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
  const [safeSearch, setSafeSearch] = useState(true);
  const [proxyResistance, setProxyResistance] = useState(true);
  const [socialWebsites, setSocialWebsites] = useState(false);

  if (!data) return null;

  const isWebsiteActive = data.settings.websiteEnabled;
  const isVpnConnected = data.capabilities.vpn && !data.capabilities.vpnError;
  const domainCount = data.settings.domains.length;

  const handleToggleWebsiteProtection = async (value: boolean) => {
    await command("setting", { key: "websiteEnabled", value });
    if (value && data.settings.dnsMode === "vpn" && !data.capabilities.vpn) {
      await run(offlineProtection.startVpn);
    } else if (!value && data.capabilities.vpn) {
      await run(offlineProtection.stopVpn);
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
            backgroundColor: isWebsiteActive ? p.successSurface : p.surfaceMuted,
            borderColor: isWebsiteActive ? p.success : p.borderSubtle,
          },
        ]}
      >
        <View style={s.noticeHeader}>
          <Icon
            name="web"
            size={20}
            color={isWebsiteActive ? p.success : p.textSecondary}
          />
          <Text
            style={[
              s.noticeTitle,
              { color: isWebsiteActive ? p.success : p.textPrimary },
            ]}
          >
            {isWebsiteActive
              ? isVpnConnected
                ? "Website protection active"
                : "Local DNS VPN ready"
              : "Website protection needs setup"}
          </Text>
        </View>
        <Text style={[s.noticeBody, { color: p.textSecondary }]}>
          {isWebsiteActive
            ? "Known adult domains are being blocked using Cloudflare Families and your local blocklist."
            : "Enable website protection below to begin filtering explicit websites on this device."}
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
              onValueChange={setSafeSearch}
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
              onValueChange={setProxyResistance}
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
              onValueChange={setSocialWebsites}
              trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* 4. Your Rules Section */}
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
            accessibilityLabel="Scoped overrides: 0 active"
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
              <Text style={[s.badgeText, { color: p.textSecondary }]}>Ready</Text>
              <Icon name="chevron-right" size={18} color={p.textMuted} />
            </View>
          </Pressable>
        </View>
      </View>

      {/* 5. Protection Database Status Section */}
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
