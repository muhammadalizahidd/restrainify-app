import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "../design";

export function SurfaceCard({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfacePrimary,
    borderColor: colors.borderSubtle,
    borderRadius: radii.radiusLarge,
    borderWidth: 1,
    padding: spacing.space16,
  },
});
