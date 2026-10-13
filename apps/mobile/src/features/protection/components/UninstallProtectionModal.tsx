import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "../../../components/AppText";
import { Body, Button, Icon, Panel, SurfaceGradient, useReducedMotion } from "../../../components/OfflineUI";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { offlineProtection } from "../../../native/OfflineProtection";

const DAY_PRESETS = [1, 7, 14, 30, 90];

function remainingDuration(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  return `${days}d ${hours}h ${minutes % 60}m`;
}

export function UninstallProtectionModal({ visible, open, onClose }: {
  visible: boolean;
  open: (route: string, params?: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const { snapshot, palette: p, busy, reconciling, error, clearError, run, refresh } = useOffline();
  const { height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [days, setDays] = useState(30);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!visible) setConfirmationVisible(false);
  }, [visible]);

  useEffect(() => {
    const initial = snapshot?.uninstallRemainingMs ?? 0;
    const started = Date.now();
    setRemaining(initial);
    if (!visible || initial <= 0) return;
    const timer = setInterval(() => {
      const next = Math.max(0, initial - (Date.now() - started));
      setRemaining(next);
      if (next === 0) {
        clearInterval(timer);
        void refresh(true);
      }
    }, 1_000);
    return () => clearInterval(timer);
  }, [snapshot, refresh, visible]);

  if (!snapshot) return null;
  const active = snapshot.uninstallRemainingMs > 0;
  const hasAccessibility = snapshot.capabilities.accessibility && snapshot.settings.accessibilityConsent;
  const hasAdmin = Boolean(snapshot.capabilities.deviceAdmin);
  const degraded = active && (!hasAccessibility || !hasAdmin);
  const disabled = busy || reconciling;
  const expiry = snapshot.settings.uninstallUntil;
  const notice = actionError ?? error;

  const openAccessibility = () => {
    onClose();
    open("permission-disclosure", {
      permissionType: "accessibility", returnRoute: "settings", returnModal: "uninstall-protection",
    });
  };

  const confirmStart = async () => {
    if (disabled || inFlight.current || active) return;
    if (!hasAccessibility) {
      setConfirmationVisible(false);
      openAccessibility();
      return;
    }
    inFlight.current = true;
    setActionError(null);
    try {
      const ok = await run(async () => {
        try {
          if (!(await offlineProtection.requestDeviceAdmin())) {
            throw new Error("Device Administrator was not granted. No timed lock was started.");
          }
          await offlineProtection.command("uninstall_lock", { days, confirmed: true });
        } catch (failure) {
          setActionError(failure instanceof Error ? failure.message : "Could not start uninstall protection. Try again.");
          throw failure;
        }
      });
      if (ok) setConfirmationVisible(false);
    } finally {
      // A grant followed by a rejected command must not leave an unneeded administrator active.
      await refresh(true);
      inFlight.current = false;
    }
  };

  const restorePermissions = async () => {
    if (disabled || inFlight.current) return;
    if (!hasAccessibility) {
      openAccessibility();
      return;
    }
    inFlight.current = true;
    setActionError(null);
    try {
      await run(async () => {
        try {
          if (!(await offlineProtection.requestDeviceAdmin())) {
            throw new Error("Device Administrator was not granted. Your existing timer is unchanged; uninstall protection remains degraded.");
          }
        } catch (failure) {
          setActionError(failure instanceof Error ? failure.message : "Could not restore permissions. Your timer is unchanged.");
          throw failure;
        }
      });
    } finally {
      await refresh(true);
      inFlight.current = false;
    }
  };

  const dismiss = () => {
    if (busy || inFlight.current) return;
    if (confirmationVisible && !active) setConfirmationVisible(false);
    else onClose();
  };

  return (
    <Modal visible={visible} transparent animationType={reducedMotion ? "none" : "fade"} statusBarTranslucent onRequestClose={dismiss}>
      <View style={s.backdrop}>
        <View accessibilityViewIsModal style={[s.dialog, { maxHeight: height * 0.85, borderColor: p.borderSubtle }]}>
          <SurfaceGradient />
          <View style={[s.header, { borderBottomColor: p.borderSubtle }]}>
            <Text accessibilityRole="header" style={[s.title, { color: p.textPrimary }]}>
              {confirmationVisible && !active ? `Confirm ${days}-day lock` : "Uninstall Protection"}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close uninstall protection" disabled={busy} onPress={() => {
              if (!inFlight.current) onClose();
            }} style={({ pressed }) => [s.close, { opacity: busy ? 0.45 : pressed ? 0.7 : 1 }]}>
              <Icon name="close" size={20} color={p.textSecondary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.dialogContent} showsVerticalScrollIndicator={false} bounces={false}>
            {confirmationVisible && !active ? (
              <>
                {notice && <View accessibilityRole="alert"><Body strong>{notice}</Body></View>}
                <Body strong>Once started, this timer cannot be cancelled or shortened in Restrainify.</Body>
                <Body>You are agreeing to {days} full {days === 1 ? "day" : "days"} of independent Uninstall Protection. The lock starts after administrator access is granted, not while you review this confirmation.</Body>
                <Body>Android will ask for Device Administrator access. Accessibility must stay connected. This regular Android protection can still be bypassed by safe mode, administrator removal or a system reset.</Body>
                <Body>Administrator access is released only when this timer and any Burst uninstall lock have both ended.</Body>
                <Button title={busy ? "Requesting protection…" : `Agree & start ${days}-day lock`} disabled={disabled} onPress={() => void confirmStart()} />
                <Button title="Cancel" tone="secondary" disabled={disabled} onPress={() => setConfirmationVisible(false)} />
              </>
            ) : (
              <>
                <Body>Keep Restrainify installed for a duration you choose. This timer is independent of Burst.</Body>

                {notice && <View accessibilityRole="alert"><Panel><Body strong>{notice}</Body><Button title="Dismiss notice" tone="secondary" onPress={() => { setActionError(null); clearError(); }} /></Panel></View>}

                {active ? (
                  <Panel>
                    <Icon name={degraded ? "shield-alert-outline" : "shield-lock-outline"} color={degraded ? p.warning : p.brandPrimary} />
                    <Body strong>{degraded ? "Timer active · protection degraded" : "Timed uninstall lock active"}</Body>
                    <Text style={[s.countdown, { color: p.textPrimary }]}>{remainingDuration(remaining)} remaining</Text>
                    {expiry !== undefined && <Body>Expires {new Date(expiry).toLocaleString()}</Body>}
                    <Body>You cannot cancel, shorten or replace this timer in the app. Restoring permissions keeps the same expiry.</Body>
                    {degraded && <>
                      <Body>{!hasAccessibility ? "Accessibility is not connected or consent is missing. Settings and uninstall-screen interception cannot work." : "Device Administrator is missing. Android uninstall protection is not fully active."}</Body>
                      <Button title="Restore permissions" icon="shield-check-outline" disabled={disabled} onPress={() => void restorePermissions()} />
                    </>}
                    {remaining === 0 && <Body>Checking timer expiry…</Body>}
                  </Panel>
                ) : (
                  <Panel>
                    <Body strong>Choose your lock duration</Body>
                    <View style={s.presets}>
                      {DAY_PRESETS.map(value => (
                        <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value} ${value === 1 ? "day" : "days"} duration`}
                          accessibilityState={{ selected: days === value, disabled }} disabled={disabled} onPress={() => setDays(value)}
                          style={({ pressed }) => [s.preset, {
                            backgroundColor: days === value ? p.actionFill : p.surfaceMuted,
                            borderColor: days === value ? p.actionFill : p.borderSubtle,
                            opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
                          }]}>
                          <Text style={[s.presetText, { color: days === value ? p.actionText : p.textPrimary }]}>{value} {value === 1 ? "day" : "days"}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Body>The timer starts only after you confirm and Android grants Device Administrator access.</Body>
                    {!hasAccessibility && <Body>Connected accessibility and your consent are required before starting.</Body>}
                    <Button title={hasAccessibility ? `Review ${days}-day lock` : "Set up accessibility"} icon="shield-lock-outline" disabled={disabled}
                      onPress={() => {
                        clearError();
                        if (!hasAccessibility) openAccessibility();
                        else setConfirmationVisible(true);
                      }} />
                  </Panel>
                )}

              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 1 },
  close: { minHeight: 48, width: 48, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 21, fontWeight: "700", letterSpacing: -0.5 },
  countdown: { fontSize: 26, fontWeight: "700" },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  preset: { minHeight: 48, minWidth: 80, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1 },
  presetText: { fontSize: 15, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(8, 14, 26, 0.72)", alignItems: "center", justifyContent: "center", padding: 20 },
  dialog: { width: "100%", maxWidth: 375, borderRadius: 24, borderWidth: 1.2, elevation: 24, overflow: "hidden" },
  dialogContent: { padding: 20, gap: 16 },
});
