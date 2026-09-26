package com.restrainify.protection.admin

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.restrainify.protection.OfflineRuntime

class BurstAutoRevokeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val revoked = DeviceAdminManager.ensureRevokedIfExpired(context)
        try {
            val runtime = OfflineRuntime.get(context)
            runtime.notifyProtectionChanged()
            if (revoked) {
                runtime.onAdminStatusChanged()
            }
        } catch (_: Exception) {}
    }
}
