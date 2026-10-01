export const themes = {
  light: {
    backgroundPrimary: "#F2F6FB", surfacePrimary: "#FFFFFF", surfaceMuted: "#E8EEF7",
    textPrimary: "#10264D", textSecondary: "#536681", textMuted: "#71829A", borderSubtle: "#D9E2EF",
    brandPrimary: "#254C91", brandInk: "#10264D", heroStart: "#081A42", heroMiddle: "#163C83", heroEnd: "#316FCB", actionFill: "#254C91", actionText: "#F2F6FB", cardStart: "#FFFFFF", cardEnd: "#EAF0FA", mutedStart: "#EEF3FB", mutedEnd: "#DAE5F5",
    success: "#2A5BB0", successSurface: "#E4EDFB", danger: "#CE2C31", dangerSurface: "#FEEBEC", warning: "#AB6400", warningSurface: "#FFF4D6", toggleActive: "#2D64AE", toggleThumb: "#FFFFFF",
  },
  dark: {
    backgroundPrimary: "#050505", surfacePrimary: "#131F30", surfaceMuted: "#1B2C43",
    textPrimary: "#E8EEF7", textSecondary: "#B7C3D6", textMuted: "#91A2B9", borderSubtle: "#28364A",
    brandPrimary: "#FFFFFF", brandInk: "#E8EEF7", heroStart: "#091D48", heroMiddle: "#153978", heroEnd: "#2D64AE", actionFill: "#1F4C96", actionText: "#FFFFFF", cardStart: "#182B48", cardEnd: "#0E1A2C", mutedStart: "#22395C", mutedEnd: "#16283F",
    success: "#6AA6FF", successSurface: "#11233F", danger: "#E5484D", dangerSurface: "#2B1519", warning: "#FFB224", warningSurface: "#2E2008", toggleActive: "#2D64AE", toggleThumb: "#FFFFFF",
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
