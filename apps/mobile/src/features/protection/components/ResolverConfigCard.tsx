import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface ResolverConfigCardProps {
  dnsMode: "vpn" | "private";
  isWebsiteActive: boolean;
  isVpnConnected: boolean;
  privateDnsDetected: string | false;
  onSwitchDnsMode: (mode: "vpn" | "private") => Promise<void>;
  onReconnectVpn: () => Promise<void>;
  onOpenPrivateDnsSettings: () => Promise<void>;
  onCopyHostname: (text: string) => Promise<boolean>;
}

export function ResolverConfigCard({
  dnsMode,
  isWebsiteActive,
  isVpnConnected,
  privateDnsDetected,
  onSwitchDnsMode,
  onReconnectVpn,
  onOpenPrivateDnsSettings,
  onCopyHostname,
}: ResolverConfigCardProps) {
  const { palette: p } = useOffline();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await onCopyHostname("family.cloudflare-dns.com");
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <View style={s.sectionWrap}>
      <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Resolver mode</Text>
      <View
        style={[
          s.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {/* Segmented Selector */}
        <View style={[s.segmentedWrap, { backgroundColor: p.surfaceMuted }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select Local DNS VPN mode"
            onPress={() => void onSwitchDnsMode("vpn")}
            style={[
              s.segmentedOption,
              dnsMode === "vpn" && [s.segmentedSelected, { backgroundColor: p.surfacePrimary }],
            ]}
          >
            <Icon
              name="shield-check"
              size={16}
              color={dnsMode === "vpn" ? p.brandPrimary : p.textSecondary}
            />
            <Text
              style={[
                s.segmentedText,
                {
                  color: dnsMode === "vpn" ? p.textPrimary : p.textSecondary,
                  fontWeight: dnsMode === "vpn" ? "700" : "500",
                },
              ]}
            >
              Local DNS VPN
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Select Private DNS mode"
            onPress={() => void onSwitchDnsMode("private")}
            style={[
              s.segmentedOption,
              dnsMode === "private" && [s.segmentedSelected, { backgroundColor: p.surfacePrimary }],
            ]}
          >
            <Icon
              name="lock-outline"
              size={16}
              color={dnsMode === "private" ? p.brandPrimary : p.textSecondary}
            />
            <Text
              style={[
                s.segmentedText,
                {
                  color: dnsMode === "private" ? p.textPrimary : p.textSecondary,
                  fontWeight: dnsMode === "private" ? "700" : "500",
                },
              ]}
            >
              Private DNS
            </Text>
          </Pressable>
        </View>

        {/* Mode Explanations & Setup Guide */}
        {dnsMode === "vpn" ? (
          <View style={s.resolverDetailWrap}>
            <Text style={[s.resolverDetailBody, { color: p.textSecondary }]}>
              Routes DNS requests only (no app traffic relayed). Cloudflare Families (1.1.1.3)
              filters adult domains, and your local custom blocklist and SafeSearch rules are applied
              directly on this device.
            </Text>
            {!isVpnConnected && isWebsiteActive && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reconnect DNS VPN"
                onPress={() => void onReconnectVpn()}
                style={[s.resolverActionBtn, { backgroundColor: p.brandPrimary }]}
              >
                <Icon name="refresh" size={16} color={p.backgroundPrimary} />
                <Text style={[s.resolverActionBtnText, { color: p.backgroundPrimary }]}>
                  Connect DNS VPN
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={s.resolverDetailWrap}>
            <Text style={[s.resolverDetailBody, { color: p.textSecondary }]}>
              Encrypts DNS via Android system DoT. Zero battery overhead and works alongside other
              VPN apps. Configure in Android Settings:
            </Text>
            <View
              style={[
                s.codeBox,
                { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.codeLabel, { color: p.textSecondary }]}>Provider hostname:</Text>
                <Text style={[s.codeValue, { color: p.textPrimary }]}>
                  family.cloudflare-dns.com
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Copy hostname to clipboard"
                onPress={() => void handleCopy()}
                style={[
                  s.copyBtn,
                  {
                    backgroundColor: copied ? p.successSurface : p.surfacePrimary,
                    borderColor: p.borderSubtle,
                  },
                ]}
              >
                <Icon
                  name={copied ? "check" : "content-copy"}
                  size={14}
                  color={copied ? p.success : p.textPrimary}
                />
                <Text
                  style={[s.copyBtnText, { color: copied ? p.success : p.textPrimary }]}
                >
                  {copied ? "Copied" : "Copy"}
                </Text>
              </Pressable>
            </View>
            <View style={s.dnsDetectedRow}>
              <Text style={[s.dnsDetectedLabel, { color: p.textSecondary }]}>System status:</Text>
              <Text
                style={[
                  s.dnsDetectedValue,
                  { color: privateDnsDetected ? p.success : p.warning },
                ]}
              >
                {privateDnsDetected ? `Configured (${privateDnsDetected})` : "Not detected"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Android Private DNS settings"
              onPress={() => void onOpenPrivateDnsSettings()}
              style={[
                s.resolverActionBtn,
                { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle, borderWidth: 1 },
              ]}
            >
              <Icon name="cog-outline" size={16} color={p.textPrimary} />
              <Text style={[s.resolverActionBtnText, { color: p.textPrimary }]}>
                Open Private DNS Settings
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
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
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  segmentedWrap: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  segmentedOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentedSelected: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedText: {
    fontSize: 12,
  },
  resolverDetailWrap: {
    marginTop: 12,
    gap: 10,
  },
  resolverDetailBody: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  resolverActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 2,
  },
  resolverActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  codeLabel: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  codeValue: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
    marginTop: 2,
  },
  dnsDetectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dnsDetectedLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  dnsDetectedValue: {
    fontSize: 11,
    fontWeight: "700",
  },
});
