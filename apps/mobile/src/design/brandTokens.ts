export const themes = {
  light: {
    backgroundPrimary: "#F2F6FB", surfacePrimary: "#FFFFFF", surfaceMuted: "#E8EEF7",
    textPrimary: "#10264D", textSecondary: "#536681", textMuted: "#71829A", borderSubtle: "#D9E2EF",
    brandPrimary: "#254C91", brandInk: "#10264D", heroStart: "#081A42", heroMiddle: "#163C83", heroEnd: "#316FCB",
    success: "#1F6B4B", successSurface: "#E7F4EE", danger: "#9A3434", dangerSurface: "#FBEDEE", warning: "#A66A17", warningSurface: "#FFF4DE",
  },
  dark: {
    backgroundPrimary: "#0C1422", surfacePrimary: "#131F30", surfaceMuted: "#1B2C43",
    textPrimary: "#E8EEF7", textSecondary: "#B7C3D6", textMuted: "#91A2B9", borderSubtle: "#28364A",
    brandPrimary: "#FFFFFF", brandInk: "#E8EEF7", heroStart: "#091D48", heroMiddle: "#153978", heroEnd: "#2D64AE",
    success: "#50B587", successSurface: "#17372F", danger: "#F18A8A", dangerSurface: "#3E2229", warning: "#F1C56D", warningSurface: "#3C301B",
  },
} as const;

export type AppTheme = (typeof themes)[keyof typeof themes];

export const colors = themes.light;

export const spacing = {
  space2: 2,
  space4: 4,
  space8: 8,
  space12: 12,
  space16: 16,
  space20: 20,
  space24: 24,
  space32: 32,
} as const;

export const radii = {
  radiusSmall: 8,
  radiusMedium: 14,
  radiusLarge: 24,
  radiusPill: 999,
} as const;

export const typography = {
  screenTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "400",
  },
  support: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.3,
  },
} as const;
