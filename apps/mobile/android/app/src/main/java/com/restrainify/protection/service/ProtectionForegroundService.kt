package com.restrainify.protection.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import com.restrainify.MainActivity

class ProtectionForegroundService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        val manager = getSystemService(NotificationManager::class.java)
        val channel =
            NotificationChannel(
                CHANNEL_ID,
                "App protection service",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Maintains active app limits and restriction schedules in memory."
            }
        manager?.createNotificationChannel(channel)

        val pending =
            PendingIntent.getActivity(
                this,
                0,
                Intent(this, MainActivity::class.java),
                PendingIntent.FLAG_IMMUTABLE,
            )

        val notification =
            Notification.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setContentTitle("Restrainify protection active")
                .setContentText("App usage limits and schedules are running.")
                .setContentIntent(pending)
                .setOngoing(true)
                .build()

        startForeground(NOTIFICATION_ID, notification)
        return START_STICKY
    }

    companion object {
        const val CHANNEL_ID = "protection_service"
        const val NOTIFICATION_ID = 43
        const val ACTION_START = "com.restrainify.action.START_PROTECTION"
        const val ACTION_STOP = "com.restrainify.action.STOP_PROTECTION"

        fun start(context: Context) {
            try {
                val intent =
                    Intent(context, ProtectionForegroundService::class.java).apply {
                        action = ACTION_START
                    }
                context.startForegroundService(intent)
            } catch (_: Exception) {}
        }

        fun stop(context: Context) {
            try {
                val intent =
                    Intent(context, ProtectionForegroundService::class.java).apply {
                        action = ACTION_STOP
                    }
                context.startService(intent)
            } catch (_: Exception) {}
        }
    }
}

