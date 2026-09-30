import { StyleSheet, View } from "react-native";
import { Text } from "../../../components/AppText";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon, SurfaceGradient } from "../../../components/OfflineUI";
import type { LocalEvent } from "../../../native/OfflineProtection";
import { formatTrackerDate, formatTrackerTime } from "../utils/fapTrackerUtils";

export interface FapTrackerTimelineProps {
  events: LocalEvent[];
}

/**
 * FapTrackerTimeline renders the chronological history of tracker events for JOUR-04.
 */
export function FapTrackerTimeline({ events }: FapTrackerTimelineProps) {
  const { palette: p } = useOffline();

  return (
    <View style={s.container}>
      {/* Section Header */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>
          History
        </Text>
      </View>

      {/* Events List */}
      {events.length === 0 ? (
        <View
          style={[
            s.emptyCard,
            { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
          ]}
        ><SurfaceGradient />
          <Icon name="calendar-outline" size={24} color={p.textSecondary} />
          <Text style={[s.emptyTitle, { color: p.textPrimary }]}>
            No tracker events yet
          </Text>
          <Text style={[s.emptySub, { color: p.textSecondary }]}>
            Your records stay private on this device and sync only when configured.
          </Text>
        </View>
      ) : (
        <View style={s.listWrap}>
          {events.map((event) => (
            <View
              key={event.id}
              style={[
                s.eventCard,
                { overflow: "hidden", backgroundColor: "transparent", borderColor: p.borderSubtle },
              ]}
            ><SurfaceGradient />
              <View style={[s.iconBox, { overflow: "hidden", backgroundColor: "transparent" }]}><SurfaceGradient tone="muted" />
                <Icon name="calendar-outline" size={16} color={p.brandPrimary} />
              </View>
              <View style={s.textWrap}>
                <Text style={[s.eventTitle, { color: p.textPrimary }]}>
                  Tracker event
                </Text>
                <Text style={[s.eventSub, { color: p.textSecondary }]}>
                  {event.note?.trim()
                    ? event.note.trim()
                    : formatTrackerDate(event.timestamp)}
                </Text>
              </View>
              <Text style={[s.timeText, { color: p.textSecondary }]}>
                {formatTrackerTime(event.timestamp)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 16,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
    marginBottom: 4,
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
  listWrap: {
    gap: 8,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  textWrap: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  eventSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyCard: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
