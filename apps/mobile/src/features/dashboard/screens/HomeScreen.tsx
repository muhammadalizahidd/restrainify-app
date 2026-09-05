import { StyleSheet, Text, View } from "react-native";
import { AppScreen } from "../../../components/AppScreen";
import { SectionHeader } from "../../../components/SectionHeader";
import { SurfaceCard } from "../../../components/SurfaceCard";
import { colors, spacing, typography } from "../../../design";
import { dashboardFixture } from "../state/dashboardFixture";

export function HomeScreen() {
  return (
    <AppScreen>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Restrainify</Text>
          <Text style={styles.tagline}>Protection health first</Text>
        </View>
      </View>

      <SurfaceCard>
        <Text style={styles.label}>Current Streak</Text>
        <Text style={styles.metric}>{dashboardFixture.recovery.currentStreakDays} Days</Text>
        <Text style={styles.muted}>Daily reward is available after check-in.</Text>
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="Today's Overview" />
        <SurfaceCard>
          <Text style={styles.body}>
            Screen time and protection counters will render from native/local state here.
          </Text>
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Protection Status" />
        <SurfaceCard>
          <Text style={styles.body}>
            Native reconciliation is required before showing trusted protection state.
          </Text>
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SurfaceCard>
          <Text style={styles.burstTitle}>Need help right now?</Text>
          <Text style={styles.body}>
            Burst will activate temporary high protection and record an urge event.
          </Text>
        </SurfaceCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.space20,
  },
  brand: {
    ...typography.screenTitle,
    color: colors.brandInk,
  },
  tagline: {
    ...typography.support,
    color: colors.textSecondary,
  },
  section: {
    marginTop: spacing.space24,
  },
  label: {
    ...typography.support,
    color: colors.textSecondary,
  },
  metric: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 42,
    marginTop: spacing.space4,
  },
  muted: {
    ...typography.support,
    color: colors.textMuted,
    marginTop: spacing.space8,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
  burstTitle: {
    ...typography.sectionTitle,
    color: colors.danger,
    marginBottom: spacing.space8,
  },
});
