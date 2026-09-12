package com.restrainify.protection.service

import android.accessibilityservice.AccessibilityService
import android.content.*
import android.net.Uri
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.view.*
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityWindowInfo
import android.view.inputmethod.InputMethodManager
import android.widget.*
import com.restrainify.protection.OfflineRuntime
import com.restrainify.protection.Policy
import java.time.*
import java.util.Collections

/** Foreground restrictions only. No screenshots or text content is persisted. */
class RestrictionService : AccessibilityService() {
    private lateinit var runtime: OfflineRuntime
    private val handler = Handler(Looper.getMainLooper())
    private var foreground = ""
    private var overlay: View? = null
    private var lastEvaluation = 0L
    private val check = Runnable { evaluate() }

    // Active session tracking for real-time app usage limit enforcement
    private var sessionPackage = ""
    private var sessionStartElapsed = 0L
    private var sessionStartDay: LocalDate? = null
    private var sessionBaselineUsageMs = 0L
    private var sessionBaselineFetched = false

    // Cache of active input method packages
    private var cachedImePackages = emptySet<String>()

    // Zero-flicker pre-blocking cache: packages known to be currently exhausted today
    private val exhaustedPackages = Collections.synchronizedSet(mutableSetOf<String>())
    private var exhaustedDay: LocalDate? = null

