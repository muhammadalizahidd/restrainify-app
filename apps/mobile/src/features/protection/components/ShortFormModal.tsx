import { useState } from "react";
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
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";

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
  const { palette: p, snapshot: data, command } = useOffline();
  const { height: windowHeight } = useWindowDimensions();

  const [feeds, setFeeds] = useState<FeedItem[]>(() => {
    if (!data?.settings?.rules) return INITIAL_FEEDS;
    return INITIAL_FEEDS.map((f) => {
      const match = data.settings.rules.find((r) => r.packageName === f.packageName);
      return {
        ...f,
        enabled: match ? match.enabled && match.feedMode !== "off" : f.enabled,
      };
    });
  });

  const [blockSocialWebsites, setBlockSocialWebsites] = useState(false);

  const toggleFeed = async (id: string) => {
    const target = feeds.find((f) => f.id === id);
    if (!target) return;

    const nextEnabled = !target.enabled;
    setFeeds((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: nextEnabled } : f))
    );

    try {
      await command("rule", {
        packageName: target.packageName,
        enabled: nextEnabled,
        feedMode: nextEnabled
          ? target.id === "tiktok"
            ? "whole_app"
            : "experimental"
          : "off",
      });
    } catch {
      // Offline fallback
    }
  };

  const handlePreviewOverlay = () => {
    onClose();
    open?.("shortform-block");
  };

  const activeFeedsCount = feeds.filter((f) => f.enabled).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
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
                  <Text style={[s.headerTitle, { color: p.textPrimary }]}>
                    Short-form feeds
                  </Text>
                  <Text style={[s.headerSubtitle, { color: p.textSecondary }]}>
                    Reels · Shorts · Spotlight · TikTok
                  </Text>
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
              {/* Feeds Section Header */}
              <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
                  Supported feeds
                </Text>
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
                {feeds.map((feed, idx) => (
                  <View
                    key={feed.id}
                    style={[
                      s.feedRow,
                      idx < feeds.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: p.borderSubtle,
                      },
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
                        color={feed.enabled ? p.brandPrimary : p.textSecondary}
                      />
                    </View>

                    <View style={s.feedInfo}>
                      <View style={s.feedTitleRow}>
                        <Text style={[s.feedName, { color: p.textPrimary }]}>
                          {feed.name}
                        </Text>
                        <View
                          style={[
                            s.badgePill,
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
                              s.badgeText,
                              {
                                color:
                                  feed.badgeTone === "good"
                                    ? p.success
                                    : p.warning,
                              },
                            ]}
                          >
                            {feed.badge}
                          </Text>
                        </View>
                      </View>
                      <Text style={[s.feedDetail, { color: p.textSecondary }]}>
                        {feed.statusText}
                      </Text>
                    </View>

                    <Switch
                      accessibilityLabel={`Toggle ${feed.name} feed protection`}
                      value={feed.enabled}
                      onValueChange={() => void toggleFeed(feed.id)}
                      trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                ))}
              </View>

              {/* Truthful TikTok Fallback Notice */}
              <View
                style={[
                  s.noticeBanner,
                  {
                    backgroundColor: p.warningSurface,
                    borderColor: p.warning,
                  },
                ]}
              >
                <View style={s.noticeHeader}>
                  <Icon name="alert-circle-outline" size={18} color={p.warning} />
                  <Text style={[s.noticeTitle, { color: p.warning }]}>
                    TikTok fallback in use
                  </Text>
                </View>
                <Text style={[s.noticeBody, { color: p.textSecondary }]}>
                  This device uses whole-app restriction for TikTok instead of
                  pretending feed-only control works reliably.
                </Text>
              </View>

              {/* Social Websites Toggle */}
              <View
                style={[
                  s.toggleCard,
                  { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
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
                  <Icon name="web" size={19} color={p.brandPrimary} />
                </View>

                <View style={s.toggleInfo}>
                  <Text style={[s.toggleTitle, { color: p.textPrimary }]}>
                    Block social websites
                  </Text>
                  <Text style={[s.toggleDetail, { color: p.textSecondary }]}>
                    Applies to configured DNS protection
                  </Text>
                </View>

                <Switch
                  accessibilityLabel="Block social websites"
                  value={blockSocialWebsites}
                  onValueChange={setBlockSocialWebsites}
                  trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Preview Feed-Block Overlay Button */}
              {open && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Preview feed-block overlay"
                  onPress={handlePreviewOverlay}
                  style={[
                    s.previewBtn,
                    {
                      backgroundColor: p.surfacePrimary,
                      borderColor: p.borderSubtle,
                    },
                  ]}
                >
                  <Icon name="eye-outline" size={17} color={p.brandPrimary} />
                  <Text style={[s.previewBtnText, { color: p.textPrimary }]}>
                    Preview feed-block overlay
                  </Text>
                </Pressable>
              )}
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
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  previewBtnText: {
    fontSize: 12,
    fontWeight: "600",
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
