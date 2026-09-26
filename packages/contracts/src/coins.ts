export interface DailyCoinsAvailability {
  readonly available: boolean;
  readonly coinsPerDay: number;
  readonly claimedToday: boolean;
  readonly currentDay: string;
  readonly totalCoins: number;
  readonly lifetimeEarned: number;
  readonly lastClaimedDay: string | null;
  readonly claimedDays: readonly string[];
}

export interface DailyCoinsClaimResult {
  readonly claimed: boolean;
  readonly coinsAwarded: number;
  readonly totalCoins: number;
  readonly claimedDay: string;
  readonly createdAt: string;
}

export interface DailyCoinsCheckQuery {
  readonly timezone?: string;
  readonly day?: string;
}

export interface DailyCoinsClaimBody {
  readonly timezone?: string;
  readonly day?: string;
}
