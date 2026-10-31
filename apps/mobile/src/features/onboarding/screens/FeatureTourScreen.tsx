import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, BackHandler, Easing, PanResponder, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../components/AppText";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { GradientFill, Icon, SurfaceGradient, useReducedMotion } from "../../../components/OfflineUI";
import { TourDemo } from "../tour/TourDemos";
import { TOUR_AUTOPLAY_MS, TOUR_RECAP, TOUR_SLIDES } from "../tour/tourContent";

export interface FeatureTourScreenProps {
  /** Called when the user finishes or skips the tour. */
  onDone: () => Promise<void> | void;
}

/**
 * First-launch tour of the six home-screen protections: one short, interactive slide each, then a recap.
 * Skippable at any point. The demos are mock-ups only; nothing here changes real settings.
 */
export function FeatureTourScreen({ onDone }: FeatureTourScreenProps) {
  const { palette: p } = useOffline();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [tried, setTried] = useState<boolean[]>(() => TOUR_SLIDES.map(() => false));
  const [finishing, setFinishing] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const isRecap = index >= TOUR_SLIDES.length;
  const slide = TOUR_SLIDES[Math.min(index, TOUR_SLIDES.length - 1)];
  const done = !isRecap && tried[index];

  const markTried = (k: number) => setTried((prev) => (prev[k] ? prev : prev.map((v, j) => (j === k ? true : v))));

  // If the user just reads, the demo's result plays by itself so the slide never feels stuck.
  useEffect(() => {
    if (isRecap || tried[index]) return;
    const timer = setTimeout(() => markTried(index), TOUR_AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [index, isRecap, tried]);

  const goTo = (next: number) => {
    const target = Math.max(0, Math.min(TOUR_SLIDES.length, next));
    if (target === index) return;
    if (reduceMotion) {
      setIndex(target);
      return;
    }
    Animated.timing(fade, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      setIndex(target);
      Animated.timing(fade, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    });
  };

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await onDone();
    } finally {
      setFinishing(false);
    }
  };

  // Android back steps back through the tour instead of leaving onboarding.
  const indexRef = useRef(index);
  indexRef.current = index;
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (indexRef.current === 0) return false;
      goTo(indexRef.current - 1);
      return true;
    });
    return () => sub.remove();
  });

  // Horizontal swipes on the text area move between slides (the demo card keeps its own gestures).
  const goToRef = useRef(goTo);
  goToRef.current = goTo;
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) goToRef.current(indexRef.current + 1);
        else if (g.dx > 50) goToRef.current(indexRef.current - 1);
      },
    }),
  ).current;

  if (isRecap) {
    return (
      <View style={s.container}>
        <Animated.View style={[s.recap, { opacity: fade }]}>
          <View style={[s.recapTile, { overflow: "hidden" }]}>
            <GradientFill />
            <Icon name="shield-check-outline" size={48} color={p.actionText} />
          </View>
          <Text accessibilityRole="header" style={[s.title, s.center, { color: p.textPrimary }]}>You're protected</Text>
          <Text style={[s.body, s.center, { color: p.textSecondary }]}>
            All six protections live on your home screen. Tap any card to change it.
          </Text>
          <View style={s.recapGrid}>
            {TOUR_RECAP.map((item) => (
              <View key={item.name} style={[s.recapCard, { borderColor: p.borderSubtle, overflow: "hidden" }]}>
                <SurfaceGradient />
                <View style={[s.recapIcon, { backgroundColor: p.successSurface }]}>
                  <Icon name={item.icon} size={15} color={p.brandPrimary} />
                </View>
                <Text numberOfLines={2} style={[s.recapName, { color: p.textPrimary }]}>{item.name}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
        <View style={s.bottom}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go to my dashboard" disabled={finishing} onPress={() => void finish()}
            style={({ pressed }) => [s.next, s.wide, { overflow: "hidden", opacity: finishing ? 0.7 : pressed ? 0.88 : 1 }]}>
            <GradientFill />
            {finishing ? <ActivityIndicator color={p.actionText} /> : <Text style={[s.nextText, { color: p.actionText }]}>Go to my dashboard</Text>}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.top}>
        <View style={s.segments} accessibilityRole="progressbar" accessibilityLabel={`Step ${index + 1} of ${TOUR_SLIDES.length}`}>
          {TOUR_SLIDES.map((item, k) => (
            <View key={item.demo} style={[s.segment, { backgroundColor: k <= index ? p.toggleActive : p.borderSubtle }]} />
          ))}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Skip the tour" disabled={finishing} onPress={() => void finish()} hitSlop={10}>
          <Text style={[s.skip, { color: p.textSecondary }]}>Skip</Text>
        </Pressable>
      </View>

      <Animated.View style={[s.slide, { opacity: fade }]}>
        <View style={[s.stage, { borderColor: p.borderSubtle }]}>
          <SurfaceGradient />
          <TourDemo key={slide.demo} id={slide.demo} done={done} onTry={() => markTried(index)} />
        </View>

        <View {...swipe.panHandlers} style={s.copyArea}>
          <View style={[s.hint, { backgroundColor: p.successSurface }]}>
            <Icon name={done ? slide.doneIcon : "gesture-tap"} size={14} color={p.success} />
            <Text style={[s.hintText, { color: p.success }]}>{done ? slide.doneHint : slide.tryHint}</Text>
          </View>
          <Text style={[s.eyebrow, { color: p.heroEnd }]}>
            {index + 1} of {TOUR_SLIDES.length} · {slide.feature}
          </Text>
          <Text accessibilityRole="header" style={[s.title, { color: p.textPrimary }]}>{slide.title}</Text>
          <Text style={[s.body, { color: p.textSecondary }]}>{slide.body}</Text>
        </View>
      </Animated.View>

      <View style={s.bottom}>
        {index > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => goTo(index - 1)} hitSlop={8} style={s.back}>
            <Text style={[s.backText, { color: p.textSecondary }]}>Back</Text>
          </Pressable>
        ) : <View />}
        <Pressable accessibilityRole="button" accessibilityLabel={index === TOUR_SLIDES.length - 1 ? "Finish" : "Next"} onPress={() => goTo(index + 1)}
          style={({ pressed }) => [s.next, { overflow: "hidden", opacity: pressed ? 0.88 : 1 }]}>
          <GradientFill />
          <Text style={[s.nextText, { color: p.actionText }]}>{index === TOUR_SLIDES.length - 1 ? "Finish" : "Next"}</Text>
          <Icon name="arrow-right" size={18} color={p.actionText} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, gap: 14 },
  top: { flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 4 },
  segments: { flex: 1, flexDirection: "row", gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 4 },
  skip: { fontSize: 14, fontWeight: "600" },
  slide: { flex: 1, gap: 14 },
  stage: { height: 320, borderRadius: 26, borderWidth: 1, overflow: "hidden" },
  copyArea: { flex: 1, gap: 6 },
  hint: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, marginBottom: 8 },
  hintText: { fontSize: 12.5, fontWeight: "600" },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1.3, textTransform: "uppercase" },
  title: { fontSize: 26, fontWeight: "700", letterSpacing: -0.6, lineHeight: 30 },
  body: { fontSize: 15, lineHeight: 22 },
  center: { textAlign: "center" },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { paddingVertical: 12, paddingHorizontal: 8 },
  backText: { fontSize: 14, fontWeight: "600" },
  next: { height: 52, paddingHorizontal: 26, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  wide: { flex: 1 },
  nextText: { fontSize: 15, fontWeight: "700" },
  recap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 4 },
  recapTile: { width: 96, height: 96, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  recapGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14, width: "100%" },
  recapCard: { width: "48.6%", flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, padding: 10 },
  recapIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  recapName: { flex: 1, fontSize: 11.5, fontWeight: "700", lineHeight: 15 },
});
