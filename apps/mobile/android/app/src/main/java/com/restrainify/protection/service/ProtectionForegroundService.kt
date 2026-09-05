package com.restrainify.protection.service

import android.app.Service
import android.content.Intent
import android.os.IBinder

class ProtectionForegroundService : Service() {
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}

