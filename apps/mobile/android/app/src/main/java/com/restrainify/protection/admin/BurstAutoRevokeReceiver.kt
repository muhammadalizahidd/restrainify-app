package com.restrainify.protection.admin

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.restrainify.protection.OfflineRuntime

class BurstAutoRevokeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val pending = goAsync()
        try {
            val runtime = OfflineRuntime.get(context)
            // Initialization and configuration commits precede this task, including on boot.
            runtime.executor.execute {
                try {
                    DeviceAdminManager.reconcile(runtime)
                    runtime.notifyProtectionChanged()
                } finally {
                    pending.finish()
                }
            }
        } catch (_: Exception) {
            pending.finish()
        }
    }
}
