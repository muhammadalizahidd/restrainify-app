import { useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Text } from "../../../components/AppText";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, ToggleSwitch, type IconName, SurfaceGradient } from "../../../components/OfflineUI";
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
  badgeTone: "good" | "warn" | "neutral";
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
  const shortFormBlockingEnabled = data?.settings?.shortFormBlockingEnabled ?? true;

  const isBurstActive = Boolean(data && data.burstRemainingMs > 0);
  const isStrictActive = Boolean(data && data.strictRemainingMs > 0);
  const isCooldownActive = isBurstActive || isStrictActive;
  const isAccessibilityActive = Boolean(
    data?.capabilities?.accessibility && data?.settings?.accessibilityConsent
  );
  const [modalVisible, setModalVisible] = useState(false);

  const feeds: FeedItem[] = [
    {
      id: "ig",
      name: "Instagram",
      packageName: "com.instagram.android",
      icon: "instagram",
      statusText: "Reels",
      badge: shortFormBlockingEnabled ? "Protected" : "Off",
      badgeTone: shortFormBlockingEnabled ? "good" : "neutral",
    },
    {
      id: "yt",
      name: "YouTube",
      packageName: "com.google.android.youtube",
      icon: "youtube",
      statusText: "Shorts",
      badge: shortFormBlockingEnabled ? "Protected" : "Off",
      badgeTone: shortFormBlockingEnabled ? "good" : "neutral",
    },
    {
      id: "fb",
      name: "Facebook",
      packageName: "com.facebook.katana",
      icon: "facebook",
      statusText: "Reels",
      badge: shortFormBlockingEnabled ? "Protected" : "Off",
      badgeTone: shortFormBlockingEnabled ? "good" : "neutral",
    },
    {
      id: "sc",
      name: "Snapchat",
      packageName: "com.snapchat.android",
      icon: "cellphone-lock",
      statusText: "Spotlight & Stories",
      badge: shortFormBlockingEnabled ? "Protected" : "Off",
      badgeTone: shortFormBlockingEnabled ? "good" : "neutral",
    },
    {
      id: "tiktok",
      name: "TikTok",
      packageName: "com.zhiliaoapp.musically",
      icon: "video-outline",
      statusText: "Whole app",
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
              { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
            ]}
          ><SurfaceGradient />
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, { color: p.textPrimary }]}>
            Short-form protection
          </Text>
        </View>
      </View>

      {/* Master short-form blocking toggle */}
      <View
        style={[
          styles.toggleCard,
          { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
        ]}
      ><SurfaceGradient />
        <View style={[styles.iconBox, { backgroundColor: p.backgroundPrimary, borderColor: p.borderSubtle }]}>
          <Icon name="eye-off-outline" size={20} color={p.brandPrimary} />
        </View>
        <View style={styles.toggleInfo}>
          <Text style={[styles.toggleTitle, { color: p.textPrimary }]}>Block short-form content</Text>
          <Text style={[styles.toggleDetail, { color: p.textSecondary }]}>Turns Reels, Shorts, Spotlight, Discover, and Stories detection on or off. App limits, schedules, Burst, and whole-app restrictions stay unchanged.</Text>
        </View>
        <ToggleSwitch
          accessibilityLabel="Block short-form content"
          value={shortFormBlockingEnabled}
          onValueChange={(value) => void command("setting", { key: "shortFormBlockingEnabled", value })}
        />
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
            { overflow: "hidden",
              backgroundColor: "transparent",
              borderColor: p.borderSubtle,
            },
          ]}
        ><SurfaceGradient />
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
          { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
        ]}
      ><SurfaceGradient />
        {feeds.map((feed, idx) => {
          const isFeedLocked = isCooldownActive;
          const match = data?.settings?.rules?.find((r) => isSameSocialApp(r.packageName, feed.packageName));
          const isFeedActive = match ? match.enabled && match.feedMode !== "off" : false;
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
