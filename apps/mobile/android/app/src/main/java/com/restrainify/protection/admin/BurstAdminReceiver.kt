package com.restrainify.protection.admin

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import com.restrainify.protection.OfflineRuntime

class BurstAdminReceiver : DeviceAdminReceiver() {
    override fun onDisableRequested(context: Context, intent: Intent): CharSequence? {
        val remaining = try {
            val runtime = OfflineRuntime.get(context)
            if (!runtime.ready) return "Uninstall protection is still loading. Removing administrator access can bypass an active commitment."
            runtime.uninstallProtectionRemaining()
        } catch (_: Exception) {
            0L
        }
        return if (remaining > 0L) {
            "Uninstall protection is active until every uninstall lock ends. Removing administrator access can bypass your commitment; Android allows this and protection is not tamper-proof."
        } else {
            null
        }
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        reconcileStatus(context)
    }

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        reconcileStatus(context)
    }

    private fun reconcileStatus(context: Context) {
        val pending = goAsync()
        try {
            val runtime = OfflineRuntime.get(context)
            runtime.executor.execute {
                try {
                    DeviceAdminManager.reconcile(runtime)
                    runtime.onAdminStatusChanged()
                } finally {
                    pending.finish()
                }
            }
        } catch (_: Exception) {
            pending.finish()
        }
    }
}
