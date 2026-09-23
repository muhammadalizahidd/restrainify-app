package com.restrainify.protection.service

import android.accessibilityservice.AccessibilityService
import android.content.*
import android.content.pm.PackageManager
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
import org.json.JSONObject
import java.time.*
import java.util.Collections

/** Foreground restrictions only. No screenshots or text content is persisted. */
class RestrictionService : AccessibilityService() {
    private lateinit var runtime: OfflineRuntime
    private val handler = Handler(Looper.getMainLooper())
    enum class OverlayType {
        NONE,
        WEB_BLOCK,
        SOCIAL_APP,
        APP_RESTRICTION,
        BURST,
        SCHEDULED,
        DAILY_LIMIT,
        SHORT_FORM_FEED,
    }

    private var foreground = ""
    private var overlay: View? = null
    private var activeOverlayType = OverlayType.NONE
    private var currentOverlayPackage: String? = null
    private var currentOverlayHost: String? = null
    private var isWebBlockActive = false
    private var lastEvaluation = 0L
    private var feedTransitionCooloffUntil = 0L
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

    fun isLauncher(pkg: String): Boolean {
        if (pkg.isEmpty()) return true
        val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val defaultLauncher = try {
            packageManager.resolveActivity(homeIntent, PackageManager.MATCH_DEFAULT_ONLY)?.activityInfo?.packageName
        } catch (_: Exception) { null }
        if (pkg == defaultLauncher) return true
        val lower = pkg.lowercase()
        return lower.contains("launcher") || lower.endsWith(".home")
    }

    fun isRealUserApp(pkg: String): Boolean {
        if (pkg.isEmpty() || pkg == packageName || isTransientPackage(pkg)) return false
        if (isLauncher(pkg)) return true
        return try {
            packageManager.getLaunchIntentForPackage(pkg) != null
        } catch (_: Exception) {
            false
        }
    }

