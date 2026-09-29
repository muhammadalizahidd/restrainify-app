import {
  Alert,
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, ToggleSwitch } from "../../../components/OfflineUI";
import {
  VISUAL_PROTECTED_APPS,
  hasVisualAccessibility,
  isVisualBlockingOn,
  setVisualBlocking,
} from "../utils/visualBlocking";

export interface VisualAiModalProps {
  visible: boolean;
  onClose: () => void;
  open?: (route: string, params?: Record<string, unknown>) => void;
}

/**
 * VisualAiModal is the single control for on-device visual blocking.
 *
 * One switch drives both native flags (`visualAiEnabled` + `visualAiBlockingEnabled`).
 * It cannot be turned on until Android Accessibility is consented to and connected;
 * otherwise the user is sent through the permission-disclosure flow first.
 */
export function VisualAiModal({ visible, onClose, open }: VisualAiModalProps) {
  const { palette: p, snapshot: data, command } = useOffline();
  const { height: windowHeight } = useWindowDimensions();

  const accessibilityReady = hasVisualAccessibility(data);
  const blockingOn = accessibilityReady && isVisualBlockingOn(data);
  const isBurstActive = Boolean(data && data.burstRemainingMs > 0);
  const isStrictActive = Boolean(data && data.strictRemainingMs > 0);
  const needsAndroid14 = accessibilityReady && data?.capabilities.accessibilityWindowCapture === false;

  const requestAccessibility = () => {
    if (!open) return;
    onClose();
    open("permission-disclosure", {
      permissionType: "accessibility",
      returnRoute: "home",
      returnModal: "visual-ai",
    });
  };

  const handleToggle = (next: boolean) => {
    if (next && !accessibilityReady) {
      Alert.alert(
        "Accessibility required",
        "Restrainify needs Android Accessibility turned on to see and cover explicit content in supported apps. Turn it on first, then come back to switch this on.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Turn on Accessibility", onPress: requestAccessibility },
        ]
      );
      return;
    }
    if (!next && (isBurstActive || isStrictActive)) {
      Alert.alert(
        isBurstActive ? "Burst mode active" : "Strict mode active",
        "Visual blocking cannot be turned off while Strict Mode or a Burst cooldown is active."
      );
      return;
    }
    void setVisualBlocking(command, next);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.keyboardCenter}
        >
          <View
            style={[
              s.dialogCard,
              {
                backgroundColor: p.surfacePrimary,
                borderColor: p.borderSubtle,
                maxHeight: Math.round(windowHeight * 0.82),
              },
            ]}
          >
            <View style={[s.headerRow, { borderBottomColor: p.borderSubtle }]}>
              <View style={s.headerTitleWrap}>
                <View
                  style={[
                    s.headerIconBox,
                    { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
                  ]}
                >
                  <Icon name="eye-outline" size={20} color={p.brandPrimary} />
                </View>
                <Text style={[s.headerTitle, { color: p.textPrimary }]}>Visual filter</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close visual filter dialog"
                onPress={onClose}
                style={[s.closeButton, { backgroundColor: p.surfaceMuted }]}
              >
                <Icon name="close" size={17} color={p.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={s.dialogScroll}
              contentContainerStyle={s.dialogScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled
              bounces={false}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  accessibilityReady
                    ? "Accessibility is active"
                    : "Tap to turn on Restrainify Accessibility"
                }
                disabled={accessibilityReady}
                onPress={requestAccessibility}
                style={({ pressed }) => [
                  s.permissionBanner,
                  {
                    backgroundColor: accessibilityReady ? p.successSurface : p.dangerSurface,
                    borderColor: accessibilityReady ? p.success : p.danger,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Icon
                  name={accessibilityReady ? "check-circle" : "alert-circle"}
                  size={22}
                  color={accessibilityReady ? p.success : p.danger}
                />
                <Text
                  style={[s.bannerText, { color: accessibilityReady ? p.success : p.danger }]}
                >
                  {accessibilityReady
                    ? "Accessibility active"
                    : "Turn on accessibility to use the visual filter"}
                </Text>
                {!accessibilityReady && <Icon name="gesture-tap" size={22} color={p.danger} />}
              </Pressable>

              <View
                style={[
                  s.mainCard,
                  { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
                ]}
              >
                <View style={s.mainCopy}>
                  <Text style={[s.mainTitle, { color: p.textPrimary }]}>
                    Block explicit content
                  </Text>
                  <Text style={[s.mainSubtitle, { color: p.textSecondary }]}>
                    Covers reels and videos detected as explicit by two on-device models.
                  </Text>
                </View>
                <ToggleSwitch
                  accessibilityLabel="Block explicit content"
                  value={blockingOn}
                  onValueChange={handleToggle}
                />
              </View>

              {needsAndroid14 && (
                <Text style={[s.warnText, { color: p.danger }]}>
                  Screen capture for the visual filter needs Android 14 or newer. It cannot
                  cover content on this device.
                </Text>
              )}

              <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Protected apps</Text>
                <Text style={[s.sectionKicker, { color: p.textSecondary }]}>
                  {VISUAL_PROTECTED_APPS.length} SUPPORTED
                </Text>
              </View>
              <View
                style={[
                  s.appsCard,
                  { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
                ]}
              >
                {VISUAL_PROTECTED_APPS.map((name, index) => (
                  <View
                    key={name}
                    style={[
                      s.appRow,
                      index < VISUAL_PROTECTED_APPS.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: p.borderSubtle,
                      },
                    ]}
                  >
                    <Text style={[s.appName, { color: p.textPrimary }]}>{name}</Text>
                    <Text style={[s.appSubtitle, { color: blockingOn ? p.success : p.textMuted }]}>
                      {blockingOn ? "Protected" : "Off"}
                    </Text>
                  </View>
                ))}
              </View>

              <View
                style={[
                  s.privacyCard,
                  { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
                ]}
              >
                <View style={s.privacyHeader}>
                  <Icon name="shield-check" size={16} color={p.brandPrimary} />
                  <Text style={[s.privacyTitle, { color: p.textPrimary }]}>
                    On-Device Guarantee
                  </Text>
                </View>
                <Text style={[s.privacyText, { color: p.textSecondary }]}>
                  Visual Protection runs only in the foreground while a supported app is
                  displayed. Temporary screen buffers are evaluated locally and instantly
                  discarded.
                </Text>
              </View>
            </ScrollView>

            <View style={[s.footerRow, { borderTopColor: p.borderSubtle }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                onPress={onClose}
                style={[s.doneBtn, { backgroundColor: p.brandPrimary }]}
              >
                <Text style={[s.doneBtnText, { color: p.backgroundPrimary }]}>Done</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 14, 26, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  keyboardCenter: {
    width: "100%",
    maxWidth: 375,
    alignItems: "center",
    justifyContent: "center",
  },
  dialogCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1.2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 22,
    elevation: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  dialogScroll: {
    flexShrink: 1,
  },
  dialogScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 12,
  },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  mainCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  mainCopy: {
    flex: 1,
    gap: 3,
  },
  mainTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  mainSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  warnText: {
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionKicker: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  appsCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  appName: {
    fontSize: 13,
    fontWeight: "600",
  },
  appSubtitle: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  privacyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
    marginTop: 2,
  },
  privacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  privacyTitle: {
    fontSize: 11,
    fontWeight: "700",
  },
  privacyText: {
    fontSize: 10,
    lineHeight: 14,
  },
  footerRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneBtn: {
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
