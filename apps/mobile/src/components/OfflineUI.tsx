import type { ComponentProps, PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useOffline } from "../app/providers/OfflineProvider";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
export function Icon({ name, color, size = 22 }: { name: IconName; color?: string; size?: number }) {
  const { palette } = useOffline(); return <MaterialCommunityIcons accessible={false} name={name} color={color ?? palette.brandPrimary} size={size} />;
}
export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  const { palette } = useOffline(); return <View style={{ marginBottom: 22 }}><Text accessibilityRole="header" style={{ color: palette.textPrimary, fontSize: 29, fontWeight: "700", letterSpacing: -1 }}>{title}</Text>{subtitle && <Text style={{ color: palette.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 }}>{subtitle}</Text>}</View>;
}
export function Label({ children }: PropsWithChildren) { const { palette } = useOffline(); return <Text style={{ color: palette.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 1.3, marginTop: 24, marginBottom: 12 }}>{children}</Text>; }
export function Panel({ children }: PropsWithChildren) { const { palette } = useOffline(); return <View style={{ backgroundColor: palette.surfacePrimary, borderColor: palette.borderSubtle, borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 }}>{children}</View>; }
export function Body({ children, strong = false }: PropsWithChildren<{ strong?: boolean }>) { const { palette } = useOffline(); return <Text style={{ color: strong ? palette.textPrimary : palette.textSecondary, fontSize: 14, lineHeight: 21, fontWeight: strong ? "700" : "400" }}>{children}</Text>; }
export function Button({ title, onPress, tone = "primary", disabled = false, icon }: { title: string; onPress: () => void; tone?: "primary" | "secondary" | "danger"; disabled?: boolean; icon?: IconName }) {
  const { palette, busy } = useOffline(); const blocked = disabled || busy;
  const backgroundColor = tone === "primary" ? palette.brandPrimary : tone === "danger" ? palette.danger : palette.surfaceMuted;
  const color = tone === "secondary" ? palette.textPrimary : tone === "danger" ? "#fff" : palette.backgroundPrimary;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: blocked }} disabled={blocked} onPress={onPress} style={({ pressed }) => [{ backgroundColor, opacity: blocked ? 0.45 : pressed ? 0.75 : 1, minHeight: 48, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 15, flexDirection: "row", gap: 8 }]}>{icon && <Icon name={icon} color={color} size={19} />}<Text style={{ color, fontWeight: "700", fontSize: 13 }}>{title}</Text></Pressable>;
}
export function Toggle({ title, detail, value, onChange, disabled = false }: { title: string; detail?: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const { palette, busy } = useOffline(); return <View style={ui.row}><View style={{ flex: 1 }}><Body strong>{title}</Body>{detail && <Text style={{ color: palette.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 3 }}>{detail}</Text>}</View><Switch accessibilityLabel={title} disabled={busy || disabled} value={value} onValueChange={onChange} trackColor={{ true: palette.success, false: palette.borderSubtle }} /></View>;
}
export function Field({ label, value, onChange, placeholder, multiline = false, numeric = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean; numeric?: boolean }) {
  const { palette } = useOffline(); return <View style={{ gap: 6 }}><Body strong>{label}</Body><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={palette.textMuted} autoCapitalize="none" keyboardType={numeric ? "number-pad" : "default"} multiline={multiline} maxLength={multiline ? 500 : 253} style={{ borderColor: palette.borderSubtle, backgroundColor: palette.backgroundPrimary, color: palette.textPrimary, borderWidth: 1, borderRadius: 12, minHeight: multiline ? 90 : 48, padding: 12, textAlignVertical: multiline ? "top" : "center" }} /></View>;
}
export function LinkRow({ title, detail, icon, onPress }: { title: string; detail?: string; icon: IconName; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[ui.row, { minHeight: 58 }]}><Icon name={icon} /><View style={{ flex: 1 }}><Body strong>{title}</Body>{detail && <Body>{detail}</Body>}</View><Icon name="chevron-right" size={20} /></Pressable>;
}
export function Loading() { const { palette } = useOffline(); return <ActivityIndicator accessibilityLabel="Reading encrypted local data" color={palette.brandPrimary} style={{ margin: 40 }} />; }
export const ui = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: 12 }, stack: { gap: 16 }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 } });
export function duration(ms: number) { const minutes = Math.floor(ms / 60000); return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`; }
