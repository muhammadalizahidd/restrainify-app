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
 * VisualProtectionScreen displays the streamlined Protected Apps view.
 * All legacy clutter (notice banner, explicit/suggestive cards, person filtering sliders)
 * has been discarded per UX specification.
 */
export function VisualProtectionScreen({ onBack }: VisualProtectionScreenProps) {
  const { palette: p } = useOffline();
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
    <View style={s.container}>
      {/* 1. Subscreen Header */}
      <View style={s.headerRow}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[
              s.backButton,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={s.titleWrap}>
          <Text style={[s.headerKicker, { color: p.textSecondary }]}>
            On-device visual filtering
          </Text>
          <Text style={[s.headerTitle, { color: p.textPrimary }]}>
            Visual Protection
          </Text>
        </View>
      </View>

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
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
  },
  headerKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 13,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
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
