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

/** Foreground restrictions only. No screenshots or text content is persisted. */
class RestrictionService : AccessibilityService() {
    private lateinit var runtime: OfflineRuntime
    private val handler = Handler(Looper.getMainLooper())
    private var foreground = ""
    private var overlay: View? = null
    private var lastEvaluation = 0L
    private var lastVisualCapture = 0L
    private var visualCaptureInFlight = false
    private var visualTransitionPending = false
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
            publishVisualDiagnostics(VisualAiDiagnostics(failure = "Screen capture timed out; retrying."))
            scheduleVisualSampling()
        }
    }
    private val visualSampler = object : Runnable {
        override fun run() {
            if (visualPackage.isNotBlank()) requestVisualFrame(visualPackage, visualWindowId)
            if (visualPackage.isNotBlank() && ::runtime.isInitialized && runtime.configuration.optBoolean("visualAiEnabled")) handler.postDelayed(this, 500L)
        }
    }
    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) { handler.removeCallbacks(check); stopVisualAi(); hideOverlay(); foreground = "" }
    }
    override fun onServiceConnected() {
        runtime = OfflineRuntime.get(this); instance = this
        runtime.accessibilityActive = true; runtime.changed?.invoke()
        registerReceiver(screenReceiver, IntentFilter(Intent.ACTION_SCREEN_OFF))
    }
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || !::runtime.isInitialized) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg == packageName) return
        val windowChanged = event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && pkg != foreground
        val reelScrolled = event.eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED
        if (windowChanged) {
            foreground = pkg; hideOverlay(); advanceVisualContent()
            // Ignore transient system UI; it must not tear down capture of a reel underneath.
            if (pkg !in visualPackages && pkg != "com.android.systemui") { stopVisualAi(); return }
        }
        // A scroll event also fires for comments and UI panels. Keep an existing
        // cover visible until a later screen frame proves that the reel changed.
        if (reelScrolled) visualTransitionPending = true
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
        if (visualPackage in visualPackages && ::runtime.isInitialized && runtime.configuration.optBoolean("visualAiEnabled")) handler.postDelayed(visualSampler, 500L)
    }
    private fun requestVisualFrame(pkg: String, windowId: Int, prioritize: Boolean = false) {
        if (!::runtime.isInitialized || !runtime.ready || !runtime.configuration.optBoolean("visualAiEnabled") || !runtime.configuration.optBoolean("accessibilityConsent")) return
        if (pkg !in visualPackages || windowId < 0) return
        if (android.os.Build.VERSION.SDK_INT < 34) {
            publishVisualDiagnostics(VisualAiDiagnostics(failure = "This Viddexa test build needs Android 14+ window capture. MediaProjection fallback is not enabled yet."))
            return
        }
        val now = System.currentTimeMillis()
        if (visualCaptureInFlight || now - lastVisualCapture < 500L) return
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
            result.onSuccess { frame -> pipeline.submit(frame, prioritize) }
                .onFailure { error -> publishVisualDiagnostics(VisualAiDiagnostics(failure = error.message ?: "Screen capture failed")) }
        }
        }
    }
    private fun publishVisualDiagnostics(value: VisualAiDiagnostics) {
        fun scores(raw: ClassifierResult?) = raw?.let {
            JSONObject().put("normal", it.normal).put("sexy", it.sexy).put("porn", it.porn).put("hentai", it.hentai).put("drawing", it.drawing)
                .put("topCategory", it.topCategory.name).put("sexualVote", it.castsSexualVote).put("inferenceMs", it.inferenceMs)
        }
        fun decision(raw: DualModelDecision?) = raw?.let {
            JSONObject().put("viddexaSexualVote", it.viddexaSexualVote).put("nsfwJsSexualVote", it.nsfwJsSexualVote)
                .put("matchingSexualCategory", it.matchingSexualCategory?.name ?: JSONObject.NULL).put("finalDecision", it.finalDecision.name)
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
                            sensitiveContentOverlay?.hide()
                            revealControl?.hide()
                        }
                    }
                }
                ProtectionDecision.ALLOW -> if (!contentInstances.isBlocked()) { sensitiveContentOverlay?.hide(); revealControl?.hide() }
            }
        }
    }
    private fun advanceVisualContent() { visualTransitionPending = false; contentInstances.advance(); sensitiveContentOverlay?.hide(); revealControl?.hide() }
    private fun stopVisualAi() { handler.removeCallbacks(visualSampler); handler.removeCallbacks(visualCaptureTimeout); visualPipeline?.close(); visualPipeline = null; visualSource?.close(); visualSource = null; visualScoreOverlay?.close(); visualScoreOverlay = null; sensitiveContentOverlay?.close(); sensitiveContentOverlay = null; revealControl?.close(); revealControl = null; contentInstances.clear(); visualTransitionPending = false; visualPackage = ""; visualWindowId = -1; visualCaptureInFlight = false }
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
    override fun onInterrupt() { handler.removeCallbacks(check); stopVisualAi(); hideOverlay(); if (::runtime.isInitialized) { runtime.accessibilityActive = false; runtime.changed?.invoke() } }
    override fun onDestroy() { onInterrupt(); instance = null; if (::runtime.isInitialized) unregisterReceiver(screenReceiver); super.onDestroy() }
    companion object {
        var instance: RestrictionService? = null; private set
        private val visualPackages = setOf("com.instagram.android", "com.zhiliaoapp.musically", "com.google.android.youtube", "com.snapchat.android")
    }
}
