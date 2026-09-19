import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  FlatList,
  Alert,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, duration, type IconName } from "../../../components/OfflineUI";
import {
  offlineProtection,
  type InstalledApp,
  type AppRule,
} from "../../../native/OfflineProtection";
import { AppLimitContent } from "./AppLimitModal";

export interface AppControlsModalProps {
  visible: boolean;
  onClose: () => void;
  open?: (route: string, params?: Record<string, unknown>) => void;
}

interface ControlledAppRow {
  packageName: string;
  label: string;
  icon: IconName;
  usedMs: number;
  limitMinutes: number;
  isScheduleRestricted: boolean;
  scheduleText?: string;
  rule?: AppRule;
}

/**
 * AppControlsModal renders a centered, beautifully proportioned dialog for App Controls
 * directly from the Home screen action button.
 */
export function AppControlsModal({ visible, onClose, open }: AppControlsModalProps) {
  const { snapshot: data, palette: p, command } = useOffline();
  const { height: windowHeight } = useWindowDimensions();

  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppForLimit, setSelectedAppForLimit] = useState<{
    packageName: string;
    label: string;
  } | null>(null);

  // Reset internal navigation when modal dismisses
  useEffect(() => {
    if (!visible) {
      setSelectedAppForLimit(null);
      setIsPickerVisible(false);
      setSearchQuery("");
    }
  }, [visible]);

  // Fetch installed applications for picker
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const apps = await offlineProtection.apps();
        if (active) setInstalledApps(apps);
      } catch {
        // Fallback for dev client / preview
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!data) return null;

  const usageGranted = data.capabilities.usage;
  const accessibilityGranted = Boolean(
    data.capabilities.accessibility && data.settings.accessibilityConsent
  );
  const rules = data.settings.rules;
  const usageApps = data.usage.apps;

  const isCooldownActive = Boolean(
    data && (data.burstRemainingMs > 0 || data.strictRemainingMs > 0)
  );

  const appRows: ControlledAppRow[] = rules.map((rule) => {
    const usage = usageApps.find((u) => u.packageName === rule.packageName);
    const installed = installedApps.find((i) => i.packageName === rule.packageName);
    const label =
      installed?.label ?? usage?.label ?? rule.packageName.split(".").pop() ?? "App";
    const usedMs = usage?.ms ?? 0;
    const hasSchedule = rule.startMinute >= 0 && rule.endMinute >= 0;
    const startH = Math.floor(rule.startMinute / 60);
    const startM = rule.startMinute % 60;
    const endH = Math.floor(rule.endMinute / 60);
    const endM = rule.endMinute % 60;
    const scheduleText = hasSchedule
      ? `Blocked ${startH.toString().padStart(2, "0")}:${startM.toString().padStart(2, "0")}–${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`
      : undefined;

    let icon: IconName = "cellphone-lock";
    if (rule.packageName.includes("instagram")) icon = "instagram";
    else if (rule.packageName.includes("youtube")) icon = "youtube";
    else if (rule.packageName.includes("reddit")) icon = "reddit";
    else if (
      rule.packageName.includes("tiktok") ||
      rule.packageName.includes("musically")
    )
      icon = "video-outline";

    return {
      packageName: rule.packageName,
      label,
      icon,
      usedMs,
      limitMinutes: rule.limitMinutes,
      isScheduleRestricted: hasSchedule,
      scheduleText,
      rule,
    };
  });

  const handleDeleteApp = (app: ControlledAppRow) => {
    if (isCooldownActive) {
      Alert.alert(
        "Strict Mode Active",
        "Removing limits is locked until the configured cooldown ends."
      );
      return;
    }

    Alert.alert(
      "Delete App Limit",
      `Are you sure you want to remove all limits and schedules for ${app.label}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await command("rule", {
                packageName: app.packageName,
                remove: true,
              });
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Failed to remove limit";
              Alert.alert("Rule Error", msg);
            }
          },
        },
      ]
    );
  };

  const handleSelectApp = (app: ControlledAppRow) => {
    setSelectedAppForLimit({ packageName: app.packageName, label: app.label });
  };

  const handleAddApp = async (app: InstalledApp) => {
    setIsPickerVisible(false);
    if (!accessibilityGranted) {
      Alert.alert(
        "Accessibility Service Required",
        `To enforce limits and block ${app.label} when time runs out, Restrainify requires Android Accessibility Service to be enabled.`,
        [
          { text: "Later", style: "cancel" },
          {
            text: "Set Up Now",
            onPress: async () => {
              try {
                await command("setting", { key: "accessibilityConsent", value: true });
              } catch {}
              if (open) {
                onClose();
                open("permission-disclosure", {
                  permissionType: "accessibility",
                  returnRoute: "home",
                  returnModal: "app-controls",
                });
              } else {
                void offlineProtection.settings("accessibility");
              }
            },
          },
        ]
      );
    }
    try {
      await command("rule", {
        packageName: app.packageName,
        enabled: true,
        limitMinutes: 30,
        startMinute: -1,
        endMinute: -1,
        burst: true,
        feedMode: "off",
      });
    } catch {
      // Offline fallback
    }
    setSelectedAppForLimit({ packageName: app.packageName, label: app.label });
  };

  const filteredInstalledApps = installedApps.filter(
    (app) =>
      app.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.packageName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        {/* Dismiss on backdrop tap */}
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
                maxHeight: Math.round(windowHeight * 0.84),
              },
            ]}
          >
            {selectedAppForLimit ? (
              <AppLimitContent
                packageName={selectedAppForLimit.packageName}
                label={selectedAppForLimit.label}
                onBack={() => setSelectedAppForLimit(null)}
                onClose={onClose}
                open={open}
              />
            ) : (
              <>
                {/* 1. Pinned Header */}
                <View style={[s.headerRow, { borderBottomColor: p.borderSubtle }]}>
                  <View style={s.headerTitleWrap}>
                <View
                  style={[
                    s.headerIconBox,
                    { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
                  ]}
                >
                  <Icon name="cellphone-cog" size={20} color={p.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.headerTitle, { color: p.textPrimary }]}>
                    App controls
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close app controls dialog"
                onPress={onClose}
                style={[s.closeButton, { backgroundColor: p.surfaceMuted }]}
              >
                <Icon name="close" size={17} color={p.textSecondary} />
              </Pressable>
            </View>

            {/* 2. Scrollable Body Content */}
            <ScrollView
              style={s.dialogScroll}
              contentContainerStyle={s.dialogScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
              bounces={false}
            >
              {/* Section Title: Controlled apps */}
              <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
                  Controlled apps
                </Text>
                {appRows.length > 0 && (
                  <Text style={[s.sectionKicker, { color: p.textSecondary }]}>
                    {appRows.length} CONFIGURED
                  </Text>
                )}
              </View>

              {/* Controlled Apps List Card */}
              <View
                style={[
                  s.appListCard,
                  { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
                ]}
              >
                {appRows.length === 0 ? (
                  <View style={s.emptyWrap}>
                    <View
                      style={[
                        s.emptyIconBox,
                        { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
                      ]}
                    >
                      <Icon name="cellphone-check" size={20} color={p.brandPrimary} />
                    </View>
                    <Text style={[s.emptyTitle, { color: p.textPrimary }]}>
                      No controlled apps yet
                    </Text>
                    <Text style={[s.emptySubtitle, { color: p.textSecondary }]}>
                      Tap "+ Add an app to control" below to set daily allowances and restriction schedules.
                    </Text>
                  </View>
                ) : (
                  appRows.map((app, idx) => (
                    <Pressable
                      key={app.packageName}
                      accessibilityRole="button"
                      accessibilityLabel={`Manage ${app.label}`}
                      onPress={() => handleSelectApp(app)}
                      style={({ pressed }) => [
                        s.appItemRow,
                        idx < appRows.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: p.borderSubtle,
                        },
                        pressed && { backgroundColor: p.surfacePrimary },
                      ]}
                    >
                      <View
                        style={[
                          s.appIconBox,
                          {
                            backgroundColor: p.surfacePrimary,
                            borderColor: p.borderSubtle,
                          },
                        ]}
                      >
                        <Icon name={app.icon} size={19} color={p.brandPrimary} />
                      </View>

                      <View style={s.appInfoWrap}>
                        <Text style={[s.appLabel, { color: p.textPrimary }]}>
                          {app.label}
                        </Text>
                        <Text style={[s.appDetail, { color: p.textSecondary }]}>
                          {app.isScheduleRestricted
                            ? "Restricted by schedule"
                            : `${duration(app.usedMs)} used today`}
                        </Text>
                      </View>

                      <View style={s.metricWrap}>
                        <Text
                          style={[
                            s.metricValue,
                            {
                              color:
                                app.limitMinutes > 0 &&
                                app.usedMs >= app.limitMinutes * 60000
                                  ? p.danger
                                  : p.textPrimary,
                            },
                          ]}
                        >
                          {app.scheduleText
                            ? app.scheduleText
                            : app.limitMinutes > 0
                            ? `${duration(app.usedMs)} / ${app.limitMinutes}m`
                            : duration(app.usedMs)}
                        </Text>
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Delete limit for ${app.label}`}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleDeleteApp(app);
                        }}
                        style={({ pressed }) => [
                          s.rowDeleteBtn,
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        <Icon name="delete-outline" size={17} color={p.textMuted} />
                      </Pressable>

                      <Icon name="chevron-right" size={16} color={p.textMuted} />
                    </Pressable>
                  ))
                )}
              </View>

              {/* Add New App Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose an app to control"
                onPress={() => setIsPickerVisible(true)}
                style={[
                  s.addAppBtn,
                  {
                    backgroundColor: p.surfacePrimary,
                    borderColor: p.borderSubtle,
                  },
                ]}
              >
                <Icon name="plus-circle-outline" size={18} color={p.brandPrimary} />
                <Text style={[s.addAppBtnText, { color: p.brandPrimary }]}>
                  + Add an app to control
                </Text>
              </Pressable>

              {/* Accessibility / App Restriction Health Card */}
              <View
                style={[
                  s.usageHealthCard,
                  {
                    backgroundColor: accessibilityGranted
                      ? p.surfaceMuted
                      : p.warningSurface,
                    borderColor: accessibilityGranted ? p.borderSubtle : p.warning,
                  },
                ]}
              >
                <View style={s.usageHealthHeader}>
                  <View
                    style={[
                      s.healthIconBox,
                      {
                        backgroundColor: accessibilityGranted
                          ? p.successSurface
                          : p.warningSurface,
                      },
                    ]}
                  >
                    <Icon
                      name={accessibilityGranted ? "shield-check" : "shield-alert"}
                      size={20}
                      color={accessibilityGranted ? p.success : p.warning}
                    />
                  </View>

                  <View style={s.healthTextWrap}>
                    <Text style={[s.healthTitle, { color: p.textPrimary }]}>
                      {accessibilityGranted
                        ? "App restriction active"
                        : "App restriction access required"}
                    </Text>
                    <Text style={[s.healthBody, { color: p.textSecondary }]}>
                      {accessibilityGranted
                        ? "Restrainify accessibility service is active to display intentional cooling overlays."
                        : "Grant Android Accessibility Service so Restrainify can display intentional cooling overlays when limits are reached."}
                    </Text>
                  </View>
                </View>

                {!accessibilityGranted && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Grant App Restriction Access"
                    onPress={async () => {
                      try {
                        await command("setting", { key: "accessibilityConsent", value: true });
                      } catch {}
                      if (open) {
                        onClose();
                        open("permission-disclosure", {
                          permissionType: "accessibility",
                          returnRoute: "home",
                          returnModal: "app-controls",
                        });
                      } else {
                        void offlineProtection.settings("accessibility");
                      }
                    }}
                    style={[s.repairButton, { backgroundColor: p.warning }]}
                  >
                    <Text style={s.repairButtonText}>Grant App Restriction Access</Text>
                  </Pressable>
                )}
              </View>

              {/* Usage Access Health Card */}
              <View
                style={[
                  s.usageHealthCard,
                  {
                    backgroundColor: usageGranted
                      ? p.surfaceMuted
                      : p.warningSurface,
                    borderColor: usageGranted ? p.borderSubtle : p.warning,
                  },
                ]}
              >
                <View style={s.usageHealthHeader}>
                  <View
                    style={[
                      s.healthIconBox,
                      {
                        backgroundColor: usageGranted
                          ? p.successSurface
                          : p.warningSurface,
                      },
                    ]}
                  >
                    <Icon
                      name={usageGranted ? "shield-check" : "shield-alert"}
                      size={20}
                      color={usageGranted ? p.success : p.warning}
                    />
                  </View>

                  <View style={s.healthTextWrap}>
                    <Text style={[s.healthTitle, { color: p.textPrimary }]}>
                      {usageGranted
                        ? "Usage tracking active"
                        : "Usage access required"}
                    </Text>
                    <Text style={[s.healthBody, { color: p.textSecondary }]}>
                      {usageGranted
                        ? "Restrainify accurately tracks screen time and enforces scheduled limits."
                        : "Grant Android usage stats access so Restrainify can accurately enforce your daily limits."}
                    </Text>
                  </View>
                </View>

                {!usageGranted && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Grant Android Usage Access"
                    onPress={() => void offlineProtection.settings("usage")}
                    style={[s.repairButton, { backgroundColor: p.warning }]}
                  >
                    <Text style={s.repairButtonText}>Grant Usage Access</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>

            {/* 3. Pinned Footer */}
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
          </>
        )}
      </View>
        </KeyboardAvoidingView>
      </View>

      {/* Embedded Sub-Modal for Selecting an App */}
      <Modal
        visible={isPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <View style={s.pickerBackdrop}>
          <View
            style={[
              s.pickerCard,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <View style={s.pickerHeader}>
              <Text style={[s.pickerTitle, { color: p.textPrimary }]}>
                Select an Application
              </Text>
              <Pressable
                accessibilityLabel="Close app picker"
                onPress={() => setIsPickerVisible(false)}
                style={s.pickerCloseBtn}
              >
                <Icon name="close" size={20} color={p.textPrimary} />
              </Pressable>
            </View>

            <TextInput
              accessibilityLabel="Search installed apps"
              placeholder="Search apps..."
              placeholderTextColor={p.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[
                s.searchInput,
                {
                  backgroundColor: p.surfaceMuted,
                  borderColor: p.borderSubtle,
                  color: p.textPrimary,
                },
              ]}
            />

            <FlatList
              data={filteredInstalledApps}
              keyExtractor={(item) => item.packageName}
              contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
              showsVerticalScrollIndicator={true}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void handleAddApp(item)}
                  style={({ pressed }) => [
                    s.pickerItemRow,
                    {
                      backgroundColor: p.surfaceMuted,
                      borderColor: p.borderSubtle,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <View
                    style={[
                      s.pickerIconBox,
                      { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
                    ]}
                  >
                    <Icon name="cellphone" size={18} color={p.brandPrimary} />
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={[s.pickerLabel, { color: p.textPrimary }]}>
                      {item.label}
                    </Text>
                    <Text
                      style={[s.pickerPackage, { color: p.textSecondary }]}
                      numberOfLines={1}
                    >
                      {item.packageName}
                    </Text>
                  </View>
                  <Icon name="plus" size={18} color={p.brandPrimary} />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  keyboardCenter: {
    width: "100%",
    maxWidth: 375,
    justifyContent: "center",
    alignItems: "center",
  },
  dialogCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1.2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 10.5,
    fontWeight: "500",
    marginTop: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  dialogScroll: {
    width: "100%",
  },
  dialogScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  sectionHeaderRow: {
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
  sectionKicker: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  appListCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  appItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 10,
  },
  appIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  appInfoWrap: {
    flex: 1,
    gap: 2,
  },
  appLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  appDetail: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  metricWrap: {
    alignItems: "flex-end",
  },
  metricValue: {
    fontSize: 11,
    fontWeight: "600",
  },
  rowDeleteBtn: {
    padding: 6,
    borderRadius: 8,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: "center",
  },
  addAppBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  addAppBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  usageHealthCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  usageHealthHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  healthIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  healthTextWrap: {
    flex: 1,
    gap: 2,
  },
  healthTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  healthBody: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  repairButton: {
    borderRadius: 10,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  repairButtonText: {
    color: "#fff",
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
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  pickerCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 18,
    maxHeight: "75%",
    gap: 12,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  pickerCloseBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  pickerItemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  pickerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  pickerPackage: {
    fontSize: 10.5,
  },
});
