import { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  Alert,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";
import { offlineProtection } from "../../../native/OfflineProtection";
import { isSameSocialApp } from "../utils/socialPackages";

export interface ShortFormModalProps {
  visible: boolean;
  onClose: () => void;
  open?: (route: string, params?: Record<string, unknown>) => void;
}

interface FeedItem {
  id: string;
  name: string;
  packageName: string;
  icon: IconName;
  statusText: string;
  badge: string;
  badgeTone: "good" | "warn";
  enabled: boolean;
}

const INITIAL_FEEDS: FeedItem[] = [
  {
    id: "ig",
    name: "Instagram",
    packageName: "com.instagram.android",
    icon: "instagram",
    statusText: "Reels identified reliably",
    badge: "Protected",
    badgeTone: "good",
    enabled: true,
  },
  {
    id: "yt",
    name: "YouTube",
    packageName: "com.google.android.youtube",
    icon: "youtube",
    statusText: "Shorts identified reliably",
    badge: "Protected",
    badgeTone: "good",
    enabled: true,
  },
  {
    id: "fb",
    name: "Facebook",
    packageName: "com.facebook.katana",
    icon: "facebook",
    statusText: "Reels identified reliably",
    badge: "Protected",
    badgeTone: "good",
    enabled: true,
  },
  {
    id: "sc",
    name: "Snapchat",
    packageName: "com.snapchat.android",
    icon: "cellphone-lock",
    statusText: "Spotlight identified reliably",
    badge: "Protected",
    badgeTone: "good",
    enabled: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    packageName: "com.zhiliaoapp.musically",
    icon: "video-outline",
    statusText: "Feed-only restriction not reliable",
    badge: "Whole app",
    badgeTone: "warn",
    enabled: true,
  },
];

/**
 * ShortFormModal renders a centered, beautifully proportioned dialog for Short-Form Protection
 * directly from the Home screen action button.
 */
export function ShortFormModal({ visible, onClose, open }: ShortFormModalProps) {
  const { palette: p, snapshot: data, command, run } = useOffline();
  const { height: windowHeight } = useWindowDimensions();

  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});
  const inFlightRef = useRef<Set<string>>(new Set());

  const feeds: FeedItem[] = INITIAL_FEEDS.map((f) => {
    const isPending = pendingToggles[f.id] !== undefined;
    if (isPending) {
      return { ...f, enabled: pendingToggles[f.id] };
    }
    const match = data?.settings?.rules?.find((r) => isSameSocialApp(r.packageName, f.packageName));
    return {
      ...f,
      enabled: match ? match.enabled && match.feedMode !== "off" : f.enabled,
    };
  });

  const isBurstActive = Boolean(data && data.burstRemainingMs > 0);
  const isStrictActive = Boolean(data && data.strictRemainingMs > 0);
  const isCooldownActive = isBurstActive || isStrictActive;
  const isAccessibilityActive = Boolean(
    data?.capabilities?.accessibility && data?.settings?.accessibilityConsent
  );
  const isSocialActive = Boolean(data?.settings.socialWebsites);
  const isLockedRef = useRef(false);
  const [isLocked, setIsLocked] = useState(false);
  const [optimisticActive, setOptimisticActive] = useState<boolean | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      isLockedRef.current = false;
      setIsLocked(false);
      setOptimisticActive(null);
      setPendingToggles({});
      inFlightRef.current.clear();
    }
  }, [visible]);

  const switchValue = optimisticActive !== null ? optimisticActive : isSocialActive;

  const handleToggleSocialWebsites = async (value: boolean) => {
    if (isLockedRef.current) return;

    if (!value && isCooldownActive) {
      Alert.alert(
        "Settings Locked",
        "Social website blocking cannot be disabled while Strict Mode or Burst cooldown is active.",
      );
      return;
    }

    if (value && !isAccessibilityActive) {
      Alert.alert(
        "Accessibility Service Required",
        "Restrainify needs Android Accessibility Service enabled to detect and block social apps (like Instagram, TikTok, and Facebook) and short-form feeds.\n\nWould you like to set it up now?",
        [
          {
            text: "Not Now",
            style: "cancel",
            onPress: () => {
              setOptimisticActive(false);
            },
          },
          {
            text: "Set Up Now",
            onPress: async () => {
              try {
                await command("setting", { key: "accessibilityConsent", value: true });
                await command("setting", { key: "socialWebsites", value: true });
                if (data && !data.settings.websiteEnabled) {
                  const ok = await command("setting", { key: "websiteEnabled", value: true });
                  if (ok && (data.settings.dnsMode || "vpn") === "vpn") {
                    try {
                      await run(offlineProtection.startVpn);
                    } catch {
                      // VPN permission handling
                    }
                  }
                }
              } catch (err) {
                console.warn("Error enabling social websites:", err);
              }
              if (open) {
                onClose();
                open("permission-disclosure", {
                  permissionType: "accessibility",
                  returnRoute: "home",
                  returnModal: "short-form",
                });
              } else {
                try {
                  await run(() => offlineProtection.settings("accessibility"));
                } catch {
                  // dev fallback
                }
              }
            },
          },
        ],
      );
      return;
    }

    isLockedRef.current = true;
    setIsLocked(true);
    setOptimisticActive(value);
    const startTime = Date.now();

    try {
      await command("setting", { key: "socialWebsites", value });
      if (value && data && !data.settings.websiteEnabled) {
        const ok = await command("setting", { key: "websiteEnabled", value: true });
        if (ok && (data.settings.dnsMode || "vpn") === "vpn") {
          try {
            await run(offlineProtection.startVpn);
          } catch {
            // VPN permission handling
          }
        }
      }
    } catch (err: unknown) {
      setOptimisticActive(null);
      const msg = err instanceof Error ? err.message : "Failed to update social website blocking";
      Alert.alert("Social Websites", msg);
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

  const toggleFeed = async (id: string, requestedVal?: boolean) => {
    if (isCooldownActive) {
      Alert.alert(
        isBurstActive ? "Burst Mode Active" : "Strict Mode Active",
        "Short-form feed protections cannot be modified while Burst mode or Strict mode is active.",
      );
      return;
    }

    if (inFlightRef.current.has(id)) return;

    const target = feeds.find((f) => f.id === id);
    if (!target) return;

    const nextEnabled = requestedVal !== undefined ? requestedVal : !target.enabled;
    if (nextEnabled === target.enabled) return;

    if (nextEnabled && !isAccessibilityActive) {
      Alert.alert(
        "Accessibility Service Required",
        `Restrainify needs Android Accessibility Service enabled to identify and block short-form feeds in ${target.name}.\n\nWould you like to set it up now?`,
        [
          {
            text: "Not Now",
            style: "cancel",
          },
          {
            text: "Set Up Now",
            onPress: async () => {
              inFlightRef.current.add(id);
              setPendingToggles((prev) => ({ ...prev, [id]: true }));
              try {
                await command("setting", { key: "accessibilityConsent", value: true });
                const existing = data?.settings?.rules?.find((r) => isSameSocialApp(r.packageName, target.packageName));
                await command("rule", {
                  packageName: target.packageName,
                  enabled: true,
                  limitMinutes: existing?.limitMinutes ?? 0,
                  startMinute: existing?.startMinute ?? -1,
                  endMinute: existing?.endMinute ?? -1,
                  days: existing?.days ?? [1, 2, 3, 4, 5, 6, 7],
                  feedMode: target.id === "tiktok" ? "whole_app" : "experimental",
                  burst: existing?.burst ?? true,
                });
              } catch {
                // Offline fallback
              } finally {
                inFlightRef.current.delete(id);
                setPendingToggles((prev) => {
                  const copy = { ...prev };
                  delete copy[id];
                  return copy;
                });
              }
              if (open) {
                onClose();
                open("permission-disclosure", {
                  permissionType: "accessibility",
                  returnRoute: "home",
                  returnModal: "short-form",
                });
              } else {
                try {
                  await run(() => offlineProtection.settings("accessibility"));
                } catch {}
              }
            },
          },
        ],
      );
      return;
    }

    inFlightRef.current.add(id);
    setPendingToggles((prev) => ({ ...prev, [id]: nextEnabled }));

    try {
      const existing = data?.settings?.rules?.find((r) => isSameSocialApp(r.packageName, target.packageName));
      const hasLimitOrSchedule = Boolean(existing && (existing.limitMinutes > 0 || existing.startMinute >= 0));
      const ok = await command("rule", {
        packageName: target.packageName,
        enabled: nextEnabled || hasLimitOrSchedule,
        limitMinutes: existing?.limitMinutes ?? 0,
        startMinute: existing?.startMinute ?? -1,
        endMinute: existing?.endMinute ?? -1,
        days: existing?.days ?? [1, 2, 3, 4, 5, 6, 7],
        feedMode: nextEnabled ? (target.id === "tiktok" ? "whole_app" : "experimental") : "off",
        burst: existing?.burst ?? true,
      });
      if (!ok) {
        Alert.alert("Rule Error", "Failed to update feed rule. Please check active restrictions.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update feed rule";
      Alert.alert("Rule Error", msg);
    } finally {
      inFlightRef.current.delete(id);
      setPendingToggles((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  const activeFeedsCount = feeds.filter((f) => f.enabled).length;

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
                maxHeight: Math.round(windowHeight * 0.82),
              },
            ]}
          >
            {/* 1. Pinned Header */}
            <View style={[s.headerRow, { borderBottomColor: p.borderSubtle }]}>
              <View style={s.headerTitleWrap}>
                <View
                  style={[
                    s.headerIconBox,
                    { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
                  ]}
                >
                  <Icon name="play-box-outline" size={20} color={p.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.headerTitle, { color: p.textPrimary }]}>Short-form feeds</Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close short-form dialog"
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
              {/* Accessibility inactive warning banner */}
              {!isAccessibilityActive && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Accessibility service not enabled. Tap to configure."
                  onPress={() => {
                    if (open) {
                      onClose();
                      open("permission-disclosure", {
                        permissionType: "accessibility",
                        returnRoute: "home",
                        returnModal: "short-form",
                      });
                    } else {
                      void (async () => {
                        try {
                          await command("setting", { key: "accessibilityConsent", value: true });
                          await run(() => offlineProtection.settings("accessibility"));
                        } catch {}
                      })();
                    }
                  }}
                  style={[
                    s.warningBanner,
                    { backgroundColor: p.warningSurface, borderColor: p.warning },
                  ]}
                >
                  <View style={s.warningIconBox}>
                    <Icon name="shield-alert" size={19} color={p.warning} />
                  </View>
                  <View style={s.warningTextWrap}>
                    <Text style={[s.warningBannerTitle, { color: p.textPrimary }]}>
                      Accessibility setup required
                    </Text>
                    <Text style={[s.warningBannerDesc, { color: p.textSecondary }]}>
                      Required to detect and block social apps & short-form feeds.
                    </Text>
                  </View>
                  <View style={[s.setupPill, { backgroundColor: p.warning }]}>
                    <Text style={s.setupPillText}>Set Up</Text>
                  </View>
                </Pressable>
              )}

              {/* Cooldown / Burst locked warning banner */}
              {isCooldownActive && (
                <View
                  style={[
                    s.burstLockedBanner,
                    {
                      backgroundColor: p.surfaceMuted,
                      borderColor: p.borderSubtle,
                    },
                  ]}
                >
                  <View style={[s.burstLockedIconBox, { backgroundColor: p.surfacePrimary }]}>
                    <Icon name="lock" size={18} color={p.brandPrimary} />
                  </View>
                  <View style={s.burstLockedTextWrap}>
                    <Text style={[s.burstLockedTitle, { color: p.textPrimary }]}>
                      {isBurstActive ? "Burst mode active" : "Strict mode active"}
                    </Text>
                    <Text style={[s.burstLockedDesc, { color: p.textSecondary }]}>
                      {isBurstActive
                        ? `Settings are locked (${Math.ceil((data?.burstRemainingMs ?? 0) / 60000)}m remaining). Feeds cannot be disabled.`
                        : `Settings are locked (${Math.ceil((data?.strictRemainingMs ?? 0) / 60000)}m remaining). Protections cannot be weakened.`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Feeds Section Header */}
              <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Supported feeds</Text>
                <Text style={[s.sectionKicker, { color: p.textSecondary }]}>
                  {activeFeedsCount} OF {feeds.length} ACTIVE
                </Text>
              </View>

              {/* Feeds List Card */}
              <View
                style={[
                  s.feedsCard,
                  { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
                ]}
              >
                {feeds.map((feed, idx) => {
                  const isFeedLocked = isCooldownActive;
                  return (
                    <View
                      key={feed.id}
                      style={[
                        s.feedRow,
                        idx < feeds.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: p.borderSubtle,
                        },
                        isFeedLocked && { opacity: 0.65 },
                      ]}
                    >
                      <View
                        style={[
                          s.feedIconBox,
                          {
                            backgroundColor: p.surfacePrimary,
                            borderColor: p.borderSubtle,
                          },
                        ]}
                      >
                        <Icon
                          name={feed.icon}
                          size={19}
                          color={
                            feed.enabled
                              ? isFeedLocked
                                ? p.textSecondary
                                : p.brandPrimary
                              : p.textSecondary
                          }
                        />
                      </View>

                      <View style={s.feedInfo}>
                        <View style={s.feedTitleRow}>
                          <Text style={[s.feedName, { color: p.textPrimary }]}>{feed.name}</Text>
                          <View
                            style={[
                              s.badgePill,
                              {
                                backgroundColor: isFeedLocked
                                  ? p.surfacePrimary
                                  : !feed.enabled
                                  ? p.surfacePrimary
                                  : feed.badgeTone === "good"
                                  ? p.successSurface
                                  : p.warningSurface,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 3,
                              },
                            ]}
                          >
                            {isFeedLocked && (
                              <Icon name="lock" size={10} color={p.textSecondary} />
                            )}
                            <Text
                              style={[
                                s.badgeText,
                                {
                                  color: isFeedLocked
                                    ? p.textSecondary
                                    : !feed.enabled
                                    ? p.textSecondary
                                    : feed.badgeTone === "good"
                                    ? p.success
                                    : p.warning,
                                },
                              ]}
                            >
                              {isFeedLocked ? "Locked" : !feed.enabled ? "Off" : feed.badge}
                            </Text>
                          </View>
                        </View>
                        <Text style={[s.feedDetail, { color: p.textSecondary }]}>
                          {isFeedLocked
                            ? isBurstActive
                              ? "Locked while Burst mode is active"
                              : "Locked while Strict mode is active"
                            : !feed.enabled
                            ? "Feed & social protection disabled"
                            : feed.statusText}
                        </Text>
                      </View>

                      <Switch
                        accessibilityLabel={`Toggle ${feed.name} feed protection`}
                        disabled={isFeedLocked || pendingToggles[feed.id] !== undefined}
                        value={feed.enabled}
                        onValueChange={(val) => void toggleFeed(feed.id, val)}
                        trackColor={{
                          false: p.borderSubtle,
                          true: isFeedLocked ? p.borderSubtle : p.brandPrimary,
                        }}
                        thumbColor={isFeedLocked && feed.enabled ? p.textSecondary : "#FFFFFF"}
                      />
                    </View>
                  );
                })}
              </View>

              {/* Social Websites & Apps Toggle */}
              {(() => {
                const isSocialLocked = isLocked || (isCooldownActive && switchValue);
                return (
                  <View
                    style={[
                      s.toggleCard,
                      {
                        backgroundColor: p.surfaceMuted,
                        borderColor: switchValue
                          ? isCooldownActive
                            ? p.borderSubtle
                            : p.brandPrimary
                          : p.borderSubtle,
                        opacity: isSocialLocked ? 0.65 : 1,
                      },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Toggle block social websites and apps"
                      disabled={isSocialLocked}
                      onPress={() => void handleToggleSocialWebsites(!switchValue)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
                    >
                      <View
                        style={[
                          s.feedIconBox,
                          {
                            backgroundColor: switchValue
                              ? isCooldownActive
                                ? p.surfacePrimary
                                : "rgba(37, 99, 235, 0.12)"
                              : p.surfacePrimary,
                            borderColor: switchValue
                              ? isCooldownActive
                                ? p.borderSubtle
                                : p.brandPrimary
                              : p.borderSubtle,
                          },
                        ]}
                      >
                        <Icon
                          name={isCooldownActive && switchValue ? "lock" : "web"}
                          size={19}
                          color={
                            switchValue
                              ? isCooldownActive
                                ? p.textSecondary
                                : p.brandPrimary
                              : p.textSecondary
                          }
                        />
                      </View>

                      <View style={s.toggleInfo}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={[s.toggleTitle, { color: p.textPrimary }]}>
                            Block social websites & apps
                          </Text>
                          {isCooldownActive && switchValue && (
                            <View
                              style={[
                                s.badgePill,
                                {
                                  backgroundColor: p.surfacePrimary,
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 3,
                                },
                              ]}
                            >
                              <Icon name="lock" size={10} color={p.textSecondary} />
                              <Text style={[s.badgeText, { color: p.textSecondary }]}>
                                Locked
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[s.toggleDetail, { color: p.textSecondary }]}>
                          {isCooldownActive && switchValue
                            ? isBurstActive
                              ? "Locked while Burst mode is active"
                              : "Locked while Strict mode is active"
                            : "Displays an overlay when opening Instagram, TikTok, Facebook, Reddit, X & more"}
                        </Text>
                      </View>
                    </Pressable>

                    <Switch
                      accessibilityLabel="Block social websites and apps"
                      disabled={isSocialLocked}
                      value={switchValue}
                      onValueChange={(val) => void handleToggleSocialWebsites(val)}
                      trackColor={{
                        false: p.borderSubtle,
                        true: isCooldownActive ? p.borderSubtle : p.brandPrimary,
                      }}
                      thumbColor={isCooldownActive && switchValue ? p.textSecondary : "#FFFFFF"}
                    />
                  </View>
                );
              })()}
            </ScrollView>

            {/* 3. Pinned Footer */}
            <View style={[s.footerRow, { borderTopColor: p.borderSubtle }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                onPress={onClose}
                style={[s.doneBtn, { backgroundColor: p.brandPrimary }]}
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
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 4,
  },
  warningIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  warningTextWrap: {
    flex: 1,
    gap: 2,
  },
  warningBannerTitle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  warningBannerDesc: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  burstLockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 4,
  },
  burstLockedIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  burstLockedTextWrap: {
    flex: 1,
    gap: 2,
  },
  burstLockedTitle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  burstLockedDesc: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  setupPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  setupPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionKicker: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  feedsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  feedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 10,
  },
  feedIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  feedInfo: {
    flex: 1,
    gap: 2,
  },
  feedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  feedName: {
    fontSize: 13,
    fontWeight: "700",
  },
  feedDetail: {
    fontSize: 10.5,
    lineHeight: 14,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  noticeBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  noticeBody: {
    fontSize: 10.5,
    lineHeight: 15,
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  toggleDetail: {
    fontSize: 10.5,
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
