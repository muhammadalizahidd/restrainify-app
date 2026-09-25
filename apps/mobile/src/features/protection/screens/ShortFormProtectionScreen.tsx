import { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, View, Pressable, Switch, Alert } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";
import { offlineProtection } from "../../../native/OfflineProtection";
import { isSameSocialApp } from "../utils/socialPackages";
import { ShortFormModal } from "../components/ShortFormModal";
export interface ShortFormProtectionScreenProps {
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

interface FeedItem {
  id: string;
  name: string;
  packageName: string;
  icon: IconName;
  statusText: string;
  badge: string;
  badgeTone: "good" | "warn";
}

/**
 * ShortFormProtectionScreen implements SET-SOC-01: Short-Form Protection
 * from the Restrainify UI Architecture specification.
 *
 * Controls automated accessibility detection for addictive short-form video surfaces
 * (Instagram Reels, YouTube Shorts, Facebook Reels, Snapchat Spotlight).
 *
 * Product truth invariant:
 * - Truthfully reports that TikTok feed-only control is not reliable on all Android versions
 *   and provides a whole-app restriction fallback rather than pretending feed isolation works.
 */
export function ShortFormProtectionScreen({
  open,
  onBack,
}: ShortFormProtectionScreenProps) {
  const { palette: p, snapshot: data, command, run } = useOffline();

  const isBurstActive = Boolean(data && data.burstRemainingMs > 0);
  const isStrictActive = Boolean(data && data.strictRemainingMs > 0);
  const isCooldownActive = isBurstActive || isStrictActive;
  const isAccessibilityActive = Boolean(
    data?.capabilities?.accessibility && data?.settings?.accessibilityConsent
  );
  const isSocialActive = Boolean(data?.settings.socialWebsites);
  const [modalVisible, setModalVisible] = useState(false);
  const isLockedRef = useRef(false);
  const [isLocked, setIsLocked] = useState(false);
  const [optimisticActive, setOptimisticActive] = useState<boolean | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  const switchValue = optimisticActive !== null ? optimisticActive : isSocialActive;

  const handleToggleSocialWebsites = async (value: boolean) => {
    if (isLockedRef.current) return;

    if (!value && isCooldownActive) {
      Alert.alert(
        "Settings Locked",
        "Social website blocking cannot be disabled while Strict Mode or Burst cooldown is active."
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
                open("permission-disclosure", {
                  permissionType: "accessibility",
                  returnRoute: "short-form",
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
        ]
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
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to update social website blocking";
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

  const feeds: FeedItem[] = [
    {
      id: "ig",
      name: "Instagram",
      packageName: "com.instagram.android",
      icon: "instagram",
      statusText: "Reels identified reliably",
      badge: "Protected",
      badgeTone: "good",
    },
    {
      id: "yt",
      name: "YouTube",
      packageName: "com.google.android.youtube",
      icon: "youtube",
      statusText: "Shorts identified reliably",
      badge: "Protected",
      badgeTone: "good",
    },
    {
      id: "fb",
      name: "Facebook",
      packageName: "com.facebook.katana",
      icon: "facebook",
      statusText: "Reels identified reliably",
      badge: "Protected",
      badgeTone: "good",
    },
    {
      id: "sc",
      name: "Snapchat",
      packageName: "com.snapchat.android",
      icon: "cellphone-lock",
      statusText: "Spotlight identified reliably",
      badge: "Protected",
      badgeTone: "good",
    },
    {
      id: "tiktok",
      name: "TikTok",
      packageName: "com.zhiliaoapp.musically",
      icon: "video-outline",
      statusText: "Feed-only restriction not reliable",
      badge: "Whole app",
      badgeTone: "warn",
    },
  ];

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
            Reels · Shorts · Spotlight
          </Text>
          <Text style={[styles.headerTitle, { color: p.textPrimary }]}>
            Short-form protection
          </Text>
        </View>
      </View>

      {/* Accessibility inactive warning banner */}
      {!isAccessibilityActive && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Accessibility service not enabled. Tap to configure."
          onPress={() => {
            if (open) {
              open("permission-disclosure", {
                permissionType: "accessibility",
                returnRoute: "short-form",
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
            styles.warningBanner,
            { backgroundColor: p.warningSurface, borderColor: p.warning },
          ]}
        >
          <View style={styles.warningIconBox}>
            <Icon name="shield-alert" size={19} color={p.warning} />
          </View>
          <View style={styles.warningTextWrap}>
            <Text style={[styles.warningBannerTitle, { color: p.textPrimary }]}>
              Accessibility setup required
            </Text>
            <Text style={[styles.warningBannerDesc, { color: p.textSecondary }]}>
              Required to detect and block social apps & short-form feeds.
            </Text>
          </View>
          <View style={[styles.setupPill, { backgroundColor: p.warning }]}>
            <Text style={styles.setupPillText}>Set Up</Text>
          </View>
        </Pressable>
      )}

      {/* Burst / Strict Cooldown lock banner */}
      {isCooldownActive && (
        <View
          style={[
            styles.burstLockedBanner,
            {
              backgroundColor: p.surfacePrimary,
              borderColor: p.borderSubtle,
            },
          ]}
        >
          <View style={[styles.burstLockedIconBox, { backgroundColor: p.backgroundPrimary }]}>
            <Icon name="lock" size={20} color={p.brandPrimary} />
          </View>
          <View style={styles.burstLockedTextWrap}>
            <Text style={[styles.burstLockedTitle, { color: p.textPrimary }]}>
              {isBurstActive ? "Burst mode active" : "Strict mode active"}
            </Text>
            <Text style={[styles.burstLockedDesc, { color: p.textSecondary }]}>
              {isBurstActive
                ? `Settings are locked (${Math.ceil((data?.burstRemainingMs ?? 0) / 60000)}m remaining). Protection settings cannot be weakened.`
                : `Settings are locked (${Math.ceil((data?.strictRemainingMs ?? 0) / 60000)}m remaining). Protection settings cannot be weakened.`}
            </Text>
          </View>
        </View>
      )}

      {/* 2. Feeds Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
          Supported feeds
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Configure in-app rules and reels options"
          onPress={() => setModalVisible(true)}
          style={styles.configureButton}
        >
          <Text style={[styles.configureButtonText, { color: p.brandPrimary }]}>
            Configure Rules
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.feedsCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {feeds.map((feed, idx) => {
          const isFeedLocked = isCooldownActive;
          const match = data?.settings?.rules?.find((r) => isSameSocialApp(r.packageName, feed.packageName));
          const isFeedActive = match ? match.enabled && match.feedMode !== "off" : true;
          const isIg = feed.id === "ig";
          const isYt = feed.id === "yt";
          const options = match?.options;
          const hasReelsBlocked = options ? options.includes("ig_reels") : true;
          const hasShortsBlocked = options ? options.includes("yt_shorts") : true;
          const hasYtCommentsBlocked = options ? options.includes("yt_comments") : false;
          const hasYtHomeBlocked = options ? options.includes("yt_home") : false;

          const feedDetailText = isFeedLocked
            ? isBurstActive
              ? "Locked while Burst mode is active"
              : "Locked while Strict mode is active"
            : !isFeedActive
            ? "Feed & social protection disabled"
            : isIg
            ? hasReelsBlocked
              ? "Reels blocked · Posts & DMs allowed"
              : "Reels allowed · Feed active"
            : isYt
            ? hasShortsBlocked
              ? hasYtHomeBlocked
                ? "Shorts & Home feed blocked"
                : hasYtCommentsBlocked
                ? "Shorts & Comments blocked · Videos allowed"
                : "Shorts blocked · Videos allowed"
              : hasYtHomeBlocked || hasYtCommentsBlocked
              ? "Custom in-app rules active"
              : "Shorts allowed · Feed active"
            : feed.statusText;

          const badgeText = isFeedLocked
            ? "Locked"
            : !isFeedActive
            ? "Off"
            : isIg && !hasReelsBlocked
            ? "Allowed"
            : isYt && !hasShortsBlocked && !hasYtHomeBlocked && !hasYtCommentsBlocked
            ? "Allowed"
            : feed.badge;
          return (
            <Pressable
              key={feed.id}
              accessibilityRole="button"
              accessibilityLabel={`${feed.name}, ${feedDetailText}. Tap to configure in-app options.`}
              onPress={() => setModalVisible(true)}
              style={[
                styles.feedRow,
                idx < feeds.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: p.borderSubtle,
                },
                (isFeedLocked || !isFeedActive) && { opacity: isFeedLocked ? 0.75 : 0.65 },
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
                  name={feed.icon}
                  size={20}
                  color={isFeedLocked || !isFeedActive ? p.textSecondary : p.brandPrimary}
                />
              </View>

              <View style={styles.feedInfo}>
                <Text style={[styles.feedName, { color: p.textPrimary }]}>
                  {feed.name}
                </Text>
                <Text style={[styles.feedDetail, { color: p.textSecondary }]}>
                  {feedDetailText}
                </Text>
              </View>

              <View
                style={[
                  styles.badgePill,
                  {
                    backgroundColor:
                      isFeedLocked || !isFeedActive
                        ? p.backgroundPrimary
                        : feed.badgeTone === "good"
                        ? p.successSurface
                        : p.warningSurface,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  },
                ]}
              >
                {isFeedLocked && (
                  <Icon name="lock" size={11} color={p.textSecondary} />
                )}
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        isFeedLocked || !isFeedActive
                          ? p.textSecondary
                          : feed.badgeTone === "good"
                          ? p.success
                          : p.warning,
                    },
                  ]}
                >
                  {badgeText}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* 3. Truthful TikTok Fallback Notice */}
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
          <Icon name="alert-circle-outline" size={20} color={p.warning} />
          <Text style={[styles.noticeTitle, { color: p.warning }]}>
            TikTok fallback in use
          </Text>
        </View>
        <Text style={[styles.noticeBody, { color: p.textSecondary }]}>
          This device and app version uses whole-app restriction instead of
          pretending feed-only control works reliably.
        </Text>
      </View>

      {/* 4. Social Websites & Apps Toggle */}
      <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
        Social websites & apps
      </Text>

      {(() => {
        const isSocialLocked = isLocked || (isCooldownActive && switchValue);
        return (
          <View
            style={[
              styles.toggleCard,
              {
                backgroundColor: p.surfacePrimary,
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
              accessibilityLabel="Toggle block supported social websites and apps"
              disabled={isSocialLocked}
              onPress={() => void handleToggleSocialWebsites(!switchValue)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: switchValue
                      ? isCooldownActive
                        ? p.backgroundPrimary
                        : "rgba(37, 99, 235, 0.12)"
                      : p.backgroundPrimary,
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
                  size={20}
                  color={
                    switchValue
                      ? isCooldownActive
                        ? p.textSecondary
                        : p.brandPrimary
                      : p.textSecondary
                  }
                />
              </View>

              <View style={styles.toggleInfo}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.toggleTitle, { color: p.textPrimary }]}>
                    Block social websites & apps
                  </Text>
                  {isCooldownActive && switchValue && (
                    <View
                      style={[
                        styles.badgePill,
                        {
                          backgroundColor: p.backgroundPrimary,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 3,
                        },
                      ]}
                    >
                      <Icon name="lock" size={10} color={p.textSecondary} />
                      <Text style={[styles.badgeText, { color: p.textSecondary }]}>
                        Locked
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.toggleDetail, { color: p.textSecondary }]}>
                  {isCooldownActive && switchValue
                    ? isBurstActive
                      ? "Locked while Burst mode is active"
                      : "Locked while Strict mode is active"
                    : "Displays an overlay when opening Instagram, TikTok, Facebook, Reddit, X & more"}
                </Text>
              </View>
            </Pressable>

            <Switch
              accessibilityLabel="Block supported social websites and apps"
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
      {/* In-App Blocking Modal */}
      <ShortFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        open={open}
      />
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
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 6,
  },
  warningIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  warningTextWrap: {
    flex: 1,
    gap: 2,
  },
  warningBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  warningBannerDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  burstLockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 6,
  },
  burstLockedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  burstLockedTextWrap: {
    flex: 1,
    gap: 2,
  },
  burstLockedTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  burstLockedDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  setupPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  setupPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
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
  configureButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  configureButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  feedsCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  feedRow: {
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
  feedInfo: {
    flex: 1,
    gap: 2,
  },
  feedName: {
    fontSize: 15,
    fontWeight: "600",
  },
  feedDetail: {
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
    fontWeight: "700",
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
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  toggleDetail: {
    fontSize: 12,
    lineHeight: 16,
  },
});
