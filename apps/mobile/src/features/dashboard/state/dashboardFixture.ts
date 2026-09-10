import type { ProtectionHealth, RecoverySnapshot } from "@restrainify/contracts";

export const dashboardFixture: {
  readonly protection: ProtectionHealth;
  readonly recovery: RecoverySnapshot;
  readonly screenTime: {
    readonly total: string;
    readonly change: string;
    readonly days: readonly number[];
  };
  readonly appUsage: readonly { readonly name: string; readonly duration: string }[];
} = {
  protection: {
    runtimeState: "DEGRADED",
    website: {
      state: "degraded",
      label: "Website Protection",
      detail: "Website protection needs setup.",
      repairAction: "Set up",
      checkedAt: new Date(0).toISOString(),
    },
    visual: {
      state: "disabled",
      label: "Visual Protection",
      detail: "Screen access is not enabled.",
      repairAction: "Set up",
      checkedAt: new Date(0).toISOString(),
    },
    usage: {
      state: "disabled",
      label: "App Controls",
      detail: "Usage Access is not enabled.",
      repairAction: "Set up",
      checkedAt: new Date(0).toISOString(),
    },
    antiBypass: {
      state: "disabled",
      label: "Anti-Bypass",
      detail: "Protection friction is not configured.",
      repairAction: "Set up",
      checkedAt: new Date(0).toISOString(),
    },
  },
  recovery: {
    currentStreakDays: 14,
    longestStreakDays: 28,
    pornFreeDaysLast30: 14,
    urgesLoggedToday: 3,
    burstActive: false,
  },
  screenTime: {
    total: "1h 42m",
    change: "−28%",
    days: [56, 78, 54, 45, 69, 37, 29],
  },
  appUsage: [
    { name: "Instagram", duration: "18m" },
    { name: "Chrome", duration: "24m" },
    { name: "X", duration: "12m" },
  ],
};
