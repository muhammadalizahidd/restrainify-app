export const brandTokenStatus = {
  source: "restrainify.com",
  verified: false,
  note: "Temporary placeholders. Replace with exact live website tokens before final UI implementation.",
} as const;

export const colors = {
  brandPrimary: "#1D6B4F",
  brandSecondary: "#E7F4EE",
  brandInk: "#14231D",
  backgroundPrimary: "#F7F9F6",
  backgroundSecondary: "#EEF4F0",
  surfacePrimary: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  textPrimary: "#14231D",
  textSecondary: "#45554D",
  textMuted: "#718078",
  borderSubtle: "#DDE7E1",
  success: "#2F8A61",
  successSurface: "#E7F4EE",
  danger: "#B93838",
  dangerSurface: "#F8EAEA",
  warning: "#A46A1F",
  warningSurface: "#FFF4DF",
} as const;

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
  radiusSmall: 6,
  radiusMedium: 8,
  radiusLarge: 12,
  radiusPill: 999,
} as const;

export const typography = {
  fontFamily: "System",
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
} as const;
