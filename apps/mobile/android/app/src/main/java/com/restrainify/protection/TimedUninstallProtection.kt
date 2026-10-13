package com.restrainify.protection

/** Clock and lifecycle decisions shared by the runtime and administrator cleanup. */
object TimedUninstallProtection {
    fun durationMillis(days: Any?): Long {
        require(days is Number) { "Choose an integer between 1 and 90 days" }
        val value = days.toDouble()
        require(value.isFinite() && value >= 1.0 && value <= 90.0 && value == value.toInt().toDouble()) {
            "Choose an integer between 1 and 90 days"
        }
        return value.toLong() * 86_400_000L
    }

    fun remaining(
        untilWall: Long,
        untilElapsed: Long,
        deadlineBoot: Int,
        currentBoot: Int,
        nowWall: Long,
        nowElapsed: Long,
    ): Long {
        if (untilWall == 0L) return 0L
        return if (currentBoot >= 0 && currentBoot == deadlineBoot) {
            maxOf(0L, untilElapsed - nowElapsed)
        } else {
            maxOf(0L, untilWall - nowWall)
        }
    }

    fun effectiveRemaining(standalone: Long, burst: Long, burstProtectionEnabled: Boolean): Long =
        maxOf(standalone, if (burstProtectionEnabled) burst else 0L)

    fun shouldRevoke(ready: Boolean, activationPending: Boolean, remaining: Long): Boolean =
        ready && !activationPending && remaining == 0L
}
