import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Switch,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";

export interface ProtectedVisualContextsScreenProps {
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

/**
 * ProtectedVisualContextsScreen implements SET-VIS-02: Protected Contexts
 * from the Restrainify UI Architecture specification.
 *
 * Configures the scope of on-device visual AI filtering, allowing the user
 * to specify exactly which supported applications trigger on-screen scanning.
 */
export function ProtectedVisualContextsScreen({
  onBack,
}: ProtectedVisualContextsScreenProps) {
  const { palette: p } = useOffline();
  const [search, setSearch] = useState("");
  const [apps, setApps] = useState<VisualContextApp[]>([
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
  ]);

  const toggleApp = (id: string) => {
    setApps((prev) =>
      prev.map((app) =>
        app.id === id ? { ...app, enabled: !app.enabled } : app
      )
    );
  };

  const filteredApps = apps.filter(
    (app) =>
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.packageName.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCount = apps.filter((a) => a.supported && a.enabled).length;

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
            Supported, user-selected scope
          </Text>
          <Text style={[styles.headerTitle, { color: p.textPrimary }]}>
            Protected visual contexts
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
          styles.searchInput,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
            color: p.textPrimary,
          },
        ]}
      />

      {/* 3. Section Title */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
          Supported apps
        </Text>
        <Text style={[styles.sectionKicker, { color: p.textSecondary }]}>
          {selectedCount} SELECTED
        </Text>
      </View>

      {/* 4. Apps List */}
      <View
        style={[
          styles.appsCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {filteredApps.map((app, idx) => (
          <View
            key={app.id}
            style={[
              styles.appRow,
              idx < filteredApps.length - 1 && {
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
              <Icon
                name={app.icon}
                size={20}
                color={app.supported ? p.brandPrimary : p.textMuted}
              />
            </View>

            <View style={styles.appInfo}>
              <Text style={[styles.appName, { color: p.textPrimary }]}>
                {app.name}
              </Text>
              <Text style={[styles.appDetail, { color: p.textSecondary }]}>
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
                trackColor={{ true: p.success, false: p.borderSubtle }}
              />
            ) : (
              <View
                style={[
                  styles.badgePill,
                  { backgroundColor: p.surfaceMuted },
                ]}
              >
                <Text
                  style={[styles.badgeText, { color: p.textMuted }]}
                >
                  Not supported
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* 5. Privacy Guarantee Footer */}
      <View
        style={[
          styles.privacyCard,
          { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
        ]}
      >
        <Text style={[styles.privacyText, { color: p.textSecondary }]}>
          Visual Protection runs only in the foreground while selected supported
          apps are actively displayed. Temporary screen buffers are evaluated
          locally and instantly discarded.
        </Text>
      </View>
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
  searchInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 2,
    marginTop: 2,
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
  appsCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  appRow: {
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
  appInfo: {
    flex: 1,
    gap: 2,
  },
  appName: {
    fontSize: 15,
    fontWeight: "600",
  },
  appDetail: {
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
    fontWeight: "600",
  },
  privacyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  privacyText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
