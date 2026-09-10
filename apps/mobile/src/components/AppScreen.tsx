import type { PropsWithChildren } from "react";
import type { ColorValue } from "react-native";
import { Platform, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { spacing } from "../design";

interface AppScreenProps extends PropsWithChildren {
  readonly backgroundColor: ColorValue;
}

export function AppScreen({ backgroundColor, children }: AppScreenProps) {
  const statusBarHeight = StatusBar.currentHeight ?? 0;
  const topInset = Platform.OS === "android" ? Math.max(statusBarHeight, 24) : 0;

  return (
    <View style={[styles.root, { backgroundColor }]}>
      <View style={{ height: topInset, backgroundColor, width: "100%" }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: spacing.space20,
    paddingBottom: 112,
  },
});
