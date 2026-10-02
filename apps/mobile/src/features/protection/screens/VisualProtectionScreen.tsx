import { useState } from "react";
import { Alert, StyleSheet, View, Pressable } from "react-native";
import { Text, TextInput } from "../../../components/AppText";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, ToggleSwitch, type IconName, SurfaceGradient } from "../../../components/OfflineUI";
import { isVisualBlockingOn, setVisualBlocking } from "../utils/visualBlocking";
import { disclosureParams, hasVisualConsent } from "../utils/consent";

export interface VisualProtectionScreenProps {
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

interface VisualContextApp {
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
    id: "tt",
    name: "TikTok",
    packageName: "com.zhiliaoapp.musically",
    icon: "cellphone-lock",
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
    id: "yt",
    name: "YouTube",
    packageName: "com.google.android.youtube",
    icon: "youtube",
    supported: true,
    enabled: true,
  },
  {
    id: "rd",
    name: "Reddit",
    packageName: "com.reddit.frontpage",
    icon: "reddit",
    supported: false,
    enabled: false,
  },
  {
    id: "tw",
    name: "X (Twitter)",
    packageName: "com.twitter.android",
    icon: "twitter",
    supported: false,
    enabled: false,
  },
  {
    id: "tg",
    name: "Telegram",
    packageName: "org.telegram.messenger",
    icon: "send",
    supported: false,
    enabled: false,
  },
  {
    id: "wa",
    name: "WhatsApp",
    packageName: "com.whatsapp",
    icon: "whatsapp",
    supported: false,
    enabled: false,
  },
  {
    id: "ch",
    name: "Chrome Browser",
    packageName: "com.android.chrome",
    icon: "web",
    supported: false,
    enabled: false,
  },
];

/**
 * VisualProtectionScreen displays the streamlined Protected Apps view
 * alongside the on-device dual-model AI diagnostics and consent controls.
 */
