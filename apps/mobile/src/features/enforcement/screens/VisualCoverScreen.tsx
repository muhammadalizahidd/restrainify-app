import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface VisualCoverScreenProps {
  open?: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

/**
 * VisualCoverScreen implements STATE-08: Visual Content Cover
 * from the Restrainify UI Architecture specification.
 *
 * Demonstrates the real-time on-screen blur overlay placed over detected
 * explicit or sexually suggestive imagery on supported apps.
 *
 * Privacy & Architecture guarantees (AGENT.md Section 8):
 * - On-device execution only: no cloud vision APIs.
 * - Ephemeral RAM processing: temporary frames are immediately discarded.
 * - Zero screenshot history: never saved to gallery, disk, or remote servers.
 */
export function VisualCoverScreen({
  open,
  onBack,
}: VisualCoverScreenProps) {
  const { palette: p } = useOffline();

  const handleReturn = () => {
    if (onBack) {
      onBack();
    } else if (open) {
      open("home");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContainer,
        { backgroundColor: p.backgroundPrimary },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header */}
      <View style={styles.headerRow}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[
              styles.backButton,
              {
                backgroundColor: p.surfacePrimary,
                borderColor: p.borderSubtle,
              },
            ]}
          >
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={styles.titleWrap}>
          <Text style={[styles.headerKicker, { color: p.textSecondary }]}>
            ON-DEVICE ENFORCEMENT
          </Text>
          <Text
            accessibilityRole="header"
            style={[styles.headerTitle, { color: p.textPrimary }]}
          >
            Visual Protection overlay
          </Text>
        </View>
      </View>

      {/* 2. Simulated On-Screen Media Surface */}
      <View
        style={[
          styles.demoContainer,
          {
            backgroundColor: p.surfaceMuted,
            borderColor: p.borderSubtle,
          },
        ]}
      >
        {/* Background fake app elements */}
        <View style={styles.fakeFeed}>
          <View
            style={[styles.fakeLine, { backgroundColor: p.borderSubtle }]}
          />
          <View
            style={[
              styles.fakeMediaBox,
              { backgroundColor: p.surfaceMuted },
            ]}
          />
          <View
            style={[styles.fakeLine, { backgroundColor: p.borderSubtle }]}
          />
        </View>

        {/* Real-time Frosted Cover Overlay */}
        <View
          style={[
            styles.blurCover,
            {
              backgroundColor: "rgba(12, 20, 34, 0.88)",
            },
          ]}
        >
          <View style={styles.blurContent}>
            <View style={styles.eyeBadge}>
              <Icon name="eye-off-outline" size={32} color="#FFFFFF" />
            </View>

            <Text style={styles.coverTitle}>
              Content hidden by Restrainify
            </Text>

            <Text style={styles.coverBody}>
              Risky visual content was covered. The temporary screen frame is
              discarded after the protection decision.
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Centered Privacy Guarantee Helper */}
      <Text style={[styles.helperCallout, { color: p.textSecondary }]}>
        This is an enforcement overlay, not a screenshot-history surface.
      </Text>

      {/* 4. Action Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Return to app"
        onPress={handleReturn}
        style={({ pressed }) => [
          styles.returnBtn,
          { backgroundColor: p.brandPrimary },
          pressed && styles.btnPressed,
        ]}
      >
        <Text style={[styles.returnBtnText, { color: p.backgroundPrimary }]}>
          Return to app
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
  },
  headerKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginTop: 2,
  },
  demoContainer: {
    height: 430,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    marginBottom: 16,
  },
  fakeFeed: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    justifyContent: "space-between",
  },
  fakeLine: {
    height: 22,
    borderRadius: 8,
    width: "70%",
  },
  fakeMediaBox: {
    flex: 1,
    marginVertical: 14,
    borderRadius: 16,
  },
  blurCover: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  blurContent: {
    alignItems: "center",
  },
  eyeBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  coverTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  coverBody: {
    fontSize: 12,
    lineHeight: 18,
    color: "#D8E8FF",
    textAlign: "center",
    maxWidth: 290,
  },
  helperCallout: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  returnBtn: {
    width: "100%",
    minHeight: 48,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  returnBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  btnPressed: {
    opacity: 0.8,
  },
});
