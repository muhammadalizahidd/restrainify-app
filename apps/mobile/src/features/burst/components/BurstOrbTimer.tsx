import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";

export interface BurstOrbTimerProps {
  burstRemainingMs: number;
  onComplete?: () => void;
}

/**
 * Formats milliseconds into clean MM:SS string
 */
export function formatTimer(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * BurstOrbTimer implements the signature Orbit / Clarity .burst-orb:
 * Concentric dark navy/blue radial-look rings with real-time digital countdown.
 */
export function BurstOrbTimer({
  burstRemainingMs,
  onComplete,
}: BurstOrbTimerProps) {
  const { palette: p } = useOffline();
  const [remaining, setRemaining] = useState(burstRemainingMs);

  // High-precision local 1-second interval ticker for smooth visual countdown
  useEffect(() => {
    setRemaining(burstRemainingMs);
    if (burstRemainingMs <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const next = Math.max(0, burstRemainingMs - elapsed);
      setRemaining(next);
      if (next <= 0) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [burstRemainingMs, onComplete]);

  const timeDisplay = formatTimer(remaining);

  return (
    <View style={s.wrap}>
      {/* Outer subtle glow rings */}
      <View style={[s.outerRing2, { borderColor: "rgba(49, 111, 203, 0.08)" }]}>
        <View style={[s.outerRing1, { borderColor: "rgba(49, 111, 203, 0.16)" }]}>
          {/* Central Deep Core Orb */}
          <View
            style={[
              s.coreOrb,
              {
                backgroundColor: p.brandPrimary,
                shadowColor: p.brandPrimary,
              },
            ]}
          >
            <View style={s.innerGradientLayer}>
              <Text style={s.timerNumeral}>{timeDisplay}</Text>
              <Text style={s.timerLabel}>COOLDOWN REMAINING</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 18,
  },
  outerRing2: {
    width: 218,
    height: 218,
    borderRadius: 109,
    borderWidth: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  outerRing1: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  coreOrb: {
    width: 166,
    height: 166,
    borderRadius: 83,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  innerGradientLayer: {
    width: "100%",
    height: "100%",
    borderRadius: 83,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#173B75",
  },
  timerNumeral: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -1.2,
  },
  timerLabel: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#D8E8FF",
    letterSpacing: 0.6,
    marginTop: 4,
  },
});
