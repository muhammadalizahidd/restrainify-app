import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Animated, Easing, Image, PanResponder, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../../../components/AppText";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, useReducedMotion, type IconName } from "../../../components/OfflineUI";
import type { TourDemoId } from "./tourContent";

/**
 * Small interactive mock-ups for the feature tour. They never touch real settings or permissions:
 * every tap only changes what the mock card shows. Colours come from the live theme palette.
 */
export interface TourDemoProps {
  /** True once the user tried the demo, or its result auto-played. */
  done: boolean;
  onTry: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mark = require("../../../../assets/restrainify-mark.png");

/** Fades and lifts a result into view once `done` turns true. */
function Reveal({ done, children, style }: PropsWithChildren<{ done: boolean; style?: StyleProp<ViewStyle> }>) {
  const reduceMotion = useReducedMotion();
  const value = useRef(new Animated.Value(done ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) {
      value.setValue(done ? 1 : 0);
      return;
    }
    Animated.timing(value, { toValue: done ? 1 : 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [done, reduceMotion, value]);
  return (
    <Animated.View
      pointerEvents={done ? "auto" : "none"}
      style={[style, { opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

function Chip({ icon, label }: { icon: IconName; label: string }) {
  const { palette: p } = useOffline();
  return (
    <View style={[s.chip, { backgroundColor: p.successSurface }]}>
      <Icon name={icon} size={13} color={p.success} />
      <Text style={[s.chipText, { color: p.success }]}>{label}</Text>
    </View>
  );
}

/** A static mini switch for the mock rows. */
function MiniSwitch({ on }: { on: boolean }) {
  const { palette: p } = useOffline();
  return (
    <View style={[s.miniSwitch, { backgroundColor: on ? p.toggleActive : p.borderSubtle }]}>
      <View style={[s.miniThumb, on ? { right: 3 } : { left: 3 }]} />
    </View>
  );
}

function SiteBlockerDemo({ done, onTry }: TourDemoProps) {
  const { palette: p } = useOffline();
  return (
    <View style={s.pad}>
      <View style={[s.bar, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}>
        <Icon name="web" size={16} color={p.textMuted} />
        <Text style={[s.barText, { color: p.textPrimary }]}>adult-site.com</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Visit adult-site.com" onPress={onTry}
          style={({ pressed }) => [s.smallBtn, { backgroundColor: p.actionFill, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={[s.smallBtnText, { color: p.actionText }]}>Visit</Text>
        </Pressable>
      </View>
      <View style={[s.card, s.centerCard, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}>
        {!done && (
          <View style={s.skeleton}>
            {[0.9, 0.7, 0.8].map((w, k) => <View key={k} style={[s.skeletonLine, { width: `${w * 100}%`, backgroundColor: p.surfaceMuted }]} />)}
          </View>
        )}
        <Reveal done={done} style={StyleSheet.absoluteFill}>
          <View style={s.blockedCenter}>
            <View style={[s.bigTile, { backgroundColor: p.dangerSurface }]}>
              <Icon name="cancel" size={28} color={p.danger} />
            </View>
            <Text style={[s.cardTitle, { color: p.textPrimary }]}>Site blocked</Text>
            <Text style={[s.cardBody, { color: p.textSecondary }]}>This site is on Restrainify's adult content list.</Text>
            <View style={s.chipRow}>
              <Chip icon="magnify" label="SafeSearch on" />
              <Chip icon="shield-check-outline" label="Every browser" />
            </View>
          </View>
        </Reveal>
      </View>
    </View>
  );
}

function ExplicitFilterDemo({ done, onTry }: TourDemoProps) {
  const { palette: p } = useOffline();
  return (
    <View style={s.pad}>
      <View style={[s.post, { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle }]}>
        {/* An abstract, blurred-looking placeholder: never real imagery. */}
        <View style={[s.blob, { backgroundColor: p.heroEnd, top: 30, left: 40 }]} />
        <View style={[s.blob, { backgroundColor: p.heroMiddle, top: 80, left: 140, width: 120, height: 120 }]} />
        <View style={[s.blob, { backgroundColor: p.warning, top: 120, left: 60, width: 70, height: 70 }]} />
        {!done && (
          <Pressable accessibilityRole="button" accessibilityLabel="Scan this post" onPress={onTry}
            style={({ pressed }) => [s.scanBtn, { backgroundColor: p.actionFill, opacity: pressed ? 0.8 : 1 }]}>
            <Icon name="magnify" size={16} color={p.actionText} />
            <Text style={[s.smallBtnText, { color: p.actionText }]}>Scan</Text>
          </Pressable>
        )}
        {/* The real block cover is always dark, in both themes. */}
        <Reveal done={done} style={[StyleSheet.absoluteFill, s.cover]}>
          <Image source={mark} style={s.coverMark} />
          <Text style={s.coverBrand}>Restrainify</Text>
          <Text style={s.coverTitle}>Content blocked</Text>
          <View style={s.coverHint}>
            <Icon name="gesture-swipe-up" size={13} color="rgb(191,219,254)" />
            <Text style={s.coverHintText}>Swipe up to skip</Text>
          </View>
        </Reveal>
      </View>
      <View style={s.platformRow}>
        {["Instagram", "TikTok", "YouTube"].map((name) => (
          <View key={name} style={[s.platform, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}>
            <Text style={[s.platformText, { color: p.textPrimary }]}>{name}</Text>
            <MiniSwitch on />
          </View>
        ))}
      </View>
    </View>
  );
}

function InAppBlockerDemo({ done, onTry }: TourDemoProps) {
  const { palette: p } = useOffline();
  const navIcons: IconName[] = ["home-outline", "magnify", "play-box-outline", "send-outline", "account-circle-outline"];
  return (
    <View style={s.pad}>
      <View style={[s.card, s.appMock, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}>
        <Text style={[s.appMockTitle, { color: p.textPrimary }]}>Social app</Text>
        <View style={[s.feed, { backgroundColor: p.surfaceMuted }]}>
          {!done && <Icon name="play-circle-outline" size={34} color={p.textMuted} />}
          <Reveal done={done} style={[StyleSheet.absoluteFill, s.feedBlocked, { backgroundColor: p.dangerSurface }]}>
            <Icon name="play-box-outline" size={30} color={p.danger} />
            <Text style={[s.feedBlockedTitle, { color: p.danger }]}>Reels blocked</Text>
            <Text style={[s.cardBody, { color: p.textSecondary }]}>Feeds close the moment they open</Text>
          </Reveal>
        </View>
      </View>
      <View style={[s.nav, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}>
        {navIcons.map((icon) => {
          const reels = icon === "play-box-outline";
          return (
            <Pressable key={icon} accessibilityRole="button" accessibilityLabel={reels ? "Reels tab" : icon} disabled={!reels} onPress={onTry}
              style={[s.navItem, reels && !done && { borderColor: p.heroEnd, borderWidth: 2, borderRadius: 18 }]}>
              <Icon name={icon} size={21} color={reels ? (done ? p.danger : p.brandPrimary) : p.textSecondary} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const TRACK_MAX_MINUTES = 120;

function AppLimitsDemo({ done, onTry }: TourDemoProps) {
  const { palette: p } = useOffline();
  const [minutes, setMinutes] = useState(done ? 30 : 15);
  const [trackWidth, setTrackWidth] = useState(1);
  const startMinutes = useRef(minutes);
  // Latest values for the gesture handlers, which are created once.
  const minutesRef = useRef(minutes);
  const widthRef = useRef(trackWidth);
  const tryRef = useRef(onTry);
  minutesRef.current = minutes;
  widthRef.current = trackWidth;
  tryRef.current = onTry;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { startMinutes.current = minutesRef.current; },
      onPanResponderMove: (_, g) => {
        const next = Math.round(startMinutes.current + (g.dx / widthRef.current) * TRACK_MAX_MINUTES);
        setMinutes(Math.max(5, Math.min(TRACK_MAX_MINUTES, Math.round(next / 5) * 5)));
      },
      onPanResponderRelease: () => tryRef.current(),
    }),
  ).current;
  // Auto-play lands on 30 minutes so the result reads the same either way.
  useEffect(() => { if (done && minutesRef.current === 15) setMinutes(30); }, [done]);

  const used = Math.min(22, minutes);
  const fraction = minutes / TRACK_MAX_MINUTES;
  return (
    <View style={[s.pad, { alignItems: "center" }]}>
      <View style={[s.budget, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle }]}>
        <Text style={[s.budgetBig, { color: p.textPrimary }]}>{used}m</Text>
        <Text style={[s.cardBody, { color: p.textSecondary }]}>of {minutes} min today</Text>
        <View style={[s.budgetBar, { backgroundColor: p.surfaceMuted }]}>
          <View style={[s.budgetFill, { width: `${(used / minutes) * 100}%`, backgroundColor: p.toggleActive }]} />
        </View>
      </View>
      <View style={s.sliderBlock}>
        <View style={s.sliderLabels}>
          <Text style={[s.sliderLabel, { color: p.textSecondary }]}>Instagram limit</Text>
          <Text style={[s.sliderLabel, { color: p.textPrimary }]}>{minutes} min</Text>
        </View>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel={`Instagram daily limit, ${minutes} minutes`}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) => {
            setMinutes((m) => Math.max(5, Math.min(TRACK_MAX_MINUTES, m + (e.nativeEvent.actionName === "increment" ? 5 : -5))));
            onTry();
          }}
          onLayout={(e) => setTrackWidth(Math.max(1, e.nativeEvent.layout.width))}
          style={s.trackTouch}
          {...pan.panHandlers}
        >
          <View style={[s.track, { backgroundColor: p.surfaceMuted }]}>
            <View style={[s.trackFill, { width: `${fraction * 100}%`, backgroundColor: p.toggleActive }]} />
          </View>
          <View style={[s.thumb, { left: fraction * trackWidth - 13, borderColor: p.toggleActive, backgroundColor: p.surfacePrimary }]} />
        </View>
        <View style={s.chipRow}>
          <View style={[s.chip, { backgroundColor: p.actionFill }]}><Text style={[s.chipText, { color: p.actionText }]}>21:00 – 07:00</Text></View>
          <View style={[s.chip, { backgroundColor: p.surfaceMuted }]}><Text style={[s.chipText, { color: p.textPrimary }]}>Every day</Text></View>
        </View>
      </View>
    </View>
  );
}

function SettingsLockDemo({ done, onTry }: TourDemoProps) {
  const { palette: p } = useOffline();
  const reduceMotion = useReducedMotion();
  const shake = useRef(new Animated.Value(0)).current;
  const attempt = () => {
    onTry();
    if (reduceMotion) return;
    shake.setValue(0);
    Animated.sequence([-1, 1, -1, 1, 0].map((to) => Animated.timing(shake, { toValue: to, duration: 55, useNativeDriver: true }))).start();
  };
  const rows: { name: string; icon: IconName }[] = [
    { name: "Site Blocker", icon: "web" },
    { name: "Explicit Content Filter", icon: "eye-off-outline" },
    { name: "In-App Blocker", icon: "play-box-outline" },
  ];
  return (
    <View style={s.pad}>
      <View style={[s.card, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle, paddingVertical: 4 }]}>
        {rows.map((row, k) => {
          const target = k === 1;
          return (
            <View key={row.name} style={[s.lockRow, k < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.borderSubtle }]}>
              <View style={[s.rowIcon, { backgroundColor: p.successSurface }]}><Icon name={row.icon} size={17} color={p.brandPrimary} /></View>
              <Text numberOfLines={1} style={[s.lockRowText, { color: p.textPrimary }]}>{row.name}</Text>
              {target && done && <Icon name="lock" size={16} color={p.brandPrimary} />}
              {target ? (
                <Pressable accessibilityRole="switch" accessibilityLabel="Explicit Content Filter" accessibilityState={{ checked: true }} onPress={attempt} hitSlop={8}>
                  <Animated.View style={{ transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] }) }] }}>
                    <View style={!done && [s.pulseRing, { borderColor: p.heroEnd }]}><MiniSwitch on /></View>
                  </Animated.View>
                </Pressable>
              ) : <MiniSwitch on />}
            </View>
          );
        })}
      </View>
      <Reveal done={done} style={[s.darkBanner, { backgroundColor: p.heroStart }]}>
        <Icon name="lock-outline" size={20} color="#FFFFFF" />
        <View style={{ flex: 1 }}>
          <Text style={s.darkBannerTitle}>Settings Lock is on</Text>
          <Text style={s.darkBannerBody}>Protection can't be weakened for 58 min</Text>
        </View>
      </Reveal>
    </View>
  );
}

function UninstallLockDemo({ done, onTry }: TourDemoProps) {
  const { palette: p } = useOffline();
  return (
    <View style={s.pad}>
      <View style={[s.card, { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle, padding: 14 }]}>
        <View style={s.appInfoHead}>
          <Image source={mark} style={[s.appInfoIcon, { borderColor: p.borderSubtle }]} />
          <View>
            <Text style={[s.appInfoName, { color: p.textPrimary }]}>Restrainify</Text>
            <Text style={[s.cardBody, { color: p.textSecondary, marginTop: 0, textAlign: "left" }]}>App info</Text>
          </View>
        </View>
        <View style={s.appInfoActions}>
          {["Uninstall", "Force stop"].map((label) => (
            <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} disabled={done || label !== "Uninstall"} onPress={onTry}
              style={[s.appInfoBtn, { backgroundColor: p.surfaceMuted, borderColor: !done && label === "Uninstall" ? p.heroEnd : "transparent" }]}>
              <Text style={[s.smallBtnText, { color: done ? p.textMuted : p.textPrimary, textDecorationLine: done ? "line-through" : "none" }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Reveal done={done} style={[s.countdown, { backgroundColor: p.heroStart }]}>
        <Text style={s.countdownBig}>29d 23h</Text>
        <Text style={s.darkBannerBody}>Uninstall Lock remaining</Text>
        <View style={s.dayRow}>
          {[1, 7, 14, 30, 60, 90].map((d) => (
            <View key={d} style={[s.dayChip, { backgroundColor: d === 30 ? "#FFFFFF" : "rgba(255,255,255,0.14)" }]}>
              <Text style={[s.dayChipText, { color: d === 30 ? "#10264D" : "#FFFFFF" }]}>{d}d</Text>
            </View>
          ))}
        </View>
      </Reveal>
    </View>
  );
}

export function TourDemo({ id, ...props }: TourDemoProps & { id: TourDemoId }) {
  switch (id) {
    case "site": return <SiteBlockerDemo {...props} />;
    case "explicit": return <ExplicitFilterDemo {...props} />;
    case "inapp": return <InAppBlockerDemo {...props} />;
    case "limits": return <AppLimitsDemo {...props} />;
    case "settingsLock": return <SettingsLockDemo {...props} />;
    case "uninstall": return <UninstallLockDemo {...props} />;
  }
}

const s = StyleSheet.create({
  pad: { flex: 1, padding: 14, gap: 12 },
  card: { borderWidth: 1, borderRadius: 16 },
  centerCard: { flex: 1, overflow: "hidden" },
  bar: { height: 42, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingRight: 4 },
  barText: { flex: 1, fontSize: 13 },
  smallBtn: { height: 34, paddingHorizontal: 14, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  smallBtnText: { fontSize: 12.5, fontWeight: "700" },
  skeleton: { padding: 18, gap: 10 },
  skeletonLine: { height: 10, borderRadius: 6 },
  blockedCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  bigTile: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 18, fontWeight: "700", marginTop: 10 },
  cardBody: { fontSize: 12.5, lineHeight: 18, textAlign: "center", marginTop: 4 },
  chipRow: { flexDirection: "row", gap: 6, marginTop: 12, flexWrap: "wrap", justifyContent: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  chipText: { fontSize: 11, fontWeight: "600" },
  miniSwitch: { width: 30, height: 18, borderRadius: 999 },
  miniThumb: { position: "absolute", top: 3, width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFFFFF" },
  post: { flex: 1, borderRadius: 16, borderWidth: 1, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  blob: { position: "absolute", width: 100, height: 100, borderRadius: 60, opacity: 0.45 },
  scanBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingHorizontal: 18, borderRadius: 19 },
  cover: { backgroundColor: "rgb(10,18,32)", alignItems: "center", justifyContent: "center" },
  coverMark: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#FFFFFF" },
  coverBrand: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", marginTop: 10 },
  coverTitle: { color: "rgb(244,247,252)", fontSize: 19, fontWeight: "700", marginTop: 4 },
  coverHint: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  coverHintText: { color: "rgb(191,219,254)", fontSize: 12, fontWeight: "700" },
  platformRow: { flexDirection: "row", gap: 6, justifyContent: "center" },
  platform: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingLeft: 10, paddingRight: 5, paddingVertical: 5 },
  platformText: { fontSize: 11, fontWeight: "600" },
  appMock: { flex: 1, padding: 12, gap: 10 },
  appMockTitle: { fontSize: 15, fontWeight: "700" },
  feed: { flex: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  feedBlocked: { alignItems: "center", justifyContent: "center", gap: 4, padding: 10 },
  feedBlockedTitle: { fontSize: 16, fontWeight: "700" },
  nav: { height: 50, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  navItem: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  budget: { alignItems: "center", borderWidth: 1, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 22, width: "100%" },
  budgetBig: { fontSize: 32, fontWeight: "700", letterSpacing: -1 },
  budgetBar: { height: 8, borderRadius: 8, width: "100%", marginTop: 12, overflow: "hidden" },
  budgetFill: { height: "100%", borderRadius: 8 },
  sliderBlock: { width: "100%" },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between" },
  sliderLabel: { fontSize: 12.5, fontWeight: "600" },
  trackTouch: { height: 40, justifyContent: "center" },
  track: { height: 8, borderRadius: 8, overflow: "hidden" },
  trackFill: { height: "100%", borderRadius: 8 },
  thumb: { position: "absolute", width: 26, height: 26, borderRadius: 13, borderWidth: 3, top: 7 },
  lockRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  lockRowText: { flex: 1, fontSize: 13, fontWeight: "600" },
  pulseRing: { borderWidth: 2, borderRadius: 999, padding: 2 },
  darkBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 12 },
  darkBannerTitle: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  darkBannerBody: { color: "rgba(255,255,255,0.8)", fontSize: 11.5, marginTop: 2 },
  appInfoHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  appInfoIcon: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, backgroundColor: "#FFFFFF" },
  appInfoName: { fontSize: 14, fontWeight: "700" },
  appInfoActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  appInfoBtn: { flex: 1, height: 38, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  countdown: { borderRadius: 16, padding: 14, alignItems: "center" },
  countdownBig: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  dayRow: { flexDirection: "row", gap: 5, marginTop: 10 },
  dayChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  dayChipText: { fontSize: 11, fontWeight: "700" },
});
