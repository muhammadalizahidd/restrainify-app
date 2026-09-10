package com.restrainify.protection.service

import android.accessibilityservice.AccessibilityService
import android.content.*
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.view.*
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.*
import com.restrainify.protection.OfflineRuntime
import com.restrainify.protection.Policy
import java.time.*

/** Foreground restrictions only. No screenshots or text content is persisted. */
class RestrictionService : AccessibilityService() {
    private lateinit var runtime: OfflineRuntime
    private val handler = Handler(Looper.getMainLooper())
    private var foreground = ""
    private var overlay: View? = null
    private var lastEvaluation = 0L
    private val check = Runnable { evaluate() }
    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) { handler.removeCallbacks(check); hideOverlay(); foreground = "" }
    }
    override fun onServiceConnected() {
        runtime = OfflineRuntime.get(this); instance = this
        runtime.accessibilityActive = true; runtime.changed?.invoke()
        registerReceiver(screenReceiver, IntentFilter(Intent.ACTION_SCREEN_OFF))
    }
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || !::runtime.isInitialized) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg == packageName && overlay != null) return
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && pkg != foreground) { foreground = pkg; hideOverlay() }
        if (System.currentTimeMillis() - lastEvaluation > 350) reevaluate()
    }
    fun reevaluate() { handler.removeCallbacks(check); handler.post(check) }
    private fun evaluate() {
        if (!::runtime.isInitialized || !runtime.ready) return
        lastEvaluation = System.currentTimeMillis()
        if (!getSystemService(PowerManager::class.java).isInteractive || !runtime.configuration.optBoolean("accessibilityConsent")) { hideOverlay(); return }
        val root = rootInActiveWindow
        val pkg = if (overlay == null) root?.packageName?.toString() ?: foreground else foreground
        foreground = pkg
        val rules = runtime.configuration.optJSONArray("rules") ?: return
        val rule = (0 until rules.length()).map { rules.getJSONObject(it) }.firstOrNull { it.optBoolean("enabled") && it.optString("packageName") == pkg }
        if (rule == null || pkg == packageName) { hideOverlay(); return }
        val now = LocalDateTime.now()
        val days = rule.getJSONArray("days"); val weekdays = (0 until days.length()).map { days.getInt(it) }.toSet()
        val scheduled = rule.optInt("startMinute", -1) >= 0 && Policy.scheduled(now.hour * 60 + now.minute, now.dayOfWeek.value, rule.getInt("startMinute"), rule.getInt("endMinute"), weekdays)
        val reason = when {
            rule.optBoolean("burst") && runtime.burstRemaining() > 0 -> "Your Burst cooldown is active. Take a breath and step away for a moment."
            rule.optString("feedMode") == "whole_app" -> "You chose to keep this app out of reach."
            scheduled -> "This app is resting during your scheduled window."
            rule.optString("feedMode") == "experimental" && feedVisible(pkg, root) -> "You chose to pause short-form feeds."
            else -> null
        }
        if (reason != null) showOverlay(reason)
        else if (rule.optInt("limitMinutes") > 0 && runtime.hasUsageAccess()) {
            val observed = pkg
            runtime.executor.execute {
                try {
                    val today = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
                    val used = runtime.usage(today, System.currentTimeMillis())[observed] ?: 0
                    handler.post { if (foreground == observed) { if (used >= rule.getInt("limitMinutes") * 60_000L) showOverlay("You've reached the daily limit you chose for this app.") else hideOverlay() } }
                } catch (_: Exception) { runtime.failure = "Usage limits could not be checked"; runtime.changed?.invoke() }
            }
        } else hideOverlay()
        // A timer exists only while a selected app is foreground; no background polling.
        handler.removeCallbacks(check); handler.postDelayed(check, 15_000)
    }
    private fun feedVisible(pkg: String, root: AccessibilityNodeInfo?): Boolean {
        if (root == null) return false
        val selectors = when (pkg) {
            "com.google.android.youtube" -> listOf("reel_recycler", "reel_watch_player")
            "com.instagram.android" -> listOf("clips_viewer_view_pager", "clips_viewer_view_pager_v2")
            else -> emptyList()
        }
        return selectors.any { id -> root.findAccessibilityNodeInfosByViewId("$pkg:id/$id").any { it.isVisibleToUser } }
    }
    private fun showOverlay(reason: String) {
        if (overlay != null) return
        val density = resources.displayMetrics.density
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding((32*density).toInt(), 0, (32*density).toInt(), 0)
            setBackgroundColor(Color.rgb(12,20,34))
            addView(TextView(context).apply { text = "A little space.\nA better next choice."; textSize = 28f; setTextColor(Color.WHITE); gravity = Gravity.CENTER })
            addView(TextView(context).apply { text = reason; textSize = 16f; setTextColor(Color.rgb(183,195,214)); gravity = Gravity.CENTER; setPadding(0,24,0,24) })
            addView(Button(context).apply { text = "Back to home"; setOnClickListener { performGlobalAction(GLOBAL_ACTION_HOME); hideOverlay() } })
        }
        try {
            getSystemService(WindowManager::class.java).addView(layout, WindowManager.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY, WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN, PixelFormat.TRANSLUCENT))
            overlay = layout; runtime.recordBlock()
        } catch (_: Exception) { runtime.failure = "The restriction screen could not be displayed"; runtime.changed?.invoke() }
    }
    private fun hideOverlay() { overlay?.let { getSystemService(WindowManager::class.java).removeView(it) }; overlay = null }
    override fun onInterrupt() { handler.removeCallbacks(check); hideOverlay(); if (::runtime.isInitialized) { runtime.accessibilityActive = false; runtime.changed?.invoke() } }
    override fun onDestroy() { onInterrupt(); instance = null; if (::runtime.isInitialized) unregisterReceiver(screenReceiver); super.onDestroy() }
    companion object { var instance: RestrictionService? = null; private set }
}
