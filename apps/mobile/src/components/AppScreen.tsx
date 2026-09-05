import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { colors, spacing } from "../design";

export function AppScreen({ children }: PropsWithChildren) {
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  content: {
    padding: spacing.space20,
    paddingBottom: spacing.space32,
  },
});
