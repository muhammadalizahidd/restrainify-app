package com.restrainify.protection

import org.junit.Assert.*
import org.junit.Test

class TimedUninstallProtectionTest {
    @Test fun dayDurationsUseLongMilliseconds() {
        assertEquals(86_400_000L, TimedUninstallProtection.durationMillis(1))
        assertEquals(2_592_000_000L, TimedUninstallProtection.durationMillis(30))
        assertEquals(7_776_000_000L, TimedUninstallProtection.durationMillis(90))
        assertEquals(2_592_000_000L, TimedUninstallProtection.durationMillis(30.0))
    }

    @Test fun invalidDaysCannotBeTruncatedOrCoerced() {
        for (days in listOf(null, "30", true, 0, -1, 91, 1.5, 90.5, Long.MAX_VALUE, Double.NaN, Double.POSITIVE_INFINITY)) {
            try {
                TimedUninstallProtection.durationMillis(days)
                fail("Accepted invalid days: $days")
            } catch (_: IllegalArgumentException) {}
        }
    }

    @Test fun persistedThirtyDayDeadlineSurvivesSameBootProcessRestartAndWallChanges() {
        val duration = TimedUninstallProtection.durationMillis(30)
        val untilWall = 1_800_000_000_000L + duration
        val untilElapsed = 5_000L + duration
        assertEquals(duration - 10_000L, TimedUninstallProtection.remaining(
            untilWall, untilElapsed, 42, 42, untilWall + 1_000_000L, 15_000L,
        ))
    }

    @Test fun rebootRestoresRemainingTimeFromPersistedWallDeadline() {
        val duration = TimedUninstallProtection.durationMillis(30)
        val startWall = 1_800_000_000_000L
        assertEquals(duration - 86_400_000L, TimedUninstallProtection.remaining(
            startWall + duration, 5_000L + duration, 42, 43,
            startWall + 86_400_000L, 1_000L,
        ))
    }

    @Test fun unknownBootCountDoesNotReuseElapsedDeadlineFromPreviousBoot() {
        assertEquals(100L, TimedUninstallProtection.remaining(1_000L, 10_000L, -1, -1, 900L, 0L))
    }

    @Test fun burstExpiryCannotReleaseThirtyDayStandaloneLock() {
        val standalone = TimedUninstallProtection.durationMillis(30) - 60_000L
        val remaining = TimedUninstallProtection.effectiveRemaining(standalone, 0L, true)
        assertEquals(standalone, remaining)
        assertFalse(TimedUninstallProtection.shouldRevoke(true, false, remaining))
    }

    @Test fun standaloneExpiryCannotReleaseLongerBurstLock() {
        val remaining = TimedUninstallProtection.effectiveRemaining(0L, 60_000L, true)
        assertEquals(60_000L, remaining)
        assertFalse(TimedUninstallProtection.shouldRevoke(true, false, remaining))
    }

    @Test fun disabledBurstUninstallProtectionDoesNotExtendStandaloneLock() {
        assertEquals(20L, TimedUninstallProtection.effectiveRemaining(20L, 100L, false))
        assertTrue(TimedUninstallProtection.shouldRevoke(
            true, false, TimedUninstallProtection.effectiveRemaining(0L, 100L, false),
        ))
    }

    @Test fun combinedAlarmTargetsLatestExpiryAndLastExpiryReleasesAdmin() {
        assertEquals(100L, TimedUninstallProtection.effectiveRemaining(100L, 20L, true))
        assertEquals(100L, TimedUninstallProtection.effectiveRemaining(20L, 100L, true))
        val standalone = TimedUninstallProtection.remaining(1_000L, 200L, 42, 42, 0L, 200L)
        val burst = TimedUninstallProtection.remaining(1_000L, 100L, 42, 42, 0L, 200L)
        assertTrue(TimedUninstallProtection.shouldRevoke(
            true, false, TimedUninstallProtection.effectiveRemaining(standalone, burst, true),
        ))
    }

    @Test fun coldStartAndPendingActivationNeverRevokeAdmin() {
        assertFalse(TimedUninstallProtection.shouldRevoke(false, false, 0L))
        assertFalse(TimedUninstallProtection.shouldRevoke(true, true, 0L))
        assertFalse(TimedUninstallProtection.shouldRevoke(false, true, 0L))
        assertTrue(TimedUninstallProtection.shouldRevoke(true, false, 0L))
    }

    @Test fun unusedActivationGuardExpiresThroughProductionClockDecision() {
        val grace = 5 * 60_000L
        val pendingBeforeExpiry = TimedUninstallProtection.remaining(
            1_000_000L + grace, 10_000L + grace, 42, 42, 1_000_000L, 10_000L + grace - 1L,
        )
        val pendingAfterExpiry = TimedUninstallProtection.remaining(
            1_000_000L + grace, 10_000L + grace, 42, 42, 1_000_000L, 10_000L + grace,
        )
        assertFalse(TimedUninstallProtection.shouldRevoke(true, pendingBeforeExpiry > 0L, 0L))
        assertTrue(TimedUninstallProtection.shouldRevoke(true, pendingAfterExpiry > 0L, 0L))
    }

    @Test fun unsetAndExpiredDeadlinesHaveNoRemainingTime() {
        assertEquals(0L, TimedUninstallProtection.remaining(0L, 100L, 42, 42, 0L, 0L))
        assertEquals(0L, TimedUninstallProtection.remaining(100L, 100L, 42, 42, 0L, 101L))
        assertEquals(0L, TimedUninstallProtection.remaining(100L, 100L, 42, 43, 101L, 0L))
    }
}
