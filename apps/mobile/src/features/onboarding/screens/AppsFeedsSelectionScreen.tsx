import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";
import { offlineProtection, type InstalledApp } from "../../../native/OfflineProtection";

export interface AppsFeedsSelectionScreenProps {
  onNext: (configuredCount: number) => void;
  onBack: () => void;
}

interface HighRiskSurface {
  packageName: string;
  name: string;
  category: string;
  icon: IconName;
  feedSupported: boolean;
  feedNote?: string;
}

const CURATED_SURFACES: HighRiskSurface[] = [
  {
    packageName: "com.instagram.android",
    name: "Instagram",
    category: "Reels & Explore Feed",
    icon: "camera-outline",
    feedSupported: true,
  },
  {
    packageName: "com.google.android.youtube",
    name: "YouTube",
    category: "Shorts & Home Feed",
    icon: "play-circle-outline",
    feedSupported: true,
  },
  {
    packageName: "com.zhiliaoapp.musically",
    name: "TikTok",
    category: "Full App Restriction",
    icon: "music-note",
    feedSupported: false,
    feedNote: "Feed-only isolation is not reliably supported; whole app restriction applies.",
  },
  {
    packageName: "com.snapchat.android",
    name: "Snapchat",
    category: "Spotlight & Discover",
    icon: "ghost",
    feedSupported: false,
    feedNote: "Whole app pause during focus sessions.",
  },
  {
    packageName: "com.reddit.frontpage",
    name: "Reddit",
    category: "Infinite Feeds & Media",
    icon: "reddit",
    feedSupported: false,
  },
  {
    packageName: "com.twitter.android",
    name: "X (Twitter)",
    category: "For You Feed",
    icon: "twitter",
    feedSupported: false,
  },
];

/**
 * ONB-08: Apps & Feeds Selection Screen (Setup Step 4/6)
 *
 * Lets users pick high-risk apps and short-form video surfaces to protect.
 * Discloses feed-level vs full-app restriction capabilities truthfully.
 * Supports adding other installed apps via offlineProtection.apps().
 *
 * Frontend → Backend mapping:
 *   Selected app rules saved via command("rule", {
 *     packageName,
 *     feedMode: feedSupported ? "experimental" : "whole_app",
 *     enabled: true,
 *     burst: true,
 *     days: [1,2,3,4,5,6,7]
 *   }) → OfflineRuntime.kt:100-119
 */
