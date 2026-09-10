import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";

export interface RecoveryTimelineProps {
  currentStreak: number;
  longestStreak: number;
  recoveryStart: string;
  relapseCount: number;
}

function formatDateString(isoDateString: string): string {
  try {
    const parts = isoDateString.split("-");
    if (parts.length === 3) {
      const date = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10)
      );
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    }
    return isoDateString;
  } catch {
    return isoDateString;
  }
}

/**
 * RecoveryTimeline presents the user's current streak and historical achievements,
 * visually reassuring the user that previous recovery progress is preserved.
 */
export function RecoveryTimeline({
  currentStreak,
  longestStreak,
  recoveryStart,
  relapseCount,
}: RecoveryTimelineProps) {
  const { palette: p } = useOffline();

  const isPersonalBest = currentStreak >= longestStreak && currentStreak > 0;
  const formattedStart = formatDateString(recoveryStart);

  return (
    <View style={s.container}>
      {/* Section Title */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          Recovery history
        </Text>
      </View>

      <View style={s.timeline}>
        {/* Timeline Item 1: Current Streak */}
        <View style={s.timelineItem}>
          <View
            style={[
              s.timelineDot,
              { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
            ]}
          >
            <Icon name="chart-timeline-variant" size={17} color={p.brandPrimary} />
          </View>
          <View
            style={[
              s.timelineBody,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <Text style={[s.timelineTitle, { color: p.textPrimary }]}>
              Current streak · {currentStreak} {currentStreak === 1 ? "day" : "days"}
            </Text>
            <Text style={[s.timelineSubtitle, { color: p.textSecondary }]}>
              {isPersonalBest
                ? `Started ${formattedStart} · personal best in progress.`
                : `Active streak · tracking since ${formattedStart}.`}
            </Text>
          </View>
        </View>

        {/* Timeline Item 2: Longest / Historical Streak */}
        <View style={s.timelineItem}>
          <View
            style={[
              s.timelineDot,
              { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
            ]}
          >
            <Icon name="history" size={17} color={p.brandPrimary} />
          </View>
          <View
            style={[
              s.timelineBody,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <Text style={[s.timelineTitle, { color: p.textPrimary }]}>
              Longest streak · {longestStreak} {longestStreak === 1 ? "day" : "days"}
            </Text>
            <Text style={[s.timelineSubtitle, { color: p.textSecondary }]}>
              {relapseCount > 0
                ? "Historical progress preserved after setback."
                : "Continuous milestone record."}
            </Text>
          </View>
        </View>
      </View>

      {/* Mindset Reassurance Footer */}
      <View
        style={[
          s.mindsetCard,
          { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
        ]}
      >
        <Text style={[s.mindsetText, { color: p.textSecondary }]}>
          Restrainify never wipes out your recovery history. A difficult day does
          not erase the days that came before it.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 18,
    marginBottom: 8,
  },
  sectionHeader: {
    marginBottom: 10,
    marginHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  timeline: {
    gap: 10,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timelineDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineBody: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  timelineSubtitle: {
    fontSize: 10.5,
    fontWeight: "500",
    lineHeight: 15,
    marginTop: 3,
  },
  mindsetCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    marginTop: 12,
  },
  mindsetText: {
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "500",
  },
});
