/**
 * Centralized Feature Gate for Burst Mode.
 *
 * Architecture Role:
 * Restricts user access to Burst Mode across the presentation, navigation,
 * and command layers while preserving all underlying implementations, components,
 * and business logic for future paid reactivation.
 */

export const IS_BURST_MODE_ENABLED = false;

/**
 * Returns true if Burst Mode is enabled in the current runtime environment.
 */
export function isBurstModeEnabled(): boolean {
  return IS_BURST_MODE_ENABLED;
}

/**
 * Guard assertion that prevents Burst Mode activation when disabled.
 * Throws a descriptive runtime error if invoked while restricted.
 */
export function assertBurstModeAvailable(): void {
  if (!isBurstModeEnabled()) {
    throw new Error("Burst Mode is currently unavailable.");
  }
}

