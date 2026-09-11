import { useState } from "react";
import { StyleSheet, Text, View, Pressable, Switch, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, duration } from "../../../components/OfflineUI";

export interface StrictModeScreenProps {
  open: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * StrictModeScreen implements SET-STRICT-01: Strict Mode & Anti-Bypass Screen
 * from the Restrainify UI Architecture specification.
 *
 * It introduces deliberate change friction, weakening cooldowns, and category locks.
 * Adheres strictly to truthful naming (never claiming impossible adult Android uninstall blocking).
 */
export function StrictModeScreen({ onBack }: StrictModeScreenProps) {
  const { snapshot: data, palette: p, command } = useOffline();
  const [protectWeb, setProtectWeb] = useState(true);
  const [protectVisual, setProtectVisual] = useState(true);
  const [protectLimits, setProtectLimits] = useState(true);

  if (!data) return null;

  const isStrictActive = data.strictRemainingMs > 0;
  const configuredMinutes = data.settings.strictMinutes || 30;

  const handleToggleStrict = async (value: boolean) => {
    if (value) {
      if (isStrictActive) return;
      if (data.settings.strictMinutes === 0) {
        await command("setting", { key: "strictMinutes", value: 30 });
      }
      await command("strict");
    } else {
      if (isStrictActive) {
        Alert.alert(
          "Strict Mode Active",
          `Protection changes are locked until the active cooldown ends (${duration(data.strictRemainingMs)} remaining).`
        );
      }
    }
  };

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
            Friction, not entrapment
          </Text>
          <Text style={[s.headerTitle, { color: p.textPrimary }]}>
            Strict Mode
          </Text>
        </View>
      </View>

      {/* 2. Hero Card */}
      <LinearGradient
        colors={[p.heroStart, p.heroMiddle, p.heroEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.6 }}
        style={s.heroCard}
      >
        <View style={s.kickerRow}>
          <Text style={s.kickerText}>DISABLE FRICTION</Text>
          <Text style={s.kickerText}>{isStrictActive ? "ACTIVE" : "READY"}</Text>
        </View>
        <Text style={s.heroTitle}>Protect your intentions.</Text>
        <Text style={s.heroSub}>
          Strict Mode adds deliberate friction to impulsive protection changes. It does not claim to make an adult device impossible to uninstall.
        </Text>
        {isStrictActive && (
          <View style={s.activeCooldownBadge}>
            <Icon name="clock-outline" size={16} color="#DBEAFF" />
            <Text style={s.activeCooldownText}>
              {duration(data.strictRemainingMs)} remain on active lock
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* 3. Strict Controls Section */}
      <View style={s.sectionWrap}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Strict controls</Text>
        <View
          style={[
            s.rowList,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          {/* Row 1: Strict Mode Toggle */}
          <View style={[s.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.borderSubtle }]}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="lock-outline" size={20} color={isStrictActive ? p.brandPrimary : p.textMuted} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Strict Mode</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
                Apply configured change delays
              </Text>
            </View>
            <Switch
              accessibilityLabel="Toggle Strict Mode"
              value={isStrictActive}
              onValueChange={handleToggleStrict}
              trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Row 2: Local PIN */}
          <View style={[s.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.borderSubtle }]}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="key-outline" size={20} color={p.brandPrimary} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Local PIN</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
                Optional in-app control
              </Text>
            </View>
            <View style={s.rightBadgeWrap}>
              <Text style={[s.badgeText, { color: p.textSecondary }]}>Enabled</Text>
            </View>
          </View>

          {/* Row 3: Weakening Cooldowns */}
          <View style={s.row}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="clock-outline" size={20} color={p.brandPrimary} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Weakening cooldowns</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
                Exact durations are product-policy values
              </Text>
            </View>
            <View style={s.rightBadgeWrap}>
              <Text style={[s.badgeText, { color: p.textSecondary }]}>
                {configuredMinutes}m configured
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 4. Protected Categories Section */}
      <View style={s.sectionWrap}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Protected categories</Text>
        <View
          style={[
            s.rowList,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          {/* Row 1: Website protection */}
          <View style={[s.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.borderSubtle }]}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="web" size={20} color={p.brandPrimary} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Website protection</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
                Cooldown before disabling
              </Text>
            </View>
            <Switch
              accessibilityLabel="Protect website setting"
              value={protectWeb}
              onValueChange={setProtectWeb}
              trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Row 2: Visual protection */}
          <View style={[s.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.borderSubtle }]}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="eye-outline" size={20} color={p.brandPrimary} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Visual protection</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
                Cooldown before disabling
              </Text>
            </View>
            <Switch
              accessibilityLabel="Protect visual setting"
              value={protectVisual}
              onValueChange={setProtectVisual}
              trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Row 3: App limits */}
          <View style={s.row}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="apps" size={20} color={p.brandPrimary} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>App limits</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
                Cooldown before weakening
              </Text>
            </View>
            <Switch
              accessibilityLabel="Protect app limits"
              value={protectLimits}
              onValueChange={setProtectLimits}
              trackColor={{ false: p.borderSubtle, true: p.brandPrimary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* 5. Truthful Policy Footnote */}
      <View style={[s.footnoteCard, { backgroundColor: p.surfaceMuted }]}>
        <Text style={[s.footnoteText, { color: p.textSecondary }]}>
          Language throughout the app uses uninstall resistance / disable friction; never absolute adult uninstall prevention.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  titleWrap: {
    flex: 1,
  },
  headerKicker: {
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginTop: 2,
  },
  heroCard: {
    borderRadius: 25,
    padding: 18,
    marginTop: 6,
    overflow: "hidden",
  },
  kickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kickerText: {
    fontSize: 9.5,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#DBEAFF",
    fontWeight: "700",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -1,
    fontWeight: "700",
    marginTop: 8,
  },
  heroSub: {
    color: "#DBEAFF",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    marginTop: 6,
  },
  activeCooldownBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 99,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  activeCooldownText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "700",
  },
  sectionWrap: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.2,
    marginBottom: 8,
    marginHorizontal: 2,
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
    minHeight: 56,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
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
  rightBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  footnoteCard: {
    borderRadius: 16,
    padding: 13,
    marginTop: 10,
    marginBottom: 12,
  },
  footnoteText: {
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "500",
  },
});
