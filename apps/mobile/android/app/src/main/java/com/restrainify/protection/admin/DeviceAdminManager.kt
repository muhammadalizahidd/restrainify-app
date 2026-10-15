package com.restrainify.protection.admin

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.provider.Settings
import com.restrainify.protection.OfflineRuntime
import com.restrainify.protection.TimedUninstallProtection
import org.json.JSONObject
import java.util.UUID

object DeviceAdminManager {
    private const val REVOKE_REQUEST_CODE = 9001
    private const val ACTIVATION_PREFS = "uninstall_admin_activation"
    private const val ACTIVATION_TOKEN = "adminActivationToken"
    private const val ACTIVATION_GRACE_MS = 5 * 60_000L

    private fun activationPreferences(context: Context) =
        context.getSharedPreferences(ACTIVATION_PREFS, Context.MODE_PRIVATE)

    fun getAdminComponent(context: Context): ComponentName =
        ComponentName(context, BurstAdminReceiver::class.java)

    fun isAdminActive(context: Context): Boolean {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager ?: return false
        return dpm.isAdminActive(getAdminComponent(context))
    }

    /** Persist before opening Android's prompt, including across a cold-start callback. */
    @Synchronized
    fun createActivationIntent(context: Context): Intent {
        if (!isAdminActive(context)) {
            check(activationPreferences(context).edit()
                .putString(ACTIVATION_TOKEN, UUID.randomUUID().toString())
                .putLong("untilWall", System.currentTimeMillis() + ACTIVATION_GRACE_MS)
                .putLong("untilElapsed", SystemClock.elapsedRealtime() + ACTIVATION_GRACE_MS)
                .putInt("boot", Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1))
                .commit()) {
                "Could not save the Device Administrator activation request"
            }
        }
        return Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
            .putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, getAdminComponent(context))
            .putExtra(
                DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "Restrainify uses Device Administrator to deter uninstallation during a timed uninstall lock or a Burst cooldown with uninstall protection enabled. It releases administrator access only after every uninstall lock ends. This is not tamper-proof: Android administrator removal, safe mode, and system resets can bypass it."
            )
    }

    private fun removeAdmin(context: Context): Boolean {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager ?: return false
        val admin = getAdminComponent(context)
        return if (dpm.isAdminActive(admin)) {
            dpm.removeActiveAdmin(admin)
            true
        } else {
            false
        }
    }
    /** Saved with the actual lock transaction; loading consumes a matching pending token. */
    @Synchronized
    fun recordActivation(configuration: JSONObject, context: Context) {
        activationPreferences(context).getString(ACTIVATION_TOKEN, null)?.let {
            configuration.put(ACTIVATION_TOKEN, it)
        }
    }

    @Synchronized
    fun activationDeclined(context: Context) {
        activationPreferences(context).edit().remove(ACTIVATION_TOKEN).commit()
    }

    private fun getRevocationPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, BurstAutoRevokeReceiver::class.java)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getBroadcast(context, REVOKE_REQUEST_CODE, intent, flags)
    }

    private fun scheduleAutoRevocation(context: Context, remainingMillis: Long) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val pendingIntent = getRevocationPendingIntent(context)
        val triggerAtMillis = SystemClock.elapsedRealtime() + remainingMillis
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pendingIntent)
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pendingIntent)
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pendingIntent)
            } else {
                alarmManager.setExact(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pendingIntent)
            }
        } catch (_: SecurityException) {
            alarmManager.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAtMillis, pendingIntent)
        } catch (_: Exception) {}
    }

    private fun cancelAutoRevocation(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val pendingIntent = getRevocationPendingIntent(context)
        alarmManager.cancel(pendingIntent)
    }

    /** Called only on the runtime executor, after loading or committing configuration. */
    @Synchronized
    fun reconcile(runtime: OfflineRuntime): Boolean {
        if (!runtime.ready) return false
        val context = runtime.context
        val preferences = activationPreferences(context)
        val pendingToken = preferences.getString(ACTIVATION_TOKEN, null)
        val activationRemaining = if (pendingToken == null || runtime.configuration.optString(ACTIVATION_TOKEN) == pendingToken) {
            0L
        } else {
            TimedUninstallProtection.remaining(
                preferences.getLong("untilWall", 0L),
                preferences.getLong("untilElapsed", 0L),
                preferences.getInt("boot", -2),
                Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1),
                System.currentTimeMillis(),
                SystemClock.elapsedRealtime(),
            )
        }
        if (pendingToken != null && activationRemaining == 0L) {
            preferences.edit().remove(ACTIVATION_TOKEN).commit()
        }
        val remaining = runtime.uninstallProtectionRemaining()
        val nextCleanup = maxOf(remaining, activationRemaining)
        if (nextCleanup > 0L) {
            if (isAdminActive(context)) scheduleAutoRevocation(context, nextCleanup)
            else cancelAutoRevocation(context)
            return false
        }
        if (TimedUninstallProtection.shouldRevoke(runtime.ready, activationRemaining > 0L, remaining)) {
            cancelAutoRevocation(context)
            return removeAdmin(context)
        }
        return false
    }
}
