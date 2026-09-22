import { useState, useEffect, useMemo } from "react";
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
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";
import { offlineProtection } from "../../../native/OfflineProtection";

export interface ShortFormModalProps {
  visible: boolean;
  onClose: () => void;
  open?: (route: string, params?: Record<string, unknown>) => void;
}

export interface GranularSubOption {
  id: string;
  label: string;
  icon: IconName;
  badge?: string;
  enabled: boolean;
}

export interface InAppBlockingApp {
  id: string;
  name: string;
  packageName: string;
  icon: IconName;
  brandType: "youtube" | "instagram" | "facebook" | "snapchat" | "tiktok" | "x";
  options: GranularSubOption[];
}

const INITIAL_APPS: InAppBlockingApp[] = [
  {
    id: "yt",
    name: "YouTube",
    packageName: "com.google.android.youtube",
    icon: "youtube",
    brandType: "youtube",
    options: [
      { id: "yt_shorts", label: "Block shorts", icon: "movie-open-play-outline", enabled: false },
      { id: "yt_home", label: "Block home feed", icon: "home-outline", enabled: false },
      { id: "yt_explore", label: "Block explore tab", icon: "magnify", enabled: false },
      { id: "yt_comments", label: "Block comments", icon: "comment-text-outline", enabled: false },
    ],
  },
  {
    id: "ig",
    name: "Instagram",
    packageName: "com.instagram.android",
    icon: "instagram",
    brandType: "instagram",
    options: [
      { id: "ig_stories", label: "Block stories", icon: "loading", enabled: false },
      { id: "ig_reels", label: "Block reels", icon: "movie-play-outline", badge: "Early Access", enabled: false },
      { id: "ig_explore", label: "Block explore tab", icon: "magnify", enabled: false },
    ],
  },
  {
    id: "fb",
    name: "Facebook",
    packageName: "com.facebook.katana",
    icon: "facebook",
    brandType: "facebook",
    options: [
      { id: "fb_reels", label: "Block reels", icon: "movie-play-outline", enabled: false },
      { id: "fb_stories", label: "Block stories", icon: "loading", enabled: false },
      { id: "fb_feed", label: "Block news feed", icon: "newspaper-variant-outline", enabled: false },
    ],
  },
  {
    id: "sc",
    name: "Snapchat",
    packageName: "com.snapchat.android",
    icon: "snapchat",
    brandType: "snapchat",
    options: [
      { id: "sc_spotlight", label: "Block spotlight", icon: "movie-play-outline", enabled: false },
      { id: "sc_stories", label: "Block discover / stories", icon: "loading", enabled: false },
    ],
  },
  {
    id: "tiktok",
    name: "TikTok",
    packageName: "com.zhiliaoapp.musically",
    icon: "video-outline",
    brandType: "tiktok",
    options: [
      { id: "tiktok_app", label: "Block whole app (fallback)", icon: "cellphone-lock", enabled: false },
    ],
  },
  {
    id: "x",
    name: "X",
    packageName: "com.twitter.android",
    icon: "alpha-x",
    brandType: "x",
    options: [
      { id: "x_explore", label: "Block explore / For You", icon: "magnify", enabled: false },
      { id: "x_video", label: "Block video feed", icon: "play-box-outline", enabled: false },
    ],
  },
];

/**
 * ShortFormModal renders the In-App Blocking pop-up dialog matching the shared modal theme system
 * (WebFilterModal, AppControlsModal, StrictModeModal) with StayFree-style in-app blocking UX.
 */