    // Monotonic usage preservation across clock rollbacks and timezone shifts (FR-APP-008)
    private val maxObservedUsage = Collections.synchronizedMap(mutableMapOf<String, Long>())
    private var maxObservedDay: LocalDate? = null

    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            handler.removeCallbacks(check)
            hideOverlay()
            foreground = ""
            resetSession()
        }
    }

    private fun resetSession() {
        sessionPackage = ""
        sessionStartElapsed = 0L
        sessionStartDay = null
        sessionBaselineUsageMs = 0L
        sessionBaselineFetched = false
    }

    fun isTransientPackage(pkg: String): Boolean =
        Policy.isTransientPackage(pkg, cachedImePackages)

    fun isPackageExhausted(pkg: String): Boolean {
        val today = LocalDate.now()
        if (exhaustedDay != today) {
            exhaustedPackages.clear()
            exhaustedDay = today
            return false
        }
        return exhaustedPackages.contains(pkg)
    }

    fun getMonotonicUsage(pkg: String, reportedUsage: Long): Long {
        val today = LocalDate.now()
        if (maxObservedDay != today) {
            maxObservedUsage.clear()
            maxObservedDay = today
        }
        val maxObserved = maxObservedUsage[pkg] ?: 0L
        val monotonic = Policy.monotonicUsage(reportedUsage, maxObserved)
        maxObservedUsage[pkg] = monotonic
        return monotonic
    }

    /**
     * Inspects all currently visible on-screen application windows to counter
     * split-screen, freeform multi-window, and Picture-in-Picture bypasses.
     */
    fun getVisibleAppPackages(): Set<String> {
        return try {
            windows.mapNotNull { win ->
                if (win.type == AccessibilityWindowInfo.TYPE_APPLICATION) {
                    win.root?.packageName?.toString()
                } else null
            }.filter { it.isNotEmpty() && !isTransientPackage(it) }.toSet()
        } catch (_: Exception) {
            emptySet()
        }
    }

    fun updateImePackages() {
        try {
            val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            cachedImePackages = imm?.inputMethodList?.map { it.packageName }?.toSet() ?: emptySet()
        } catch (_: Exception) {
            // Fallback to empty if IPC fails
        }
    }

    fun refreshExhaustedPackages() {
        if (!::runtime.isInitialized || !runtime.ready) return
        if (!runtime.hasUsageAccess()) {
            val rules = runtime.configuration.optJSONArray("rules")
            var hasLimitRules = false
            if (rules != null) {
                for (i in 0 until rules.length()) {
                    val r = rules.getJSONObject(i)
                    if (r.optBoolean("enabled") && r.optInt("limitMinutes") > 0) {
                        hasLimitRules = true
                        break
                    }
                }
            }
            if (hasLimitRules) {
                val failureMsg = "Usage Access permission is required to enforce daily limits"
                if (runtime.failure != failureMsg) {
                    runtime.failure = failureMsg
                    runtime.changed?.invoke()
                }
            }
            return
        }
        val today = LocalDate.now()
        runtime.executor.execute {
            try {
                val startOfDayMs = today.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
                val usageMap = runtime.usage(startOfDayMs, System.currentTimeMillis())
                val rules = runtime.configuration.optJSONArray("rules") ?: return@execute
                val newlyExhausted = mutableSetOf<String>()
                for (i in 0 until rules.length()) {
                    val r = rules.getJSONObject(i)
                    if (r.optBoolean("enabled")) {
                        val limitMinutes = r.optInt("limitMinutes")
                        val pkg = r.optString("packageName")
                        if (limitMinutes > 0 && pkg.isNotEmpty()) {
                            val rawUsed = usageMap[pkg] ?: 0L
                            val used = getMonotonicUsage(pkg, rawUsed)
                            if (used >= limitMinutes * 60_000L) {
                                newlyExhausted.add(pkg)
                            }
                        }
                    }
                }
                handler.post {
                    if (exhaustedDay != today) {
                        exhaustedPackages.clear()
                        exhaustedDay = today
                    }
                    exhaustedPackages.addAll(newlyExhausted)
                }
            } catch (_: Exception) {
                // Non-fatal initial cache populate
            }
        }
    }

    override fun onServiceConnected() {
        runtime = OfflineRuntime.get(this); instance = this
        runtime.accessibilityActive = true; runtime.changed?.invoke()
        registerReceiver(screenReceiver, IntentFilter(Intent.ACTION_SCREEN_OFF))
        updateImePackages()
        refreshExhaustedPackages()
        ProtectionForegroundService.start(this)
    }
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || !::runtime.isInitialized) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg == packageName && overlay != null) return

        // Ignore transient system windows (keyboards, status bar, heads-up notifications)
        if (isTransientPackage(pkg)) return

        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && pkg != foreground) {
            foreground = pkg
            // Check if any currently visible split-screen/multi-window app is exhausted
            val visibleApps = getVisibleAppPackages()
            val hasExhaustedVisible = visibleApps.any { isPackageExhausted(it) }

            // Only hide the overlay if NO visible package is exhausted
            if (!isPackageExhausted(pkg) && !hasExhaustedVisible) {
                hideOverlay()
            }
        }
        if (System.currentTimeMillis() - lastEvaluation > 350) reevaluate()
    }
    fun reevaluate() { handler.removeCallbacks(check); handler.post(check) }
    private fun evaluate() {
        if (!::runtime.isInitialized || !runtime.ready) return
        lastEvaluation = System.currentTimeMillis()
        if (!getSystemService(PowerManager::class.java).isInteractive || !runtime.configuration.optBoolean("accessibilityConsent")) {
            hideOverlay()
            resetSession()
            return
        }
        val root = rootInActiveWindow
        val rootPkg = root?.packageName?.toString()
        val candidatePkg = if (rootPkg != null && !isTransientPackage(rootPkg)) rootPkg else foreground
        val pkg = if (overlay == null) candidatePkg else foreground
        foreground = pkg

        // Multi-window / Split-screen protection:
        // If an exhausted app is visible in a split window even when another window has focus,
        // force collapse to home to prevent split-screen bypass.
        val visibleApps = getVisibleAppPackages()
        val visibleExhausted = visibleApps.firstOrNull { isPackageExhausted(it) }
        if (visibleExhausted != null && visibleExhausted != pkg) {
            performGlobalAction(GLOBAL_ACTION_HOME)
            hideOverlay()
            return
        }
        val rules = runtime.configuration.optJSONArray("rules") ?: return
        val rule = (0 until rules.length()).map { rules.getJSONObject(it) }.firstOrNull { it.optBoolean("enabled") && it.optString("packageName") == pkg }
        if (rule == null || pkg == packageName) {
            hideOverlay()
            resetSession()
            return
        }

        val today = LocalDate.now()
        if (sessionPackage != pkg || sessionStartDay != today) {
            sessionPackage = pkg
            sessionStartElapsed = SystemClock.elapsedRealtime()
            sessionStartDay = today
            sessionBaselineUsageMs = 0L
            sessionBaselineFetched = false
        }

        val now = LocalDateTime.now()
        val days = rule.getJSONArray("days"); val weekdays = (0 until days.length()).map { days.getInt(it) }.toSet()
        val scheduled = rule.optInt("startMinute", -1) >= 0 && Policy.scheduled(now.hour * 60 + now.minute, now.dayOfWeek.value, rule.getInt("startMinute"), rule.getInt("endMinute"), weekdays)
        val appLabel = try { packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString() } catch (_: Exception) { pkg }
        val reasonDetails = when {
            rule.optBoolean("burst") && runtime.burstRemaining() > 0 -> OverlayDetails(
                eyebrow = "Burst intervention",
                title = "Cooldown active.",
                description = "Your Burst cooldown is active. Take a breath and step away for a moment.",
                canRequestOverride = false,
                targetPackage = pkg,
                appLabel = appLabel,
            )
            rule.optString("feedMode") == "whole_app" -> OverlayDetails(
                eyebrow = "App restriction",
                title = "$appLabel is restricted.",
                description = "You chose to keep this app out of reach.",
                canRequestOverride = true,
                targetPackage = pkg,
                appLabel = appLabel,
            )
            scheduled -> OverlayDetails(
                eyebrow = "Scheduled restriction",
                title = "$appLabel is resting.",
                description = "This app is resting during your scheduled window. This restriction is separate from a daily usage limit.",
                canRequestOverride = true,
                targetPackage = pkg,
                appLabel = appLabel,
            )
            rule.optString("feedMode") == "experimental" && feedVisible(pkg, root) -> OverlayDetails(
                eyebrow = "Short-form paused",
                title = "Feed restricted.",
                description = "You chose to pause short-form feeds.",
                canRequestOverride = false,
                targetPackage = pkg,
                appLabel = appLabel,
            )
            else -> null
        }
        if (reasonDetails != null) {
            showOverlay(reasonDetails)
            handler.removeCallbacks(check)
            handler.postDelayed(check, 15_000)
            return
        }

        val limitMinutes = rule.optInt("limitMinutes")
        if (limitMinutes > 0) {
            if (!runtime.hasUsageAccess()) {
                val failureMsg = "Usage Access permission is required to enforce daily limits"
                if (runtime.failure != failureMsg) {
                    runtime.failure = failureMsg
                    runtime.changed?.invoke()
                }
                exhaustedPackages.remove(pkg)
                hideOverlay()
                handler.removeCallbacks(check)
                handler.postDelayed(check, 15_000)
                return
            } else if (runtime.failure == "Usage Access permission is required to enforce daily limits") {
                runtime.failure = null
                runtime.changed?.invoke()
            }

            val limitDetails = OverlayDetails(
                eyebrow = "Daily limit reached",
                title = "$appLabel is restricted.",
                badge = "${limitMinutes}m",
                description = "You used your full $limitMinutes minute allowance. It becomes available again when your daily limit resets.",
                canRequestOverride = true,
                targetPackage = pkg,
                appLabel = appLabel,
            )

            // Synchronous zero-latency pre-blocking: eliminate 100-500ms launch flicker
            if (isPackageExhausted(pkg)) {
                showOverlay(limitDetails)
            }

            val observed = pkg
            runtime.executor.execute {
                try {
                    val startOfDayMs = today.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
                    val rawUsage = runtime.usage(startOfDayMs, System.currentTimeMillis())[observed] ?: 0L
                    val currentUsageStats = getMonotonicUsage(observed, rawUsage)
                    handler.post {
                        if (foreground == observed && sessionPackage == observed) {
                            if (!sessionBaselineFetched) {
                                sessionBaselineUsageMs = currentUsageStats
                                sessionBaselineFetched = true
                            }
                            val sessionElapsedMs = if (sessionStartElapsed > 0L) maxOf(0L, SystemClock.elapsedRealtime() - sessionStartElapsed) else 0L
                            val verdict = Policy.evaluateLimit(
                                limitMinutes = limitMinutes,
                                currentUsageStats = currentUsageStats,
                                baselineUsageStats = sessionBaselineUsageMs,
                                sessionElapsedMs = sessionElapsedMs,
                            )
                            if (verdict.exceeded) {
                                exhaustedPackages.add(observed)
                                showOverlay(limitDetails)
                                handler.removeCallbacks(check)
                                handler.postDelayed(check, 15_000)
                            } else {
                                exhaustedPackages.remove(observed)
                                hideOverlay()
                                val nextDelay = minOf(15_000L, maxOf(1_000L, verdict.remainingMs))
                                handler.removeCallbacks(check)
                                handler.postDelayed(check, nextDelay)
                            }
                        }
                    }
                } catch (_: Exception) {
                    runtime.failure = "Usage limits could not be checked"
                    runtime.changed?.invoke()
                    handler.removeCallbacks(check)
                    handler.postDelayed(check, 15_000)
                }
            }
        } else {
            exhaustedPackages.remove(pkg)
            hideOverlay()
            handler.removeCallbacks(check)
            handler.postDelayed(check, 15_000)
        }
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

    data class OverlayDetails(
        val eyebrow: String,
        val title: String,
        val badge: String? = null,
        val description: String,
        val canRequestOverride: Boolean = false,
        val targetPackage: String = "",
        val appLabel: String = "",
    )

    private fun showOverlay(details: OverlayDetails) {
        if (overlay != null) return
        val density = resources.displayMetrics.density
        val dip = { dp: Int -> (dp * density).toInt() }

        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dip(24), dip(24), dip(24), dip(24))
            setBackgroundColor(Color.rgb(12, 20, 34))

            addView(LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setPadding(dip(24), dip(28), dip(24), dip(24))
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(Color.rgb(20, 31, 51))
                    cornerRadius = 20f * density
                    setStroke(dip(1), Color.rgb(38, 56, 89))
                }

                addView(TextView(context).apply {
                    text = details.eyebrow.uppercase()
                    textSize = 12f
                    typeface = android.graphics.Typeface.DEFAULT_BOLD
                    setTextColor(Color.rgb(112, 161, 255))
                    gravity = Gravity.CENTER
                    letterSpacing = 0.08f
                })

                addView(TextView(context).apply {
                    text = details.title
                    textSize = 22f
                    typeface = android.graphics.Typeface.DEFAULT_BOLD
                    setTextColor(Color.WHITE)
                    gravity = Gravity.CENTER
                    setPadding(0, dip(10), 0, dip(8))
                })

                if (!details.badge.isNullOrEmpty()) {
                    addView(TextView(context).apply {
                        text = details.badge
                        textSize = 26f
                        typeface = android.graphics.Typeface.DEFAULT_BOLD
                        setTextColor(Color.rgb(147, 197, 253))
                        gravity = Gravity.CENTER
                        setPadding(dip(18), dip(6), dip(18), dip(6))
                        background = android.graphics.drawable.GradientDrawable().apply {
                            setColor(Color.rgb(28, 44, 73))
                            cornerRadius = 12f * density
                        }
                    })
                }

                addView(TextView(context).apply {
                    text = details.description
                    textSize = 14f
                    setTextColor(Color.rgb(183, 195, 214))
                    gravity = Gravity.CENTER
                    setPadding(0, dip(14), 0, dip(20))
                    setLineSpacing(4f * density, 1f)
                })

                if (details.canRequestOverride && details.targetPackage.isNotEmpty()) {
                    addView(Button(context).apply {
                        text = "Request an override"
                        textSize = 14f
                        typeface = android.graphics.Typeface.DEFAULT_BOLD
                        setTextColor(Color.WHITE)
                        background = android.graphics.drawable.GradientDrawable().apply {
                            setColor(Color.rgb(35, 52, 85))
                            cornerRadius = 12f * density
                            setStroke(dip(1), Color.rgb(51, 74, 115))
                        }
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            dip(46),
                        ).apply { bottomMargin = dip(10) }
                        setOnClickListener {
                            val intent = Intent(
                                Intent.ACTION_VIEW,
                                Uri.parse("restrainify://pending-change?packageName=${Uri.encode(details.targetPackage)}&appName=${Uri.encode(details.appLabel)}"),
                            ).apply {
                                setPackage(packageName)
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                            }
                            try { startActivity(intent) } catch (_: Exception) {}
                            hideOverlay()
                        }
                    })
                }

                addView(Button(context).apply {
                    text = "Return"
                    textSize = 14f
                    typeface = android.graphics.Typeface.DEFAULT_BOLD
                    setTextColor(Color.rgb(147, 197, 253))
                    background = android.graphics.drawable.GradientDrawable().apply {
                        setColor(Color.TRANSPARENT)
                    }
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        dip(42),
                    )
                    setOnClickListener {
                        performGlobalAction(GLOBAL_ACTION_HOME)
                        hideOverlay()
                    }
                })

                addView(TextView(context).apply {
                    text = "Overrides require a cooling delay when Strict Mode is configured."
                    textSize = 11f
                    setTextColor(Color.rgb(100, 116, 139))
                    gravity = Gravity.CENTER
                    setPadding(0, dip(12), 0, 0)
                })
            })
        }
        try {
            getSystemService(WindowManager::class.java).addView(
                rootLayout,
                WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                    PixelFormat.TRANSLUCENT,
                ),
            )
            overlay = rootLayout
            runtime.recordBlock()
        } catch (_: Exception) {
            runtime.failure = "The restriction screen could not be displayed"
            runtime.changed?.invoke()
        }
    }
    private fun hideOverlay() { overlay?.let { getSystemService(WindowManager::class.java).removeView(it) }; overlay = null }
    override fun onInterrupt() { ProtectionForegroundService.stop(this); handler.removeCallbacks(check); hideOverlay(); resetSession(); if (::runtime.isInitialized) { runtime.accessibilityActive = false; runtime.changed?.invoke() } }
    override fun onDestroy() { ProtectionForegroundService.stop(this); onInterrupt(); instance = null; if (::runtime.isInitialized) unregisterReceiver(screenReceiver); super.onDestroy() }
    companion object { var instance: RestrictionService? = null; private set }
}
