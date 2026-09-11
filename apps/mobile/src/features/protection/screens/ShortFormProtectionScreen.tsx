import { useState } from "react";
import { StyleSheet, Text, View, Pressable, Switch } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";

export interface ShortFormProtectionScreenProps {
  open: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

interface FeedItem {
  id: string;
  name: string;
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
  const { palette: p } = useOffline();
  const [blockSocialWebsites, setBlockSocialWebsites] = useState(false);

  const feeds: FeedItem[] = [
    {
      id: "ig",
      name: "Instagram",
      icon: "instagram",
      statusText: "Reels identified reliably",
      badge: "Protected",
      badgeTone: "good",
    },
    {
      id: "yt",
      name: "YouTube",
      icon: "youtube",
      statusText: "Shorts identified reliably",
      badge: "Protected",
      badgeTone: "good",
    },
    {
      id: "fb",
      name: "Facebook",
      icon: "facebook",
      statusText: "Reels identified reliably",
      badge: "Protected",
      badgeTone: "good",
    },
    {
      id: "sc",
      name: "Snapchat",
      icon: "cellphone-lock",
      statusText: "Spotlight identified reliably",
      badge: "Protected",
      badgeTone: "good",
    },
    {
      id: "tiktok",
      name: "TikTok",
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

      {/* 2. Feeds Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
          Supported feeds
        </Text>
        <Text style={[styles.sectionKicker, { color: p.textSecondary }]}>
          CURRENT APP VERSIONS
        </Text>
      </View>

      <View
        style={[
          styles.feedsCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {feeds.map((feed, idx) => (
          <View
            key={feed.id}
            style={[
              styles.feedRow,
              idx < feeds.length - 1 && {
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
              <Icon name={feed.icon} size={20} color={p.brandPrimary} />
            </View>

            <View style={styles.feedInfo}>
              <Text style={[styles.feedName, { color: p.textPrimary }]}>
                {feed.name}
              </Text>
              <Text style={[styles.feedDetail, { color: p.textSecondary }]}>
                {feed.statusText}
              </Text>
            </View>

            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor:
                    feed.badgeTone === "good"
                      ? p.successSurface
                      : p.warningSurface,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      feed.badgeTone === "good" ? p.success : p.warning,
                  },
                ]}
              >
                {feed.badge}
              </Text>
            </View>
          </View>
        ))}
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

      {/* 4. Social Websites Toggle */}
      <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
        Social websites
      </Text>

      <View
        style={[
          styles.toggleCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
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
          <Icon name="web" size={20} color={p.brandPrimary} />
        </View>

        <View style={styles.toggleInfo}>
          <Text style={[styles.toggleTitle, { color: p.textPrimary }]}>
            Block supported social websites
          </Text>
          <Text style={[styles.toggleDetail, { color: p.textSecondary }]}>
            Applies to configured website protection scope
          </Text>
        </View>

        <Switch
          accessibilityLabel="Block supported social websites"
          value={blockSocialWebsites}
          onValueChange={setBlockSocialWebsites}
          trackColor={{ true: p.success, false: p.borderSubtle }}
        />
      </View>

      {/* 5. Preview Overlay Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Preview feed-block overlay"
        onPress={() => open("shortform-block")}
        style={[
          styles.secondaryButton,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
          },
        ]}
      >
        <Text style={[styles.secondaryButtonText, { color: p.textPrimary }]}>
          Preview feed-block overlay
        </Text>
      </Pressable>
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
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
