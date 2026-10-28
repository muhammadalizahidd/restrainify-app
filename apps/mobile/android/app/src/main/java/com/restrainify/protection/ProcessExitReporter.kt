package com.restrainify.protection

import android.app.ActivityManager
import android.app.ApplicationExitInfo
import android.content.Context
import android.os.Build
import android.util.Log
import org.json.JSONObject

/**
 * Records why Android last ended this app's process (low memory, native crash, ANR, ...), so a
 * "protection just stopped" report can name the real reason instead of guessing. Android 11+ only.
 */
object ProcessExitReporter {
    private const val PREFS = "restrainify_process_exit"
    private const val KEY_LAST = "last_abnormal_exit"
    private const val KEY_LAST_SEEN = "last_seen_timestamp"

    /** Call once per process start. Logs new exits and keeps the latest abnormal one for diagnostics. */
    fun record(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return
        try {
            val manager = context.getSystemService(ActivityManager::class.java) ?: return
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val lastSeen = prefs.getLong(KEY_LAST_SEEN, 0L)
            val exits = manager.getHistoricalProcessExitReasons(context.packageName, 0, 10)
                .filter { it.timestamp > lastSeen }
                .sortedBy { it.timestamp }
            for (exit in exits) {
                Log.w("RestrainifyExit", "Previous process ended: ${describe(exit)}")
                if (isAbnormal(exit.reason)) prefs.edit().putString(KEY_LAST, toJson(exit).toString()).apply()
            }
            exits.maxOfOrNull { it.timestamp }?.let { prefs.edit().putLong(KEY_LAST_SEEN, it).apply() }
        } catch (error: Throwable) {
            Log.w("RestrainifyExit", "Could not read process exit history", error)
        }
    }

    /** The most recent abnormal exit as JSON, or null if there has been none. */
    fun latest(context: Context): JSONObject? = try {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_LAST, null)?.let { JSONObject(it) }
    } catch (_: Throwable) { null }

    private fun isAbnormal(reason: Int) = reason in setOf(
        ApplicationExitInfo.REASON_LOW_MEMORY,
        ApplicationExitInfo.REASON_CRASH,
        ApplicationExitInfo.REASON_CRASH_NATIVE,
        ApplicationExitInfo.REASON_ANR,
        ApplicationExitInfo.REASON_EXCESSIVE_RESOURCE_USAGE,
        ApplicationExitInfo.REASON_INITIALIZATION_FAILURE,
        ApplicationExitInfo.REASON_SIGNALED,
        ApplicationExitInfo.REASON_UNKNOWN,
    )

    private fun reasonName(reason: Int) = when (reason) {
        ApplicationExitInfo.REASON_LOW_MEMORY -> "LOW_MEMORY"
        ApplicationExitInfo.REASON_CRASH -> "CRASH"
        ApplicationExitInfo.REASON_CRASH_NATIVE -> "CRASH_NATIVE"
        ApplicationExitInfo.REASON_ANR -> "ANR"
        ApplicationExitInfo.REASON_EXCESSIVE_RESOURCE_USAGE -> "EXCESSIVE_RESOURCE_USAGE"
        ApplicationExitInfo.REASON_INITIALIZATION_FAILURE -> "INITIALIZATION_FAILURE"
        ApplicationExitInfo.REASON_SIGNALED -> "SIGNALED"
        ApplicationExitInfo.REASON_USER_REQUESTED -> "USER_REQUESTED"
        ApplicationExitInfo.REASON_USER_STOPPED -> "USER_STOPPED"
        ApplicationExitInfo.REASON_DEPENDENCY_DIED -> "DEPENDENCY_DIED"
        ApplicationExitInfo.REASON_PERMISSION_CHANGE -> "PERMISSION_CHANGE"
        ApplicationExitInfo.REASON_EXIT_SELF -> "EXIT_SELF"
        ApplicationExitInfo.REASON_OTHER -> "OTHER"
        else -> "UNKNOWN($reason)"
    }

    private fun describe(exit: ApplicationExitInfo) =
        "${reasonName(exit.reason)} at ${exit.timestamp} importance=${exit.importance} rssKb=${exit.rss / 1024} pssKb=${exit.pss} desc=${exit.description}"

    private fun toJson(exit: ApplicationExitInfo) = JSONObject()
        .put("reason", reasonName(exit.reason))
        .put("timestamp", exit.timestamp)
        .put("importance", exit.importance)
        .put("rssKb", exit.rss / 1024)
        .put("description", exit.description ?: JSONObject.NULL)
}
