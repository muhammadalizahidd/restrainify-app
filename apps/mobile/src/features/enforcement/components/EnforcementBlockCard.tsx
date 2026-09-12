import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, type IconName } from "../../../components/OfflineUI";

export type EnforcementIconTone = "primary" | "warn" | "danger" | "neutral";

export interface EnforcementBlockCardProps extends PropsWithChildren {
  icon: IconName;
  iconTone?: EnforcementIconTone;
  eyebrow: string;
  title: string;
  value?: string;
  description: string;
  primaryButton?: {
    label: string;
    onPress: () => void;
    tone?: "primary" | "accent" | "danger";
  };
  secondaryButton?: {
    label: string;
    onPress: () => void;
  };
  cancelLink?: {
    label: string;
    onPress: () => void;
  };
  footerNote?: string;
}

/**
 * EnforcementBlockCard implements the standard full-screen blocking pattern
 * from the Restrainify Orbit / Clarity specification (`block-screen` & `block-card`).
 *
 * Used across Domain 5 enforcement overlays:
 * - Pre-Permission Disclosure (STATE-01)
 * - Permission Denied Fallback (STATE-02)
 * - App Limit Reached (STATE-04)
 * - Scheduled Block Overlay (STATE-05)
 * - Short-Form Feed Block (STATE-06)
 */
export function EnforcementBlockCard({
  icon,
  iconTone = "primary",
  eyebrow,
  title,
  value,
  description,
  children,
  primaryButton,
  secondaryButton,
  cancelLink,
  footerNote,
}: EnforcementBlockCardProps) {
  const { palette: p } = useOffline();

  const iconBg =
    iconTone === "warn"
      ? p.warningSurface
      : iconTone === "danger"
      ? p.dangerSurface
      : p.surfaceMuted;

  const iconColor =
    iconTone === "warn"
      ? p.warning
      : iconTone === "danger"
      ? p.danger
      : p.brandPrimary;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: p.surfacePrimary,
            borderColor: p.borderSubtle,
          },
        ]}
      >
        {/* 1. Centered Icon Badge */}
        <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={32} color={iconColor} />
        </View>

        {/* 2. Eyebrow */}
        <Text style={[styles.eyebrow, { color: p.textSecondary }]}>
          {eyebrow}
        </Text>

        {/* 3. Title */}
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: p.textPrimary }]}
        >
          {title}
        </Text>

        {/* 4. Optional Large Metric Value (e.g. 45m) */}
        {value ? (
          <Text style={[styles.blockValue, { color: p.textPrimary }]}>
            {value}
          </Text>
        ) : null}

        {/* 5. Explanatory Description */}
        <Text style={[styles.description, { color: p.textSecondary }]}>
          {description}
        </Text>

        {/* 6. Optional Custom Rows / Content */}
        {children ? <View style={styles.contentWrap}>{children}</View> : null}

        {/* 7. Action Button Stack */}
        <View style={styles.actionStack}>
          {primaryButton && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={primaryButton.label}
              onPress={primaryButton.onPress}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor:
                    primaryButton.tone === "danger"
                      ? p.danger
                      : p.brandPrimary,
                },
                pressed && styles.btnPressed,
              ]}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  {
                    color:
                      primaryButton.tone === "danger"
                        ? "#FFFFFF"
                        : p.backgroundPrimary,
                  },
                ]}
              >
                {primaryButton.label}
              </Text>
            </Pressable>
          )}

          {secondaryButton && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={secondaryButton.label}
              onPress={secondaryButton.onPress}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  backgroundColor: p.surfacePrimary,
                  borderColor: p.borderSubtle,
                },
                pressed && styles.btnPressed,
              ]}
            >
              <Text
                style={[styles.secondaryBtnText, { color: p.textPrimary }]}
              >
                {secondaryButton.label}
              </Text>
            </Pressable>
          )}

          {cancelLink && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cancelLink.label}
              onPress={cancelLink.onPress}
              style={styles.cancelBtn}
            >
              <Text style={[styles.cancelBtnText, { color: p.brandPrimary }]}>
                {cancelLink.label}
              </Text>
            </Pressable>
          )}
        </View>

        {/* 8. Optional Footer Note */}
        {footerNote ? (
          <Text style={[styles.footerNote, { color: p.textSecondary }]}>
            {footerNote}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 27,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 32,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 30,
  },
  blockValue: {
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -2,
    textAlign: "center",
    marginVertical: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 320,
    marginBottom: 16,
  },
  contentWrap: {
    width: "100%",
    marginBottom: 16,
  },
  actionStack: {
    width: "100%",
    gap: 10,
    marginTop: 6,
  },
  primaryBtn: {
    width: "100%",
    minHeight: 48,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  secondaryBtn: {
    width: "100%",
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  footerNote: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 14,
  },
});
