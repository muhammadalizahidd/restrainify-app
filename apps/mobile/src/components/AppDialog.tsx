import { useEffect, useRef, useSyncExternalStore } from "react";
import { Animated, BackHandler, Easing, Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import { useOffline } from "../app/providers/OfflineProvider";
import { useReducedMotion } from "./OfflineUI";

/** Same shape as React Native's AlertButton, so existing call sites move over unchanged. */
export interface AppAlertButton {
  text?: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

export interface AppAlertOptions {
  /** Back button and tapping outside dismiss the dialog. Off by default, like Android's Alert. */
  cancelable?: boolean;
  onDismiss?: () => void;
}

interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  options: AppAlertOptions;
}

// A tiny external store: dialogs can be requested from anywhere (handlers, effects, non-React code)
// and are shown one at a time, in order, by the single host mounted at the app root.
let queue: DialogRequest[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const current = () => queue[0] ?? null;
function close(id: number) {
  queue = queue.filter((dialog) => dialog.id !== id);
  emit();
}

/**
 * Drop-in replacement for `Alert.alert` that shows the app's own Material 3 style dialog instead of the
 * old Android system dialog. Use this everywhere; `Alert` from react-native is blocked by lint.
 */
export const appAlert = {
  alert(title: string, message?: string, buttons?: AppAlertButton[], options?: AppAlertOptions) {
    queue = [...queue, { id: nextId++, title, message, buttons: buttons?.length ? buttons : [{ text: "OK" }], options: options ?? {} }];
    emit();
  },
};

/** Test helper: clears pending dialogs between tests. */
export function resetAppDialogsForTests() {
  queue = [];
  emit();
}

/** Renders the dialog queue. Mount once, inside the theme provider. */
export function AppDialogHost() {
  const dialog = useSyncExternalStore(subscribe, current, current);
  const { palette: p, dark } = useOffline();
  const reduceMotion = useReducedMotion();
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!dialog) return;
    enter.setValue(reduceMotion ? 1 : 0);
    if (!reduceMotion) {
      Animated.timing(enter, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [dialog, enter, reduceMotion]);

  const dismiss = () => {
    if (!dialog?.options.cancelable) return;
    close(dialog.id);
    dialog.options.onDismiss?.();
  };

  useEffect(() => {
    if (!dialog) return;
    // Android back: dismiss when cancelable, otherwise swallow it so the screen underneath doesn't navigate.
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      dismiss();
      return true;
    });
    return () => sub.remove();
  });

  if (!dialog) return null;

  const press = (button: AppAlertButton) => {
    close(dialog.id);
    button.onPress?.();
  };
  // Side by side like Android's dialogs; stacked when there are three actions or the labels are long.
  const stacked = dialog.buttons.length > 2 || dialog.buttons.some((b) => (b.text ?? "").length > 16);
  const color = (b: AppAlertButton) => (b.style === "destructive" ? p.danger : b.style === "cancel" ? p.textSecondary : p.toggleActive);

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={dismiss}>
      <Animated.View style={[s.scrim, { opacity: enter }]}>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={dismiss} />
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[
            s.card,
            { backgroundColor: p.surfaceDialog, borderColor: dark ? p.borderSubtle : "transparent" },
            { transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] },
          ]}
        >
          <Text accessibilityRole="header" style={[s.title, { color: p.textPrimary }]}>
            {dialog.title}
          </Text>
          {!!dialog.message && <Text style={[s.message, { color: p.textSecondary }]}>{dialog.message}</Text>}
          <View style={[s.actions, stacked && s.actionsStacked]}>
            {dialog.buttons.map((button, index) => (
              <Pressable
                key={`${button.text ?? "OK"}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={button.text ?? "OK"}
                onPress={() => press(button)}
                android_ripple={{ color: dark ? "rgba(255,255,255,0.12)" : "rgba(16,38,77,0.08)", borderless: false }}
                style={({ pressed }) => [s.button, stacked && s.buttonStacked, pressed && { opacity: 0.8 }]}
              >
                <Text style={[s.buttonText, { color: color(button) }]}>{button.text ?? "OK"}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(4, 10, 24, 0.5)", alignItems: "center", justifyContent: "center", padding: 28 },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 28,
    borderWidth: 1,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "600", letterSpacing: -0.3 },
  message: { fontSize: 15, lineHeight: 22, marginTop: 12 },
  actions: { flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: 4, marginTop: 20 },
  actionsStacked: { flexDirection: "column", alignItems: "stretch", gap: 0 },
  button: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  buttonStacked: { alignItems: "flex-end" },
  buttonText: { fontSize: 15, fontWeight: "600", letterSpacing: 0.1 },
});
