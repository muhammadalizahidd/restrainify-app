import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Switch,
  Modal,
  Alert,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import type { DomainRule } from "../../../native/OfflineProtection";

export interface DomainManagerScreenProps {
  open: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * DomainManagerScreen implements SET-WEB-02: Blocked & Allowed Domains
 * from the Restrainify UI Architecture specification.
 *
 * Allows users to manage custom domain entries (add, toggle, remove)
 * separated into Blocked and Allowed categories.
 *
 * Backend mapping:
 * - Domain list: `snapshot.settings.domains` (OfflineRuntime.kt:38, 91)
 * - Add/update domain: `command("domain", { domain, allow, enabled })` (OfflineRuntime.kt:88-99)
 * - Delete domain: `command("domain", { domain, remove: true })`
 * - Invariant: `assertCanWeaken()` prevents weakening or removing block rules while Strict Mode or Burst is active.
 */
export function DomainManagerScreen({ onBack }: DomainManagerScreenProps) {
  const { snapshot: data, palette: p, command } = useOffline();
  const [tab, setTab] = useState<"blocked" | "allowed">("blocked");
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!data) return null;

  const isCooldownActive =
    data.burstRemainingMs > 0 || data.strictRemainingMs > 0;
  const isAllowedTab = tab === "allowed";

  // Default demonstration domains if none added yet
  const defaultDomains: DomainRule[] = [
    { host: "example-trigger.com", allow: false, enabled: true },
    { host: "another-site.example", allow: false, enabled: true },
    { host: "old-rule.example", allow: false, enabled: false },
    { host: "work-portal.example", allow: true, enabled: true },
  ];

  const domains =
    data.settings.domains.length > 0 ? data.settings.domains : defaultDomains;

