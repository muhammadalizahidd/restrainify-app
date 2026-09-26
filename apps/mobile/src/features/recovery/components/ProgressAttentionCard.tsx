import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { duration } from "../../../components/OfflineUI";

export interface ProgressAttentionCardProps {
  todayMs: number;
  weekUsage: { day: string; ms: number }[];
}

/**
 * ProgressAttentionCard displays the 7-day attention trend card for PROG-01.
 * Renders a clean, continuous line graph showing daily focus patterns,
 * trend delta vs yesterday, and data node points across the week.
 */
export function ProgressAttentionCard({
  todayMs,
  weekUsage,
}: ProgressAttentionCardProps) {
  const { palette: p } = useOffline();
  const [graphWidth, setGraphWidth] = useState(0);

  // Compare today with yesterday (second to last item)
  const yesterdayMs = weekUsage.at(-2)?.ms ?? 0;
  const change =
    yesterdayMs > 0
      ? Math.round(((todayMs - yesterdayMs) / yesterdayMs) * 100)
      : null;

  const isReduced = change !== null && change <= 0;

  // Compute scale ceiling (minimum 1 hour to prevent flatline visual collapse)
  const maxMs = Math.max(...weekUsage.map((w) => w.ms), todayMs, 3600000);

  // Layout constants for line graph
  const GRAPH_HEIGHT = 80;
  const PAD_TOP = 14;
  const PAD_BOTTOM = 14;
  const PLOT_HEIGHT = GRAPH_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const PAD_X = 16;
  const numPoints = Math.max(weekUsage.length, 1);
  const plotWidth = Math.max(graphWidth - 2 * PAD_X, 10);

  // Compute (x, y) coordinates for all points
  const points = weekUsage.map((item, index) => {
    const x = PAD_X + (index / Math.max(numPoints - 1, 1)) * plotWidth;
    const ratio = Math.min(1, Math.max(0, item.ms / maxMs));
    const y = GRAPH_HEIGHT - PAD_BOTTOM - ratio * PLOT_HEIGHT;
    const dayLabel = new Date(`${item.day}T12:00:00`).toLocaleDateString(
      undefined,
      { weekday: "narrow" }
    );
    const isToday = index === weekUsage.length - 1;
    return { x, y, dayLabel, isToday, ms: item.ms, day: item.day };
  });

  return (
    <View style={s.container}>
      {/* Section Header */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Attention trend
        </Text>
        <Text style={[s.sectionBadge, { color: p.textSecondary }]}>
          7 DAYS
        </Text>
      </View>

      {/* Main Trend Card */}
      <View
        style={[
          s.card,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        {/* Top Header Row with Today's Usage & Comparison Pill */}
        <View style={s.topRow}>
          <View>
            <Text style={[s.usageValue, { color: p.textPrimary }]}>
              {duration(todayMs)}
            </Text>
            <Text style={[s.todayLabel, { color: p.textSecondary }]}>Today</Text>
          </View>
          {change !== null && (
            <View
              style={[
                s.pill,
                { backgroundColor: isReduced ? p.successSurface : p.surfaceMuted },
              ]}
            >
              <Text
                style={[
                  s.pillText,
                  { color: isReduced ? p.success : p.textSecondary },
                ]}
              >
                {isReduced ? "↓ " : "↑ "}
                {Math.abs(change)}% vs yesterday
              </Text>
            </View>
          )}
        </View>

        {/* 7-Day Line Graph Area */}
        <View
          onLayout={(e) => setGraphWidth(e.nativeEvent.layout.width)}
          style={[s.graphContainer, { height: GRAPH_HEIGHT + 28 }]}
        >
          {/* Subtle Horizontal Baseline */}
          <View
            style={[
              s.baseline,
              {
                top: GRAPH_HEIGHT - PAD_BOTTOM,
                borderBottomColor: p.borderSubtle,
              },
            ]}
          />

          {/* Render Graph Once Width is Measured */}
          {graphWidth > 0 && (
            <>
              {/* Vertical Guide Drops from Nodes to Baseline */}
              {points.map((pt, i) => (
                <View
                  key={`guide-${i}`}
                  style={[
                    s.verticalGuide,
                    {
                      left: pt.x,
                      top: pt.y,
                      height: Math.max(0, GRAPH_HEIGHT - PAD_BOTTOM - pt.y),
                      backgroundColor: pt.isToday ? p.brandPrimary : p.borderSubtle,
                      opacity: pt.isToday ? 0.35 : 0.2,
                    },
                  ]}
                />
              ))}

              {/* Line Segments Connecting Consecutive Points */}
              {points.map((pt, i) => {
                if (i === points.length - 1) return null;
                const next = points[i + 1];
                const dx = next.x - pt.x;
                const dy = next.y - pt.y;
                const dist = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                const cx = (pt.x + next.x) / 2;
                const cy = (pt.y + next.y) / 2;

                return (
                  <View
                    key={`line-${i}`}
                    style={[
                      s.lineSegment,
                      {
                        left: cx - dist / 2,
                        top: cy - 1.5,
                        width: dist,
                        backgroundColor: p.brandPrimary,
                        transform: [{ rotate: `${angle}deg` }],
                      },
                    ]}
                  />
                );
              })}

              {/* Data Nodes */}
              {points.map((pt, i) => (
                <View key={`node-${i}`}>
                  {pt.isToday ? (
                    <>
                      {/* Outer Pulse Halo for Today */}
                      <View
                        style={[
                          s.todayHalo,
                          {
                            left: pt.x - 9,
                            top: pt.y - 9,
                            backgroundColor: p.brandPrimary,
                          },
                        ]}
                      />
                      {/* Inner Solid Node */}
                      <View
                        accessibilityLabel={`Today: ${duration(pt.ms)}`}
                        style={[
                          s.todayNode,
                          {
                            left: pt.x - 5,
                            top: pt.y - 5,
                            backgroundColor: p.brandPrimary,
                            borderColor: p.surfacePrimary,
                          },
                        ]}
                      />
                    </>
                  ) : (
                    /* Regular Day Node */
                    <View
                      accessibilityLabel={`${pt.day}: ${duration(pt.ms)}`}
                      style={[
                        s.dayNode,
                        {
                          left: pt.x - 4,
                          top: pt.y - 4,
                          backgroundColor: p.surfacePrimary,
                          borderColor: p.brandPrimary,
                        },
                      ]}
                    />
                  )}

                  {/* Day Initials Label Below */}
                  <Text
                    style={[
                      s.dayLabel,
                      {
                        left: pt.x - 14,
                        top: GRAPH_HEIGHT + 6,
                        color: pt.isToday ? p.brandPrimary : p.textSecondary,
                        fontWeight: pt.isToday ? "800" : "500",
                      },
                    ]}
                  >
                    {pt.dayLabel}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionBadge: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  usageValue: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  todayLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  graphContainer: {
    width: "100%",
    position: "relative",
    marginTop: 4,
  },
  baseline: {
    position: "absolute",
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderStyle: "dashed",
    opacity: 0.6,
  },
  verticalGuide: {
    position: "absolute",
    width: 1,
  },
  lineSegment: {
    position: "absolute",
    height: 3,
    borderRadius: 1.5,
  },
  dayNode: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  todayHalo: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    opacity: 0.25,
  },
  todayNode: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  dayLabel: {
    position: "absolute",
    width: 28,
    textAlign: "center",
    fontSize: 10,
  },
});
