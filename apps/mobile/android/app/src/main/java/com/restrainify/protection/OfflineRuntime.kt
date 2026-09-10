package com.restrainify.protection

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.os.Process
import android.os.SystemClock
import android.provider.Settings
import com.restrainify.protection.storage.*
import com.restrainify.protection.service.RestrictionService
import com.restrainify.protection.webfilter.DnsVpnService
import org.json.JSONArray
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

    init { executor.execute { try { load() } catch (_: Exception) { failure = "Encrypted storage could not be opened. Your data has not been reset." } } }
    private fun defaults() = JSONObject().put("onboardingComplete", false).put("theme", "system")
        .put("recoveryEnabled", true).put("trackerEnabled", false).put("websiteEnabled", false)
        .put("accessibilityConsent", false).put("dnsMode", "vpn").put("burstMinutes", 0).put("strictMinutes", 0)
        .put("recoveryStart", LocalDate.now().toString()).put("domains", JSONArray()).put("rules", JSONArray())
    private fun load() {
        configuration = dao.configuration()?.let { JSONObject(it.payload) } ?: defaults().also { dao.configuration(Configuration(payload = it.toString())) }
        ready = true
    }
    fun hasUsageAccess(): Boolean {
        val ops = context.getSystemService(AppOpsManager::class.java)
        return ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName) == AppOpsManager.MODE_ALLOWED
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
                        "websiteEnabled", "recoveryEnabled", "trackerEnabled", "accessibilityConsent" -> {
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
                    context.packageManager.getApplicationInfo(pkg, 0)
                    val minutes = input.optInt("limitMinutes")
                    val start = input.optInt("startMinute", -1)
                    val end = input.optInt("endMinute", -1)
                    require(minutes in 0..1440 && ((start == -1 && end == -1) || (start in 0..1439 && end in 0..1439 && start != end))) { "Check the limit and schedule" }
                    val days = input.optJSONArray("days") ?: JSONArray(listOf(1,2,3,4,5,6,7))
                    require((0 until days.length()).all { days.getInt(it) in 1..7 })
                    val mode = input.optString("feedMode", "off")
                    require(mode in listOf("off", "experimental", "whole_app"))
                    val rules = next.getJSONArray("rules"); val updated = JSONArray()
                    for (i in 0 until rules.length()) if (rules.getJSONObject(i).getString("packageName") != pkg) updated.put(rules.getJSONObject(i))
                    if (!input.optBoolean("remove")) updated.put(JSONObject().put("packageName", pkg).put("enabled", input.optBoolean("enabled", true))
                        .put("limitMinutes", minutes).put("startMinute", start).put("endMinute", end).put("days", days)
                        .put("feedMode", mode).put("burst", input.optBoolean("burst", true)))
                    next.put("rules", updated)
                }
                "reward" -> {
                    val day = LocalDate.now().toString()
                    require(dao.days().none { it.reward && it.day >= day }) { "Today's reward has already been claimed, or the clock moved back." }
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
                "burst" -> {
                    require(burstRemaining() == 0L) { "Burst is already active" }
                    val minutes = next.optInt("burstMinutes"); require(minutes in 1..1440) { "Choose your Burst duration first" }
                    require(accessibilityActive && next.optBoolean("accessibilityConsent")) { "Enable app restriction access before starting Burst" }
                    val rules = next.getJSONArray("rules")
                    require((0 until rules.length()).any { rules.getJSONObject(it).optBoolean("enabled") && rules.getJSONObject(it).optBoolean("burst") }) { "Select at least one Burst app first" }
                    val id = UUID.randomUUID().toString()
                    deadline(next, "burst", minutes); next.put("burstId", id)
                    dao.event(LocalEvent(id, "burst", System.currentTimeMillis(), LocalDate.now().toString(), ""))
                }
                "resist" -> require(dao.resist(input.getString("id")) > 0) { "This intervention could not be found" }
                "strict" -> { require(strictRemaining() == 0L); val minutes = next.optInt("strictMinutes"); require(minutes in 1..1440) { "Choose a lock duration first" }; deadline(next, "strict", minutes) }
                "reset" -> { assertCanWeaken(); require(input.optBoolean("confirmed")); dao.clearEvents(); dao.clearDays(); dao.clearConfiguration() }
                else -> throw IllegalArgumentException("Unsupported action")
            }
            dao.configuration(Configuration(payload = (if (action == "reset") defaults() else next).toString()))
        }
        load()
        if (!configuration.optBoolean("websiteEnabled") || configuration.optString("dnsMode") != "vpn") context.stopService(Intent(context, DnsVpnService::class.java))
        RestrictionService.instance?.reevaluate()
        changed?.invoke()
        return snapshot()
    }

    fun recordBlock() { executor.execute {
        try { val day = LocalDate.now().toString(); db.runInTransaction { dao.day((dao.day(day) ?: DailyRecord(day)).let { it.copy(blocked = it.blocked + 1) }) } }
        catch (_: Exception) { failure = "Protection counters could not be saved" }
    } }

    fun usage(from: Long, to: Long): Map<String, Long> {
        if (!hasUsageAccess()) return emptyMap()
        return context.getSystemService(UsageStatsManager::class.java).queryAndAggregateUsageStats(from, to)
            .mapValues { maxOf(0L, it.value.totalTimeInForeground) }.filterValues { it > 0 }
    }
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
        val perApp = usage(today.atStartOfDay(zone).toInstant().toEpochMilli(), now)
        val days = dao.days()
        val total = perApp.values.sum()
        val stored = dao.day(today.toString()) ?: DailyRecord(today.toString())
        if (total > stored.usageMs) dao.day(stored.copy(usageMs = total))
        val recovery = Policy.recovery(LocalDate.parse(configuration.getString("recoveryStart")), today, dao.eventsOfKind("relapse").map { LocalDate.parse(it.day) }.toSet())
        val capabilities = JSONObject().put("usage", hasUsageAccess()).put("accessibility", accessibilityActive)
            .put("vpn", vpnActive).put("vpnError", vpnError ?: JSONObject.NULL)
        val cm = context.getSystemService(ConnectivityManager::class.java)
        val network = cm.activeNetwork
        val links = network?.let { cm.getLinkProperties(it) }
        capabilities.put("privateDns", if (android.os.Build.VERSION.SDK_INT >= 28) links?.privateDnsServerName ?: "" else "")
        val events = JSONArray(dao.events().map { JSONObject().put("id", it.id).put("kind", it.kind).put("timestamp", it.timestamp).put("day", it.day).put("note", it.note).put("resisted", it.resisted) })
        val week = JSONArray((6L downTo 0).map { offset ->
            val date = today.minusDays(offset)
            val ms = if (offset == 0L) total else usage(date.atStartOfDay(zone).toInstant().toEpochMilli(), date.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli()).values.sum()
            JSONObject().put("day", date.toString()).put("ms", ms)
        })
        return JSONObject().put("settings", JSONObject(configuration.toString())).put("capabilities", capabilities).put("events", events)
            .put("recovery", JSONObject().put("current", recovery.current).put("longest", recovery.longest).put("cleanDays", recovery.cleanDays))
            .put("reward", JSONObject().put("balance", days.count { it.reward } * 10).put("claimed", days.any { it.reward && it.day >= today.toString() }))
            .put("burstRemainingMs", burstRemaining()).put("strictRemainingMs", strictRemaining()).put("blockedToday", stored.blocked)
            .put("usage", JSONObject().put("todayMs", total).put("week", week).put("apps", JSONArray(perApp.entries.sortedByDescending { it.value }.map { entry ->
                val label = try { context.packageManager.getApplicationLabel(context.packageManager.getApplicationInfo(entry.key, 0)).toString() } catch (_: Exception) { entry.key }
                JSONObject().put("packageName", entry.key).put("label", label).put("ms", entry.value)
            }))).put("storageError", failure ?: JSONObject.NULL)
    }
    companion object {
        @Volatile private var singleton: OfflineRuntime? = null
        fun get(context: Context): OfflineRuntime = singleton ?: synchronized(this) { singleton ?: OfflineRuntime(context.applicationContext).also { singleton = it } }
    }
}
