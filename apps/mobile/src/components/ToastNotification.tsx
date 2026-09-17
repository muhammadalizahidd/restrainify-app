import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { useOffline } from "../app/providers/OfflineProvider";
import { Icon } from "./OfflineUI";

export interface ToastNotificationProps {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
  topInset?: number;
}

/**
 * ToastNotification renders a sleek, non-intrusive floating toast overlay.
 *
 * Key features:
 * - Positioned absolutely as a floating top pill/toaster (never disrupts or shifts page layout)
 * - Animated entrance (spring slide down + fade in) and exit
 * - Automatic auto-dismiss timer (default 4.5s)
 * - Quick dismiss button (X)
 * - Elevated with soft shadows matching the Orbit / Clarity design system
 */
export function ToastNotification({
  message,
  onDismiss,
  durationMs = 4500,
  topInset = 0,
}: ToastNotificationProps) {
  const { palette: p } = useOffline();
  const translateY = useRef(new Animated.Value(-40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;

    // Reset and animate in
    translateY.setValue(-30);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 180,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss countdown
    const timer = setTimeout(() => {
      handleDismiss();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [message]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -25,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!message) return null;

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        s.container,
        {
          top: topInset + 10,
          transform: [{ translateY }],
          opacity,
          backgroundColor: p.surfacePrimary,
          borderColor: p.borderSubtle,
        },
      ]}
    >
      <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
        <Icon name="shield-alert-outline" size={18} color={p.brandPrimary} />
      </View>

      <View style={s.textContainer}>
        <Text style={[s.title, { color: p.textPrimary }]}>Notice</Text>
        <Text style={[s.message, { color: p.textSecondary }]} numberOfLines={2}>
          {message}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={({ pressed }) => [
          s.closeBtn,
          { backgroundColor: pressed ? p.borderSubtle : p.surfaceMuted },
        ]}
      >
        <Icon name="close" size={15} color={p.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 99999,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 16,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
