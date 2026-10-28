package com.restrainify.protection.service

import com.restrainify.protection.service.UninstallLockState.Decision
import com.restrainify.protection.service.UninstallLockState.Zone
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class UninstallLockStateTest {
    @Test fun first_positive_scan_shows_and_later_ones_keep() {
        val s = UninstallLockState()
        assertEquals(Decision.SHOW, s.onScan(0, true, Zone.DANGER))
        assertEquals(Decision.KEEP, s.onScan(100, true, Zone.DANGER))
    }

    @Test fun nothing_happens_while_unlocked() {
        val s = UninstallLockState()
        assertEquals(Decision.NONE, s.onScan(0, false, Zone.SAFE))
        assertFalse(s.isLocked)
    }

    @Test fun a_missed_scan_inside_settings_never_lifts_the_cover() {
        val s = UninstallLockState()
        s.onScan(0, true, Zone.DANGER)
        for (t in listOf(100L, 200L, 300L, 400L, 500L, 900L, 1_300L)) {
            assertEquals(Decision.KEEP, s.onScan(t, false, Zone.DANGER))
        }
        assertTrue(s.isLocked)
    }

    @Test fun inconclusive_scans_never_release() {
        val s = UninstallLockState()
        s.onScan(0, true, Zone.DANGER)
        for (t in 100L..20_000L step 100L) assertEquals(Decision.KEEP, s.onScan(t, false, Zone.UNKNOWN))
    }

    @Test fun a_positive_scan_resets_the_negative_streak() {
        val s = UninstallLockState()
        s.onScan(0, true, Zone.DANGER)
        s.onScan(2_000, false, Zone.DANGER)
        s.onScan(2_400, true, Zone.DANGER)
        assertEquals(Decision.KEEP, s.onScan(2_800, false, Zone.DANGER))
        assertEquals(Decision.KEEP, s.onScan(3_200, false, Zone.DANGER))
    }

    @Test fun leaving_settings_releases_only_after_the_safe_dwell_and_minimum_display_time() {
        val s = UninstallLockState()
        s.onScan(0, true, Zone.DANGER)
        assertEquals(Decision.KEEP, s.onScan(100, false, Zone.SAFE))
        assertEquals(Decision.KEEP, s.onScan(500, false, Zone.SAFE))
        assertEquals(Decision.KEEP, s.onScan(800, false, Zone.SAFE))
        assertEquals(Decision.RELEASE, s.onScan(1_300, false, Zone.SAFE))
        assertFalse(s.isLocked)
    }

    @Test fun bouncing_back_into_settings_restarts_the_safe_dwell() {
        val s = UninstallLockState()
        s.onScan(0, true, Zone.DANGER)
        s.onScan(1_300, false, Zone.SAFE)
        s.onScan(1_500, false, Zone.DANGER)
        assertEquals(Decision.KEEP, s.onScan(1_700, false, Zone.SAFE))
        assertEquals(Decision.KEEP, s.onScan(2_000, false, Zone.SAFE))
        assertEquals(Decision.RELEASE, s.onScan(2_400, false, Zone.SAFE))
    }

    @Test fun two_separated_conclusive_negatives_inside_settings_release_after_the_quiet_period() {
        val s = UninstallLockState()
        s.onScan(0, true, Zone.DANGER)
        assertEquals(Decision.KEEP, s.onScan(1_600, false, Zone.DANGER))
        assertEquals(Decision.KEEP, s.onScan(1_700, false, Zone.DANGER))
        assertEquals(Decision.RELEASE, s.onScan(2_000, false, Zone.DANGER))
    }

    @Test fun a_long_noisy_session_raises_the_cover_exactly_once() {
        val s = UninstallLockState()
        var shows = 0
        var releases = 0
        var t = 0L
        repeat(200) { i ->
            val positive = i % 3 == 0
            when (s.onScan(t, positive, Zone.DANGER)) {
                Decision.SHOW -> shows++
                Decision.RELEASE -> releases++
                else -> Unit
            }
            t += 80
        }
        assertEquals(1, shows)
        assertEquals(0, releases)
    }

    @Test fun reset_clears_the_lock() {
        val s = UninstallLockState()
        s.onScan(0, true, Zone.DANGER)
        s.reset()
        assertFalse(s.isLocked)
        assertEquals(Decision.SHOW, s.onScan(10, true, Zone.DANGER))
    }

    @Test fun danger_packages_are_settings_and_installers_only() {
        assertTrue(UninstallLockState.isDangerPackage("com.android.settings"))
        assertTrue(UninstallLockState.isDangerPackage("com.google.android.packageinstaller"))
        assertFalse(UninstallLockState.isDangerPackage("com.instagram.android"))
        assertFalse(UninstallLockState.isDangerPackage(null))
    }
}
