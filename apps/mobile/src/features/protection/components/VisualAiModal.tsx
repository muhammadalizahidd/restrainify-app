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
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";

export interface VisualAiModalProps {
  visible: boolean;
  onClose: () => void;
}

export interface VisualContextApp {
  id: string;
  name: string;
  packageName: string;
  icon: IconName;
  supported: boolean;
  enabled: boolean;
}

const DEFAULT_SUPPORTED_APPS: VisualContextApp[] = [
  {
    id: "ig",
    name: "Instagram",
    packageName: "com.instagram.android",
    icon: "instagram",
    supported: true,
    enabled: true,
  },
  {
    id: "yt",
    name: "YouTube",
    packageName: "com.google.android.youtube",
    icon: "youtube",
    supported: true,
    enabled: true,
  },
  {
    id: "fb",
    name: "Facebook",
    packageName: "com.facebook.katana",
    icon: "facebook",
    supported: true,
    enabled: true,
  },
  {
    id: "sc",
    name: "Snapchat",
    packageName: "com.snapchat.android",
    icon: "cellphone-lock",
    supported: true,
    enabled: true,
  },
  {
    id: "chrome",
    name: "Chrome",
    packageName: "com.android.chrome",
    icon: "web",
    supported: true,
    enabled: true,
  },
  {
    id: "unsupported",
    name: "Example unsupported app",
    packageName: "com.example.unsupported",
    icon: "cellphone-remove",
    supported: false,
    enabled: false,
  },
];

/**
 * VisualAiModal renders a centered, beautifully proportioned dialog for the Visual AI action on Home.
 *
 * Matching the exact visual specifications of WebFilterModal:
 * - Centered dialog (maxWidth: 375, borderRadius: 24, borderWidth: 1.2, elevation: 24)
 * - Pinned header with icon, title, subtitle, and close button
 * - Scrollable body with Protected Apps search, list of supported apps with switches, and privacy note
 */
export function VisualAiModal({ visible, onClose }: VisualAiModalProps) {
  const { palette: p } = useOffline();
  const { height: windowHeight } = useWindowDimensions();

  const [search, setSearch] = useState("");
  const [apps, setApps] = useState<VisualContextApp[]>(DEFAULT_SUPPORTED_APPS);

  const toggleApp = (id: string) => {
    setApps((prev) =>
      prev.map((app) => (app.id === id ? { ...app, enabled: !app.enabled } : app))
    );
  };

  const filteredApps = apps.filter(
    (app) =>
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.packageName.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCount = apps.filter((a) => a.supported && a.enabled).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
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
                maxHeight: Math.round(windowHeight * 0.82),
              },
            ]}
          >
            {/* Pinned Header */}
            <View style={[s.headerRow, { borderBottomColor: p.borderSubtle }]}>
              <View style={s.headerTitleWrap}>
                <View
                  style={[
                    s.headerIconBox,
                    { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
                  ]}
                >
                  <Icon name="eye-outline" size={20} color={p.brandPrimary} />
                </View>
                <View>
                  <Text style={[s.headerTitle, { color: p.textPrimary }]}>Visual filter</Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close visual filter dialog"
                onPress={onClose}
                style={[s.closeButton, { backgroundColor: p.surfaceMuted }]}
              >
                <Icon name="close" size={17} color={p.textSecondary} />
              </Pressable>
            </View>

            {/* Scrollable Body Container */}
            <ScrollView
              style={s.dialogScroll}
              contentContainerStyle={s.dialogScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
              bounces={false}
            >
              {/* Search Input */}
              <View style={s.searchRow}>
                <TextInput
                  accessibilityLabel="Search installed apps"
                  placeholder="Search installed apps"
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
                {search.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                    onPress={() => setSearch("")}
                    style={[s.clearButton, { backgroundColor: p.surfaceMuted }]}
                  >
                    <Icon name="close" size={14} color={p.textSecondary} />
                  </Pressable>
                )}
              </View>

              {/* Section Header Row */}
              <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
                  Supported apps
                </Text>
                <Text style={[s.sectionKicker, { color: p.textSecondary }]}>
                  {selectedCount} SELECTED
                </Text>
              </View>

              {/* Apps List Card */}
              <View
                style={[
                  s.appsCard,
                  { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
                ]}
              >
                {filteredApps.length === 0 ? (
                  <View style={s.emptyWrap}>
                    <Text style={[s.emptyText, { color: p.textSecondary }]}>
                      No matching apps found.
                    </Text>
                  </View>
                ) : (
                  filteredApps.map((app, index) => {
                    const isLast = index === filteredApps.length - 1;
                    return (
                      <View
                        key={app.id}
                        style={[
                          s.appRow,
                          !isLast && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: p.borderSubtle,
                          },
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
                          <Icon
                            name={app.icon}
                            size={19}
                            color={app.supported ? p.brandPrimary : p.textMuted}
                          />
                        </View>

                        <View style={s.appCopy}>
                          <Text style={[s.appName, { color: p.textPrimary }]}>
                            {app.name}
                          </Text>
                          <Text style={[s.appSubtitle, { color: p.textSecondary }]}>
                            {app.supported
                              ? "Supported visual context"
                              : "Visual protection is not supported here"}
                          </Text>
                        </View>

                        {app.supported ? (
                          <Switch
                            accessibilityLabel={`Toggle visual protection for ${app.name}`}
                            value={app.enabled}
                            onValueChange={() => toggleApp(app.id)}
                            trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
                            thumbColor="#FFFFFF"
                            style={s.rowSwitch}
                          />
                        ) : (
                          <View
                            style={[s.badgePill, { backgroundColor: p.surfacePrimary }]}
                          >
                            <Text style={[s.badgeText, { color: p.textMuted }]}>
                              Not supported
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>

              {/* Privacy Footer Guarantee */}
              <View
                style={[
                  s.privacyCard,
                  { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
                ]}
              >
                <View style={s.privacyHeader}>
                  <Icon name="shield-check" size={16} color={p.brandPrimary} />
                  <Text style={[s.privacyTitle, { color: p.textPrimary }]}>
                    On-Device Guarantee
                  </Text>
                </View>
                <Text style={[s.privacyText, { color: p.textSecondary }]}>
                  Visual Protection runs only in the foreground while selected supported
                  apps are actively displayed. Temporary screen buffers are evaluated
                  locally and instantly discarded.
                </Text>
              </View>
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    paddingRight: 36,
    fontSize: 12.5,
  },
  clearButton: {
    position: "absolute",
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
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
  appsCard: {
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
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  appIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  appCopy: {
    flex: 1,
    minWidth: 0,
  },
  appName: {
    fontSize: 13,
    fontWeight: "600",
  },
  appSubtitle: {
    fontSize: 9.5,
    marginTop: 1,
  },
  rowSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  badgePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  privacyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
    marginTop: 2,
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  privacyTitle: {
    fontSize: 11,
    fontWeight: "700",
  },
  privacyText: {
    fontSize: 10,
    lineHeight: 14,
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
