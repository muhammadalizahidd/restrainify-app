import type { PropsWithChildren } from "react";
import type { ColorValue } from "react-native";
import { Platform, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { spacing } from "../design";

interface AppScreenProps extends PropsWithChildren {
  readonly backgroundColor: ColorValue;
}

export function AppScreen({ backgroundColor, children }: AppScreenProps) {
  return (
    <View style={[styles.root, { backgroundColor }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + spacing.space12 : spacing.space20 }]} showsVerticalScrollIndicator={false}>
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
