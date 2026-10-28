package com.restrainify.protection.service

/**
 * Hysteresis for the uninstall-protection cover. A screen scan decides when to raise the cover, but a
 * single scan that misses (empty tree mid-transition, a dialog without the app name, a list that
 * scrolled) must never lower it: that is what made the cover flicker. It lifts only once the user is
 * positively somewhere that cannot remove the app. Pure Kotlin so the timing can be unit tested.
 */
class UninstallLockState(
    private val minShowMs: Long = 1_200L,
    private val safeDwellMs: Long = 600L,
    private val negativeScanGapMs: Long = 300L,
    private val negativeQuietMs: Long = 1_500L,
) {
    enum class Zone {
        /** A Settings or installer window: the user is where the app can be removed. */
        DANGER,
        /** An ordinary app or the launcher was positively identified in front. */
        SAFE,
        /** No window, a keyboard or system UI: nothing can be concluded. */
        UNKNOWN,
    }

    enum class Decision { NONE, SHOW, KEEP, RELEASE }

    private var locked = false
    private var lockedAt = 0L
    private var lastPositiveAt = 0L
    private var safeSince = 0L
    private var lastNegativeAt = 0L
    private var negativeScans = 0

    val isLocked: Boolean get() = locked

    fun reset() {
        locked = false
        lockedAt = 0L; lastPositiveAt = 0L; safeSince = 0L; lastNegativeAt = 0L; negativeScans = 0
    }

    fun onScan(now: Long, tamperDetected: Boolean, zone: Zone): Decision {
        if (tamperDetected) {
            val wasLocked = locked
            if (!wasLocked) { locked = true; lockedAt = now }
            lastPositiveAt = now
            safeSince = 0L; negativeScans = 0; lastNegativeAt = 0L
            return if (wasLocked) Decision.KEEP else Decision.SHOW
        }
        if (!locked) return Decision.NONE

        when (zone) {
            Zone.UNKNOWN -> Unit
            Zone.SAFE -> {
                negativeScans = 0; lastNegativeAt = 0L
                if (safeSince == 0L) safeSince = now
                if (now - safeSince >= safeDwellMs && now - lockedAt >= minShowMs) return release()
            }
            Zone.DANGER -> {
                safeSince = 0L
                // Only conclusive when seen twice, apart in time, and long after the last positive scan.
                if (negativeScans == 0 || now - lastNegativeAt >= negativeScanGapMs) {
                    negativeScans++
                    lastNegativeAt = now
                }
                if (negativeScans >= 2 && now - lastPositiveAt >= negativeQuietMs && now - lockedAt >= minShowMs) return release()
            }
        }
        return Decision.KEEP
    }

    private fun release(): Decision { reset(); return Decision.RELEASE }

    companion object {
        /** Windows from which the app can be uninstalled, force-stopped or have its admin/accessibility removed. */
        fun isDangerPackage(pkg: String?): Boolean = when (pkg?.lowercase()?.trim()) {
            "com.android.settings", "com.android.packageinstaller", "com.google.android.packageinstaller" -> true
            else -> false
        }
    }
}