export function AppsFeedsSelectionScreen({
  onNext,
  onBack,
}: AppsFeedsSelectionScreenProps) {
  const { palette: p, command } = useOffline();

  // Selected package names
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(
    new Set(["com.instagram.android", "com.google.android.youtube"])
  );

  // Expandable other installed apps
  const [showInstalledPicker, setShowInstalledPicker] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [installedLoading, setInstalledLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // Load installed apps when requested
  useEffect(() => {
    if (showInstalledPicker && installedApps.length === 0) {
      setInstalledLoading(true);
      offlineProtection
        .apps()
        .then((apps) => {
          // Filter out system/internal packages and already curated ones
          const curatedPkgs = new Set(CURATED_SURFACES.map((c) => c.packageName));
          const nonCurated = apps.filter((a) => !curatedPkgs.has(a.packageName));
          setInstalledApps(nonCurated);
        })
        .catch(() => {
          setInstalledApps([]);
        })
        .finally(() => {
          setInstalledLoading(false);
        });
    }
  }, [showInstalledPicker, installedApps.length]);

  const togglePackage = (pkg: string) => {
    setSelectedPackages((prev) => {
      const next = new Set(prev);
      if (next.has(pkg)) {
        next.delete(pkg);
      } else {
        next.add(pkg);
      }
      return next;
    });
  };

  const filteredInstalled = useMemo(() => {
    if (!searchQuery.trim()) return installedApps.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return installedApps.filter(
      (a) =>
        a.label.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [installedApps, searchQuery]);

  const handleContinue = async () => {
    setSaving(true);
    try {
      // Save all selected app rules to OfflineRuntime
      const curatedMap = new Map(CURATED_SURFACES.map((c) => [c.packageName, c]));

      for (const pkg of selectedPackages) {
        const curated = curatedMap.get(pkg);
        const feedMode = curated?.feedSupported ? "experimental" : "whole_app";
        await command("rule", {
          packageName: pkg,
          feedMode,
          enabled: true,
          burst: true,
          days: [1, 2, 3, 4, 5, 6, 7],
        });
      }
      onNext(selectedPackages.size);
    } catch {
      onNext(selectedPackages.size);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: p.backgroundPrimary }]}>
      {/* Header */}
      <View style={s.headerArea}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={[s.backBtn, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}
        >
          <Icon name="arrow-left" size={20} color={p.textPrimary} />
        </Pressable>
        <View style={[s.stepBadge, { backgroundColor: p.surfaceMuted }]}>
          <Text style={[s.stepText, { color: p.brandPrimary }]}>Step 4 of 6</Text>
        </View>
        <View style={s.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.title, { color: p.textPrimary }]}>
          Apps & Feeds
        </Text>
        <Text style={[s.subtitle, { color: p.textSecondary }]}>
          Select high-risk apps and short-form video feeds you want to keep under control.
        </Text>

        {/* Curated List */}
        <View style={s.listContainer}>
          {CURATED_SURFACES.map((surface) => {
            const isSelected = selectedPackages.has(surface.packageName);
            return (
              <View
                key={surface.packageName}
                style={[
                  s.card,
                  {
                    backgroundColor: isSelected ? p.surfaceMuted : p.surfacePrimary,
                    borderColor: isSelected ? p.brandPrimary : p.borderSubtle,
                  },
                ]}
              >
                <View style={s.cardTop}>
                  <View
                    style={[
                      s.iconWrap,
                      {
                        backgroundColor: isSelected
                          ? p.brandPrimary
                          : p.surfaceMuted,
                      },
                    ]}
                  >
                    <Icon
                      name={surface.icon}
                      size={22}
                      color={isSelected ? p.backgroundPrimary : p.textSecondary}
                    />
                  </View>

                  <View style={s.cardInfo}>
                    <Text style={[s.cardTitle, { color: p.textPrimary }]}>
                      {surface.name}
                    </Text>
                    <Text style={[s.cardCategory, { color: p.textSecondary }]}>
                      {surface.category}
                    </Text>
                  </View>

                  <Switch
                    value={isSelected}
                    onValueChange={() => togglePackage(surface.packageName)}
                    trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
                    thumbColor={isSelected ? p.surfacePrimary : p.textSecondary}
                    accessibilityLabel={`Toggle ${surface.name}`}
                  />
                </View>

                {/* Capability disclosure */}
                {surface.feedNote ? (
                  <View
                    style={[
                      s.noteWrap,
                      {
                        backgroundColor: p.surfaceMuted,
                        borderLeftColor: p.warning,
                      },
                    ]}
                  >
                    <Icon name="information-outline" size={14} color={p.warning} />
                    <Text style={[s.noteText, { color: p.textSecondary }]}>
                      {surface.feedNote}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Expandable Other Installed Apps */}
        <Pressable
          style={[
            s.expandButton,
            {
              backgroundColor: p.surfacePrimary,
              borderColor: p.borderSubtle,
            },
          ]}
          onPress={() => setShowInstalledPicker((prev) => !prev)}
        >
          <Icon
            name={showInstalledPicker ? "chevron-up" : "plus-circle-outline"}
            size={18}
            color={p.brandPrimary}
          />
          <Text style={[s.expandButtonText, { color: p.brandPrimary }]}>
            {showInstalledPicker
              ? "Hide installed apps"
              : "Add other installed apps"}
          </Text>
        </Pressable>

        {showInstalledPicker && (
          <View
            style={[
              s.installedSection,
              {
                backgroundColor: p.surfacePrimary,
                borderColor: p.borderSubtle,
              },
            ]}
          >
            <TextInput
              style={[
                s.searchInput,
                {
                  backgroundColor: p.surfaceMuted,
                  borderColor: p.borderSubtle,
                  color: p.textPrimary,
                },
              ]}
              placeholder="Search installed apps..."
              placeholderTextColor={p.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {installedLoading ? (
              <ActivityIndicator
                size="small"
                color={p.brandPrimary}
                style={{ paddingVertical: 16 }}
              />
            ) : filteredInstalled.length === 0 ? (
              <Text
                style={[
                  s.emptyText,
                  { color: p.textSecondary },
                ]}
              >
                {searchQuery ? "No matching apps found." : "No additional apps detected."}
              </Text>
            ) : (
              filteredInstalled.map((app) => {
                const isSelected = selectedPackages.has(app.packageName);
                return (
                  <Pressable
                    key={app.packageName}
                    style={[
                      s.installedRow,
                      {
                        borderBottomColor: p.borderSubtle,
                        backgroundColor: isSelected
                          ? p.surfaceMuted
                          : "transparent",
                      },
                    ]}
                    onPress={() => togglePackage(app.packageName)}
                  >
                    <View style={s.installedInfo}>
                      <Text
                        style={[s.installedLabel, { color: p.textPrimary }]}
                        numberOfLines={1}
                      >
                        {app.label}
                      </Text>
                      <Text
                        style={[s.installedPkg, { color: p.textSecondary }]}
                        numberOfLines={1}
                      >
                        {app.packageName}
                      </Text>
                    </View>
                    <Switch
                      value={isSelected}
                      onValueChange={() => togglePackage(app.packageName)}
                      trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
                      thumbColor={isSelected ? p.surfacePrimary : p.textSecondary}
                    />
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        <View style={s.bottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View
        style={[
          s.footerArea,
          {
            backgroundColor: p.backgroundPrimary,
            borderTopColor: p.borderSubtle,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue to next step"
          disabled={saving}
          onPress={handleContinue}
          style={[
            s.primaryBtn,
            {
              backgroundColor: p.brandPrimary,
              opacity: saving ? 0.7 : 1,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={p.backgroundPrimary} />
          ) : (
            <Text style={[s.primaryBtnText, { color: p.backgroundPrimary }]}>
              {selectedPackages.size > 0
                ? `Protect ${selectedPackages.size} ${selectedPackages.size === 1 ? "App" : "Apps"}`
                : "Continue"}
            </Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip apps selection"
          disabled={saving}
          onPress={() => onNext(0)}
          style={s.skipBtn}
        >
          <Text style={[s.skipBtnText, { color: p.textSecondary }]}>
            Skip for now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepText: {
    fontSize: 12,
    fontWeight: "700",
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  listContainer: {
    gap: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  noteWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    marginTop: 10,
  },
  noteText: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  installedSection: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  searchInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 14,
  },
  installedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  installedInfo: {
    flex: 1,
    marginRight: 10,
  },
  installedLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  installedPkg: {
    fontSize: 11,
    marginTop: 2,
  },
  bottomSpacer: {
    height: 24,
  },
  footerArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    gap: 8,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  skipBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
