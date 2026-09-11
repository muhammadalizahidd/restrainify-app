import { Alert, StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { JournalQuickActions } from "../components/JournalQuickActions";
import { JournalTimeline } from "../components/JournalTimeline";
import { JournalFapCard } from "../components/JournalFapCard";
import { groupEventsByRelativeDate } from "../utils/journalUtils";

export interface RecoveryJournalScreenProps {
  open: (route: string) => void;
}

/**
 * RecoveryJournalScreen implements JOUR-01: Recovery Journal Hub
 * from the Restrainify UI Architecture specification.
 *
 * It serves as the primary landing surface for the "Journal" bottom navigation tab,
 * displaying quick action buttons to log an urge or relapse,
 * structured relative date timeline sections, and link to the Fap Tracker.
 */
export function RecoveryJournalScreen({ open }: RecoveryJournalScreenProps) {
  const { snapshot: data, palette: p, command } = useOffline();

  if (!data) return null;

  const trackerEnabled = data.settings.trackerEnabled;
  const groupedEvents = groupEventsByRelativeDate(data.events, new Date());

  const handleMarkResisted = async (id: string) => {
    try {
      const ok = await command("resist", { id });
      if (!ok) {
        Alert.alert("Unable to update event", "Please try again.");
      }
    } catch (e) {
      Alert.alert(
        "Update failed",
        e instanceof Error ? e.message : "Unable to mark urge as resisted."
      );
    }
  };

  return (
    <View style={s.container}>
      {/* 1. Page Header */}
      <View style={s.pageHead}>
        <Text style={[s.eyebrow, { color: p.textSecondary }]}>
          Recovery journal
        </Text>
        <Text style={[s.pageTitle, { color: p.textPrimary }]}>
          Notice the pattern.
        </Text>
        <Text style={[s.pageSub, { color: p.textSecondary }]}>
          Structured recovery events — urges, relapses and interventions. No generic diary bloat.
        </Text>
      </View>

      {/* 2. Quick Actions Row */}
      <JournalQuickActions open={open} />

      {/* 3. Grouped Event Timeline */}
      <JournalTimeline
        groups={groupedEvents}
        onMarkResisted={handleMarkResisted}
      />

      {/* 4. Fap Tracker Tile Link */}
      <JournalFapCard enabled={trackerEnabled} open={open} />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 4,
  },
  pageHead: {
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
  },
  pageSub: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
