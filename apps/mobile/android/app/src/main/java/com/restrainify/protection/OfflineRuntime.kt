package com.restrainify.protection

import android.accessibilityservice.AccessibilityServiceInfo
import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.os.Process
import android.os.SystemClock
import android.provider.Settings
import android.text.TextUtils
import android.view.accessibility.AccessibilityManager
import com.restrainify.protection.storage.*
import com.restrainify.protection.service.RestrictionService
import com.restrainify.protection.webfilter.DnsVpnService
import org.json.JSONArray
import com.restrainify.protection.admin.DeviceAdminManager
import org.json.JSONObject
import java.time.*
import java.util.UUID
import java.util.concurrent.Executors

/** All persisted product mutations share this executor and a Room transaction. */
class OfflineRuntime private constructor(val context: Context) {
    val executor = Executors.newSingleThreadExecutor()
    private val db by lazy { ProtectionDatabase.open(context) }
    private val dao get() = db.records()
    @Volatile var configuration = defaults()
        private set
    @Volatile var ready = false
    @Volatile var failure: String? = null
    @Volatile var vpnActive = false
    @Volatile var vpnError: String? = null
    @Volatile var accessibilityActive = false
    @Volatile var changed: (() -> Unit)? = null
    @Volatile var domainRules: List<Policy.DomainRule> = emptyList()
        private set
    @Volatile var appRules: List<Policy.AppRule> = emptyList()
        private set
    @Volatile var safeSearchEnabled: Boolean = true
        private set
    @Volatile var proxyResistanceEnabled: Boolean = true
        private set
    @Volatile var socialWebsitesEnabled: Boolean = false
        private set
    val orchestrator by lazy { ProtectionOrchestrator(this) }
    private val recentBlocks = java.util.concurrent.ConcurrentHashMap<String, Long>()

