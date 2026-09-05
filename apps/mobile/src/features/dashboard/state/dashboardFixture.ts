import type { ProtectionHealth, RecoverySnapshot } from "@restrainify/contracts";

export const dashboardFixture: {
  readonly protection: ProtectionHealth;
  readonly recovery: RecoverySnapshot;
} = {
  protection: {
    runtimeState: "DEGRADED",
    website: {
      state: "degraded",
      label: "Website Protection",
      detail: "Native protection state has not been reconciled.",
      checkedAt: new Date(0).toISOString(),
    },
    visual: {
      state: "disabled",
      label: "Visual Protection",
      detail: "Consent and native capability setup are required.",
      checkedAt: new Date(0).toISOString(),
    },
    usage: {
      state: "disabled",
      label: "App Controls",
      detail: "Usage Access has not been configured.",
      checkedAt: new Date(0).toISOString(),
    },
    antiBypass: {
      state: "disabled",
      label: "Anti-Bypass",
      detail: "Strict Mode has not been configured.",
      checkedAt: new Date(0).toISOString(),
    },
  },
  recovery: {
    currentStreakDays: 0,
    longestStreakDays: 0,
    pornFreeDaysLast30: 0,
    urgesLoggedToday: 0,
    burstActive: false,
  },
};