export function ShortFormModal({ visible, onClose }: ShortFormModalProps) {
  const { palette: p, snapshot: data, command } = useOffline();
  const { height: windowHeight } = useWindowDimensions();

  // Search filter query
  const [searchQuery, setSearchQuery] = useState("");

  // Accordion expansion state - Instagram ('ig') is expanded by default
  const [expandedApps, setExpandedApps] = useState<Record<string, boolean>>({
    ig: true,
  });

  // Granular in-app blocking state
  const [apps, setApps] = useState<InAppBlockingApp[]>(() => {
    if (!data?.settings?.rules) return INITIAL_APPS;
    return INITIAL_APPS.map((app) => {
      const match = data.settings.rules.find((r) => r.packageName === app.packageName);
      const isAppActive = match ? match.enabled && match.feedMode !== "off" : false;
      return {
        ...app,
        options: app.options.map((opt, idx) => ({
          ...opt,
          enabled: isAppActive ? (idx === 0 || opt.id.includes("reel") || opt.id.includes("short")) : false,
        })),
      };
    });
  });

  // Re-sync with snapshot rules when data changes
  useEffect(() => {
    if (!data?.settings?.rules) return;
    setApps((prevApps) =>
      prevApps.map((app) => {
        const match = data.settings.rules.find((r) => r.packageName === app.packageName);
        if (!match) return app;
        const isAppActive = match.enabled && match.feedMode !== "off";
        const anySubOptionActive = app.options.some((o) => o.enabled);
        if (!isAppActive && anySubOptionActive) {
          return {
            ...app,
            options: app.options.map((o) => ({ ...o, enabled: false })),
          };
        }
        return app;
      })
    );
  }, [data?.settings?.rules]);

  // Reset search when modal dismisses
  useEffect(() => {
    if (!visible) {
      setSearchQuery("");
    }
  }, [visible]);

  const isCooldownActive = Boolean(
    data && (data.burstRemainingMs > 0 || data.strictRemainingMs > 0)
  );

  const hasAccessibility = Boolean(data?.capabilities?.accessibility);

  const toggleAccordion = (appId: string) => {
    setExpandedApps((prev) => ({
      ...prev,
      [appId]: !prev[appId],
    }));
  };

  const handleGrantAccessibility = async () => {
    try {
      await offlineProtection.settings("accessibility");
    } catch {
      Alert.alert(
        "Accessibility Settings",
        "Please open your Android Settings > Accessibility > Restrainify to enable In-App Blocking detection."
      );
    }
  };

  const toggleSubOption = async (appId: string, optionId: string) => {
    if (isCooldownActive) {
      Alert.alert(
        "Settings Locked",
        "In-App blocking rules cannot be modified while Strict Mode or Burst cooldown is active."
      );
      return;
    }

    const app = apps.find((a) => a.id === appId);
    if (!app) return;

    const nextOptions = app.options.map((opt) =>
      opt.id === optionId ? { ...opt, enabled: !opt.enabled } : opt
    );

    const willHaveAnyActive = nextOptions.some((o) => o.enabled);

    // Optimistically update UI
    setApps((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, options: nextOptions } : a))
    );

    // Persist to native Android protection bridge
    try {
      await command("rule", {
        packageName: app.packageName,
        enabled: willHaveAnyActive,
        feedMode: willHaveAnyActive
          ? app.id === "tiktok"
            ? "whole_app"
            : "experimental"
          : "off",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update in-app rule";
      Alert.alert("In-App Blocking", msg);
      // Revert on failure
      setApps((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, options: app.options } : a))
      );
    }
  };

  // Filter apps based on search query
  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.options.some((o) => o.label.toLowerCase().includes(q))
    );
  }, [apps, searchQuery]);

  const renderAppIcon = (app: InAppBlockingApp) => {
    switch (app.brandType) {
      case "youtube":
        return (
          <View style={[s.appIconBase, { backgroundColor: "#CC0000" }]}>
            <Icon name="youtube" size={20} color="#FFFFFF" />
          </View>
        );
      case "instagram":
        return (
          <LinearGradient
            colors={["#833AB4", "#FD1D1D", "#FCB045"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.appIconBase}
          >
            <Icon name="instagram" size={20} color="#FFFFFF" />
          </LinearGradient>
        );
      case "facebook":
        return (
          <View style={[s.appIconBase, { backgroundColor: "#1877F2" }]}>
            <Icon name="facebook" size={20} color="#FFFFFF" />
          </View>
        );
      case "snapchat":
        return (
          <View style={[s.appIconBase, { backgroundColor: "#111111" }]}>
            <Icon name="snapchat" size={20} color="#FFFC00" />
          </View>
        );
      case "tiktok":
        return (
          <View style={[s.appIconBase, { backgroundColor: "#010101" }]}>
            <Icon name="video-outline" size={19} color="#FFFFFF" />
          </View>
        );
      case "x":
        return (
          <View style={[s.appIconBase, { backgroundColor: "#000000" }]}>
            <Icon name="alpha-x" size={20} color="#FFFFFF" />
          </View>
        );
      default:
        return (
          <View style={[s.appIconBase, { backgroundColor: p.surfaceMuted }]}>
            <Icon name={app.icon} size={20} color={p.brandPrimary} />
          </View>
        );
    }
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
        {/* Backdrop tap dismiss */}
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
            {/* 1. Header Search Bar & Dismiss Button (Shared Theme) */}
            <View style={[s.headerContainer, { borderBottomColor: p.borderSubtle }]}>
              <View
                style={[
                  s.searchBarWrap,
                  {
                    backgroundColor: p.surfaceMuted,
                    borderColor: p.borderSubtle,
                  },
                ]}
              >
                <Icon name="menu" size={20} color={p.textSecondary} />
                <TextInput
                  accessibilityRole="search"
                  accessibilityLabel="Search in Restrainify"
                  placeholder="Search in Restrainify"
                  placeholderTextColor={p.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={[s.searchInput, { color: p.textPrimary }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear search text"
                    onPress={() => setSearchQuery("")}
                    hitSlop={8}
                  >
                    <Icon name="close-circle" size={18} color={p.textSecondary} />
                  </Pressable>
                ) : (
                  <View style={s.searchStatusBadge}>
                    <Icon name="shield-check" size={17} color={p.success} />
                    <View
                      style={[
                        s.badgeMiniCount,
                        { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
                      ]}
                    >
                      <Text style={[s.badgeMiniText, { color: p.textPrimary }]}>5</Text>
                    </View>
                  </View>
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                onPress={onClose}
                style={[
                  s.closeIconBtn,
                  {
                    backgroundColor: p.surfaceMuted,
                    borderColor: p.borderSubtle,
                  },
                ]}
                hitSlop={8}
              >
                <Icon name="close" size={18} color={p.textSecondary} />
              </Pressable>
            </View>

            {/* 2. Scrollable Content Body */}
            <ScrollView
              style={s.dialogScroll}
              contentContainerStyle={s.dialogScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
              bounces={false}
            >
              {/* Accessibility Permission Action Banner */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tap to grant Restrainify Accessibility Permission"
                onPress={() => void handleGrantAccessibility()}
                style={({ pressed }) => [
                  s.permissionBanner,
                  {
                    backgroundColor: hasAccessibility ? p.successSurface : p.dangerSurface,
                    borderColor: hasAccessibility ? p.success : p.danger,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={s.bannerIconBox}>
                  <Icon
                    name={hasAccessibility ? "check-circle" : "alert-circle"}
                    size={22}
                    color={hasAccessibility ? p.success : p.danger}
                  />
                </View>

                <Text
                  style={[
                    s.bannerText,
                    { color: hasAccessibility ? p.success : p.danger },
                  ]}
                >
                  {hasAccessibility
                    ? "Restrainify Accessibility Permission is active. In-App Blocking is enforcing reliably."
                    : "Tap to grant Restrainify Accessibility Permission, which is required for using In-App Blocking options."}
                </Text>

                <View style={s.bannerTapBox}>
                  <Icon
                    name={hasAccessibility ? "cog-outline" : "gesture-tap"}
                    size={22}
                    color={hasAccessibility ? p.success : p.danger}
                  />
                </View>
              </Pressable>

              {/* In-App Blocking Section Title */}
              <View style={s.sectionHeader}>
                <View style={s.titleRow}>
                  <Text style={[s.sectionTitle, { color: p.textPrimary }]}>In-App Blocking</Text>
                  <View
                    style={[
                      s.wandPill,
                      {
                        backgroundColor: p.surfaceMuted,
                        borderColor: p.borderSubtle,
                      },
                    ]}
                  >
                    <Icon name="auto-fix" size={15} color={p.brandPrimary} />
                  </View>
                </View>

                <Text style={[s.sectionSubtitle, { color: p.textSecondary }]}>
                  Customize your social media visits, say goodbye to clutter and
                  regain control over your online viewing experience in social apps
                  and websites.
                </Text>
              </View>

              {/* App Accordion Cards */}
              <View style={s.accordionsContainer}>
                {filteredApps.map((app) => {
                  const isExpanded = Boolean(
                    searchQuery.trim().length > 0 || expandedApps[app.id]
                  );
                  const activeOptionsCount = app.options.filter((o) => o.enabled).length;

                  return (
                    <View
                      key={app.id}
                      style={[
                        s.appCard,
                        {
                          backgroundColor: p.surfaceMuted,
                          borderColor: p.borderSubtle,
                        },
                      ]}
                    >
                      {/* Accordion Header */}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${app.name}, ${activeOptionsCount} active restrictions. Tap to ${isExpanded ? "collapse" : "expand"}`}
                        onPress={() => toggleAccordion(app.id)}
                        style={({ pressed }) => [
                          s.appHeaderRow,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        {renderAppIcon(app)}

                        <View style={s.appNameWrap}>
                          <Text style={[s.appNameText, { color: p.textPrimary }]}>
                            {app.name}
                          </Text>
                        </View>

                        <View style={s.headerRightAction}>
                          {activeOptionsCount > 0 && !isExpanded && (
                            <View
                              style={[
                                s.activeBadge,
                                {
                                  backgroundColor: p.surfacePrimary,
                                  borderColor: p.borderSubtle,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  s.activeBadgeText,
                                  { color: p.brandPrimary },
                                ]}
                              >
                                {activeOptionsCount}
                              </Text>
                            </View>
                          )}
                          <Icon
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={20}
                            color={p.textSecondary}
                          />
                        </View>
                      </Pressable>

                      {/* Accordion Sub-options Body */}
                      {isExpanded && (
                        <View
                          style={[
                            s.appSubOptionsList,
                            {
                              backgroundColor: p.surfacePrimary,
                              borderTopColor: p.borderSubtle,
                            },
                          ]}
                        >
                          {app.options.map((option, optIdx) => (
                            <View
                              key={option.id}
                              style={[
                                s.subOptionRow,
                                optIdx < app.options.length - 1 && [
                                  s.subOptionBorder,
                                  { borderBottomColor: p.borderSubtle },
                                ],
                              ]}
                            >
                              <View style={s.subOptionIconBox}>
                                <Icon
                                  name={option.icon}
                                  size={18}
                                  color={option.enabled ? p.brandPrimary : p.textSecondary}
                                />
                              </View>

                              <View style={s.subOptionLabelWrap}>
                                <Text
                                  style={[
                                    s.subOptionLabel,
                                    {
                                      color: option.enabled
                                        ? p.textPrimary
                                        : p.textSecondary,
                                      fontWeight: option.enabled ? "700" : "500",
                                    },
                                  ]}
                                >
                                  {option.label}
                                </Text>

                                {option.badge && (
                                  <View
                                    style={[
                                      s.earlyAccessPill,
                                      {
                                        backgroundColor: p.surfaceMuted,
                                        borderColor: p.borderSubtle,
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        s.earlyAccessText,
                                        { color: p.brandPrimary },
                                      ]}
                                    >
                                      {option.badge}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              <Switch
                                accessibilityLabel={`Toggle ${option.label} for ${app.name}`}
                                value={option.enabled}
                                onValueChange={() => void toggleSubOption(app.id, option.id)}
                                trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
                                thumbColor="#FFFFFF"
                              />
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}

                {filteredApps.length === 0 && (
                  <View style={s.emptySearchCard}>
                    <Icon name="magnify" size={26} color={p.textSecondary} />
                    <Text style={[s.emptySearchTitle, { color: p.textPrimary }]}>
                      No matching apps found
                    </Text>
                    <Text style={[s.emptySearchSubtitle, { color: p.textSecondary }]}>
                      Try searching for &quot;Instagram&quot;, &quot;YouTube&quot;, or &quot;Reels&quot;.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* 3. Pinned Footer Done Action (Shared Theme) */}
            <View style={[s.footerContainer, { borderTopColor: p.borderSubtle }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                onPress={onClose}
                style={({ pressed }) => [
                  s.doneBtn,
                  { backgroundColor: p.brandPrimary },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[s.doneBtnText, { color: p.backgroundPrimary }]}>Done</Text>
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
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  searchBarWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "500",
    paddingVertical: 0,
  },
  searchStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeMiniCount: {
    borderRadius: 999,
    borderWidth: 1,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeMiniText: {
    fontSize: 10,
    fontWeight: "700",
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  bannerIconBox: {
    width: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "600",
  },
  bannerTapBox: {
    width: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    paddingHorizontal: 2,
    gap: 5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  wandPill: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionSubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  accordionsContainer: {
    gap: 10,
  },
  appCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  appHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  appIconBase: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  appNameWrap: {
    flex: 1,
  },
  appNameText: {
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  headerRightAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  appSubOptionsList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 2,
  },
  subOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  subOptionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subOptionIconBox: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  subOptionLabelWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  subOptionLabel: {
    fontSize: 13,
  },
  earlyAccessPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  earlyAccessText: {
    fontSize: 10,
    fontWeight: "700",
  },
  emptySearchCard: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptySearchTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptySearchSubtitle: {
    fontSize: 12,
    textAlign: "center",
  },
  footerContainer: {
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
