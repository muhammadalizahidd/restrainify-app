import { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, View, Pressable, Switch, TextInput, Modal, Alert } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { offlineProtection, type DomainRule } from "../../../native/OfflineProtection";

export interface WebsiteProtectionScreenProps {
  open: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * WebsiteProtectionScreen implements SET-WEB-01: Website Protection Screen.
 *
 * Streamlined to core essentials:
 * 1. Safe Browsing Toggle (mapped to local DNS VPN functionality)
 * 2. Blocked & Allowed Domain Rules (with tabs, search, add, and delete)
 */
export function WebsiteProtectionScreen({ onBack }: WebsiteProtectionScreenProps) {
  const { snapshot: data, palette: p, command, run } = useOffline();

  const [tab, setTab] = useState<"blocked" | "allowed">("blocked");
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lock and optimistic states to avoid triple-toggle bounce and enforce cooldown
  const isLockedRef = useRef(false);
  const [isLocked, setIsLocked] = useState(false);
  const [optimisticActive, setOptimisticActive] = useState<boolean | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
      }
    };
  }, []);

  if (!data) return null;

  const isCooldownActive = data.burstRemainingMs > 0 || data.strictRemainingMs > 0;
  const isWebsiteActive = data.settings.websiteEnabled;
  const switchValue = optimisticActive !== null ? optimisticActive : isWebsiteActive;
  const dnsMode = data.settings.dnsMode || "vpn";

  const defaultDomains: DomainRule[] = [
    { host: "example-trigger.com", allow: false, enabled: true },
    { host: "another-site.example", allow: false, enabled: true },
    { host: "work-portal.example", allow: true, enabled: true },
  ];

  const domains = data.settings.domains.length > 0 ? data.settings.domains : defaultDomains;
  const isAllowedTab = tab === "allowed";

  const filteredDomains = domains.filter((d) => {
    const matchesTab = isAllowedTab ? d.allow : !d.allow;
    const matchesSearch = d.host.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const enabledCount = filteredDomains.filter((d) => d.enabled).length;

  const handleToggleWebsiteProtection = async (value: boolean) => {
    if (isLockedRef.current) return;

    if (!value && isCooldownActive) {
      Alert.alert(
        "Settings Locked",
        "Website protection cannot be disabled while Strict Mode or Burst is active.",
      );
      return;
    }

    isLockedRef.current = true;
    setIsLocked(true);
    setOptimisticActive(value);
    const startTime = Date.now();

    try {
      if (!value) {
        await run(offlineProtection.stopVpn);
        await command("setting", { key: "websiteEnabled", value: false });
      } else {
        const ok = await command("setting", { key: "websiteEnabled", value: true });
        if (ok && dnsMode === "vpn") {
          await run(offlineProtection.startVpn);
        }
      }
    } catch (err: unknown) {
      setOptimisticActive(null);
      const msg = err instanceof Error ? err.message : "Failed to toggle Safe Browsing";
      Alert.alert("Safe Browsing", msg);
    } finally {
      const elapsed = Date.now() - startTime;
      const remainingCooldown = Math.max(400, 1000 - elapsed);
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      lockTimerRef.current = setTimeout(() => {
        isLockedRef.current = false;
        setIsLocked(false);
        setOptimisticActive(null);
      }, remainingCooldown);
    }
  };


  const handleToggleRule = async (rule: DomainRule) => {
    setErrorMessage(null);
    if (!rule.allow && rule.enabled && isCooldownActive) {
      Alert.alert(
        "Settings Locked",
        "Block rules cannot be disabled while an active Strict Mode lock or Burst cooldown is running.",
      );
      return;
    }
    await command("domain", {
      domain: rule.host,
      allow: rule.allow,
      enabled: !rule.enabled,
    });
  };

  const handleDeleteRule = async (rule: DomainRule) => {
    setErrorMessage(null);
    if (!rule.allow && isCooldownActive) {
      Alert.alert(
        "Settings Locked",
        "Block rules cannot be removed while an active Strict Mode lock or Burst cooldown is running.",
      );
      return;
    }
    await command("domain", {
      domain: rule.host,
      remove: true,
    });
  };

  const handleAddDomain = async () => {
    setErrorMessage(null);
    const host = newDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "");
    if (!host || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) {
      setErrorMessage("Please enter a valid domain (e.g. example.com).");
      return;
    }

    if (isAllowedTab && isCooldownActive) {
      Alert.alert(
        "Strict Mode Active",
        "Adding allowlist exceptions is locked until the configured cooldown ends.",
      );
      return;
    }

    await command("domain", {
      domain: host,
      allow: isAllowedTab,
      enabled: true,
    });

    setNewDomain("");
    setIsAddModalOpen(false);
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
          <Text style={[s.headerKicker, { color: p.textSecondary }]}>Domains & safe browsing</Text>
          <Text style={[s.headerTitle, { color: p.textPrimary }]}>Web Filter</Text>
        </View>
      </View>

      {/* 2. Safe Browsing Toggle (Mapped to Local DNS) */}
      <View
        style={[
          s.optionCard,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: switchValue ? p.brandPrimary : p.borderSubtle,
            opacity: isLocked ? 0.88 : 1,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle Safe Browsing"
          disabled={isLocked}
          onPress={() => handleToggleWebsiteProtection(!switchValue)}
          style={s.optionContentPressable}
        >
          <View
            style={[
              s.optionIconBox,
              {
                backgroundColor: switchValue ? "rgba(37, 99, 235, 0.12)" : p.surfaceMuted,
              },
            ]}
          >
            <Icon
              name="shield-check"
              size={22}
              color={switchValue ? p.brandPrimary : p.textMuted}
            />
          </View>

          <View style={s.optionCopy}>
            <Text style={[s.optionTitle, { color: p.textPrimary }]}>Safe Browsing</Text>
            <Text style={[s.optionSubtitle, { color: p.textSecondary }]}>
              Filter explicit and adult domains via local DNS
            </Text>
          </View>
        </Pressable>

        <Switch
          accessibilityLabel="Toggle Safe Browsing"
          disabled={isLocked}
          value={switchValue}
          onValueChange={handleToggleWebsiteProtection}
          trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
          thumbColor="#FFFFFF"
        />
      </View>


      {/* 3. Blocked & Allowed Section */}
      <View style={s.sectionWrap}>
        <View style={s.sectionHeaderRow}>
          <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Blocked & allowed</Text>
          <Text style={[s.sectionKicker, { color: p.textSecondary }]}>{domains.length} RULES</Text>
        </View>

        {/* Segmented Control */}
        <View
          style={[
            s.segmentedControl,
            { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
          ]}
        >
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "blocked" }}
            onPress={() => setTab("blocked")}
            style={[
              s.segmentButton,
              tab === "blocked" && {
                backgroundColor: p.surfacePrimary,
                elevation: 1,
              },
            ]}
          >
            <Text
              style={[
                s.segmentText,
                {
                  color: tab === "blocked" ? p.textPrimary : p.textSecondary,
                  fontWeight: tab === "blocked" ? "700" : "500",
                },
              ]}
            >
              Blocked
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === "allowed" }}
            onPress={() => setTab("allowed")}
            style={[
              s.segmentButton,
              tab === "allowed" && {
                backgroundColor: p.surfacePrimary,
                elevation: 1,
              },
            ]}
          >
            <Text
              style={[
                s.segmentText,
                {
                  color: tab === "allowed" ? p.textPrimary : p.textSecondary,
                  fontWeight: tab === "allowed" ? "700" : "500",
                },
              ]}
            >
              Allowed
            </Text>
          </Pressable>
        </View>

        {/* Search & Add Row */}
        <View style={s.searchRow}>
          <TextInput
            accessibilityLabel="Search your domains"
            placeholder="Search your domains"
            placeholderTextColor={p.textMuted}
            value={search}
            onChangeText={setSearch}
            style={[
              s.searchInput,
              {
                backgroundColor: p.surfacePrimary,
                borderColor: p.borderSubtle,
                color: p.textPrimary,
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add domain"
            onPress={() => {
              setErrorMessage(null);
              setIsAddModalOpen(true);
            }}
            style={[s.addIconButton, { backgroundColor: p.brandPrimary }]}
          >
            <Icon name="plus" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Manual rules list */}
        <View style={s.rulesSubHeader}>
          <Text style={[s.rulesSubTitle, { color: p.textSecondary }]}>
            MANUAL RULES ({enabledCount} ACTIVE)
          </Text>
        </View>

        <View
          style={[s.rulesCard, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}
        >
          {filteredDomains.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={[s.emptyText, { color: p.textSecondary }]}>No {tab} domains found.</Text>
            </View>
          ) : (
            filteredDomains.map((rule, index) => {
              const isLast = index === filteredDomains.length - 1;
              return (
                <View
                  key={`${rule.host}-${rule.allow}`}
                  style={[
                    s.domainRow,
                    !isLast && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: p.borderSubtle,
                    },
                  ]}
                >
                  <View
                    style={[
                      s.domainIconBox,
                      {
                        backgroundColor: rule.allow
                          ? "rgba(16, 185, 129, 0.12)"
                          : "rgba(239, 68, 68, 0.12)",
                      },
                    ]}
                  >
                    <Icon
                      name={rule.allow ? "check" : "cancel"}
                      size={15}
                      color={rule.allow ? p.success : p.danger}
                    />
                  </View>

                  <View style={s.domainCopy}>
                    <Text
                      style={[
                        s.domainHost,
                        {
                          color: rule.enabled ? p.textPrimary : p.textMuted,
                          textDecorationLine: rule.enabled ? "none" : "line-through",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {rule.host}
                    </Text>
                    <Text style={[s.domainSubtitle, { color: p.textSecondary }]}>
                      {rule.allow ? "Always allowed" : "Explicitly blocked"}
                    </Text>
                  </View>

                  <Switch
                    accessibilityLabel={`Toggle rule for ${rule.host}`}
                    value={rule.enabled}
                    onValueChange={() => void handleToggleRule(rule)}
                    trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
                    thumbColor="#FFFFFF"
                    style={s.rowSwitch}
                  />

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete rule for ${rule.host}`}
                    onPress={() => void handleDeleteRule(rule)}
                    style={({ pressed }) => [s.deleteButton, pressed && { opacity: 0.6 }]}
                  >
                    <Icon name="delete-outline" size={18} color={p.textSecondary} />
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      </View>

      {/* Add Domain Dialog Modal */}
      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={s.addModalBackdrop}>
          <View
            style={[
              s.addModalCard,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <Text style={[s.addModalTitle, { color: p.textPrimary }]}>
              Add {isAllowedTab ? "Allowed" : "Blocked"} Domain
            </Text>
            <Text style={[s.addModalSubtitle, { color: p.textSecondary }]}>
              Enter domain without http:// or https:// (e.g. trigger-site.com)
            </Text>

            <TextInput
              placeholder="example.com"
              placeholderTextColor={p.textMuted}
              value={newDomain}
              onChangeText={setNewDomain}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                s.addModalInput,
                {
                  backgroundColor: p.surfaceMuted,
                  borderColor: errorMessage ? p.danger : p.borderSubtle,
                  color: p.textPrimary,
                },
              ]}
            />

            {errorMessage && (
              <Text style={[s.errorMessage, { color: p.danger }]}>{errorMessage}</Text>
            )}

            <View style={s.addModalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setErrorMessage(null);
                  setIsAddModalOpen(false);
                }}
                style={[s.modalCancelBtn, { backgroundColor: p.surfaceMuted }]}
              >
                <Text style={[s.modalCancelText, { color: p.textPrimary }]}>Cancel</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => void handleAddDomain()}
                style={[s.modalConfirmBtn, { backgroundColor: p.brandPrimary }]}
              >
                <Text style={s.modalConfirmText}>Add Domain</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerRow: {
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
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionContentPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  optionSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  sectionWrap: {
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 9,
  },
  segmentText: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  addIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  rulesSubHeader: {
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  rulesSubTitle: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  rulesCard: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 12,
  },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  domainIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  domainCopy: {
    flex: 1,
    minWidth: 0,
  },
  domainHost: {
    fontSize: 13,
    fontWeight: "600",
  },
  domainSubtitle: {
    fontSize: 9.5,
    marginTop: 1,
  },
  rowSwitch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
  deleteButton: {
    padding: 6,
  },
  addModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  addModalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  addModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  addModalSubtitle: {
    fontSize: 11,
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 15,
  },
  addModalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 10.5,
    marginBottom: 8,
  },
  addModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
