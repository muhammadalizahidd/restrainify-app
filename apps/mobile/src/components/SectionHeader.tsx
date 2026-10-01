import { StyleSheet } from "react-native";
import { Text } from "./AppText";
import { colors, spacing, typography } from "../design";

interface SectionHeaderProps {
  readonly title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return <Text style={styles.title}>{title}</Text>;
}

const styles = StyleSheet.create({
  title: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.space12,
  },
});