    fun getTopApplicationPackage(): String? {
        return try {
            val appWindows = windows.filter { it.type == AccessibilityWindowInfo.TYPE_APPLICATION }
            if (appWindows.isEmpty()) return null
            val topWin = appWindows.maxByOrNull { it.layer }
            topWin?.root?.packageName?.toString()
        } catch (_: Exception) {
            null
        }
    }

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
        runtime.accessibilityActive = true
        if (!runtime.configuration.optBoolean("accessibilityConsent")) {
            runtime.executor.execute {
                try {
                    runtime.command(
                        "setting",
                        JSONObject().put("key", "accessibilityConsent").put("value", true),
                    )
                } catch (_: Exception) {}
            }
        }
        runtime.changed?.invoke()
        registerReceiver(screenReceiver, IntentFilter(Intent.ACTION_SCREEN_OFF))
        updateImePackages()
        refreshExhaustedPackages()
        ProtectionForegroundService.start(this)
    }
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || !::runtime.isInitialized) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg == packageName) return

        // Ignore transient system windows (keyboards, status bar, heads-up notifications)
        if (isTransientPackage(pkg)) return

        val isTargetFeedApp = pkg == "com.instagram.android" ||
            pkg == "com.instagram.lite" ||
            pkg == "com.instagram.barcelona" ||
            pkg == "com.google.android.youtube" ||
            pkg == "com.facebook.katana"

        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            foreground = pkg
            reevaluate()
        } else if (event.eventType == AccessibilityEvent.TYPE_VIEW_CLICKED ||
            event.eventType == AccessibilityEvent.TYPE_VIEW_SELECTED) {
            if (isTargetFeedApp) {
                reevaluate()
            }
        } else {
            // Anti-flicker: When an app-level restriction overlay (social, whole-app, scheduled, burst, daily limit)
            // is actively displayed, occluded background content changes must NOT trigger re-evaluation.
            if (activeOverlayType != OverlayType.NONE && activeOverlayType != OverlayType.WEB_BLOCK && activeOverlayType != OverlayType.SHORT_FORM_FEED) {
                return
            }
            val elapsed = System.currentTimeMillis() - lastEvaluation
            val debounceMs = if (isTargetFeedApp) 100L else 200L
            if (elapsed > debounceMs) {
                reevaluate()
            } else {
                handler.removeCallbacks(check)
                handler.postDelayed(check, debounceMs - elapsed)
            }
        }
    }
    fun reevaluate() { handler.removeCallbacks(check); handler.post(check) }
    private fun evaluate() {
        if (!::runtime.isInitialized || !runtime.ready) return
        lastEvaluation = System.currentTimeMillis()
        val hasConsent = runtime.configuration.optBoolean("accessibilityConsent", false) || runtime.accessibilityActive
        if (!getSystemService(PowerManager::class.java).isInteractive || !hasConsent) {
            hideOverlay()
            resetSession()
            return
        }
        val topAppPkg = getTopApplicationPackage()
        val root = rootInActiveWindow
        val rootPkg = root?.packageName?.toString()

        val candidatePkg = when {
            topAppPkg != null && !isTransientPackage(topAppPkg) && topAppPkg != packageName -> topAppPkg
            rootPkg != null && !isTransientPackage(rootPkg) && rootPkg != packageName -> rootPkg
            foreground.isNotEmpty() && !isTransientPackage(foreground) && foreground != packageName -> foreground
            else -> ""
        }

        if (candidatePkg.isEmpty()) return
        val pkg = candidatePkg
        foreground = pkg

        // 1. If on launcher/home screen: user has exited the app -> dismiss overlay and reset session
        if (isLauncher(pkg)) {
            hideOverlay()
            resetSession()
            return
        }

        if (pkg == packageName) {
            if (activeOverlayType != OverlayType.NONE && currentOverlayPackage != packageName) {
                hideOverlay()
            }
            return
        }

        // Multi-window / Split-screen protection:
        val visibleApps = getVisibleAppPackages()
        val visibleExhausted = visibleApps.firstOrNull { isPackageExhausted(it) }
        if (visibleExhausted != null && visibleExhausted != pkg) {
            performGlobalAction(GLOBAL_ACTION_HOME)
            hideOverlay()
            return
        }

        // 2. Web / Social Website filtering in browsers and web views
        val browserUrl = findBrowserUrl(root, candidatePkg)
        val browserHost = Policy.extractHost(browserUrl)
        if (browserHost != null) {
            val activeDomainRules = runtime.domainRules.filter { it.enabled }
            val isExplicitlyAllowed = activeDomainRules.any { it.allow && Policy.matches(browserHost, it.host) }
            if (!isExplicitlyAllowed) {
                val isExplicitlyBlocked = activeDomainRules.any { !it.allow && Policy.matches(browserHost, it.host) }
                val isAdultBlocked = Policy.isKnownAdultDomain(browserHost)
                val isSocialBlocked = runtime.socialWebsitesEnabled && Policy.isSocialWebsite(browserHost) && !Policy.isSocialHostExempt(browserHost, runtime.appRules)
                val isProxyBlocked = runtime.proxyResistanceEnabled && Policy.isProxyOrBypass(browserHost)

                if (isSocialBlocked || isExplicitlyBlocked || isAdultBlocked || isProxyBlocked) {
                    val normalizedHost = Policy.normalizeBlockHost(browserHost, runtime.domainRules)
                    // If already showing for this exact web block, KEEP IT (zero flicker)
                    if (overlay != null && activeOverlayType == OverlayType.WEB_BLOCK && currentOverlayHost == normalizedHost) {
                        return
                    }

                    val details = when {
                        isSocialBlocked -> OverlayDetails(
                            eyebrow = "Social website blocked",
                            title = "Website restricted.",
                            badge = normalizedHost,
                            description = "You chose to block social websites from functioning.",
                            canRequestOverride = false,
                            targetPackage = candidatePkg,
                            appLabel = "Social website",
                            isWebBlock = true,
                        )
                        isExplicitlyBlocked -> OverlayDetails(
                            eyebrow = "Blocked website",
                            title = "$normalizedHost is restricted.",
                            badge = normalizedHost,
                            description = "This website is on your blocked domain list.",
                            canRequestOverride = false,
                            targetPackage = candidatePkg,
                            appLabel = normalizedHost,
                            isWebBlock = true,
                        )
                        isAdultBlocked -> OverlayDetails(
                            eyebrow = "Adult content blocked",
                            title = "Restricted domain.",
                            badge = normalizedHost,
                            description = "This website was blocked by Safe Browsing protection.",
                            canRequestOverride = false,
                            targetPackage = candidatePkg,
                            appLabel = normalizedHost,
                            isWebBlock = true,
                        )
                        else -> OverlayDetails(
                            eyebrow = "Proxy / bypass blocked",
                            title = "Access restricted.",
                            badge = normalizedHost,
                            description = "Proxy and bypass unblocker sites are restricted.",
                            canRequestOverride = false,
                            targetPackage = candidatePkg,
                            appLabel = normalizedHost,
                            isWebBlock = true,
                        )
                    }
                    showOverlay(details, OverlayType.WEB_BLOCK)
                    return
                }
            }
            // Host is known and safe: dismiss web block if active
            if (activeOverlayType == OverlayType.WEB_BLOCK) {
                hideOverlay()
            }
        } else {
            // Only dismiss web block if the user switched away from the browser to a real user app or launcher
            if (activeOverlayType == OverlayType.WEB_BLOCK) {
                if (candidatePkg != currentOverlayPackage && isRealUserApp(candidatePkg)) {
                    hideOverlay()
                } else {
                    return
                }
            }
        }

        // 3. StayFree-style Social App Protection & In-App Rule Resolution
        val rules = runtime.configuration.optJSONArray("rules")
        val explicitRule = if (rules == null) null else (0 until rules.length()).map { rules.getJSONObject(it) }.firstOrNull {
            val rulePkg = it.optString("packageName")
            rulePkg == pkg || Policy.getCanonicalSocialPackage(rulePkg) == Policy.getCanonicalSocialPackage(pkg)
        }
        val isDefaultFeedApp = explicitRule == null && Policy.isKnownFeedPackage(pkg)
        val isFeedManagedApp = isDefaultFeedApp || (explicitRule != null && explicitRule.optString("feedMode") != "whole_app")

        if (runtime.socialWebsitesEnabled && Policy.isSocialApp(pkg) && !isFeedManagedApp && !Policy.isSocialAppExempt(pkg, runtime.appRules)) {
            // If already showing for this exact social app, KEEP IT (zero flicker)
            if (overlay != null && activeOverlayType == OverlayType.SOCIAL_APP && currentOverlayPackage == pkg) {
                return
            }
            val appLabel = try {
                packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString()
            } catch (_: Exception) { pkg }
            val details = OverlayDetails(
                eyebrow = "Social protection",
                title = "$appLabel is restricted.",
                badge = appLabel,
                description = "Social media apps and websites are blocked while social protection is active.",
                canRequestOverride = false,
                targetPackage = pkg,
                appLabel = appLabel,
                isSocialApp = true,
            )
            showOverlay(details, OverlayType.SOCIAL_APP)
            return
        } else if (activeOverlayType == OverlayType.SOCIAL_APP) {
            // If overlay is currently SOCIAL_APP, dismiss if this app is no longer blocked (e.g. exempted or social protection disabled), or if switched to another real user app
            if (currentOverlayPackage == pkg || Policy.getCanonicalSocialPackage(currentOverlayPackage) == Policy.getCanonicalSocialPackage(pkg) || isRealUserApp(pkg)) {
                hideOverlay()
            } else {
                return
            }
        }

        // 4. App Rules Check
        // Check if explicitly disabled or feedMode is "off" with no active limits/schedules
        val hasActiveLimits = explicitRule != null && explicitRule.optBoolean("enabled") && (explicitRule.optInt("limitMinutes", 0) > 0 || explicitRule.optInt("startMinute", -1) >= 0 || (explicitRule.optBoolean("burst") && runtime.burstRemaining() > 0))
        val isExplicitlyFeedOff = explicitRule != null && (!explicitRule.optBoolean("enabled") || explicitRule.optString("feedMode") == "off")

        if (isExplicitlyFeedOff && !hasActiveLimits) {
            if (activeOverlayType != OverlayType.NONE && (currentOverlayPackage == pkg || Policy.getCanonicalSocialPackage(currentOverlayPackage) == Policy.getCanonicalSocialPackage(pkg))) {
                hideOverlay()
                resetSession()
            }
            return
        }

        if (explicitRule == null && !isDefaultFeedApp) {
            // Unmanaged app: if overlay was showing for another app and user switched to a real user app, dismiss it
            if (activeOverlayType != OverlayType.NONE && (currentOverlayPackage == pkg || (currentOverlayPackage != pkg && isRealUserApp(pkg)))) {
                hideOverlay()
                resetSession()
            }
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
        val days = explicitRule?.optJSONArray("days")
        val weekdays = if (days != null) (0 until days.length()).map { days.getInt(it) }.toSet() else (1..7).toSet()
        val scheduled = explicitRule != null && explicitRule.optInt("startMinute", -1) >= 0 && Policy.scheduled(now.hour * 60 + now.minute, now.dayOfWeek.value, explicitRule.getInt("startMinute"), explicitRule.getInt("endMinute"), weekdays)
        val appLabel = try { packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString() } catch (_: Exception) { pkg }

        val effectiveFeedMode = when {
            explicitRule != null -> explicitRule.optString("feedMode", "off")
            isDefaultFeedApp -> if (pkg == "com.zhiliaoapp.musically" || pkg == "com.zhiliaoapp.musically.go" || pkg == "com.ss.android.ugc.trill") "whole_app" else "experimental"
            else -> "off"
        }

        val (reasonDetails, reasonType) = when {
            explicitRule != null && explicitRule.optBoolean("burst") && runtime.burstRemaining() > 0 -> Pair(
                OverlayDetails(
                    eyebrow = "Burst intervention",
                    title = "Cooldown active.",
                    description = "Your Burst cooldown is active. Take a breath and step away for a moment.",
                    canRequestOverride = false,
                    targetPackage = pkg,
                    appLabel = appLabel,
                ),
                OverlayType.BURST,
            )
            effectiveFeedMode == "whole_app" -> Pair(
                OverlayDetails(
                    eyebrow = "App restriction",
                    title = "$appLabel is restricted.",
                    description = "You chose to keep this app out of reach.",
                    canRequestOverride = true,
                    targetPackage = pkg,
                    appLabel = appLabel,
                ),
                OverlayType.APP_RESTRICTION,
            )
            scheduled -> Pair(
                OverlayDetails(
                    eyebrow = "Scheduled restriction",
                    title = "$appLabel is resting.",
                    description = "This app is resting during your scheduled window. This restriction is separate from a daily usage limit.",
                    canRequestOverride = true,
                    targetPackage = pkg,
                    appLabel = appLabel,
                ),
                OverlayType.SCHEDULED,
            )
            effectiveFeedMode == "experimental" -> {
                val feedResult = detectShortFormFeed(pkg, root, explicitRule)
                if (feedResult != null && feedResult.blocked) {
                    Pair(
                        OverlayDetails(
                            eyebrow = feedResult.eyebrow,
                            title = feedResult.title,
                            description = feedResult.description,
                            canRequestOverride = false,
                            targetPackage = pkg,
                            appLabel = feedResult.feature?.let { "$appLabel ${it.label}" } ?: appLabel,
                        ),
                        OverlayType.SHORT_FORM_FEED,
                    )
                } else Pair(null, OverlayType.NONE)
            }
            else -> Pair(null, OverlayType.NONE)
        }

        if (reasonDetails != null) {
            showOverlay(reasonDetails, reasonType)
            return
        } else if (activeOverlayType == OverlayType.SHORT_FORM_FEED && currentOverlayPackage == pkg) {
            hideOverlay()
        }

        val limitMinutes = explicitRule?.optInt("limitMinutes") ?: 0
        if (limitMinutes > 0) {
            if (!runtime.hasUsageAccess()) {
                val failureMsg = "Usage Access permission is required to enforce daily limits"
                if (runtime.failure != failureMsg) {
                    runtime.failure = failureMsg
                    runtime.changed?.invoke()
                }
                exhaustedPackages.remove(pkg)
                if (activeOverlayType == OverlayType.DAILY_LIMIT && currentOverlayPackage == pkg) {
                    hideOverlay()
                }
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

            // Synchronous zero-latency pre-blocking
            if (isPackageExhausted(pkg)) {
                showOverlay(limitDetails, OverlayType.DAILY_LIMIT)
            }

            val observed = pkg
            runtime.executor.execute {
                try {
                    val startOfDayMs = today.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
                    val rawUsage = runtime.usage(startOfDayMs, System.currentTimeMillis())[observed] ?: 0L
                    val currentUsageStats = getMonotonicUsage(observed, rawUsage)
                    handler.post {
                        if (!sessionBaselineFetched && sessionPackage == observed) {
                            sessionBaselineUsageMs = currentUsageStats
                            sessionBaselineFetched = true
                        }
                        val sessionElapsedMs = if (sessionStartElapsed > 0L && sessionPackage == observed) {
                            maxOf(0L, SystemClock.elapsedRealtime() - sessionStartElapsed)
                        } else 0L
                        val verdict = Policy.evaluateLimit(
                            limitMinutes = limitMinutes,
                            currentUsageStats = currentUsageStats,
                            baselineUsageStats = sessionBaselineUsageMs,
                            sessionElapsedMs = sessionElapsedMs,
                        )
                        if (verdict.exceeded) {
                            exhaustedPackages.add(observed)
                            if (foreground == observed) {
                                showOverlay(limitDetails, OverlayType.DAILY_LIMIT)
                                handler.removeCallbacks(check)
                                handler.postDelayed(check, 15_000)
                            }
                        } else {
                            exhaustedPackages.remove(observed)
                            // ONLY hide if currently showing for DAILY_LIMIT on this observed package
                            if (foreground == observed && activeOverlayType == OverlayType.DAILY_LIMIT && currentOverlayPackage == observed) {
                                hideOverlay()
                            }
                            val nextDelay = minOf(15_000L, maxOf(1_000L, verdict.remainingMs))
                            handler.removeCallbacks(check)
                            handler.postDelayed(check, nextDelay)
                        }
                    }
                } catch (e: Exception) {
                    android.util.Log.e("Restrainify", "Usage limit evaluation failed", e)
                    runtime.failure = "Usage limits could not be checked: ${e.message}"
                    runtime.changed?.invoke()
                    handler.removeCallbacks(check)
                    handler.postDelayed(check, 15_000)
                }
            }
        } else {
            exhaustedPackages.remove(pkg)
            if (activeOverlayType == OverlayType.DAILY_LIMIT && currentOverlayPackage == pkg) {
                hideOverlay()
            }
            handler.removeCallbacks(check)
            handler.postDelayed(check, 15_000)
        }
    }
    private fun getTargetApplicationRoot(pkg: String): AccessibilityNodeInfo? {
        val activeRoot = rootInActiveWindow
        if (activeRoot != null) {
            val activePkg = activeRoot.packageName?.toString()
            if (activePkg != null && (activePkg == pkg || Policy.getCanonicalSocialPackage(activePkg) == Policy.getCanonicalSocialPackage(pkg))) {
                return activeRoot
            }
        }
        try {
            val appWindows = windows
                .filter { win ->
                    val winPkg = win.root?.packageName?.toString()
                    winPkg != null && (winPkg == pkg || Policy.getCanonicalSocialPackage(winPkg) == Policy.getCanonicalSocialPackage(pkg))
                }
                .sortedByDescending { it.layer }
            return appWindows.firstOrNull()?.root
        } catch (_: Exception) {
            return null
        }
    }
    private fun detectShortFormFeed(
        pkg: String,
        root: AccessibilityNodeInfo?,
        explicitRule: JSONObject?,
    ): Policy.FeedDetectionResult? {
        if (SystemClock.elapsedRealtime() < feedTransitionCooloffUntil) {
            return null
        }
        val canonical = Policy.getCanonicalSocialPackage(pkg)

        if (canonical == "com.instagram.android") {
            val options = explicitRule?.optJSONArray("options")?.let { arr ->
                (0 until arr.length()).map { arr.getString(it) }
            } ?: emptyList()

            val targetRoot = getTargetApplicationRoot(pkg) ?: root ?: return null
            return detectInstagramFeed(pkg, targetRoot, options)
        }
        if (canonical == "com.google.android.youtube") {
            return if (root != null && isYouTubeShorts(root)) {
                Policy.FeedDetectionResult(
                    blocked = true,
                    eyebrow = "YouTube Shorts paused",
                    title = "Shorts restricted.",
                    description = "Short-form video is paused based on your in-app blocking rules. Regular YouTube videos remain accessible.",
                )
            } else null
        }

        // Generic fallback for other supported feed packages
        if (root != null && feedVisible(pkg, root)) {
            return Policy.FeedDetectionResult(
                blocked = true,
                eyebrow = "Short-form paused",
                title = "Feed restricted.",
                description = "You chose to pause short-form feeds.",
            )
        }
        return null
    }

    private fun inspectInstagramTree(root: AccessibilityNodeInfo): Policy.InstagramScreenInspection {
        val screenWidth = try { resources.displayMetrics.widthPixels } catch (_: Exception) { 0 }
        val screenHeight = try { resources.displayMetrics.heightPixels } catch (_: Exception) { 0 }
        val rect = android.graphics.Rect()

        val viewIds = mutableSetOf<String>()
        val descriptions = mutableListOf<String>()
        val textList = mutableListOf<String>()
        var isReelsTabCandidate = false
        var isHomeTabCandidate = false
        var isExploreTabCandidate = false
        var hasHomeActionBar = false
        var hasStoryProgress = false
        var hasStoryHeader = false
        var hasActiveStoryContainer = false
        var hasStoryReplyComposer = false
        var hasStoryViewPrefix = false
        var hasFeedList = false
        var hasDedicatedClipsPager = false
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)
        var count = 0
        val maxNodes = 1200

        while (queue.isNotEmpty() && count < maxNodes) {
            val node = queue.removeFirst()
            count++

            // Always enqueue children regardless of parent's isVisibleToUser!
            // In Android, transparent containers (FrameLayout, CoordinatorLayout) can report isVisibleToUser == false
            // while their children inside are completely visible.
            // Traversing in reverse child order visits frontmost visual overlays/dialogs FIRST.
            for (i in node.childCount - 1 downTo 0) {
                val child = node.getChild(i)
                if (child != null) {
                    queue.add(child)
                }
            }

            // Only record features if the node itself is visible to user
            if (!node.isVisibleToUser) {
                continue
            }

            node.getBoundsInScreen(rect)

            // Reject zero-size or completely off-screen nodes (detached or background views)
            if (rect.width() <= 0 || rect.height() <= 0) {
                continue
            }
            if (screenHeight > 0 && screenWidth > 0) {
                if (rect.bottom <= 0 || rect.top >= screenHeight || rect.right <= 0 || rect.left >= screenWidth) {
                    continue
                }
            }

            val resId = node.viewIdResourceName?.substringAfterLast(":id/") ?: ""
            if (resId.isNotEmpty()) {
                viewIds.add(resId)
            }
            val desc = node.contentDescription?.toString()?.trim() ?: ""
            if (desc.isNotEmpty()) {
                descriptions.add(desc)
            }
            val text = node.text?.toString()?.trim() ?: ""
            if (text.isNotEmpty()) {
                textList.add(text)
            }

            // Home feed action bar check (DM inbox button, wordmark title, activity button)
            // Note: stories_tray is explicitly NOT an action bar!
            if (resId == "action_bar_inbox_button" ||
                resId == "action_bar_textview_custom_title_container" ||
                resId == "action_bar_activity_button" ||
                resId == "action_bar_inbox_icon" ||
                resId == "main_feed_action_bar" ||
                resId == "title_logo" ||
                (screenHeight > 0 && rect.top < screenHeight * 0.25f && (text.equals("instagram", ignoreCase = true) || desc.equals("instagram", ignoreCase = true)))
            ) {
                if (screenHeight <= 0 || rect.top < screenHeight * 0.35f) {
                    hasHomeActionBar = true
                }
            }

            // Home feed recycler list check (post list in main feed)
            if (resId in listOf("feed_recycler_view", "main_feed", "sticky_header_list", "newsfeed_items", "feed_post_header")) {
                hasFeedList = true
            }

            // Story progress bar check (Must be at the top of the screen)
            val isStoryProgressId = resId in listOf(
                "segments_progress_bar",
                "reel_viewer_progress_bar",
                "story_progress_bar",
                "segment_progress_bar",
                "reel_progress_bar",
                "story_item_top_progress_bar_stub",
            )
            if (isStoryProgressId && (screenHeight <= 0 || rect.top < screenHeight * 0.25f)) {
                hasStoryProgress = true
            }

            // Story header check (Header container, title, or username at top)
            val isStoryHeaderId = resId in listOf(
                "reel_viewer_header",
                "reel_viewer_header_container",
                "reel_viewer_title",
                "reel_viewer_title_row",
                "direct_story_viewer_header",
            )
            if (isStoryHeaderId && (screenHeight <= 0 || rect.top < screenHeight * 0.35f)) {
                hasStoryHeader = true
            }

            // Story full-screen container / media view check
            val isStoryContainerId = resId in listOf(
                "reel_viewer_texture_view",
                "reel_viewer_media_container",
                "reel_viewer_media_layout",
                "reel_viewer_root",
                "reel_viewer_content_layout",
                "reel_viewer_animator",
                "story_viewer_container",
                "story_viewer_fragment",
                "story_viewer",
                "viewer_media_view",
                "layout_reel_viewer",
            )
            if (isStoryContainerId && (screenHeight <= 0 || rect.height() > screenHeight * 0.4f)) {
                hasActiveStoryContainer = true
            }

            // Any reel_viewer_ prefix (exclusive to Story Viewer layouts in Instagram)
            if ((resId.startsWith("reel_viewer_") || resId.startsWith("story_viewer_")) && !resId.contains("tray")) {
                hasStoryViewPrefix = true
            }

            // Story reply composer / footer check (Must be at the bottom of the screen)
            val lowerNodeText = text.lowercase()
            val lowerNodeDesc = desc.lowercase()
            val isReplyId = resId in listOf(
                "direct_story_reply_composer",
                "direct_story_reply",
                "reel_viewer_message_composer",
                "story_reply",
                "story_reply_button",
            )
            val isReplyText = lowerNodeText.startsWith("reply to") ||
                lowerNodeDesc.startsWith("reply to") ||
                lowerNodeDesc.contains("reply to story") ||
                lowerNodeText.startsWith("send message") ||
                lowerNodeDesc.startsWith("send message")
            if ((isReplyId || isReplyText) && (screenHeight <= 0 || rect.top >= screenHeight * 0.60f)) {
                hasStoryReplyComposer = true
            }
            // Dedicated full-screen clips viewer layout check
            if (resId in listOf("clips_viewer_view_pager", "clips_viewer_view_pager_v2", "clips_viewer_container", "clips_viewer_root", "clips_swipe_refresh_container")) {
                // Must occupy a substantial portion of the screen to be an active foreground player
                if (screenHeight <= 0 || rect.height() > screenHeight * 0.4f) {
                    hasDedicatedClipsPager = true
                }
            }

            // Bottom Navigation Bar tabs check
            if (screenHeight > 0) {
                val isBottomArea = rect.bottom > 0 && rect.top >= screenHeight * 0.70f
                if (isBottomArea) {
                    val lowerDesc = desc.lowercase()
                    val lowerText = text.lowercase()
                    val isChildSelected = (0 until node.childCount).any { node.getChild(it)?.isSelected == true }
                    val isSelected = node.isSelected ||
                        isChildSelected ||
                        lowerDesc.contains("selected") ||
                        lowerDesc.contains("current") ||
                        lowerDesc.contains("active")

                    val isLeftTab = screenWidth > 0 && rect.left >= 0 && rect.left < screenWidth * 0.28f

                    if (lowerDesc == "home" || lowerDesc.contains("home,") || lowerText == "home" ||
                        resId == "feed_tab" || resId.contains("feed_tab") || resId.contains("home_tab") || (isLeftTab && isSelected)) {
                        if (isSelected) isHomeTabCandidate = true
                    } else if (lowerDesc == "reels" || lowerDesc.contains("reels,") || lowerText == "reels" || lowerDesc.contains("clips") || resId == "clips_tab" || resId.contains("clips_tab")) {
                        if (isSelected) isReelsTabCandidate = true
                    } else if (lowerDesc.contains("explore") || lowerDesc.contains("search") || lowerText.contains("explore") || resId == "search_tab" || resId.contains("search_tab")) {
                        if (isSelected) isExploreTabCandidate = true
                    }
                }
            }

            // Children already enqueued at start of loop in reverse order
        }
        // Active Story viewer determination:
        // Confirmed when top progress bar, story header, or reel_viewer/story_viewer prefix is present
        val hasActiveStoryViewer = hasStoryProgress ||
            hasStoryHeader ||
            hasStoryViewPrefix ||
            hasActiveStoryContainer ||
            (hasStoryReplyComposer && hasActiveStoryContainer)
        // Post-traversal resolution: Accurate tab resolution based on bottom navigation bar
        val isReelsTabSelected = isReelsTabCandidate && !isHomeTabCandidate
        val isHomeTabSelected = isHomeTabCandidate && !isReelsTabCandidate
        val isExploreTabSelected = isExploreTabCandidate && !isHomeTabSelected && !isReelsTabSelected
        return Policy.inspectInstagramScreen(
            viewIds = viewIds,
            descriptions = descriptions,
            textList = textList,
            isReelsTabSelected = isReelsTabSelected,
            isHomeTabSelected = isHomeTabSelected,
            isExploreTabSelected = isExploreTabSelected,
            hasHomeActionBar = hasHomeActionBar,
            hasStoryProgress = hasStoryProgress,
            hasFeedList = hasFeedList,
            hasDedicatedClipsPager = hasDedicatedClipsPager,
            hasActiveStoryViewer = hasActiveStoryViewer,
        )
    }

    private fun detectInstagramFeed(
        pkg: String,
        root: AccessibilityNodeInfo,
        options: List<String>,
    ): Policy.FeedDetectionResult? {
        val inspection = inspectInstagramTree(root)

        // 1. Direct Messages are always allowed
        if (inspection.isDmScreen) {
            return null
        }

        // 2. Stories Detection
        val storiesBlocked = Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.STORIES, options)
        if (storiesBlocked && inspection.isStoriesScreen) {
            return Policy.FeedDetectionResult(
                blocked = true,
                feature = Policy.InstagramFeature.STORIES,
                eyebrow = "Instagram Stories blocked",
                title = "Stories restricted.",
                description = "Instagram Stories are paused based on your in-app blocking rules. Direct messages and posts remain available.",
            )
        }

        // 3. Reels Detection (Reels tab or full-screen Reels viewer)
        val reelsBlocked = Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.REELS, options)
        if (reelsBlocked && inspection.isReelsScreen) {
            return Policy.FeedDetectionResult(
                blocked = true,
                feature = Policy.InstagramFeature.REELS,
                eyebrow = "Instagram Reels blocked",
                title = "Reels restricted.",
                description = "Short-form video reels are paused based on your in-app blocking rules. Enjoy normal Instagram posts, stories, and messages without the addictive reel trap.",
            )
        }

        // 4. Explore Tab Detection
        val exploreBlocked = Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.EXPLORE, options)
        if (exploreBlocked && inspection.isExploreScreen) {
            return Policy.FeedDetectionResult(
                blocked = true,
                feature = Policy.InstagramFeature.EXPLORE,
                eyebrow = "Instagram Explore blocked",
                title = "Explore tab restricted.",
                description = "Explore feed is paused based on your in-app blocking rules.",
            )
        }

        return null
    }

    private fun isYouTubeShorts(root: AccessibilityNodeInfo): Boolean {
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)
        var count = 0
        while (queue.isNotEmpty() && count < 300) {
            val node = queue.removeFirst()
            count++
            val resId = node.viewIdResourceName?.substringAfterLast(":id/") ?: ""
            val desc = node.contentDescription?.toString()?.lowercase() ?: ""
            val text = node.text?.toString()?.lowercase() ?: ""

            if (resId in listOf("reel_recycler", "reel_watch_player", "shorts_player_fragment", "reel_player_page_holder", "reel_player_view")) {
                return true
            }
            if (desc.contains("sound used in this short") || desc.contains("remix this short") || desc.contains("dislike this short")) {
                return true
            }
            if (desc == "shorts" && (node.isSelected || desc.contains("selected"))) {
                return true
            }
            for (i in 0 until node.childCount) {
                node.getChild(i)?.let { queue.add(it) }
            }
        }
        return false
    }

    private fun feedVisible(pkg: String, root: AccessibilityNodeInfo?): Boolean {
        if (root == null) return false
        val canonical = Policy.getCanonicalSocialPackage(pkg)
        val selectors = when (canonical) {
            "com.google.android.youtube" -> listOf("reel_recycler", "reel_watch_player", "shorts_player_fragment", "reel_player_page_holder")
            "com.instagram.android" -> listOf("clips_viewer_view_pager", "clips_viewer_view_pager_v2", "clips_viewer_container", "clips_viewer_root", "clips_swipe_refresh_container")
            else -> emptyList()
        }
        return selectors.any { id ->
            try {
                val nodes = root.findAccessibilityNodeInfosByViewId("$pkg:id/$id")
                if (activeOverlayType == OverlayType.SHORT_FORM_FEED && currentOverlayPackage == pkg) {
                    nodes.isNotEmpty()
                } else {
                    nodes.any { it.isVisibleToUser }
                }
            } catch (_: Exception) { false }
        }
    }

    fun navigateToInstagramHome(): Boolean {
        hideOverlay()
        feedTransitionCooloffUntil = SystemClock.elapsedRealtime() + 1000L
        val root = rootInActiveWindow ?: return performGlobalAction(GLOBAL_ACTION_BACK)
        val homeNode = findHomeTabNode(root)
        if (homeNode != null) {
            val clicked = homeNode.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            if (clicked) return true
        }
        return performGlobalAction(GLOBAL_ACTION_BACK)
    }

    private fun findHomeTabNode(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val screenWidth = try { resources.displayMetrics.widthPixels } catch (_: Exception) { 0 }
        val screenHeight = try { resources.displayMetrics.heightPixels } catch (_: Exception) { 0 }
        val rect = android.graphics.Rect()
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)
        var count = 0
        var firstBottomTab: AccessibilityNodeInfo? = null

        while (queue.isNotEmpty() && count < 300) {
            val node = queue.removeFirst()
            count++
            val desc = node.contentDescription?.toString()?.lowercase() ?: ""
            val text = node.text?.toString()?.lowercase() ?: ""
            val resId = node.viewIdResourceName?.substringAfterLast(":id/")?.lowercase() ?: ""

            if (screenHeight > 0) {
                node.getBoundsInScreen(rect)
                val isBottomArea = rect.bottom > 0 && rect.top >= screenHeight * 0.70f
                if (isBottomArea) {
                    // In Instagram / YouTube / social apps, the leftmost bottom tab (left < width * 0.28) is Home
                    if (screenWidth > 0 && rect.left >= 0 && rect.left < screenWidth * 0.28f && rect.width() > 0 && rect.height() > 0) {
                        if (firstBottomTab == null) {
                            var clickable: AccessibilityNodeInfo? = node
                            while (clickable != null && !clickable.isClickable) {
                                clickable = clickable.parent
                            }
                            firstBottomTab = clickable ?: node
                        }
                    }

                    if (desc.contains("home") || text.contains("home") || desc.contains("feed") ||
                        resId.contains("feed_tab") || resId.contains("home_tab") || resId == "feed" ||
                        desc.contains("tab 1") || desc.contains("1 of ")
                    ) {
                        var clickable: AccessibilityNodeInfo? = node
                        while (clickable != null && !clickable.isClickable) {
                            clickable = clickable.parent
                        }
                        return clickable ?: node
                    }
                }
            } else {
                if (desc.contains("home") || text.contains("home") || desc.contains("feed") ||
                    resId.contains("feed_tab") || resId.contains("home_tab") || resId == "feed"
                ) {
                    var clickable: AccessibilityNodeInfo? = node
                    while (clickable != null && !clickable.isClickable) {
                        clickable = clickable.parent
                    }
                    return clickable ?: node
                }
            }
            for (i in 0 until node.childCount) {
                node.getChild(i)?.let { queue.add(it) }
            }
        }
        return firstBottomTab
    }
    private fun findBrowserUrl(root: AccessibilityNodeInfo?, pkg: String): String? {
        if (root == null) return null
        val directIds = listOf(
            "com.android.chrome:id/url_bar",
            "com.android.chrome:id/search_box_text",
            "com.sec.android.app.sbrowser:id/location_bar_edit_text",
            "org.mozilla.firefox:id/mozac_browser_toolbar_url_view",
            "org.mozilla.firefox:id/url_bar_title",
            "com.microsoft.emmx:id/url_bar",
            "com.brave.browser:id/url_bar",
            "com.opera.browser:id/url_field",
            "com.opera.mini.native:id/url_field",
            "com.duckduckgo.mobile.android:id/omnibarTextInput",
            "$pkg:id/url_bar",
            "$pkg:id/location_bar",
            "$pkg:id/address_bar",
            "$pkg:id/search_box",
        )
        for (id in directIds) {
            try {
                val nodes = root.findAccessibilityNodeInfosByViewId(id)
                for (node in nodes) {
                    val text = node.text?.toString() ?: node.contentDescription?.toString()
                    if (!text.isNullOrBlank()) return text
                }
            } catch (_: Exception) {}
        }
        return findUrlInNode(root, 0)
    }

    private fun findUrlInNode(node: AccessibilityNodeInfo?, depth: Int): String? {
        if (node == null || depth > 6) return null
        val resId = node.viewIdResourceName?.lowercase() ?: ""
        if (resId.contains("url") || resId.contains("location") || resId.contains("address") || resId.contains("omnibar")) {
            val text = node.text?.toString() ?: node.contentDescription?.toString()
            if (!text.isNullOrBlank() && !text.contains(" ") && text.contains(".")) {
                return text
            }
        }
        val count = minOf(node.childCount, 20)
        for (i in 0 until count) {
            val child = node.getChild(i) ?: continue
            val found = findUrlInNode(child, depth + 1)
            if (found != null) return found
        }
        return null
    }

    data class OverlayDetails(
        val eyebrow: String,
        val title: String,
        val badge: String? = null,
        val description: String,
        val canRequestOverride: Boolean = false,
        val targetPackage: String = "",
        val appLabel: String = "",
        val isWebBlock: Boolean = false,
        val isSocialApp: Boolean = false,
    )

    private fun showOverlay(details: OverlayDetails, type: OverlayType = OverlayType.APP_RESTRICTION) {
        // Anti-flicker idempotency: If exact same overlay is already displayed, DO NOT re-render or re-add
        if (overlay != null && activeOverlayType == type && details.targetPackage == currentOverlayPackage) {
            if (!details.isWebBlock || details.badge == currentOverlayHost) {
                return
            }
        }

        if (overlay != null) {
            hideOverlay()
        }
        val density = resources.displayMetrics.density
        val dip = { dp: Int -> (dp * density).toInt() }

        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dip(24), dip(24), dip(24), dip(24))
            setBackgroundColor(Color.argb(238, 10, 15, 29))
            isClickable = true
            addView(LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setPadding(dip(24), dip(28), dip(24), dip(24))
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(Color.rgb(20, 31, 51))
                    cornerRadius = 24f * density
                    setStroke(dip(1), Color.rgb(38, 56, 89))
                }

                // 1. App icon (StayFree style)
                val appIcon = try {
                    if (details.targetPackage.isNotEmpty()) {
                        packageManager.getApplicationIcon(details.targetPackage)
                    } else null
                } catch (_: Exception) { null }

                if (appIcon != null) {
                    addView(ImageView(context).apply {
                        setImageDrawable(appIcon)
                        layoutParams = LinearLayout.LayoutParams(dip(54), dip(54)).apply {
                            bottomMargin = dip(16)
                            gravity = Gravity.CENTER_HORIZONTAL
                        }
                    })
                }

                // 2. Eyebrow
                addView(TextView(context).apply {
                    text = details.eyebrow.uppercase()
                    textSize = 12f
                    typeface = android.graphics.Typeface.DEFAULT_BOLD
                    setTextColor(Color.rgb(112, 161, 255))
                    gravity = Gravity.CENTER
                    letterSpacing = 0.08f
                })

                // 3. Title
                addView(TextView(context).apply {
                    text = details.title
                    textSize = 22f
                    typeface = android.graphics.Typeface.DEFAULT_BOLD
                    setTextColor(Color.WHITE)
                    gravity = Gravity.CENTER
                    setPadding(0, dip(8), 0, dip(6))
                })

                // 4. Badge (e.g. limit or hostname)
                if (!details.badge.isNullOrEmpty() && !details.isSocialApp) {
                    addView(TextView(context).apply {
                        text = details.badge
                        textSize = 24f
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

                // 5. Description
                addView(TextView(context).apply {
                    text = details.description
                    textSize = 14f
                    setTextColor(Color.rgb(183, 195, 214))
                    gravity = Gravity.CENTER
                    setPadding(0, dip(10), 0, dip(20))
                    setLineSpacing(4f * density, 1f)
                })

                // 6. Action buttons
                if (details.isWebBlock) {
                    addView(Button(context).apply {
                        text = "Go back"
                        textSize = 14f
                        typeface = android.graphics.Typeface.DEFAULT_BOLD
                        setTextColor(Color.WHITE)
                        background = android.graphics.drawable.GradientDrawable().apply {
                            setColor(Color.rgb(37, 99, 235))
                            cornerRadius = 12f * density
                        }
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            dip(46),
                        ).apply { bottomMargin = dip(10) }
                        setOnClickListener {
                            performGlobalAction(GLOBAL_ACTION_BACK)
                            hideOverlay()
                        }
                    })

                    addView(Button(context).apply {
                        text = "Return to Home"
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
                } else if (type == OverlayType.SHORT_FORM_FEED) {
                    addView(Button(context).apply {
                        text = "Return to Home Feed"
                        textSize = 15f
                        typeface = android.graphics.Typeface.DEFAULT_BOLD
                        setTextColor(Color.WHITE)
                        background = android.graphics.drawable.GradientDrawable().apply {
                            setColor(Color.rgb(37, 99, 235)) // Brand Primary button
                            cornerRadius = 12f * density
                        }
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            dip(48),
                        ).apply { bottomMargin = dip(10) }
                        setOnClickListener {
                            hideOverlay()
                            navigateToInstagramHome()
                        }
                    })

                    addView(Button(context).apply {
                        text = "Step away"
                        textSize = 14f
                        typeface = android.graphics.Typeface.DEFAULT_BOLD
                        setTextColor(Color.rgb(147, 197, 253))
                        background = android.graphics.drawable.GradientDrawable().apply {
                            setColor(Color.TRANSPARENT)
                        }
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            dip(42),
                        ).apply { bottomMargin = dip(6) }
                        setOnClickListener {
                            feedTransitionCooloffUntil = SystemClock.elapsedRealtime() + 1500L
                            hideOverlay()
                            performGlobalAction(GLOBAL_ACTION_BACK)
                        }
                    })
                    addView(Button(context).apply {
                        text = "Close App"
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
                            hideOverlay()
                            performGlobalAction(GLOBAL_ACTION_HOME)
                        }
                    })
                } else {
                    addView(Button(context).apply {
                        text = "Close App"
                        textSize = 15f
                        typeface = android.graphics.Typeface.DEFAULT_BOLD
                        setTextColor(Color.WHITE)
                        background = android.graphics.drawable.GradientDrawable().apply {
                            setColor(Color.rgb(37, 99, 235)) // Brand Primary button
                            cornerRadius = 12f * density
                        }
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            dip(48),
                        ).apply { bottomMargin = dip(10) }
                        setOnClickListener {
                            performGlobalAction(GLOBAL_ACTION_HOME)
                            hideOverlay()
                        }
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
                }

                addView(TextView(context).apply {
                    text = if (details.canRequestOverride) "Overrides require a cooling delay when Strict Mode is configured." else "Restrainify On-Device Protection"
                    textSize = 11f
                    setTextColor(Color.rgb(100, 116, 139))
                    gravity = Gravity.CENTER
                    setPadding(0, dip(10), 0, 0)
                })
            })
        }
        rootLayout.isFocusable = true
        rootLayout.isFocusableInTouchMode = true
        rootLayout.setOnKeyListener { _, keyCode, event ->
            if (keyCode == KeyEvent.KEYCODE_BACK && event.action == KeyEvent.ACTION_UP) {
                if (type == OverlayType.SHORT_FORM_FEED) {
                    navigateToInstagramHome()
                } else {
                    performGlobalAction(GLOBAL_ACTION_BACK)
                    hideOverlay()
                }
                true
            } else {
                false
            }
        }
        try {
            val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                PixelFormat.TRANSLUCENT,
            ).apply {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                    layoutInDisplayCutoutMode =
                        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
                }
            }
            wm.addView(rootLayout, params)
            overlay = rootLayout
            activeOverlayType = type
            currentOverlayPackage = details.targetPackage
            currentOverlayHost = if (details.isWebBlock) details.badge else null
            isWebBlockActive = details.isWebBlock
            val blockKey = details.badge ?: details.appLabel
            runtime.recordBlock(if (blockKey.isNotEmpty()) blockKey else null)
        } catch (e: Exception) {
            android.util.Log.e("Restrainify", "Failed to display overlay", e)
            overlay = null
            runtime.failure = "The restriction screen could not be displayed: ${e.message}"
            runtime.changed?.invoke()
        }
    }
    private fun hideOverlay() {
        val current = overlay
        if (current != null) {
            try {
                val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
                wm.removeViewImmediate(current)
            } catch (_: Exception) {
                try {
                    val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
                    wm.removeView(current)
                } catch (_: Exception) {}
            }
        }
        overlay = null
        activeOverlayType = OverlayType.NONE
        currentOverlayPackage = null
        currentOverlayHost = null
        isWebBlockActive = false
    }
    override fun onInterrupt() { ProtectionForegroundService.stop(this); handler.removeCallbacks(check); hideOverlay(); resetSession(); if (::runtime.isInitialized) { runtime.accessibilityActive = false; runtime.changed?.invoke() } }
    override fun onDestroy() { ProtectionForegroundService.stop(this); onInterrupt(); instance = null; if (::runtime.isInitialized) unregisterReceiver(screenReceiver); super.onDestroy() }
    companion object { var instance: RestrictionService? = null; private set }
}
