package com.restrainify.protection.admin

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import com.restrainify.protection.OfflineRuntime

class BurstAdminReceiver : DeviceAdminReceiver() {
    override fun onDisableRequested(context: Context, intent: Intent): CharSequence? {
        val remaining = try {
            OfflineRuntime.get(context).burstRemaining()
        } catch (_: Exception) {
            0L
        }
        return if (remaining > 0L) {
            "Burst cooldown is currently active. Deactivating device administrator will break your active commitment."
        } else {
            null
        }
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        try {
            OfflineRuntime.get(context).onAdminStatusChanged()
        } catch (_: Exception) {}
    }

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        try {
            OfflineRuntime.get(context).onAdminStatusChanged()
        } catch (_: Exception) {}
    }
}
