import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";

export interface ScopedOverridesScreenProps {
  open: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

interface OverrideItem {
  id: string;
  icon: IconName;
  title: string;
  scopeDetail: string;
  badge: string;
}

/**
 * ScopedOverridesScreen implements SET-WEB-03: Scoped Overrides
 * from the Restrainify UI Architecture specification.
 *
 * Governs targeted, time-limited exceptions (domains, app limits, schedules)
 * with explicit Strict Mode cooldown enforcement.
 *
 * Backend mapping:
 * - Reads `snapshot.strictRemainingMs` to determine lock state
 * - If Strict Mode is active, weakening overrides route to `STATE-STRICT-02` (Pending Change Cooldown)
 */
export function ScopedOverridesScreen({
  open,
  onBack,
}: ScopedOverridesScreenProps) {
  const { snapshot: data, palette: p } = useOffline();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetName, setTargetName] = useState("");
  const [windowDesc, setWindowDesc] = useState("");
  const [overrides, setOverrides] = useState<OverrideItem[]>([
    {
      id: "ov-1",
      icon: "web",
      title: "youtube.com",
      scopeDetail: "Allowed daily from 6:00–7:00 PM",
      badge: "1h window",
    },
    {
      id: "ov-2",
      icon: "reddit",
      title: "Reddit",
      scopeDetail: "Daily app-limit exception on Sunday",
      badge: "Sunday",
    },
  ]);

  if (!data) return null;

  const isStrictActive = data.strictRemainingMs > 0;

  const handleAddOverride = () => {
    if (isStrictActive) {
      setIsAddModalOpen(false);
      open("pending-change", {
        reason: "Requesting a new weakening exception",
      });
      return;
    }

    if (!targetName.trim()) {
      Alert.alert("Validation", "Please enter a target app or domain.");
      return;
    }

    setOverrides((prev) => [
      ...prev,
      {
        id: `ov-${Date.now()}`,
        icon: targetName.includes(".") ? "web" : "cellphone-lock",
        title: targetName.trim(),
        scopeDetail: windowDesc.trim() || "Temporary custom window",
        badge: "Custom",
      },
    ]);

    setTargetName("");
    setWindowDesc("");
    setIsAddModalOpen(false);
  };

  return (
    <View style={styles.container}>
      {/* 1. Header */}
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
            Exceptions within policy
          </Text>
          <Text style={[styles.headerTitle, { color: p.textPrimary }]}>
            Scoped overrides
          </Text>
        </View>
      </View>

      {/* 2. Strict Mode Notice Banner */}
      <View
        style={[
          styles.noticeBanner,
          {
            backgroundColor: p.warningSurface,
            borderColor: p.warning,
          },
        ]}
      >
        <View style={styles.noticeHeader}>
          <Icon name="lock-outline" size={20} color={p.warning} />
          <Text style={[styles.noticeTitle, { color: p.warning }]}>
            Strict Mode applies
          </Text>
        </View>
        <Text style={[styles.noticeBody, { color: p.textSecondary }]}>
          New weakening overrides may require a cooldown before taking effect.
        </Text>
      </View>

      {/* 3. Active Exceptions Section */}
      <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
        Active exceptions
      </Text>

      <View
        style={[
          styles.overridesCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {overrides.map((item, idx) => (
          <View
            key={item.id}
            style={[
              styles.overrideRow,
              idx < overrides.length - 1 && {
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
              <Icon name={item.icon} size={20} color={p.brandPrimary} />
            </View>

            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: p.textPrimary }]}>
                {item.title}
              </Text>
              <Text style={[styles.itemDetail, { color: p.textSecondary }]}>
                {item.scopeDetail}
              </Text>
            </View>

            <View
              style={[
                styles.badgePill,
                { backgroundColor: p.surfaceMuted },
              ]}
            >
              <Text style={[styles.badgeText, { color: p.textPrimary }]}>
                {item.badge}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* 4. Add Override Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add override"
        onPress={() => setIsAddModalOpen(true)}
        style={[styles.accentButton, { backgroundColor: p.brandPrimary }]}
      >
        <Text style={[styles.accentButtonText, { color: p.backgroundPrimary }]}>
          + Add override
        </Text>
      </Pressable>

      {/* 5. How Overrides Work Section */}
      <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
        How overrides work
      </Text>
      <View
        style={[
          styles.explainerCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <Text style={[styles.explainerText, { color: p.textSecondary }]}>
          An override is scoped to a domain, app, feature or schedule. Strict
          Mode can delay or restrict weakening actions rather than silently
          applying them.
        </Text>
      </View>

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
              Create Scoped Override
            </Text>

            <TextInput
              accessibilityLabel="Target app or domain"
              placeholder="Target (e.g. youtube.com or Instagram)"
              placeholderTextColor={p.textMuted}
              value={targetName}
              onChangeText={setTargetName}
              style={[
                styles.modalInput,
                {
                  backgroundColor: p.backgroundPrimary,
                  borderColor: p.borderSubtle,
                  color: p.textPrimary,
                },
              ]}
            />

            <TextInput
              accessibilityLabel="Scope window description"
              placeholder="Scope (e.g. 1 hour daily window)"
              placeholderTextColor={p.textMuted}
              value={windowDesc}
              onChangeText={setWindowDesc}
              style={[
                styles.modalInput,
                {
                  backgroundColor: p.backgroundPrimary,
                  borderColor: p.borderSubtle,
                  color: p.textPrimary,
                },
              ]}
            />

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsAddModalOpen(false)}
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
                onPress={handleAddOverride}
                style={[
                  styles.modalActionButton,
                  { backgroundColor: p.brandPrimary },
                ]}
              >
                <Text
                  style={{ color: p.backgroundPrimary, fontWeight: "700" }}
                >
                  Save override
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
  noticeBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  noticeBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
    paddingHorizontal: 2,
  },
  overridesCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  overrideRow: {
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
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemDetail: {
    fontSize: 12,
    lineHeight: 16,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
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
  explainerCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  explainerText: {
    fontSize: 12,
    lineHeight: 18,
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
