import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "../../../components/AppText";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { GradientFill, Icon, SurfaceGradient, useReducedMotion } from "../../../components/OfflineUI";

// Metro static image asset for the Restrainify mark
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logo = require("../../../../assets/restrainify-logo.png");

export interface SignInScreenProps {
  onGoogle: () => void;
  loading: boolean;
  error?: string | null;
}

const PRIVACY_URL = "https://restrainify.com/privacy";

/**
 * The one sign-in screen: the app logo and a single "Continue with Google" action.
 * Every colour comes from the theme palette, so it follows the user's light/dark setting.
 */
export function SignInScreen({ onGoogle, loading, error }: SignInScreenProps) {
  const { palette: p } = useOffline();
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const enter = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    Animated.timing(enter, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter, reduceMotion]);

  const rise = enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  const openPrivacy = () => {
    Linking.openURL(PRIVACY_URL).catch(() => undefined);
  };

  return (
    <View style={[s.container, { minHeight: Math.max(480, height - 150) }]}>
      <Animated.View style={[s.hero, { opacity: enter, transform: [{ translateY: rise }] }]}>
        <View style={s.logoStage}>
          <View pointerEvents="none" style={[s.glowOuter, { backgroundColor: "rgba(45, 100, 174, 0.14)" }]} />
          <View pointerEvents="none" style={[s.glowInner, { backgroundColor: "rgba(45, 100, 174, 0.2)" }]} />
          <View style={[s.logoTile, { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle }]}>
            <SurfaceGradient />
            <Image source={logo} style={s.logo} resizeMode="contain" accessibilityLabel="Restrainify logo" />
          </View>
        </View>
        <Text accessibilityRole="header" style={[s.wordmark, { color: p.textPrimary }]}>
          Restrainify
        </Text>
      </Animated.View>

      <Animated.View style={[s.actions, { opacity: enter }]}>
        {!!error && (
          <Text accessibilityRole="alert" style={[s.error, { color: p.danger }]}>
            {error}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          accessibilityState={{ busy: loading, disabled: loading }}
          disabled={loading}
          onPress={onGoogle}
          style={({ pressed }) => [
            s.googleButton,
            { overflow: "hidden", backgroundColor: "transparent", borderColor: p.heroEnd, opacity: loading ? 0.7 : pressed ? 0.88 : 1 },
          ]}
        >
          <GradientFill />
          {loading ? (
            <ActivityIndicator size="small" color={p.actionText} />
          ) : (
            <>
              <Icon name="google" size={20} color={p.actionText} />
              <Text style={[s.googleText, { color: p.actionText }]}>Continue with Google</Text>
            </>
          )}
        </Pressable>
        <Pressable accessibilityRole="link" accessibilityLabel="Privacy policy" onPress={openPrivacy} hitSlop={8} style={s.policyLink}>
          <Text style={[s.policyText, { color: p.textMuted }]}>Privacy policy</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { justifyContent: "space-between", gap: 24 },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: 22, paddingTop: 12 },
  logoStage: { width: 260, height: 260, alignItems: "center", justifyContent: "center" },
  glowOuter: { position: "absolute", width: 260, height: 260, borderRadius: 130 },
  glowInner: { position: "absolute", width: 190, height: 190, borderRadius: 95 },
  logoTile: {
    width: 124,
    height: 124,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: { width: 80, height: 80 },
  wordmark: { fontSize: 36, fontWeight: "700", letterSpacing: -1.2 },
  actions: { gap: 14, alignItems: "stretch" },
  error: { fontSize: 13, fontWeight: "500", textAlign: "center" },
  googleButton: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  googleText: { fontSize: 15, fontWeight: "700", letterSpacing: 0.1 },
  policyLink: { alignSelf: "center", paddingVertical: 4 },
  policyText: { fontSize: 12.5, fontWeight: "500", textDecorationLine: "underline" },
});
