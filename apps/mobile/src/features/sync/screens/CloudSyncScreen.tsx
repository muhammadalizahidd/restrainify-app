import { useState } from "react";
import { StyleSheet, Text, View, Pressable, Switch } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface CloudSyncScreenProps {
  open: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * CloudSyncScreen implements SET-SYNC-01: Cloud Sync
 * from the Restrainify UI Architecture specification.
 *
 * Demonstrates local-first synchronization guarantees, showing that local
 * mutations remain instantly usable and resilient to network outages.
 */
export function CloudSyncScreen({ open, onBack }: CloudSyncScreenProps) {
  const { palette: p } = useOffline();
  const [syncEnabled, setSyncEnabled] = useState(true);

  const localPoints = [
    "Core protection does not wait on cloud synchronization.",
    "Offline events stay usable locally and sync when connectivity returns.",
    "Failures expose retry/repair instead of silently losing changes.",
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
            Local-first optional sync
          </Text>
          <Text style={[styles.headerTitle, { color: p.textPrimary }]}>
            Cloud Sync
          </Text>
        </View>
      </View>

      {/* 2. Main Toggle Row */}
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
          <Icon name="cloud-sync-outline" size={20} color={p.brandPrimary} />
        </View>

        <View style={styles.toggleInfo}>
          <Text style={[styles.toggleTitle, { color: p.textPrimary }]}>
            Sync eligible data
          </Text>
          <Text style={[styles.toggleSubtitle, { color: p.textSecondary }]}>
            Local changes remain usable before sync completes
          </Text>
        </View>

        <Switch
          accessibilityLabel="Sync eligible data"
          value={syncEnabled}
          onValueChange={setSyncEnabled}
          trackColor={{ true: p.success, false: p.borderSubtle }}
        />
      </View>

      {/* 3. Up to Date Status Banner */}
      <View
        style={[
          styles.statusBanner,
          {
            backgroundColor: p.successSurface,
            borderColor: p.success,
          },
        ]}
      >
        <View style={styles.statusHeader}>
          <Icon name="check-circle-outline" size={20} color={p.success} />
          <Text style={[styles.statusTitle, { color: p.success }]}>
            Up to date
          </Text>
        </View>
        <Text style={[styles.statusBody, { color: p.textSecondary }]}>
          Last successful sync · just now
        </Text>
      </View>

      {/* 4. Local-First Guarantees Card */}
      <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
        Local-first behavior
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {localPoints.map((point) => (
          <View key={point} style={styles.pointRow}>
            <View
              style={[
                styles.checkCircle,
                { backgroundColor: p.successSurface },
              ]}
            >
              <Icon name="check" size={16} color={p.success} />
            </View>
            <Text style={[styles.pointText, { color: p.textPrimary }]}>
              {point}
            </Text>
          </View>
        ))}
      </View>

      {/* 5. Preview Sync Issue Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Preview sync issue"
        onPress={() => open("sync-issue")}
        style={[
          styles.secondaryButton,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
          },
        ]}
      >
        <Text style={[styles.secondaryButtonText, { color: p.textPrimary }]}>
          Preview sync issue
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
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  toggleSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  statusBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  statusBody: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
    paddingHorizontal: 2,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  pointText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
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