    init { executor.execute { try { load() } catch (_: Exception) { failure = "Encrypted storage could not be opened. Your data has not been reset." } } }
    private fun defaults() = JSONObject().put("onboardingComplete", false).put("theme", "system")
        .put("recoveryEnabled", true).put("trackerEnabled", false).put("websiteEnabled", false)
        .put("accessibilityConsent", false).put("visualAiEnabled", false).put("visualAiBlockingEnabled", false).put("allowShowReel", false).put("shortFormBlockingEnabled", true).put("dnsMode", "vpn").put("burstMinutes", 0).put("strictMinutes", 0)
        .put("recoveryStart", LocalDate.now().toString()).put("domains", JSONArray()).put("rules", JSONArray()).put("goals", JSONArray())
        .put("safeSearch", true).put("proxyResistance", true).put("socialWebsites", false)
        .put("burstUninstallProtection", true)
    private fun load() {
<<<<<<< HEAD
        val stored = dao.configuration()?.let { JSONObject(it.payload) }
        val merged = defaults()
        stored?.keys()?.forEach { key -> merged.put(key, stored.get(key)) }
        // Migrate both main's DNS settings and Visual AI settings without
        // discarding any existing encrypted local configuration.
        if (stored == null || stored.toString() != merged.toString()) dao.configuration(Configuration(payload = merged.toString()))
        configuration = merged
=======
        configuration = dao.configuration()?.let { stored ->
            val json = JSONObject(stored.payload)
            if (!json.has("safeSearch")) json.put("safeSearch", true)
            if (!json.has("proxyResistance")) json.put("proxyResistance", true)
            if (!json.has("socialWebsites")) json.put("socialWebsites", false)
            if (!json.has("burstUninstallProtection")) json.put("burstUninstallProtection", true)
            json
        } ?: defaults().also { dao.configuration(Configuration(payload = it.toString())) }
        DeviceAdminManager.ensureRevokedIfExpired(context)
>>>>>>> 073808811f51e1e5e983234f0feef4df8411714c
        val domains = configuration.optJSONArray("domains")
        domainRules = if (domains == null) emptyList() else {
            (0 until domains.length()).map {
                val obj = domains.getJSONObject(it)
                Policy.DomainRule(
                    host = obj.getString("host"),
                    allow = obj.optBoolean("allow"),
                    enabled = obj.optBoolean("enabled", true),
                )
            }
        }
        val rules = configuration.optJSONArray("rules")
        appRules = if (rules == null) emptyList() else {
            (0 until rules.length()).mapNotNull {
                val obj = rules.optJSONObject(it) ?: return@mapNotNull null
                val daysArray = obj.optJSONArray("days")
                val daysList = if (daysArray != null) (0 until daysArray.length()).map { d -> daysArray.getInt(d) } else emptyList()
                val optsArray = obj.optJSONArray("options")
                val optionsList = if (optsArray != null) (0 until optsArray.length()).map { o -> optsArray.getString(o) } else emptyList()
                Policy.AppRule(
                    packageName = obj.getString("packageName"),
                    enabled = obj.optBoolean("enabled", true),
                    limitMinutes = obj.optInt("limitMinutes", 0),
                    startMinute = obj.optInt("startMinute", -1),
                    endMinute = obj.optInt("endMinute", -1),
                    days = daysList,
                    feedMode = obj.optString("feedMode", "off"),
                    burst = obj.optBoolean("burst", true),
                    options = optionsList,
                )
            }
        }
        safeSearchEnabled = configuration.optBoolean("safeSearch", true)
        proxyResistanceEnabled = configuration.optBoolean("proxyResistance", true)
        socialWebsitesEnabled = configuration.optBoolean("socialWebsites", false)
        ready = true
    }
    fun hasUsageAccess(): Boolean {
        val ops = context.getSystemService(AppOpsManager::class.java)
        return ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName) == AppOpsManager.MODE_ALLOWED
    }
    fun hasAccessibilityAccess(): Boolean {
        try {
            val am = context.getSystemService(AccessibilityManager::class.java)
            val services = am?.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
            if (services != null) {
                for (service in services) {
                    val serviceInfo = service.resolveInfo?.serviceInfo
                    if (serviceInfo != null && serviceInfo.packageName == context.packageName) {
                        return true
                    }
                }
            }
        } catch (_: Exception) {}

        try {
            val enabledServices = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            )
            if (!enabledServices.isNullOrEmpty()) {
                val colonSplitter = TextUtils.SimpleStringSplitter(':')
                colonSplitter.setString(enabledServices)
                val expectedFull = ComponentName(context, RestrictionService::class.java).flattenToString()
                val expectedShort = ComponentName(context, RestrictionService::class.java).flattenToShortString()
                while (colonSplitter.hasNext()) {
                    val componentName = colonSplitter.next()
                    if (componentName.equals(expectedFull, ignoreCase = true) ||
                        componentName.equals(expectedShort, ignoreCase = true) ||
                        (componentName.startsWith(context.packageName + "/", ignoreCase = true) &&
                         componentName.contains("RestrictionService", ignoreCase = true))) {
                        return true
                    }
                }
            }
        } catch (_: Exception) {}

        return accessibilityActive
    }
    fun burstRemaining(): Long = remaining("burst")
    fun strictRemaining(): Long = remaining("strict")
    private fun remaining(prefix: String): Long {
        val c = configuration
        if (c.optLong("${prefix}Until") == 0L) return 0
        val boot = Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1)
        return if (boot == c.optInt("${prefix}Boot", -2)) maxOf(0, c.optLong("${prefix}Elapsed") - SystemClock.elapsedRealtime())
        else maxOf(0, c.optLong("${prefix}Until") - System.currentTimeMillis())
    }
    private fun deadline(c: JSONObject, prefix: String, minutes: Int) {
        c.put("${prefix}Until", System.currentTimeMillis() + minutes * 60_000L)
            .put("${prefix}Elapsed", SystemClock.elapsedRealtime() + minutes * 60_000L)
            .put("${prefix}Boot", Settings.Global.getInt(context.contentResolver, Settings.Global.BOOT_COUNT, -1))
    }
    fun assertCanWeaken() { require(burstRemaining() == 0L && strictRemaining() == 0L) { "Protection is locked until the active cooldown ends." } }

    fun command(action: String, input: JSONObject): JSONObject {
        check(ready) { failure ?: "Storage is still opening" }
        val next = JSONObject(configuration.toString())
        db.runInTransaction {
            when (action) {
                "onboard" -> next.put("onboardingComplete", true)
                "setting" -> {
                    val key = input.getString("key")
                    when (key) {
                        "theme" -> { val value = input.getString("value"); require(value in listOf("system", "light", "dark")); next.put(key, value) }
<<<<<<< HEAD
                        "websiteEnabled", "recoveryEnabled", "trackerEnabled", "accessibilityConsent", "visualAiEnabled", "visualAiBlockingEnabled", "allowShowReel", "shortFormBlockingEnabled", "safeSearch", "proxyResistance", "socialWebsites" -> {
=======
                        "websiteEnabled", "recoveryEnabled", "trackerEnabled", "accessibilityConsent", "safeSearch", "proxyResistance", "socialWebsites", "burstUninstallProtection" -> {
>>>>>>> 073808811f51e1e5e983234f0feef4df8411714c
                            val value = input.getBoolean("value")
                            if (!value) assertCanWeaken()
                            next.put(key, value)
                        }
                        "burstMinutes", "strictMinutes" -> { assertCanWeaken(); val value = input.getInt("value"); require(value in 1..1440) { "Choose between 1 and 1440 minutes" }; next.put(key, value) }
                        "dnsMode" -> { assertCanWeaken(); val value = input.getString("value"); require(value in listOf("vpn", "private")); next.put(key, value) }
                        "recoveryStart" -> {
                            val date = LocalDate.parse(input.getString("value")); require(!date.isAfter(LocalDate.now())) { "Start date cannot be in the future" }
                            require(dao.eventsOfKind("relapse").isEmpty()) { "The baseline cannot change after a relapse has been recorded" }
                            next.put(key, date.toString())
                        }
                        "goals" -> {
                            val arr = input.getJSONArray("value")
                            val allowed = listOf("websites", "visual", "feeds", "apps")
                            for (i in 0 until arr.length()) require(arr.getString(i) in allowed) { "Unknown goal" }
                            next.put(key, arr)
                        }
                        else -> throw IllegalArgumentException("Unknown setting")
                    }
                }
                "domain" -> {
                    assertCanWeaken()
                    val host = Policy.domain(input.getString("domain"))
                    val domains = next.getJSONArray("domains")
                    val updated = JSONArray()
                    for (i in 0 until domains.length()) if (domains.getJSONObject(i).getString("host") != host) updated.put(domains.getJSONObject(i))
                    if (!input.optBoolean("remove")) {
                        require(updated.length() < 5000) { "Maximum 5000 custom domains" }
                        updated.put(JSONObject().put("host", host).put("allow", input.optBoolean("allow")).put("enabled", input.optBoolean("enabled", true)))
                    }
                    next.put("domains", updated)
                }
                "rule" -> {
                    assertCanWeaken()
                    val pkg = input.getString("packageName")
                    require(pkg != context.packageName && pkg.matches(Regex("[A-Za-z0-9_]+(\\.[A-Za-z0-9_]+)+"))) { "Invalid application" }
                    val isRemove = input.optBoolean("remove")
                    val minutes = input.optInt("limitMinutes")
                    val start = input.optInt("startMinute", -1)
                    val end = input.optInt("endMinute", -1)
                    val days = input.optJSONArray("days") ?: JSONArray(listOf(1,2,3,4,5,6,7))
                    val mode = input.optString("feedMode", "off")
                    if (!isRemove) {
                        try {
                            context.packageManager.getApplicationInfo(pkg, 0)
                        } catch (_: Exception) {
                            if (!Policy.isSocialApp(pkg) && !Policy.isKnownFeedPackage(pkg)) {
                                throw IllegalArgumentException("Application not installed: $pkg")
                            }
                        }
                        require(minutes in 0..1440 && ((start == -1 && end == -1) || (start in 0..1439 && end in 0..1439 && start != end))) { "Check the limit and schedule" }
                        require((0 until days.length()).all { days.getInt(it) in 1..7 })
                        require(mode in listOf("off", "experimental", "whole_app"))
                    }
                    val rules = next.getJSONArray("rules"); val updated = JSONArray()
                    for (i in 0 until rules.length()) if (rules.getJSONObject(i).getString("packageName") != pkg) updated.put(rules.getJSONObject(i))
                    if (!isRemove) {
                        val subOptions = input.optJSONArray("options") ?: input.optJSONArray("blockedFeatures")
                        val ruleObj = JSONObject()
                            .put("packageName", pkg)
                            .put("enabled", input.optBoolean("enabled", true))
                            .put("limitMinutes", minutes)
                            .put("startMinute", start)
                            .put("endMinute", end)
                            .put("days", days)
                            .put("feedMode", mode)
                            .put("burst", input.optBoolean("burst", true))
                        if (subOptions != null) {
                            ruleObj.put("options", subOptions)
                        }
                        updated.put(ruleObj)
                    }
                    next.put("rules", updated)
                }
                "reward" -> {
                    val day = LocalDate.now().toString()
                    require(dao.days().none { it.reward && it.day >= day }) { "Today's reward has already been claimed, or the clock moved back." }
                    dao.day((dao.day(day) ?: DailyRecord(day)).copy(reward = true))
                }
                "reward_remote" -> {
                    val day = input.getString("day")
                    dao.day((dao.day(day) ?: DailyRecord(day)).copy(reward = true))
                }
                "event" -> {
                    val kind = input.getString("kind")
                    require(kind in listOf("relapse", "urge", "tracker"))
                    require(if (kind == "tracker") next.optBoolean("trackerEnabled") else next.optBoolean("recoveryEnabled")) { "Enable this tracker before recording an event" }
                    val note = input.optString("note").trim(); require(note.length <= 500) { "Keep notes under 500 characters" }
                    val timestamp = input.optLong("timestamp", System.currentTimeMillis())
                    require(timestamp in 0..System.currentTimeMillis()) { "Choose a date in the past" }
                    val day = Instant.ofEpochMilli(timestamp).atZone(ZoneId.systemDefault()).toLocalDate()
                    require(!day.isBefore(LocalDate.parse(next.getString("recoveryStart")))) { "Event date is before your recovery baseline" }
                    dao.event(LocalEvent(UUID.randomUUID().toString(), kind, timestamp, day.toString(), note, input.optBoolean("resisted")))
                }
                "event_remote" -> {
                    val id = input.getString("id")
                    val kind = input.getString("kind")
                    require(kind in listOf("relapse", "urge", "tracker", "burst")) { "Invalid event kind" }
                    val timestamp = input.optLong("timestamp", System.currentTimeMillis())
                    val day = input.optString("day", LocalDate.now().toString())
                    val note = input.optString("note", "").trim()
                    val resisted = input.optBoolean("resisted", false)
                    dao.event(LocalEvent(id, kind, timestamp, day, note, resisted))
                }
                "burst" -> {
                    require(burstRemaining() == 0L) { "Burst is already active" }
                    val minutes = next.optInt("burstMinutes"); require(minutes in 1..1440) { "Choose your Burst duration first" }
                    require((hasAccessibilityAccess() || accessibilityActive) && next.optBoolean("accessibilityConsent")) { "Enable app restriction access before starting Burst" }
                    val rules = next.getJSONArray("rules")
                    require((0 until rules.length()).any { rules.getJSONObject(it).optBoolean("enabled") && rules.getJSONObject(it).optBoolean("burst") }) { "Select at least one Burst app first" }
                    val id = UUID.randomUUID().toString()
                    deadline(next, "burst", minutes); next.put("burstId", id)
                    dao.event(LocalEvent(id, "burst", System.currentTimeMillis(), LocalDate.now().toString(), ""))
                    if (next.optBoolean("burstUninstallProtection", true) && DeviceAdminManager.isAdminActive(context)) {
                        val expirationTime = System.currentTimeMillis() + minutes * 60_000L
                        DeviceAdminManager.scheduleAutoRevocation(context, expirationTime)
                    }
                }
                "resist" -> {
                    require(dao.resist(input.getString("id")) > 0) { "This intervention could not be found" }
                    if (burstRemaining() == 0L) {
                        DeviceAdminManager.ensureRevokedIfExpired(context)
                    }
                }
                "strict" -> { require(strictRemaining() == 0L); val minutes = next.optInt("strictMinutes"); require(minutes in 1..1440) { "Choose a lock duration first" }; deadline(next, "strict", minutes) }
                "reset" -> { assertCanWeaken(); require(input.optBoolean("confirmed")); dao.clearEvents(); dao.clearDays(); dao.clearConfiguration(); recentBlocks.clear() }
                else -> throw IllegalArgumentException("Unsupported action")
            }
            dao.configuration(Configuration(payload = (if (action == "reset") defaults() else next).toString()))
        }
        load()
        if (!configuration.optBoolean("websiteEnabled") || configuration.optString("dnsMode") != "vpn") DnsVpnService.stop(context)
        RestrictionService.instance?.refreshExhaustedPackages()
        RestrictionService.instance?.reevaluate()
        RestrictionService.instance?.reevaluateVisualAi()
        changed?.invoke()
        return snapshot()
    }

<<<<<<< HEAD
    fun recordBlock() { executor.execute {
        try { val day = LocalDate.now().toString(); db.runInTransaction { dao.day((dao.day(day) ?: DailyRecord(day)).let { it.copy(blocked = it.blocked + 1) }) } }
        catch (_: Exception) { failure = "Protection counters could not be saved" }
    } }
    @Volatile var visualAiDiagnostics = JSONObject().put("modelReady", false).put("inferenceCount", 0).put("skippedFrames", 0).put("duplicateFrames", 0).put("failure", JSONObject.NULL)
    fun updateVisualAiDiagnostics(value: JSONObject) { visualAiDiagnostics = value; changed?.invoke() }

    fun usage(from: Long, to: Long): Map<String, Long> {
        if (!hasUsageAccess()) return emptyMap()
        return context.getSystemService(UsageStatsManager::class.java).queryAndAggregateUsageStats(from, to)
            .mapValues { maxOf(0L, it.value.totalTimeInForeground) }.filterValues { it > 0 }
=======
    fun recordBlock(host: String? = null) {
        if (host != null) {
            val key = Policy.normalizeBlockHost(host, domainRules)
            val now = SystemClock.elapsedRealtime()
            val shouldRecord = synchronized(recentBlocks) {
                val last = recentBlocks[key]
                if (Policy.shouldRecordBlock(last, now)) {
                    recentBlocks[key] = now
                    if (recentBlocks.size > 256) {
                        recentBlocks.entries.removeIf { (now - it.value) >= 60_000L }
                    }
                    true
                } else {
                    false
                }
            }
            if (!shouldRecord) return
        }
        executor.execute {
            try { val day = LocalDate.now().toString(); db.runInTransaction { dao.day((dao.day(day) ?: DailyRecord(day)).let { it.copy(blocked = it.blocked + 1) }) } }
            catch (_: Exception) { failure = "Protection counters could not be saved" }
        }
>>>>>>> 073808811f51e1e5e983234f0feef4df8411714c
    }

    data class UsageSummary(val totalMs: Long, val appUsage: Map<String, Long>)

    fun queryUsage(from: Long, to: Long): UsageSummary {
        if (!hasUsageAccess()) return UsageSummary(0L, emptyMap())
        val usm = context.getSystemService(UsageStatsManager::class.java) ?: return UsageSummary(0L, emptyMap())

        val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val launchablePackages = try {
            context.packageManager.queryIntentActivities(launcherIntent, 0)
                .mapNotNull { it.activityInfo?.packageName }
                .toSet()
        } catch (_: Exception) {
            emptySet()
        }

        val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val defaultLauncher = try {
            context.packageManager.resolveActivity(homeIntent, PackageManager.MATCH_DEFAULT_ONLY)
                ?.activityInfo?.packageName
        } catch (_: Exception) {
            null
        }

        val excluded = setOfNotNull(context.packageName, defaultLauncher, "com.android.systemui", "android")
        val validPackages = launchablePackages - excluded
        val maxPossible = maxOf(0L, minOf(to, System.currentTimeMillis()) - from)

        val appUsage = mutableMapOf<String, Long>()
        val appResumedTime = mutableMapOf<String, Long>()
        var totalScreenTime = 0L
        var screenIntervalStart = 0L

        try {
            val events = usm.queryEvents(from, to)
            if (events != null && events.hasNextEvent()) {
                val event = UsageEvents.Event()
                while (events.hasNextEvent()) {
                    events.getNextEvent(event)
                    val pkg = event.packageName ?: continue
                    if (validPackages.isNotEmpty() && pkg !in validPackages) continue
                    if (pkg in excluded) continue

                    val time = event.timeStamp
                    if (time < from || time > to) continue

                    when (event.eventType) {
                        1 -> {
                            if (!appResumedTime.containsKey(pkg)) {
                                appResumedTime[pkg] = time
                                if (appResumedTime.size == 1) {
                                    screenIntervalStart = time
                                }
                            }
                        }
                        2, 23 -> {
                            val start = appResumedTime.remove(pkg)
                            if (start != null && time > start) {
                                val duration = time - start
                                if (duration < 86_400_000L) {
                                    appUsage[pkg] = (appUsage[pkg] ?: 0L) + duration
                                }
                            }
                            if (appResumedTime.isEmpty() && screenIntervalStart > 0L) {
                                totalScreenTime += (time - screenIntervalStart)
                                screenIntervalStart = 0L
                            }
                        }
                    }
                }

                val now = minOf(to, System.currentTimeMillis())
                for ((pkg, start) in appResumedTime) {
                    if (now > start) {
                        val duration = now - start
                        if (duration < 86_400_000L) {
                            appUsage[pkg] = (appUsage[pkg] ?: 0L) + duration
                        }
                    }
                }
                if (appResumedTime.isNotEmpty() && screenIntervalStart > 0L && now > screenIntervalStart) {
                    totalScreenTime += (now - screenIntervalStart)
                }

                val finalTotal = minOf(maxPossible, totalScreenTime)
                return UsageSummary(finalTotal, appUsage.filterValues { it > 0 })
            }
        } catch (_: Exception) {}

        val rawStats = usm.queryAndAggregateUsageStats(from, to) ?: return UsageSummary(0L, emptyMap())
        val filtered = rawStats.filterKeys { pkg ->
            (validPackages.isEmpty() || pkg in validPackages) && pkg !in excluded
        }.mapValues { maxOf(0L, it.value.totalTimeInForeground) }.filterValues { it > 0 }
        val fallbackTotal = minOf(maxPossible, filtered.values.sum())
        return UsageSummary(fallbackTotal, filtered)
    }

    fun usage(from: Long, to: Long): Map<String, Long> = queryUsage(from, to).appUsage

    fun installedApps(): JSONArray {
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val apps = context.packageManager.queryIntentActivities(intent, 0).map { it.activityInfo.applicationInfo }.distinctBy { it.packageName }
        return JSONArray(apps.filter { it.packageName != context.packageName }.sortedBy { context.packageManager.getApplicationLabel(it).toString().lowercase() }.map {
            JSONObject().put("packageName", it.packageName).put("label", context.packageManager.getApplicationLabel(it).toString())
        })
    }
    fun snapshot(): JSONObject {
        check(ready) { failure ?: "Storage is still opening" }
        val today = LocalDate.now(); val now = System.currentTimeMillis(); val zone = ZoneId.systemDefault()
        val usageSummary = queryUsage(today.atStartOfDay(zone).toInstant().toEpochMilli(), now)
        val perApp = usageSummary.appUsage
        val days = dao.days()
        val total = usageSummary.totalMs
        val stored = dao.day(today.toString()) ?: DailyRecord(today.toString())
        dao.day(stored.copy(usageMs = total))
        val recovery = Policy.recovery(LocalDate.parse(configuration.getString("recoveryStart")), today, dao.eventsOfKind("relapse").map { LocalDate.parse(it.day) }.toSet())
        val hasAccess = hasAccessibilityAccess()
        if (hasAccess && !accessibilityActive && RestrictionService.instance != null) {
            accessibilityActive = true
        }
        if (hasAccess && !configuration.optBoolean("accessibilityConsent")) {
            configuration.put("accessibilityConsent", true)
            executor.execute {
                try { dao.configuration(Configuration(payload = configuration.toString())) }
                catch (_: Exception) {}
            }
        }
        val capabilities = JSONObject().put("usage", hasUsageAccess()).put("accessibility", hasAccess)
            .put("vpn", vpnActive).put("vpnError", vpnError ?: JSONObject.NULL)
            .put("deviceAdmin", DeviceAdminManager.isAdminActive(context))
            .put("accessibilityWindowCapture", android.os.Build.VERSION.SDK_INT >= 34 && accessibilityActive)
        val privateDnsServer = try {
            val cm = context.getSystemService(ConnectivityManager::class.java)
            val network = cm?.activeNetwork
            val links = network?.let { cm.getLinkProperties(it) }
            if (android.os.Build.VERSION.SDK_INT >= 28) links?.privateDnsServerName ?: "" else ""
        } catch (_: Exception) {
            ""
        }
        capabilities.put("privateDns", privateDnsServer)
        val events = JSONArray(dao.events().map { JSONObject().put("id", it.id).put("kind", it.kind).put("timestamp", it.timestamp).put("day", it.day).put("note", it.note).put("resisted", it.resisted) })
        val week = JSONArray((6L downTo 0).map { offset ->
            val date = today.minusDays(offset)
            val ms = if (offset == 0L) total else queryUsage(date.atStartOfDay(zone).toInstant().toEpochMilli(), date.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()).totalMs
            JSONObject().put("day", date.toString()).put("ms", ms)
        })
        return JSONObject().put("settings", JSONObject(configuration.toString())).put("capabilities", capabilities)
            .put("visualAi", JSONObject(visualAiDiagnostics.toString())).put("runtimeState", orchestrator.currentState().name).put("events", events)
            .put("recovery", JSONObject().put("current", recovery.current).put("longest", recovery.longest).put("cleanDays", recovery.cleanDays))
            .put("reward", JSONObject().put("balance", days.count { it.reward } * 10).put("claimed", days.any { it.reward && it.day >= today.toString() }))
            .put("burstRemainingMs", burstRemaining()).put("strictRemainingMs", strictRemaining()).put("blockedToday", stored.blocked)
            .put("usage", JSONObject().put("todayMs", total).put("week", week).put("apps", JSONArray(perApp.entries.sortedByDescending { it.value }.map { entry ->
                val label = try { context.packageManager.getApplicationLabel(context.packageManager.getApplicationInfo(entry.key, 0)).toString() } catch (_: Exception) { entry.key }
                JSONObject().put("packageName", entry.key).put("label", label).put("ms", entry.value)
            }))).put("storageError", failure ?: JSONObject.NULL)
    }

    fun notifyProtectionChanged() {
        changed?.invoke()
    }

    fun onAdminStatusChanged() {
        changed?.invoke()
    }
    companion object {
        @Volatile private var singleton: OfflineRuntime? = null
        fun get(context: Context): OfflineRuntime = singleton ?: synchronized(this) { singleton ?: OfflineRuntime(context.applicationContext).also { singleton = it } }
    }
}