  const filteredDomains = domains.filter((d) => {
    const matchesTab = isAllowedTab ? d.allow : !d.allow;
    const matchesSearch = d.host.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const enabledCount = filteredDomains.filter((d) => d.enabled).length;

  const handleToggleRule = async (rule: DomainRule) => {
    setErrorMessage(null);
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

  const handleDeleteRule = async (rule: DomainRule) => {
    setErrorMessage(null);
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
    <View style={styles.container}>
      {/* 1. Subscreen Header */}
      <View style={styles.headerRow}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[
              styles.backButton,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={styles.titleWrap}>
          <Text style={[styles.headerKicker, { color: p.textSecondary }]}>
            Manual domain rules
          </Text>
          <Text style={[styles.headerTitle, { color: p.textPrimary }]}>
            Blocked & allowed
          </Text>
        </View>
      </View>

      {/* 2. Segmented Control */}
      <View
        style={[
          styles.segmentedControl,
          { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
        ]}
      >
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "blocked" }}
          onPress={() => setTab("blocked")}
          style={[
            styles.segmentButton,
            tab === "blocked" && {
              backgroundColor: p.surfacePrimary,
              elevation: 1,
            },
          ]}
        >
          <Text
            style={[
              styles.segmentText,
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
            styles.segmentButton,
            tab === "allowed" && {
              backgroundColor: p.surfacePrimary,
              elevation: 1,
            },
          ]}
        >
          <Text
            style={[
              styles.segmentText,
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

      {/* 3. Search & Add Row */}
      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Search your domains"
          placeholder="Search your domains"
          placeholderTextColor={p.textMuted}
          value={search}
          onChangeText={setSearch}
          style={[
            styles.searchInput,
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
          onPress={() => setIsAddModalOpen(true)}
          style={[
            styles.addIconButton,
            { backgroundColor: p.brandPrimary },
          ]}
        >
          <Icon name="plus" size={20} color={p.backgroundPrimary} />
        </Pressable>
      </View>

      {/* 4. Section Title & List */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
          Manual rules
        </Text>
        <Text style={[styles.sectionKicker, { color: p.textSecondary }]}>
          {enabledCount} ENABLED
        </Text>
      </View>

      <View
        style={[
          styles.rulesCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {filteredDomains.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: p.textSecondary }]}>
              No {tab} domains found.
            </Text>
          </View>
        ) : (
          filteredDomains.map((rule, idx) => (
            <View
              key={rule.host}
              style={[
                styles.ruleRow,
                idx < filteredDomains.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: p.borderSubtle,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: p.backgroundPrimary,
                    borderColor: p.borderSubtle,
                  },
                ]}
              >
                <Icon
                  name={rule.allow ? "check-circle-outline" : "web"}
                  size={20}
                  color={rule.allow ? p.success : p.brandPrimary}
                />
              </View>

              <View style={styles.ruleInfo}>
                <Text style={[styles.ruleHost, { color: p.textPrimary }]}>
                  {rule.host}
                </Text>
                <Text style={[styles.ruleDetail, { color: p.textSecondary }]}>
                  {rule.enabled
                    ? rule.allow
                      ? "Personal allow"
                      : "Personal block"
                    : "Disabled personal rule"}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete rule for ${rule.host}`}
                onPress={() => void handleDeleteRule(rule)}
                style={styles.deleteButton}
              >
                <Icon name="trash-can-outline" size={18} color={p.danger} />
              </Pressable>

              <Switch
                accessibilityLabel={`Toggle rule for ${rule.host}`}
                value={rule.enabled}
                onValueChange={() => void handleToggleRule(rule)}
                trackColor={{ true: p.success, false: p.borderSubtle }}
              />
            </View>
          ))
        )}
      </View>

      {/* 5. Add Website Action Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${tab} website`}
        onPress={() => setIsAddModalOpen(true)}
        style={[styles.accentButton, { backgroundColor: p.brandPrimary }]}
      >
        <Text style={[styles.accentButtonText, { color: p.backgroundPrimary }]}>
          + Add {tab === "blocked" ? "blocked" : "allowed"} website
        </Text>
      </Pressable>

      {/* 6. Helper Note */}
      <Text style={[styles.helperText, { color: p.textSecondary }]}>
        User-managed entries can be added, removed, enabled and disabled.
        Maintained Restrainify protection definitions are managed separately.
      </Text>

      {/* Add Modal */}
      <Modal
        visible={isAddModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <Text style={[styles.modalTitle, { color: p.textPrimary }]}>
              Add {isAllowedTab ? "Allowed" : "Blocked"} Domain
            </Text>

            <TextInput
              accessibilityLabel="Domain name"
              placeholder="e.g. example.com"
              placeholderTextColor={p.textMuted}
              value={newDomain}
              onChangeText={setNewDomain}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.modalInput,
                {
                  backgroundColor: p.backgroundPrimary,
                  borderColor: p.borderSubtle,
                  color: p.textPrimary,
                },
              ]}
            />

            {errorMessage && (
              <Text style={[styles.modalError, { color: p.danger }]}>
                {errorMessage}
              </Text>
            )}

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setErrorMessage(null);
                  setIsAddModalOpen(false);
                }}
                style={[
                  styles.modalActionButton,
                  { backgroundColor: p.surfaceMuted },
                ]}
              >
                <Text style={{ color: p.textPrimary, fontWeight: "600" }}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => void handleAddDomain()}
                style={[
                  styles.modalActionButton,
                  { backgroundColor: p.brandPrimary },
                ]}
              >
                <Text
                  style={{ color: p.backgroundPrimary, fontWeight: "700" }}
                >
                  Save rule
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 24,
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
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  headerKicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: 13,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  addIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  rulesCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  emptyWrap: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 64,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ruleInfo: {
    flex: 1,
    gap: 2,
  },
  ruleHost: {
    fontSize: 15,
    fontWeight: "600",
  },
  ruleDetail: {
    fontSize: 12,
    lineHeight: 16,
  },
  deleteButton: {
    padding: 8,
  },
  accentButton: {
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  accentButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  modalInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  modalError: {
    fontSize: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalActionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
