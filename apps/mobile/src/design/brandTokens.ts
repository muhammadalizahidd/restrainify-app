export const themes = {
  light: {
    backgroundPrimary: "#F2F6FB", surfacePrimary: "#FFFFFF", surfaceMuted: "#E8EEF7",
    textPrimary: "#10264D", textSecondary: "#536681", textMuted: "#71829A", borderSubtle: "#D9E2EF",
    brandPrimary: "#254C91", brandInk: "#10264D", heroStart: "#081A42", heroMiddle: "#163C83", heroEnd: "#316FCB",
    success: "#1F6B4B", successSurface: "#E7F4EE", danger: "#D8212B", dangerSurface: "#FDE8E9", warning: "#C77700", warningSurface: "#FFF0CC", toggleActive: "#64B5F6", toggleThumb: "#FFFFFF",
  },
  dark: {
    backgroundPrimary: "#050505", surfacePrimary: "#111111", surfaceMuted: "#1A1A1A",
    textPrimary: "#E8EEF7", textSecondary: "#B7C3D6", textMuted: "#91A2B9", borderSubtle: "#2A2A2A",
    brandPrimary: "#FFFFFF", brandInk: "#E8EEF7", heroStart: "#091D48", heroMiddle: "#153978", heroEnd: "#2D64AE",
    success: "#50B587", successSurface: "#17372F", danger: "#FF4545", dangerSurface: "#3D1014", warning: "#FFC21A", warningSurface: "#3A2C05", toggleActive: "#64B5F6", toggleThumb: "#FFFFFF",
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
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "400",
  },
  support: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    letterSpacing: 1.3,
  },
} as const;
