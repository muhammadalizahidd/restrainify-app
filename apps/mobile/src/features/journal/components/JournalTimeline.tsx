import { Pressable, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import type { LocalEvent } from "../../../native/OfflineProtection";
import { formatEventTime, type EventDateGroup } from "../utils/journalUtils";

export interface JournalTimelineProps {
  groups: EventDateGroup[];
  onMarkResisted: (id: string) => Promise<void>;
}

/**
 * JournalTimeline renders the chronological grouped event stream for JOUR-01.
 * Supports urges (resisted/unresisted), burst completions, and relapses.
 */
export function JournalTimeline({ groups, onMarkResisted }: JournalTimelineProps) {
  const { palette: p } = useOffline();

  if (groups.length === 0) {
    return (
      <View
        style={[
          s.emptyCard,
          { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
        ]}
      >
        <Icon name="notebook-outline" size={24} color={p.textSecondary} />
        <Text style={[s.emptyTitle, { color: p.textPrimary }]}>
          No recovery events yet.
        </Text>
        <Text style={[s.emptySub, { color: p.textSecondary }]}>
          Log an urge or intervention when you notice a trigger. Your history stays intact.
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {groups.map((group) => (
        <View key={group.title} style={s.groupWrap}>
          {/* Section Header */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
              {group.title}
            </Text>
            {!!group.badge && (
              <Text style={[s.sectionBadge, { color: p.textSecondary }]}>
                {group.badge}
              </Text>
            )}
          </View>

          {/* Group Items */}
          <View style={s.itemsWrap}>
            {group.events.map((event) => (
              <TimelineCard
                key={event.id}
                event={event}
                onMarkResisted={onMarkResisted}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function TimelineCard({
  event,
  onMarkResisted,
}: {
  event: LocalEvent;
  onMarkResisted: (id: string) => Promise<void>;
}) {
  const { palette: p } = useOffline();

  let iconName: "check" | "lightning-bolt-outline" | "alert-circle-outline" = "check";
  let iconColor: string = p.success;
  let iconBg: string = p.successSurface;
  let eventTitle = "Urge resisted";
  let pillText = "Resisted";
  let pillTone: "good" | "danger" | "neutral" = "good";

  if (event.kind === "relapse") {
    iconName = "alert-circle-outline";
    iconColor = p.danger;
    iconBg = p.dangerSurface;
    eventTitle = "Relapse logged";
    pillText = "Relapse";
    pillTone = "danger";
  } else if (event.kind === "burst") {
    iconName = "lightning-bolt-outline";
    iconColor = p.brandPrimary;
    iconBg = p.surfaceMuted;
    eventTitle = "Burst completed";
    pillText = event.resisted ? "Resisted" : "Completed";
    pillTone = "good";
  } else if (event.kind === "urge") {
    if (event.resisted) {
      iconName = "check";
      iconColor = p.success;
      iconBg = p.successSurface;
      eventTitle = "Urge resisted";
      pillText = "Resisted";
      pillTone = "good";
    } else {
      iconName = "alert-circle-outline";
      iconColor = p.textSecondary;
      iconBg = p.surfaceMuted;
      eventTitle = "Urge recorded";
      pillText = "Didn't resist";
      pillTone = "neutral";
    }
  }

  const pillBg =
    pillTone === "good"
      ? p.successSurface
      : pillTone === "danger"
      ? p.dangerSurface
      : p.surfaceMuted;

  const pillTextColor =
    pillTone === "good"
      ? p.success
      : pillTone === "danger"
      ? p.danger
      : p.textSecondary;

  const displayNote = event.note?.trim()
    ? `“${event.note.trim()}”`
    : event.kind === "burst"
    ? "High protection was active for the configured cooldown."
    : "No note added.";

  return (
    <View
      style={[
        s.card,
        { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
      ]}
    >
      <View style={s.cardTop}>
        <View style={[s.dotIcon, { backgroundColor: iconBg }]}>
          <Icon name={iconName} size={15} color={iconColor} />
        </View>
        <View style={s.cardBody}>
          <Text style={[s.cardTitle, { color: p.textPrimary }]}>
            {eventTitle}
          </Text>
          <Text style={[s.cardNote, { color: p.textSecondary }]}>
            {displayNote}
          </Text>
        </View>
      </View>

      <View style={s.metaRow}>
        <Text style={[s.timeText, { color: p.textSecondary }]}>
          {formatEventTime(event.timestamp)}
        </Text>
        <View style={[s.pill, { backgroundColor: pillBg }]}>
          <Text style={[s.pillText, { color: pillTextColor }]}>
            {pillText}
          </Text>
        </View>
      </View>

      {/* Inline Mark Resisted Button for unresisted urges/bursts */}
      {!event.resisted && (event.kind === "urge" || event.kind === "burst") && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mark this urge as resisted"
          onPress={() => void onMarkResisted(event.id)}
          style={({ pressed }) => [
            s.markBtn,
            {
              backgroundColor: p.surfaceMuted,
              borderColor: p.borderSubtle,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Icon name="check" size={13} color={p.brandPrimary} />
          <Text style={[s.markBtnText, { color: p.brandPrimary }]}>
            Mark resisted
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 16,
  },
  groupWrap: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  itemsWrap: {
    gap: 8,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  dotIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  cardNote: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  timeText: {
    fontSize: 10,
    fontWeight: "500",
  },
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 99,
  },
  pillText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  markBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
  },
  markBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyCard: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    maxWidth: 260,
  },
});