export function VisualProtectionScreen({ open, onBack }: VisualProtectionScreenProps) {
  const { snapshot: data, palette: p, command } = useOffline();
  const [search, setSearch] = useState("");
  const [apps, setApps] = useState<VisualContextApp[]>(DEFAULT_SUPPORTED_APPS);

  const toggleApp = (id: string) => {
    setApps((prev) =>
      prev.map((app) => (app.id === id ? { ...app, enabled: !app.enabled } : app))
    );
  };

  const hasAccessibility = Boolean(data?.capabilities.accessibility && data?.settings.accessibilityConsent);
  const visualAiActive = Boolean(hasAccessibility && isVisualBlockingOn(data));
  const visualAiStatus = !data?.settings.accessibilityConsent
    ? "Review the Restrainify Accessibility consent"
    : !data?.capabilities.accessibility
      ? "Enable Restrainify in Android Accessibility"
      : !isVisualBlockingOn(data)
        ? "Visual blocking is off"
        : "Visual blocking active";
  const visualAiStatusDetail = !data?.settings.accessibilityConsent
    ? "Accept the on-device processing consent below."
    : !data?.capabilities.accessibility
      ? "Open Android Accessibility settings and enable Restrainify app restrictions."
      : !isVisualBlockingOn(data)
        ? "Turn on Block explicit content below."
        : "Explicit content in supported apps is covered.";

  const filteredApps = apps.filter(
    (app) =>
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.packageName.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCount = apps.filter((a) => a.supported && a.enabled).length;

  return (
    <View style={s.container}>
      {/* 1. Subscreen Header */}
      <View style={s.headerRow}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            style={[
              s.backButton,
              { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
            ]}
          ><SurfaceGradient />
            <Icon name="arrow-left" size={18} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={s.titleWrap}>
          <Text style={[s.headerTitle, { color: p.textPrimary }]}>
            Visual Protection
          </Text>
        </View>
      </View>

      {/* Visual AI Status Banner */}
      <View
        style={[
          s.noticeCard,
          {
            backgroundColor: visualAiActive ? p.successSurface : p.surfaceMuted,
            borderColor: visualAiActive ? p.success : p.borderSubtle,
          },
        ]}
      >
        <View style={s.noticeHeader}>
          <Icon
            name="eye-outline"
            size={20}
            color={visualAiActive ? p.success : p.textSecondary}
          />
          <Text
            style={[
              s.noticeTitle,
              { color: visualAiActive ? p.success : p.textPrimary },
            ]}
          >
            {visualAiStatus}
          </Text>
        </View>
        <Text style={[s.noticeBody, { color: p.textSecondary }]}>
          {visualAiStatusDetail}
        </Text>
      </View>

      {/* Visual filter settings */}
      {data && (
        <View style={s.sectionWrap}>
          <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Visual filter</Text>
          <View style={[s.card, { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle }]}><SurfaceGradient />
            <View style={s.toggleRow}>
              <View style={s.copyBox}>
                <Text style={[s.rowTitle, { color: p.textPrimary }]}>Consent to on-device visual filtering</Text>
                <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>Frames stay on this device, are processed in memory, and are never stored or uploaded.</Text>
              </View>
              <ToggleSwitch
                accessibilityLabel="Consent to on-device visual filtering"
                value={data.settings.accessibilityConsent}
                onValueChange={(value) => void command("setting", { key: "accessibilityConsent", value })}
              />
            </View>
            <View style={s.toggleRow}>
              <View style={s.copyBox}>
                <Text style={[s.rowTitle, { color: p.textPrimary }]}>Block explicit content</Text>
                <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>Covers explicit content in supported apps.</Text>
              </View>
              <ToggleSwitch
                accessibilityLabel="Block explicit content"
                value={hasAccessibility && isVisualBlockingOn(data)}
                onValueChange={(value) => {
                  if (value && !hasAccessibility) {
                    Alert.alert(
                      "Accessibility required",
                      "Turn on Restrainify Accessibility first, then switch this on.",
                      [
                        { text: "Not now", style: "cancel" },
                        {
                          text: "Turn on Accessibility",
                          onPress: () =>
                            open?.("permission-disclosure", {
                              permissionType: "accessibility",
                              returnRoute: "visual-protection",
                            }),
                        },
                      ]
                    );
                    return;
                  }
                  if (value && !hasVisualConsent(data)) {
                    open?.("permission-disclosure", disclosureParams("visual", "visual-protection"));
                    return;
                  }
                  void setVisualBlocking(command, value);
                }}
              />

            </View>
            <View style={s.toggleRow}>
              <View style={s.copyBox}>
                <Text style={[s.rowTitle, { color: p.textPrimary }]}>Allow “Show Reel”</Text>
                <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>Adds a button on the cover to reveal one reel</Text>
              </View>
              <ToggleSwitch accessibilityLabel="Allow Show Reel" value={data.settings.allowShowReel} disabled={!data.settings.visualAiEnabled} onValueChange={(value) => void command("setting", { key: "allowShowReel", value })} />
            </View>
          </View>
        </View>
      )}

      {/* 2. Search Input */}
      <TextInput
        accessibilityLabel="Search installed apps"
        placeholder="Search installed apps"
        placeholderTextColor={p.textMuted}
        value={search}
        onChangeText={setSearch}
        style={[
          s.searchInput,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
            color: p.textPrimary,
          },
        ]}
      />

      {/* 3. Section Header */}
      <View style={s.sectionHeaderRow}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Supported apps</Text>
        <Text style={[s.sectionKicker, { color: p.textSecondary }]}>
          {selectedCount} SELECTED
        </Text>
      </View>

      {/* 4. Apps List */}
      <View
        style={[
          s.appsCard,
          { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
        ]}
      ><SurfaceGradient />
        {filteredApps.map((app, idx) => (
          <View
            key={app.id}
            style={[
              s.appRow,
              idx < filteredApps.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: p.borderSubtle,
              },
            ]}
          >
            <View
              style={[
                s.iconBox,
                {
                  backgroundColor: p.backgroundPrimary,
                  borderColor: p.borderSubtle,
                },
              ]}
            >
              <Icon
                name={app.icon}
                size={20}
                color={app.supported ? p.brandPrimary : p.textMuted}
              />
            </View>

            <View style={s.appInfo}>
              <Text style={[s.appName, { color: p.textPrimary }]}>{app.name}</Text>
              <Text style={[s.appDetail, { color: p.textSecondary }]}>
                {app.supported ? "" : "Not supported"}
              </Text>
            </View>

            {app.supported ? (
              <ToggleSwitch
                accessibilityLabel={`Toggle visual protection for ${app.name}`}
                value={app.enabled}
                onValueChange={() => toggleApp(app.id)}
              />
            ) : (
              <View style={[s.badgePill, { overflow: "hidden", backgroundColor: "transparent" }]}><SurfaceGradient tone="muted" />
                <Text style={[s.badgeText, { color: p.textMuted }]}>Not supported</Text>
              </View>
            )}
          </View>
        ))}
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 12,
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
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  noticeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    marginTop: 2,
    gap: 8,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  noticeBody: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  sectionWrap: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  copyBox: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 17,
  },
  rowSubtitle: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  sectionKicker: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  appsCard: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 14,
    fontWeight: "700",
  },
  appDetail: {
    fontSize: 11,
    marginTop: 2,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  privacyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  privacyText: {
    fontSize: 11.5,
    lineHeight: 17,
  },
});
