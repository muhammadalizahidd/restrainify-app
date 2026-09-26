package com.restrainify.protection.admin

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import com.restrainify.protection.OfflineRuntime

object DeviceAdminManager {
    private const val REVOKE_REQUEST_CODE = 9001

    fun getAdminComponent(context: Context): ComponentName =
        ComponentName(context, BurstAdminReceiver::class.java)

    fun isAdminActive(context: Context): Boolean {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager ?: return false
        return dpm.isAdminActive(getAdminComponent(context))
    }

    fun createActivationIntent(context: Context): Intent {
        return Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
            .putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, getAdminComponent(context))
            .putExtra(
                DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "Restrainify uses Device Administrator strictly to prevent uninstallation during active Burst cooldowns. It deactivates automatically when your timer completes."
            )
    }

    fun removeAdmin(context: Context): Boolean {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager ?: return false
        val admin = getAdminComponent(context)
        return if (dpm.isAdminActive(admin)) {
            dpm.removeActiveAdmin(admin)
            true
        } else {
            false
        }
    }

    private fun getRevocationPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, BurstAutoRevokeReceiver::class.java)
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        return PendingIntent.getBroadcast(context, REVOKE_REQUEST_CODE, intent, flags)
    }

    fun scheduleAutoRevocation(context: Context, triggerAtMillis: Long) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val pendingIntent = getRevocationPendingIntent(context)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                } else {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
            }
        } catch (_: SecurityException) {
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        } catch (_: Exception) {}
    }

    fun cancelAutoRevocation(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val pendingIntent = getRevocationPendingIntent(context)
        alarmManager.cancel(pendingIntent)
    }

    fun ensureRevokedIfExpired(context: Context): Boolean {
        val runtime = try {
            OfflineRuntime.get(context)
        } catch (_: Exception) {
            null
        }
        val remaining = runtime?.burstRemaining() ?: 0L
        if (remaining == 0L && isAdminActive(context)) {
            val removed = removeAdmin(context)
            cancelAutoRevocation(context)
            return removed
        }
        return false
    }
}
