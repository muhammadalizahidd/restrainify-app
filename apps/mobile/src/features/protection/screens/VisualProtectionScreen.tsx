import { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useOffline } from "../../../app/providers/OfflineProvider";
import { Icon } from "../../../components/OfflineUI";
import type { PersonBlurMode } from "@restrainify/contracts";

export interface VisualProtectionScreenProps {
  open: (route: string, params?: Record<string, unknown>) => void;
  onBack?: () => void;
}

interface BlurOption {
  key: PersonBlurMode;
  label: string;
}

const blurOptions: BlurOption[] = [
  { key: "off", label: "Off" },
  { key: "blur_women", label: "Women" },
  { key: "blur_men", label: "Men" },
  { key: "blur_everyone", label: "Everyone" },
];

/**
 * VisualProtectionScreen implements SET-VIS-01: Visual Protection Screen
 * from the Restrainify UI Architecture specification.
 *
 * It manages on-device local visual blur, person-oriented filtering without
 * biometric profiling, supported app scope, and clear privacy boundaries.
 */
export function VisualProtectionScreen({ open, onBack }: VisualProtectionScreenProps) {
  const { snapshot: data, palette: p } = useOffline();
  const [personMode, setPersonMode] = useState<PersonBlurMode>("blur_women");

  if (!data) return null;

  const hasAccessibility = data.capabilities.accessibility && data.settings.accessibilityConsent;

  return (
    <View style={s.container}>
      {/* 1. Subscreen Header */}
      <View style={s.headerRow}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[
              s.backButton,
              { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
            ]}
          >
            <Icon name="arrow-left" size={20} color={p.textPrimary} />
          </Pressable>
        )}
        <View style={s.titleWrap}>
          <Text style={[s.headerKicker, { color: p.textSecondary }]}>
            On-device visual filtering
          </Text>
          <Text style={[s.headerTitle, { color: p.textPrimary }]}>
            Visual Protection
          </Text>
        </View>
      </View>

      {/* 2. Notice Banner */}
      <View
        style={[
          s.noticeCard,
          {
            backgroundColor: hasAccessibility ? p.successSurface : p.surfaceMuted,
            borderColor: hasAccessibility ? p.success : p.borderSubtle,
          },
        ]}
      >
        <View style={s.noticeHeader}>
          <Icon
            name="eye-outline"
            size={20}
            color={hasAccessibility ? p.success : p.textSecondary}
          />
          <Text
            style={[
              s.noticeTitle,
              { color: hasAccessibility ? p.success : p.textPrimary },
            ]}
          >
            {hasAccessibility ? "Visual protection active" : "On-device model ready"}
          </Text>
        </View>
        <Text style={[s.noticeBody, { color: p.textSecondary }]}>
          Supported screen content is analyzed locally; temporary frames are discarded after each protection decision.
        </Text>
      </View>

      {/* 3. Content Protection Categories */}
      <View style={s.sectionWrap}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Content protection</Text>
        <View
          style={[
            s.rowList,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          {/* Row 1: Explicit content */}
          <View style={[s.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.borderSubtle }]}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="eye-off-outline" size={20} color={p.brandPrimary} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Explicit content</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>Nudity and pornographic content</Text>
            </View>
            <View style={[s.pillGood, { backgroundColor: p.successSurface }]}>
              <Text style={[s.pillGoodText, { color: p.success }]}>Protected</Text>
            </View>
          </View>

          {/* Row 2: Suggestive content */}
          <View style={s.row}>
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="shield-outline" size={20} color={p.brandPrimary} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Suggestive content</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>Sexually suggestive / soft-porn content</Text>
            </View>
            <View style={[s.pillGood, { backgroundColor: p.successSurface }]}>
              <Text style={[s.pillGoodText, { color: p.success }]}>Protected</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 4. Person Filtering (No Sensitivity Sliders) */}
      <View style={s.sectionWrap}>
        <View style={s.sectionHeaderWithKicker}>
          <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Person filtering</Text>
          <View style={[s.kickerPill, { backgroundColor: p.surfaceMuted }]}>
            <Text style={[s.kickerPillText, { color: p.textSecondary }]}>NO SENSITIVITY SLIDERS</Text>
          </View>
        </View>

        <View
          style={[
            s.card,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          {/* 4-way Segmented Control */}
          <View style={[s.segmentedWrap, { backgroundColor: p.surfaceMuted }]}>
            {blurOptions.map((opt) => {
              const selected = personMode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setPersonMode(opt.key)}
                  style={[
                    s.segmentBtn,
                    selected && [
                      s.segmentBtnActive,
                      { backgroundColor: p.surfacePrimary },
                    ],
                  ]}
                >
                  <Text
                    style={[
                      s.segmentText,
                      {
                        color: selected ? p.textPrimary : p.textSecondary,
                        fontWeight: selected ? "700" : "500",
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[s.helperText, { color: p.textSecondary }]}>
            Person-oriented region blur only; no identity recognition or biometric profiling.
          </Text>
        </View>
      </View>

      {/* 5. Protected Contexts */}
      <View style={s.sectionWrap}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Protected contexts</Text>
        <View
          style={[
            s.rowList,
            { backgroundColor: p.surfacePrimary, borderColor: p.borderSubtle },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Protected apps: 5 apps"
            onPress={() => open("apps")}
            style={({ pressed }) => [
              s.row,
              pressed && { backgroundColor: p.surfaceMuted },
            ]}
          >
            <View style={[s.iconBox, { backgroundColor: p.surfaceMuted }]}>
              <Icon name="apps" size={20} color={p.brandPrimary} />
            </View>
            <View style={s.copyBox}>
              <Text style={[s.rowTitle, { color: p.textPrimary }]}>Protected apps</Text>
              <Text style={[s.rowSubtitle, { color: p.textSecondary }]}>
                Run visual protection only in supported or selected contexts
              </Text>
            </View>
            <View style={s.rightBadgeWrap}>
              <Text style={[s.badgeText, { color: p.textSecondary }]}>5 apps</Text>
              <Icon name="chevron-right" size={18} color={p.textMuted} />
            </View>
          </Pressable>
        </View>
      </View>

      {/* 6. Privacy Guarantees */}
      <View style={s.sectionWrap}>
        <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Privacy</Text>
        <View
          style={[
            s.privacyCard,
            { backgroundColor: p.surfaceMuted, borderColor: p.borderSubtle },
          ]}
        >
          <View style={s.privacyPoint}>
            <Icon name="check" size={18} color={p.success} />
            <Text style={[s.privacyText, { color: p.textPrimary }]}>
              Screen analysis happens on-device.
            </Text>
          </View>
          <View style={s.privacyPoint}>
            <Icon name="check" size={18} color={p.success} />
            <Text style={[s.privacyText, { color: p.textPrimary }]}>
              Temporary frames are discarded after the decision.
            </Text>
          </View>
          <View style={s.privacyPoint}>
            <Icon name="check" size={18} color={p.success} />
            <Text style={[s.privacyText, { color: p.textPrimary }]}>
              No screenshot history is created.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  titleWrap: {
    flex: 1,
  },
  headerKicker: {
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginTop: 2,
  },
  noticeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    marginTop: 6,
    gap: 8,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  noticeBody: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  sectionWrap: {
    marginTop: 14,
  },
  sectionHeaderWithKicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.2,
    marginBottom: 8,
    marginHorizontal: 2,
  },
  kickerPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  kickerPillText: {
    fontSize: 8.5,
    fontWeight: "700",
    letterSpacing: 1,
  },
  rowList: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  copyBox: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 17,
  },
  rowSubtitle: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  pillGood: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  pillGoodText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  segmentedWrap: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  segmentBtnActive: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 11,
  },
  helperText: {
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "500",
  },
  rightBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  privacyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  privacyPoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  privacyText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
});
