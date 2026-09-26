import { useState } from "react";
import { StyleSheet, Text, View, Pressable, TextInput, Switch } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";

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
  const visualAiActive = Boolean(hasAccessibility && data?.settings.visualAiEnabled);
  const visualAiStatus = !data?.settings.accessibilityConsent
    ? "Review the Restrainify Accessibility consent"
    : !data?.capabilities.accessibility
      ? "Enable Restrainify in Android Accessibility"
      : !data?.settings.visualAiEnabled
        ? "Visual AI sampling is off"
        : "Visual AI sampling active";
  const visualAiStatusDetail = !data?.settings.accessibilityConsent
    ? "Accept the on-device visual-processing disclosure below. Android permission alone is not consent."
    : !data?.capabilities.accessibility
      ? "Open Android Accessibility settings and enable Restrainify app restrictions."
      : !data?.settings.visualAiEnabled
        ? "Turn on Sample supported apps below to begin local scoring."
        : "Viddexa and NSFWJS sample supported apps locally. Blocking requires the same sexual top category from both.";

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
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <Icon name="arrow-left" size={18} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={s.titleWrap}>
          <Text style={[s.headerKicker, { color: p.textSecondary }]}>
            LOCAL MACHINE LEARNING · ZERO UPLOADS
          </Text>
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

      {/* Dual-Model Testing & Diagnostics Card */}
      {data && (
        <View style={s.sectionWrap}>
          <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Dual-model testing</Text>
          <View style={[s.card, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}>
            <View style={s.toggleRow}>
              <View style={s.copyBox}>
                <Text style={[s.rowTitle, { color: p.textPrimary }]}>Consent to on-device visual filtering</Text>
                <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>Frames stay on this device, are processed in memory, and are never stored or uploaded.</Text>
              </View>
              <Switch
                accessibilityLabel="Consent to on-device visual filtering"
                value={data.settings.accessibilityConsent}
                onValueChange={(value) => void command("setting", { key: "accessibilityConsent", value })}
              />
            </View>
            <View style={s.toggleRow}>
              <View style={s.copyBox}>
                <Text style={[s.rowTitle, { color: p.textPrimary }]}>Sample supported apps</Text>
                <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>Two local models, one shared screen frame</Text>
              </View>
              <Switch value={data.settings.visualAiEnabled} onValueChange={(value) => void command("setting", { key: "visualAiEnabled", value })} />
            </View>
            <View style={s.toggleRow}>
              <View style={s.copyBox}>
                <Text style={[s.rowTitle, { color: p.textPrimary }]}>Allow “Show Reel”</Text>
                <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>Saved for the future blocker; inactive during score collection</Text>
              </View>
              <Switch value={data.settings.allowShowReel} disabled={!data.settings.visualAiEnabled} onValueChange={(value) => void command("setting", { key: "allowShowReel", value })} />
            </View>
            <View style={s.toggleRow}>
              <View style={s.copyBox}>
                <Text style={[s.rowTitle, { color: p.textPrimary }]}>Block detected reels</Text>
                <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>Requires an exact matching Sexy, Porn, or Hentai prediction</Text>
              </View>
              <Switch value={data.settings.visualAiBlockingEnabled} disabled={!data.settings.visualAiEnabled} onValueChange={(value) => void command("setting", { key: "visualAiBlockingEnabled", value })} />
            </View>
            <Text style={[s.helperText, { color: p.textSecondary }]}>
              {data.visualAi.failure ? `Status: ${data.visualAi.failure}` : data.visualAi.lastViddexa && data.visualAi.lastNsfwJs && data.visualAi.lastDecision ? `Viddexa ${data.visualAi.lastViddexa.topCategory}: N ${data.visualAi.lastViddexa.normal.toFixed(3)} · S ${data.visualAi.lastViddexa.sexy.toFixed(3)} · P ${data.visualAi.lastViddexa.porn.toFixed(3)} · H ${data.visualAi.lastViddexa.hentai.toFixed(3)} · D ${data.visualAi.lastViddexa.drawing.toFixed(3)} · ${data.visualAi.lastViddexa.inferenceMs} ms\nNSFWJS ${data.visualAi.lastNsfwJs.topCategory}: N ${data.visualAi.lastNsfwJs.normal.toFixed(3)} · S ${data.visualAi.lastNsfwJs.sexy.toFixed(3)} · P ${data.visualAi.lastNsfwJs.porn.toFixed(3)} · H ${data.visualAi.lastNsfwJs.hentai.toFixed(3)} · D ${data.visualAi.lastNsfwJs.drawing.toFixed(3)} · ${data.visualAi.lastNsfwJs.inferenceMs} ms\nVotes: Viddexa ${data.visualAi.lastDecision.viddexaSexualVote ? "YES" : "NO"} · NSFWJS ${data.visualAi.lastDecision.nsfwJsSexualVote ? "YES" : "NO"} · match ${data.visualAi.lastDecision.matchingSexualCategory ?? "none"} · NSFWJS Porn ${data.visualAi.lastDecision.nsfwJsPornFrameCount}/5${data.visualAi.lastDecision.nsfwJsPornWindowBlock ? " (threshold met)" : ""} · Final ${data.visualAi.lastDecision.finalDecision} · combined ${data.visualAi.lastLatencyMs ?? 0} ms` : "No dual-model frame sampled yet. Enable Accessibility access, turn this on, then open Instagram, TikTok, Snapchat, or YouTube."}
            </Text>
            <Text style={[s.helperText, { color: p.textSecondary }]}>Samples {data.visualAi.inferenceCount} · static skipped {data.visualAi.duplicateFrames} · busy skipped {data.visualAi.skippedFrames}</Text>
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
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
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
              />
            ) : (
              <View style={[s.badgePill, { backgroundColor: p.surfaceMuted }]}>
                <Text style={[s.badgeText, { color: p.textMuted }]}>Not supported</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* 5. Privacy Guarantee Footer */}
      <View
        style={[
          s.privacyCard,
          { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
        ]}
      >
        <Text style={[s.privacyText, { color: p.textSecondary }]}>
          Visual Protection runs only in the foreground while selected supported
          apps are actively displayed. Temporary screen buffers are evaluated
          locally and instantly discarded.
        </Text>
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
  helperText: {
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "500",
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
