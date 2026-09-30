import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../components/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { SurfaceGradient } from "../../../components/OfflineUI";

interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}

export function GoogleSignInButton({
  onPress,
  loading = false,
  disabled = false,
  label = "Continue with Google",
}: GoogleSignInButtonProps) {
  const { palette } = useOffline();
  const blocked = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { overflow: "hidden",
          backgroundColor: "transparent",
          borderColor: palette.borderSubtle,
          opacity: blocked ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    ><SurfaceGradient />
      {loading ? (
        <ActivityIndicator size="small" color={palette.brandPrimary} />
      ) : (
        <View style={styles.content}>
          <MaterialCommunityIcons
            name="google"
            size={20}
            color={palette.brandPrimary}
            style={styles.icon}
          />
          <Text style={[styles.text, { color: palette.textPrimary }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    width: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});
