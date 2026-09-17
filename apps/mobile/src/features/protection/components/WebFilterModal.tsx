import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import { offlineProtection, type DomainRule } from "../../../native/OfflineProtection";

export interface WebFilterModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * WebFilterModal renders a centered, beautifully proportioned dialog for the Web Filter action on Home.
 *
 * Core Features:
 * 1. Centered Dialog: Perfectly centered on screen with unified width (maxWidth: 375) and 24dp rounded corners.
 * 2. Safe Browsing Toggle: Option 1 mapped directly to local DNS VPN functionality (websiteEnabled, startVpn, stopVpn).
 * 3. Blocked & Allowed Accordion: Option 2 expands directly below with identical segmented layout and smooth scrolling.
 * 4. Resilient Layout: Numeric window bounds and scrollable body prevent any clipping, circular Yoga clamps, or keyboard overlap.
 */
export function WebFilterModal({ visible, onClose }: WebFilterModalProps) {
  const { snapshot: data, palette: p, command, run } = useOffline();
  const { height: windowHeight } = useWindowDimensions();

  // Accordion state: whether the Blocked & Allowed section is expanded
  const [isRulesExpanded, setIsRulesExpanded] = useState(false);

  // Tab inside rules: "blocked" vs "allowed"
  const [tab, setTab] = useState<"blocked" | "allowed">("blocked");
  const [search, setSearch] = useState("");

  // Add domain modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!data) return null;

  const isCooldownActive = data.burstRemainingMs > 0 || data.strictRemainingMs > 0;
  const isWebsiteActive = data.settings.websiteEnabled;
  const dnsMode = data.settings.dnsMode || "vpn";

  // Default demonstration domains if empty
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

  // Toggle Safe Browsing (Local DNS VPN)
  const handleToggleSafeBrowsing = async (value: boolean) => {
    if (!value && isCooldownActive) {
      Alert.alert(
        "Settings Locked",
        "Safe Browsing cannot be disabled while Strict Mode or Burst cooldown is active."
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

  // Toggle individual domain rule
  const handleToggleRule = async (rule: DomainRule) => {
    if (!rule.allow && rule.enabled && isCooldownActive) {
      Alert.alert(
        "Settings Locked",
        "Block rules cannot be disabled while an active Strict Mode lock or Burst cooldown is running."
      );
      return;
    }
    await command("domain", {
      domain: rule.host,
      allow: rule.allow,
      enabled: !rule.enabled,
    });
  };

  // Delete individual domain rule
  const handleDeleteRule = async (rule: DomainRule) => {
    if (!rule.allow && isCooldownActive) {
      Alert.alert(
        "Settings Locked",
        "Block rules cannot be removed while an active Strict Mode lock or Burst cooldown is running."
      );
      return;
    }
    await command("domain", {
      domain: rule.host,
      remove: true,
    });
  };

  // Add new domain rule
  const handleAddDomain = async () => {
    setErrorMessage(null);
    const host = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "");
    if (!host || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) {
      setErrorMessage("Please enter a valid domain (e.g. example.com).");
      return;
    }

    if (isAllowedTab && isCooldownActive) {
      Alert.alert(
        "Strict Mode Active",
        "Adding allowlist exceptions is locked until the configured cooldown ends."
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.backdrop}>
        {/* Outside tap dismiss */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.keyboardCenter}
        >
          <View
            style={[
              s.dialogCard,
              {
                backgroundColor: p.surfacePrimary,
                borderColor: p.borderSubtle,
                maxHeight: Math.round(windowHeight * 0.82),
              },
            ]}
          >
            {/* Pinned Header */}
            <View style={[s.headerRow, { borderBottomColor: p.borderSubtle }]}>
              <View style={s.headerTitleWrap}>
                <View style={[s.headerIconBox, { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle }]}>
                  <Icon name="web" size={20} color={p.brandPrimary} />
                </View>
                <View>
                  <Text style={[s.headerTitle, { color: p.textPrimary }]}>Web Filter</Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close web filter dialog"
                onPress={onClose}
                style={[s.closeButton, { backgroundColor: p.surfaceMuted }]}
              >
                <Icon name="close" size={17} color={p.textSecondary} />
              </Pressable>
            </View>

            {/* Scrollable Body */}
            <ScrollView
              style={s.dialogScroll}
              contentContainerStyle={s.dialogScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={isRulesExpanded}
              nestedScrollEnabled
              bounces={false}
            >
              {/* OPTION 1: Safe Browsing Toggle (Mapped to Local DNS) */}
              <View
                style={[
                  s.optionCard,
                  {
                    backgroundColor: p.surfaceMuted,
                    borderColor: isWebsiteActive ? p.brandPrimary : p.borderSubtle,
                  },
                ]}
              >
                <View
                  style={[
                    s.optionIconBox,
                    {
                      backgroundColor: isWebsiteActive
                        ? "rgba(37, 99, 235, 0.14)"
                        : p.surfacePrimary,
                    },
                  ]}
                >
                  <Icon
                    name="shield-check"
                    size={22}
                    color={isWebsiteActive ? p.brandPrimary : p.textMuted}
                  />
                </View>

                <View style={s.optionCopy}>
                  <Text style={[s.optionTitle, { color: p.textPrimary }]}>
                    Safe Browsing
                  </Text>
                  <Text style={[s.optionSubtitle, { color: p.textSecondary }]}>
                    Filter explicit and adult domains via local DNS
                  </Text>
                </View>

                <Switch
                  accessibilityLabel="Toggle Safe Browsing"
                  value={isWebsiteActive}
                  onValueChange={handleToggleSafeBrowsing}
                  trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* OPTION 2: Blocked & Allowed Button (Expands below) */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Toggle blocked and allowed websites section"
                onPress={() => setIsRulesExpanded((prev) => !prev)}
                style={({ pressed }) => [
                  s.optionCard,
                  {
                    backgroundColor: p.surfaceMuted,
                    borderColor: isRulesExpanded ? p.brandPrimary : p.borderSubtle,
                  },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <View style={[s.optionIconBox, { backgroundColor: p.surfacePrimary }]}>
                  <Icon name="format-list-bulleted" size={20} color={p.brandPrimary} />
                </View>

                <View style={s.optionCopy}>
                  <Text style={[s.optionTitle, { color: p.textPrimary }]}>
                    Blocked and allowed
                  </Text>
                  <Text style={[s.optionSubtitle, { color: p.textSecondary }]}>
                    {domains.length} custom domain rules configured
                  </Text>
                </View>

                <View style={[s.expandBadge, { backgroundColor: p.surfacePrimary }]}>
                  <Icon
                    name={isRulesExpanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={p.textPrimary}
                  />
                </View>
              </Pressable>

              {/* EXPANDED SECTION: Blocked & Allowed Manager */}
              {isRulesExpanded && (
                <View style={[s.rulesContainer, { borderTopColor: p.borderSubtle }]}>
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
                          backgroundColor: p.surfaceMuted,
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

                  {/* Section Title & Subheader */}
                  <View style={s.sectionHeaderRow}>
                    <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
                      Manual rules
                    </Text>
                    <Text style={[s.sectionKicker, { color: p.textSecondary }]}>
                      {enabledCount} ENABLED
                    </Text>
                  </View>

                  {/* Rules Container Card */}
                  <View
                    style={[
                      s.rulesCard,
                      { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
                    ]}
                  >
                    {filteredDomains.length === 0 ? (
                      <View style={s.emptyWrap}>
                        <Text style={[s.emptyText, { color: p.textSecondary }]}>
                          No {tab} domains found.
                        </Text>
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

                            {/* Toggle rule */}
                            <Switch
                              accessibilityLabel={`Toggle rule for ${rule.host}`}
                              value={rule.enabled}
                              onValueChange={() => void handleToggleRule(rule)}
                              trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
                              thumbColor="#FFFFFF"
                              style={s.rowSwitch}
                            />

                            {/* Delete rule */}
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Delete rule for ${rule.host}`}
                              onPress={() => void handleDeleteRule(rule)}
                              style={({ pressed }) => [
                                s.deleteButton,
                                pressed && { opacity: 0.6 },
                              ]}
                            >
                              <Icon name="delete-outline" size={18} color={p.textSecondary} />
                            </Pressable>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Pinned Footer */}
            <View style={[s.footerRow, { borderTopColor: p.borderSubtle }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                onPress={onClose}
                style={[s.doneBtn, { backgroundColor: p.brandPrimary }]}
              >
                <Text style={[s.doneBtnText, { color: p.backgroundPrimary }]}>
                  Done
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Nested Add Domain Dialog */}
      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddModalOpen(false)}
        statusBarTranslucent
      >
        <View style={s.addModalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsAddModalOpen(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={s.keyboardCenter}
          >
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
                <Text style={[s.errorMessage, { color: p.danger }]}>
                  {errorMessage}
                </Text>
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
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 14, 26, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  keyboardCenter: {
    width: "100%",
    maxWidth: 375,
    alignItems: "center",
    justifyContent: "center",
  },
  dialogCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1.2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  dialogScroll: {
    flexShrink: 1,
  },
  dialogScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  optionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  optionSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
    lineHeight: 14,
  },
  expandBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  rulesContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 10,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 9,
  },
  segmentText: {
    fontSize: 11.5,
    letterSpacing: 0.3,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  addIconButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionKicker: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  rulesCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  emptyWrap: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 11.5,
  },
  domainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  domainIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  domainCopy: {
    flex: 1,
    minWidth: 0,
  },
  domainHost: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  domainSubtitle: {
    fontSize: 9,
    marginTop: 1,
  },
  rowSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  deleteButton: {
    padding: 5,
  },
  addModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 14, 26, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  addModalCard: {
    width: "100%",
    maxWidth: 375,
    borderRadius: 24,
    borderWidth: 1.2,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 24,
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
  footerRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneBtn: {
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
