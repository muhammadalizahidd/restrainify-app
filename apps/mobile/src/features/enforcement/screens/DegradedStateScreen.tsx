import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";

export interface DegradedStateScreenProps {
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

interface CapabilityItem {
  id: string;
  icon: IconName;
  title: string;
  subtitle: string;
  status: "active" | "degraded";
  statusText: string;
  repairRoute?: string;
  repairParam?: string;
}

/**
 * DegradedStateScreen implements STATE-03: Degraded Protection State
 * from the Restrainify UI Architecture specification.
 *
 * Provides an actionable capability repair surface. An impaired capability
 * is never masked as operational; the user is given a direct resolution path.
 *
 * Backend mapping:
 * - Live capability status from `snapshot.capabilities` (OfflineRuntime.kt:192-198)
 * - Directly triggers resolution workflows.
 */
export function DegradedStateScreen({
  open,
  onBack,
}: DegradedStateScreenProps) {
  const { snapshot: data, palette: p } = useOffline();

  // Evaluate live capability states
  const webActive = Boolean(data?.capabilities.vpn && !data?.capabilities.vpnError);
  const appActive = Boolean(data?.capabilities.accessibility && data?.settings.accessibilityConsent);
  const usageActive = Boolean(data?.capabilities.usage);

  const capabilities: CapabilityItem[] = [
    {
      id: "visual",
      icon: "eye-off-outline",
      title: "Visual Protection",
      subtitle: "Screen analysis is unavailable",
      status: "degraded",
      statusText: "Degraded",
      repairRoute: "permission-disclosure",
      repairParam: "accessibility",
    },
    {
      id: "website",
      icon: "web",
      title: "Website Protection",
      subtitle: webActive ? "No issue detected" : "Local filter needs attention",
      status: webActive ? "active" : "degraded",
      statusText: webActive ? "Active" : "Degraded",
      repairRoute: "website-protection",
    },
    {
      id: "app",
      icon: "cellphone-cog",
      title: "App Controls",
      subtitle: appActive && usageActive ? "No issue detected" : "Usage access required",
      status: appActive && usageActive ? "active" : "degraded",
      statusText: appActive && usageActive ? "Active" : "Degraded",
      repairRoute: "permission-disclosure",
      repairParam: "usage",
    },
  ];

  const handleRepairVisual = () => {
    if (open) {
      open("permission-disclosure", { permissionType: "accessibility" });
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContainer,
        { backgroundColor: p.backgroundPrimary },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Back Header */}
      <View style={styles.headerRow}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[
              styles.backButton,
              {
                backgroundColor: p.surfacePrimary,
                borderColor: p.borderSubtle,
              },
            ]}
          >
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={styles.titleWrap}>
          <Text style={[styles.headerKicker, { color: p.textSecondary }]}>
            DEGRADED STATE · TRUTHFUL
          </Text>
          <Text
            accessibilityRole="header"
            style={[styles.headerTitle, { color: p.textPrimary }]}
          >
            Protection Health
          </Text>
        </View>
      </View>

      {/* 2. Warning Notice Card */}
      <View
        style={[
          styles.noticeCard,
          {
            backgroundColor: p.warningSurface,
            borderColor: p.borderSubtle,
          },
        ]}
      >
        <View style={styles.noticeIconWrap}>
          <Icon name="alert-circle-outline" size={22} color={p.warning} />
        </View>
        <View style={styles.noticeTextWrap}>
          <Text style={[styles.noticeTitle, { color: p.warning }]}>
            Protection needs attention
          </Text>
          <Text style={[styles.noticeBody, { color: p.textSecondary }]}>
            Visual Protection cannot currently run because a required device
            capability is unavailable.
          </Text>
        </View>
      </View>

      {/* 3. Section: Affected capability */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
          Affected capability
        </Text>
      </View>

      {/* 4. Capability Rows */}
      <View
        style={[
          styles.rowList,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
          },
        ]}
      >
        {capabilities.map((item, idx) => {
          const isLast = idx === capabilities.length - 1;
          const isDegraded = item.status === "degraded";

          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}: ${item.statusText}`}
              onPress={() => {
                if (item.repairRoute && open) {
                  open(
                    item.repairRoute,
                    item.repairParam ? { permissionType: item.repairParam } : undefined
                  );
                }
              }}
              style={({ pressed }) => [
                styles.row,
                !isLast && { borderBottomColor: p.borderSubtle, borderBottomWidth: 1 },
                pressed && styles.rowPressed,
              ]}
            >
              <View
                style={[
                  styles.rowIconWrap,
                  {
                    backgroundColor: isDegraded
                      ? p.warningSurface
                      : p.successSurface,
                  },
                ]}
              >
                <Icon
                  name={item.icon}
                  size={18}
                  color={isDegraded ? p.warning : p.success}
                />
              </View>

              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: p.textPrimary }]}>
                  {item.title}
                </Text>
                <Text style={[styles.rowSubtitle, { color: p.textSecondary }]}>
                  {item.subtitle}
                </Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: isDegraded
                      ? p.warningSurface
                      : p.successSurface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    { color: isDegraded ? p.warning : p.success },
                  ]}
                >
                  {item.statusText}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* 5. Primary Action Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Repair Visual Protection"
        onPress={handleRepairVisual}
        style={({ pressed }) => [
          styles.repairBtn,
          { backgroundColor: p.brandPrimary },
          pressed && styles.btnPressed,
        ]}
      >
        <Text style={[styles.repairBtnText, { color: p.backgroundPrimary }]}>
          Repair Visual Protection
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    letterSpacing: 1.3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginTop: 2,
  },
  noticeCard: {
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 22,
  },
  noticeIconWrap: {
    marginTop: 2,
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  noticeBody: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  sectionHeader: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  rowList: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  rowSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  repairBtn: {
    width: "100%",
    minHeight: 48,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  repairBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  btnPressed: {
    opacity: 0.8,
  },
});
