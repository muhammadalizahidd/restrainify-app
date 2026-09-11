import { StyleSheet, Text, View, Pressable, Linking } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface DataPrivacyScreenProps {
  open: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * DataPrivacyScreen implements SET-DATA-01: Data & Privacy
 * from the Restrainify UI Architecture specification.
 *
 * Explains on-device processing guarantees, local SQLCipher encrypted persistence,
 * aggregate category boundaries, and links to local reset and server account deletion.
 *
 * Backend mapping:
 * - Links to `STATE-DATA-02` (Reset Local Data, route: "reset-local")
 * - Links to `SET-ACCOUNT-02` (Delete Account, route: "delete-account")
 */
export function DataPrivacyScreen({ open, onBack }: DataPrivacyScreenProps) {
  const { palette: p } = useOffline();

  const visualPoints = [
    "Raw screen frames are not stored as persistent user history.",
    "Routine visual inference stays on-device.",
    "Diagnostics do not contain raw screen content.",
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
            Clear privacy boundaries
          </Text>
          <Text style={[styles.headerTitle, { color: p.textPrimary }]}>
            Data & Privacy
          </Text>
        </View>
      </View>

      {/* 2. Visual Privacy Points */}
      <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
        Visual privacy
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {visualPoints.map((point) => (
          <View key={point} style={styles.privacyPointRow}>
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

      {/* 3. Your Data Actions */}
      <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
        Your data
      </Text>
      <View
        style={[
          styles.rowListCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete local app data"
          onPress={() => open("reset-local")}
          style={({ pressed }) => [
            styles.rowItem,
            {
              backgroundColor: pressed ? p.surfaceMuted : "transparent",
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: p.borderSubtle,
            },
          ]}
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: p.dangerSurface,
                borderColor: p.borderSubtle,
              },
            ]}
          >
            <Icon name="trash-can-outline" size={20} color={p.danger} />
          </View>
          <View style={styles.contentWrap}>
            <Text style={[styles.itemTitle, { color: p.textPrimary }]}>
              Delete local app data
            </Text>
            <Text style={[styles.itemSubtitle, { color: p.textSecondary }]}>
              Resets applicable product data on this device
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={p.textMuted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          onPress={() => open("delete-account")}
          style={({ pressed }) => [
            styles.rowItem,
            {
              backgroundColor: pressed ? p.surfaceMuted : "transparent",
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
            <Icon name="account-remove-outline" size={20} color={p.textPrimary} />
          </View>
          <View style={styles.contentWrap}>
            <Text style={[styles.itemTitle, { color: p.textPrimary }]}>
              Delete account
            </Text>
            <Text style={[styles.itemSubtitle, { color: p.textSecondary }]}>
              Server/account deletion is a separate authenticated action
            </Text>
          </View>
          <Icon name="chevron-right" size={18} color={p.textMuted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Privacy policy"
          onPress={() => void Linking.openURL("https://restrainify.com/privacy")}
          style={({ pressed }) => [
            styles.rowItem,
            { backgroundColor: pressed ? p.surfaceMuted : "transparent" },
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
            <Icon name="shield-outline" size={20} color={p.brandPrimary} />
          </View>
          <View style={styles.contentWrap}>
            <Text style={[styles.itemTitle, { color: p.textPrimary }]}>
              Privacy policy
            </Text>
            <Text style={[styles.itemSubtitle, { color: p.textSecondary }]}>
              Public description of data handling
            </Text>
          </View>
          <Icon name="open-in-new" size={18} color={p.textMuted} />
        </Pressable>
      </View>

      {/* 4. Browsing Data Note */}
      <Text style={[styles.sectionTitle, { color: p.textPrimary }]}>
        Browsing data
      </Text>
      <View
        style={[
          styles.softCard,
          { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
        ]}
      >
        <Text style={[styles.softCardText, { color: p.textSecondary }]}>
          Restrainify favors aggregate/category information needed for protection
          and recovery counters instead of presenting a detailed browsing-history
          feed.
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
    gap: 12,
  },
  privacyPointRow: {
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
  rowListCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  rowItem: {
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
  contentWrap: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  softCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  softCardText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
