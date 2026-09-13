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
import com.restrainify.protection.visual.AccessibilityWindowFrameSource
import com.restrainify.protection.visual.AccessibilityBlockOverlayController
import com.restrainify.protection.visual.AccessibilityVisualScoreOverlay
import com.restrainify.protection.visual.AccessibilityRevealControlController
import com.restrainify.protection.visual.ContentInstanceTracker
import com.restrainify.protection.visual.ClassifierResult
import com.restrainify.protection.visual.DualModelDecision
import com.restrainify.protection.visual.DualModelDecisionEngine
import com.restrainify.protection.visual.NsfwJsMobileNetV2Classifier
import com.restrainify.protection.visual.ProtectionDecision
import com.restrainify.protection.visual.ViddexaClassifier
import com.restrainify.protection.visual.VisualAiDiagnostics
import com.restrainify.protection.visual.VisualAiPipeline
import org.json.JSONObject
import java.time.*
import java.util.concurrent.Executor
import java.util.Collections

/** Foreground restrictions only. No screenshots or text content is persisted. */
class RestrictionService : AccessibilityService() {
    private lateinit var runtime: OfflineRuntime
    private val handler = Handler(Looper.getMainLooper())
    private var foreground = ""
    private var overlay: View? = null
    private var lastEvaluation = 0L
    private var lastVisualCapture = 0L
    private var lastSuccessfulVisualCapture = 0L
    private var visualCaptureFailureCount = 0
    private var visualCaptureInFlight = false
    private var visualTransitionPending = false
    private var visualSamplingPausedForReveal = false
    private var visualPackage = ""
    private var visualWindowId = -1
    private var visualSource: AccessibilityWindowFrameSource? = null
    private var visualPipeline: VisualAiPipeline? = null
    private var visualScoreOverlay: AccessibilityVisualScoreOverlay? = null
    private var sensitiveContentOverlay: AccessibilityBlockOverlayController? = null
    private var revealControl: AccessibilityRevealControlController? = null
    private val contentInstances = ContentInstanceTracker()
    private val dualModelDecisionEngine = DualModelDecisionEngine()
    private val check = Runnable { evaluate() }
    private val visualCaptureTimeout = Runnable {
        if (visualCaptureInFlight) {
            visualCaptureInFlight = false
            reportVisualCaptureFailure("Screen capture timed out; retrying.")
            scheduleVisualSampling()
        }
    }
    private val visualSampler = object : Runnable {
        override fun run() {
            if (visualPackage.isNotBlank()) requestVisualFrame(visualPackage, visualWindowId)
            if (!visualSamplingPausedForReveal && visualPackage.isNotBlank() && ::runtime.isInitialized && runtime.configuration.optBoolean("visualAiEnabled")) handler.postDelayed(this, if (visualPipeline?.requiresContinuousLatestSampling() == true) 200L else 500L)
        }
    }

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
            stopVisualAi()
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
    }
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || !::runtime.isInitialized) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg == packageName) return
        // Ignore transient system windows (keyboards, status bar, heads-up notifications).
        if (isTransientPackage(pkg)) return
        val windowChanged = event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && pkg != foreground
        val reelScrolled = event.eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED
        if (windowChanged) {
            visualSamplingPausedForReveal = false
            foreground = pkg
            // Preserve main's split-screen/exhausted-app protection while advancing
            // the visual content instance for a genuine app/window transition.
            val hasExhaustedVisible = getVisibleAppPackages().any { isPackageExhausted(it) }
            if (!isPackageExhausted(pkg) && !hasExhaustedVisible) hideOverlay()
            advanceVisualContent()
            // Ignore transient system UI; it must not tear down capture of a reel underneath.
            if (pkg !in visualPackages && pkg != "com.android.systemui") { stopVisualAi(); return }
        }
        // A scroll event also fires for comments and UI panels. Keep an existing
        // cover visible until a later screen frame proves that the reel changed.
        if (reelScrolled) {
            visualTransitionPending = true
            visualSamplingPausedForReveal = false
            visualPipeline?.resetTemporalDecisions()
        }
        if (System.currentTimeMillis() - lastEvaluation > 350) reevaluate()
        // Content events from other apps are common. They must not replace the active visual window.
        if (pkg !in visualPackages) return
        visualPackage = pkg
        visualWindowId = event.windowId
        requestVisualFrame(pkg, event.windowId, windowChanged || reelScrolled)
        scheduleVisualSampling()
    }
    fun reevaluate() { handler.removeCallbacks(check); handler.post(check) }
    fun reevaluateVisualAi() {
        if (!::runtime.isInitialized || !runtime.configuration.optBoolean("visualAiEnabled")) stopVisualAi()
    }
    private fun scheduleVisualSampling() {
        handler.removeCallbacks(visualSampler)
        if (!visualSamplingPausedForReveal && visualPackage in visualPackages && ::runtime.isInitialized && runtime.configuration.optBoolean("visualAiEnabled")) handler.postDelayed(visualSampler, if (visualPipeline?.requiresContinuousLatestSampling() == true) 200L else 500L)
    }
    private fun requestVisualFrame(pkg: String, windowId: Int, prioritize: Boolean = false) {
        if (!::runtime.isInitialized || !runtime.ready || !runtime.configuration.optBoolean("visualAiEnabled") || !runtime.configuration.optBoolean("accessibilityConsent")) return
        if (visualSamplingPausedForReveal) return
        if (pkg !in visualPackages || windowId < 0) return
        if (android.os.Build.VERSION.SDK_INT < 34) {
            publishVisualDiagnostics(VisualAiDiagnostics(failure = "This Viddexa test build needs Android 14+ window capture. MediaProjection fallback is not enabled yet."))
            return
        }
        val now = System.currentTimeMillis()
        val latestOnly = visualPipeline?.requiresContinuousLatestSampling() == true
        if (visualCaptureInFlight || now - lastVisualCapture < if (latestOnly) 200L else 500L) return
        lastVisualCapture = now; visualCaptureInFlight = true
        handler.removeCallbacks(visualCaptureTimeout)
        handler.postDelayed(visualCaptureTimeout, 2_000L)
        val pipeline = visualPipeline ?: VisualAiPipeline(
            { ViddexaClassifier(this) },
            { NsfwJsMobileNetV2Classifier(this) },
            dualModelDecisionEngine,
            ::publishVisualDiagnostics,
            ::onFrameClassified,
        ).also { visualPipeline = it }
        val source = visualSource ?: AccessibilityWindowFrameSource(this, Executor { task -> runtime.executor.execute(task) }).also { visualSource = it }
        source.capture(windowId) { result -> handler.post {
            visualCaptureInFlight = false
            handler.removeCallbacks(visualCaptureTimeout)
            result.onSuccess { frame ->
                visualCaptureFailureCount = 0
                lastSuccessfulVisualCapture = System.currentTimeMillis()
                if (visualSamplingPausedForReveal) frame.close() else pipeline.submit(frame, prioritize || latestOnly)
            }
                .onFailure { error -> reportVisualCaptureFailure(error.message ?: "Screen capture failed") }
        }
        }
    }
    private fun reportVisualCaptureFailure(message: String) {
        visualCaptureFailureCount++
        val now = System.currentTimeMillis()
        if (visualCaptureFailureCount >= 3 && (lastSuccessfulVisualCapture == 0L || now - lastSuccessfulVisualCapture >= 2_000L)) {
            publishVisualDiagnostics(VisualAiDiagnostics(failure = message))
        }
    }
    private fun publishVisualDiagnostics(value: VisualAiDiagnostics) {
        fun scores(raw: ClassifierResult?) = raw?.let {
            JSONObject().put("normal", it.normal).put("sexy", it.sexy).put("porn", it.porn).put("hentai", it.hentai).put("drawing", it.drawing)
                .put("topCategory", it.topCategory.name).put("sexualVote", it.castsSexualVote).put("inferenceMs", it.inferenceMs)
        }
        fun decision(raw: DualModelDecision?) = raw?.let {
            JSONObject().put("viddexaSexualVote", it.viddexaSexualVote).put("nsfwJsSexualVote", it.nsfwJsSexualVote)
                .put("matchingSexualCategory", it.matchingSexualCategory?.name ?: JSONObject.NULL).put("nsfwJsPornFrameCount", it.nsfwJsPornFrameCount).put("nsfwJsPornWindowBlock", it.nsfwJsPornWindowBlock).put("pornSexyOverlapFrameCount", it.pornSexyOverlapFrameCount).put("pornSexyOverlapWindowBlock", it.pornSexyOverlapWindowBlock).put("exactSexualConsensusFrameCount", it.exactSexualConsensusFrameCount).put("exactSexualConsensusWindowBlock", it.exactSexualConsensusWindowBlock).put("finalDecision", it.finalDecision.name)
        }
        runtime.updateVisualAiDiagnostics(
            JSONObject().put("modelReady", value.modelReady).put("inferenceCount", value.inferenceCount)
                .put("skippedFrames", value.skippedFrames).put("duplicateFrames", value.duplicateFrames)
                .put("lastLatencyMs", value.lastLatencyMs ?: JSONObject.NULL)
                .put("lastViddexa", scores(value.lastViddexa) ?: JSONObject.NULL)
                .put("lastNsfwJs", scores(value.lastNsfwJs) ?: JSONObject.NULL)
                .put("lastDecision", decision(value.lastDecision) ?: JSONObject.NULL)
                .put("failure", value.failure ?: JSONObject.NULL),
        )
        handler.post {
            if (runtime.configuration.optBoolean("visualAiEnabled")) (visualScoreOverlay ?: AccessibilityVisualScoreOverlay(this).also { visualScoreOverlay = it }).show(value)
        }
    }
    private fun onFrameClassified(fingerprint: Long, viddexa: ClassifierResult, nsfwJs: ClassifierResult, decision: DualModelDecision) {
        handler.post {
            // A model call already in flight when Show Reel is tapped must not
            // update the reveal state or reinstate an overlay for that reel.
            if (visualSamplingPausedForReveal) return@post
            if (visualTransitionPending && contentInstances.confirmsNewContent(fingerprint)) {
                visualTransitionPending = false
                advanceVisualContent()
            }
            val changedContent = contentInstances.observe(fingerprint)
            if (changedContent) { sensitiveContentOverlay?.hide(); revealControl?.hide() }
            if (!runtime.configuration.optBoolean("visualAiBlockingEnabled")) {
                sensitiveContentOverlay?.hide()
                revealControl?.hide()
                return@post
            }
            if (contentInstances.isBlocked() && !contentInstances.isCurrentRevealed()) {
                (sensitiveContentOverlay ?: AccessibilityBlockOverlayController(this).also { sensitiveContentOverlay = it }).showSensitiveContentHidden()
                return@post
            }
            when (decision.finalDecision) {
                ProtectionDecision.BLOCK -> if (!contentInstances.isCurrentRevealed()) {
                    (sensitiveContentOverlay ?: AccessibilityBlockOverlayController(this).also { sensitiveContentOverlay = it }).showSensitiveContentHidden()
                    if (contentInstances.markBlocked()) runtime.recordBlock()
                    if (runtime.configuration.optBoolean("allowShowReel")) {
                        (revealControl ?: AccessibilityRevealControlController(this).also { revealControl = it }).show {
                            contentInstances.revealCurrent()
                            visualSamplingPausedForReveal = true
                            handler.removeCallbacks(visualSampler)
                            sensitiveContentOverlay?.hide()
                            revealControl?.hide()
                        }
                    }
                }
                ProtectionDecision.ALLOW -> if (!contentInstances.isBlocked()) { sensitiveContentOverlay?.hide(); revealControl?.hide() }
            }
        }
    }
    private fun advanceVisualContent() { visualTransitionPending = false; visualSamplingPausedForReveal = false; visualPipeline?.resetTemporalDecisions(); contentInstances.advance(); sensitiveContentOverlay?.hide(); revealControl?.hide() }
    private fun stopVisualAi() { handler.removeCallbacks(visualSampler); handler.removeCallbacks(visualCaptureTimeout); visualPipeline?.close(); visualPipeline = null; visualSource?.close(); visualSource = null; visualScoreOverlay?.close(); visualScoreOverlay = null; sensitiveContentOverlay?.close(); sensitiveContentOverlay = null; revealControl?.close(); revealControl = null; contentInstances.clear(); visualTransitionPending = false; visualSamplingPausedForReveal = false; visualPackage = ""; visualWindowId = -1; visualCaptureInFlight = false; lastSuccessfulVisualCapture = 0L; visualCaptureFailureCount = 0 }
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
            // The master switch controls feed-specific detection only. Full-app,
            // schedule, daily-limit, and Burst restrictions remain independent.
            runtime.configuration.optBoolean("shortFormBlockingEnabled", true) && rule.optString("feedMode") == "experimental" && feedVisible(pkg, root) -> OverlayDetails(
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
    override fun onInterrupt() {
        handler.removeCallbacks(check)
        stopVisualAi()
        hideOverlay()
        resetSession()
        if (::runtime.isInitialized) { runtime.accessibilityActive = false; runtime.changed?.invoke() }
    }
    override fun onDestroy() { onInterrupt(); instance = null; if (::runtime.isInitialized) unregisterReceiver(screenReceiver); super.onDestroy() }
    companion object {
        var instance: RestrictionService? = null; private set
        private val visualPackages = setOf("com.instagram.android", "com.zhiliaoapp.musically", "com.google.android.youtube", "com.snapchat.android")
    }
}
