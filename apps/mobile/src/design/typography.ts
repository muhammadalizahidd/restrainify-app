/**
 * Brand typeface: Space Grotesk (defined by the product UI spec). Four weights only, per DESIGN.md.
 * Custom fonts on Android are addressed per weight, so `fontWeight` is mapped to a family.
 */
export const fontFamilies = {
  regular: "SpaceGrotesk_400Regular",
  medium: "SpaceGrotesk_500Medium",
  semibold: "SpaceGrotesk_600SemiBold",
  bold: "SpaceGrotesk_700Bold",
} as const;

export function fontFamilyForWeight(weight?: string | number): string {
  const value = typeof weight === "number" ? weight : weight === "bold" ? 700 : Number(weight ?? 400) || 400;
  if (value >= 700) return fontFamilies.bold;
  if (value >= 600) return fontFamilies.semibold;
  if (value >= 500) return fontFamilies.medium;
  return fontFamilies.regular;
}
