export type RecoveryEventType = "relapse" | "urge" | "burst_triggered" | "burst_resisted";

export interface RecoveryEvent {
  readonly id: string;
  readonly type: RecoveryEventType;
  readonly occurredAt: string;
  readonly note?: string;
}

export interface RecoverySnapshot {
  readonly currentStreakDays: number;
  readonly longestStreakDays: number;
  readonly pornFreeDaysLast30: number;
  readonly urgesLoggedToday: number;
  readonly burstActive: boolean;
}
