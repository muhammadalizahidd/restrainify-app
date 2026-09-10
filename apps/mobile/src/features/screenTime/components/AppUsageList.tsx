import { StyleSheet, Text, View, Pressable } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, duration, type IconName } from "../../../components/OfflineUI";
import type { AppRule, InstalledApp } from "../../../native/OfflineProtection";

export interface AppUsageListProps {
  apps: (InstalledApp & { ms: number })[];
  rules: AppRule[];
  timeframe: "day" | "week";
  onSelectApp: (packageName: string) => void;
}

function getAppIcon(packageName: string): IconName {
  const p = packageName.toLowerCase();
  if (p.includes("instagram")) return "instagram";
  if (p.includes("youtube")) return "youtube";
  if (p.includes("chrome") || p.includes("browser")) return "web";
  if (p.includes("reddit")) return "reddit";
  if (p.includes("tiktok")) return "video";
  if (p.includes("snapchat")) return "camera";
  if (p.includes("facebook")) return "facebook";
  if (p.includes("twitter") || p.includes("x.com")) return "twitter";
  return "apps";
}

/**
 * AppUsageList displays sorted per-app usage rows
 * with configured daily limit comparisons and drill-down navigation.
 *
 * Backend mapping:
 * - apps: snapshot.usage.apps
 * - rules: snapshot.settings.rules
 */
export function AppUsageList({
  apps,
  rules,
  timeframe,
  onSelectApp,
}: AppUsageListProps) {
  const { palette: p } = useOffline();

  // Filter apps with non-zero usage or configured limits, take top 15
  const displayApps = apps.filter((a) => a.ms > 0).slice(0, 15);

  return (
    <View style={s.container}>
      {/* Section Header */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>App usage</Text>
        <View style={[s.pill, { backgroundColor: p.surfaceMuted }]}>
          <Text style={[s.pillText, { color: p.textSecondary }]}>
            {timeframe === "day" ? "TODAY" : "7 DAYS"}
          </Text>
        </View>
      </View>

      {/* App List Container */}
      <View
        style={[
          s.rowList,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {displayApps.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={[s.emptyText, { color: p.textSecondary }]}>
              No app usage recorded yet.
            </Text>
          </View>
        ) : (
          displayApps.map((app, index) => {
            const rule = rules.find(
              (r) => r.packageName === app.packageName && r.enabled
            );

            const hasLimit = rule && rule.limitMinutes > 0;
            const limitMs = hasLimit ? rule.limitMinutes * 60 * 1000 : 0;
            const isOverLimit = hasLimit && timeframe === "day" && app.ms >= limitMs;

            const iconName = getAppIcon(app.packageName);
            const usageDuration = duration(app.ms);

            const statusText = hasLimit && timeframe === "day"
              ? `${usageDuration} / ${duration(limitMs)}`
              : usageDuration;

            const isLast = index === displayApps.length - 1;

            return (
              <Pressable
                key={app.packageName}
                accessibilityRole="button"
                accessibilityLabel={`${app.label}: ${statusText}`}
                onPress={() => onSelectApp(app.packageName)}
                style={({ pressed }) => [
                  s.row,
                  !isLast && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: p.borderSubtle,
                  },
                  pressed && { backgroundColor: p.surfaceMuted },
                ]}
              >
                {/* App Icon */}
                <View
                  style={[
                    s.iconWrap,
                    {
                      backgroundColor: isOverLimit
                        ? p.dangerSurface
                        : p.surfaceMuted,
                    },
                  ]}
                >
                  <Icon
                    name={iconName}
                    size={20}
                    color={isOverLimit ? p.danger : p.brandPrimary}
                  />
                </View>

                {/* App Name & Detail */}
                <View style={s.copyWrap}>
                  <Text
                    numberOfLines={1}
                    style={[s.appTitle, { color: p.textPrimary }]}
                  >
                    {app.label}
                  </Text>
                  <Text style={[s.appSubtitle, { color: p.textSecondary }]}>
                    {hasLimit ? "Controlled app" : "Foreground session"}
                  </Text>
                </View>

                {/* Right Status */}
                <View style={s.statusWrap}>
                  <Text
                    style={[
                      s.statusText,
                      { color: isOverLimit ? p.danger : p.textSecondary },
                      isOverLimit && s.statusOverLimit,
                    ]}
                  >
                    {statusText}
                  </Text>
                  <Icon name="chevron-right" size={17} color={p.textMuted} />
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 18,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  pillText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  rowList: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 60,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  copyWrap: {
    flex: 1,
    minWidth: 0,
  },
  appTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 17,
  },
  appSubtitle: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  statusWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusOverLimit: {
    fontWeight: "700",
  },
  emptyWrap: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
