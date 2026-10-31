/** Preset lock lengths, shown as two rows of three. */
export const UNINSTALL_DAY_PRESETS = [1, 7, 14, 30, 60, 90] as const;

/** Native accepts whole days in this range (TimedUninstallProtection.durationMillis). */
export const MIN_UNINSTALL_DAYS = 1;
export const MAX_UNINSTALL_DAYS = 90;

/** Every whole number of days the custom picker offers. */
export const CUSTOM_DAY_OPTIONS: readonly number[] = Array.from(
  { length: MAX_UNINSTALL_DAYS - MIN_UNINSTALL_DAYS + 1 },
  (_, i) => MIN_UNINSTALL_DAYS + i,
);

export const dayLabel = (days: number) => `${days} ${days === 1 ? "day" : "days"}`;
