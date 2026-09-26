package com.restrainify.protection

import java.net.IDN
import java.net.URI
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import android.view.accessibility.AccessibilityNodeInfo

object Policy {
    fun domain(input: String): String {
        val raw = input.trim()
        require(raw.length <= 2048 && !raw.contains('@')) { "Enter a hostname without credentials" }
        val uri = URI(if (raw.contains("://")) raw else "https://$raw")
        require(uri.scheme in listOf("http", "https") && uri.port == -1) { "Enter a domain without a port" }
        val host =
            IDN
                .toASCII(
                    uri.host ?: throw IllegalArgumentException("Enter a valid domain"),
                    IDN.USE_STD3_ASCII_RULES,
                ).lowercase()
                .trimEnd('.')
        require(
            host.length <= 253 && host.contains('.') && host.split('.').all { it.matches(Regex("[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?")) } &&
                !host.last().isDigit(),
        ) { "Enter a valid domain" }
        return host
    }

    fun matches(
        host: String,
        rule: String,
    ) = host == rule || host.endsWith(".$rule")

    fun scheduled(
        minute: Int,
        weekday: Int,
        start: Int,
        end: Int,
        days: Set<Int>,
    ): Boolean =
        if (start < end) {
            weekday in days && minute in start until end
        } else {
            (weekday in days && minute >= start) || ((if (weekday == 1) 7 else weekday - 1) in days && minute < end)
        }

    data class Recovery(
        val current: Long,
        val longest: Long,
        val cleanDays: Int,
    )

    fun recovery(
        start: LocalDate,
        today: LocalDate,
        relapses: Set<LocalDate>,
    ): Recovery {
        val valid = relapses.filter { !it.isBefore(start) && !it.isAfter(today) }.sorted()
        var cursor = start
        var longest = 0L
        valid.forEach {
            longest = maxOf(longest, ChronoUnit.DAYS.between(cursor, it))
            cursor = it.plusDays(1)
        }
        val current = maxOf(0, ChronoUnit.DAYS.between(cursor, today))
        longest = maxOf(longest, current)
        val clean = (0L..29L).map { today.minusDays(it) }.count { !it.isBefore(start) && it !in relapses }
        return Recovery(current, longest, clean)
    }

    data class DomainRule(
        val host: String,
        val allow: Boolean,
        val enabled: Boolean,
    )

    data class AppRule(
        val packageName: String,
        val enabled: Boolean = true,
        val limitMinutes: Int = 0,
        val startMinute: Int = -1,
        val endMinute: Int = -1,
        val days: List<Int> = emptyList(),
        val feedMode: String = "off",
        val burst: Boolean = true,
        val options: List<String> = emptyList(),
    )

    sealed interface DnsVerdict {
        object Block : DnsVerdict
        data class SafeSearch(val ip: ByteArray) : DnsVerdict
        data class Forward(val upstream: String) : DnsVerdict
    }

    fun evaluateDns(
        host: String,
        qtype: Int,
        rules: List<DomainRule>,
        safeSearch: Boolean,
        proxyResistance: Boolean,
        socialWebsites: Boolean,
        appRules: List<AppRule> = emptyList(),
    ): DnsVerdict {
        val h = host.lowercase().trimEnd('.')
        val activeRules = rules.filter { it.enabled }
        val isAllowed = activeRules.any { it.allow && matches(h, it.host) }
        if (isAllowed) {
            return DnsVerdict.Forward("1.1.1.1")
        }

        val isExplicitBlocked = activeRules.any { !it.allow && matches(h, it.host) }
        if (isExplicitBlocked || isKnownAdultDomain(h)) {
            return DnsVerdict.Block
        }

        if (proxyResistance && isProxyOrBypass(h)) {
            return DnsVerdict.Block
        }

        if (socialWebsites && isSocialWebsite(h) && !isSocialHostExempt(h, appRules)) {
            return DnsVerdict.Block
        }

        if (safeSearch) {
            val safeIp = safeSearchIp(h)
            if (safeIp != null) {
                return DnsVerdict.SafeSearch(safeIp)
            }
        }

        return DnsVerdict.Forward("1.1.1.3")
    }

    // High-impact adult/pornographic domains fast-path for zero-latency local blocking
    val KNOWN_ADULT_DOMAINS =
        setOf(
            "pornhub.com",
            "xvideos.com",
            "xnxx.com",
            "xhamster.com",
            "redtube.com",
            "youporn.com",
            "stripchat.com",
            "chaturbate.com",
            "onlyfans.com",
            "cam4.com",
            "bongacams.com",
            "livejasmin.com",
            "spankbang.com",
            "eporner.com",
            "tube8.com",
            "beeg.com",
            "hqporner.com",
            "motherless.com",
            "tnaflix.com",
            "porn.com",
            "brazzers.com",
            "bangbros.com",
            "naughtyamerica.com",
            "twistys.com",
            "realitykings.com",
            "playboy.com",
            "penthouse.com",
            "hustler.com",
            "erome.com",
            "heavy-r.com",
            "bravoteens.com",
            "luscious.net",
            "rule34.xxx",
            "e621.net",
            "gelbooru.com",
            "danbooru.donmai.us",
            "fapello.com",
            "daftsex.com",
            "txxx.com",
            "pornmd.com",
            "fuq.com",
            "adultwork.com",
            "camsoda.com",
        )

    fun isKnownAdultDomain(host: String): Boolean {
        val h = host.lowercase().trimEnd('.')
        return KNOWN_ADULT_DOMAINS.any { matches(h, it) }
    }

    // SafeSearch VIPs
    val GOOGLE_SAFESEARCH_IP = byteArrayOf(216.toByte(), 239.toByte(), 38.toByte(), 120.toByte())
    val BING_SAFESEARCH_IP = byteArrayOf(204.toByte(), 79.toByte(), 197.toByte(), 220.toByte())
    val YOUTUBE_RESTRICTED_IP = byteArrayOf(216.toByte(), 239.toByte(), 38.toByte(), 120.toByte())
    val DUCKDUCKGO_SAFESEARCH_IP = byteArrayOf(52.toByte(), 142.toByte(), 124.toByte(), 215.toByte())

    private val GOOGLE_SEARCH_REGEX = Regex("^(?:[a-z0-9-]+\\.)*google\\.(?:com|[a-z]{2})(?:\\.[a-z]{2})?$")

    fun safeSearchIp(host: String): ByteArray? {
        val h = host.lowercase().trimEnd('.')
        if (h == "forcesafesearch.google.com" || h == "restrict.youtube.com" || h == "strict.bing.com" ||
            h == "safe.duckduckgo.com"
        ) {
            return null
        }
        if (h == "bing.com" || h.endsWith(".bing.com")) return BING_SAFESEARCH_IP
        if (h == "youtube.com" || h == "www.youtube.com" || h == "m.youtube.com" || h == "youtubei.googleapis.com" ||
            h == "youtube.googleapis.com"
        ) {
            return YOUTUBE_RESTRICTED_IP
        }
        if (h == "duckduckgo.com" || h == "www.duckduckgo.com") return DUCKDUCKGO_SAFESEARCH_IP
        if (h == "google.com" || h.endsWith(".google.com") || GOOGLE_SEARCH_REGEX.matches(h)) return GOOGLE_SAFESEARCH_IP
        return null
    }

    // Proxy and bypass unblocker domains
    val KNOWN_PROXY_DOMAINS =
        setOf(
            "proxysite.com",
            "croxyproxy.com",
            "blockaway.net",
            "kproxy.com",
            "hide.me",
            "vpnbook.com",
            "filterbypass.me",
            "4everproxy.com",
            "whoer.net",
            "megaproxy.com",
            "zendproxy.com",
            "free-proxy.cz",
            "proxyium.com",
            "plainproxies.com",
            "my-proxy.com",
            "proxfree.com",
            "hidester.com",
            "anonymouse.org",
            "tunnelbear.com",
            "nordvpn.com",
            "expressvpn.com",
            "dns.google",
            "cloudflare-dns.com",
            "one.one.one.one",
            "1dot1dot1dot1.cloudflare-dns.com",
            "dns.quad9.net",
            "dns.nextdns.io",
            "doh.opendns.com",
            "dns.adguard-dns.com",
            "dns.controld.com",
            "doh.cleanbrowsing.org",
            "dns.mullvad.net",
        )

    fun isProxyOrBypass(host: String): Boolean {
        val h = host.lowercase().trimEnd('.')
        return KNOWN_PROXY_DOMAINS.any { matches(h, it) }
    }

    // Social website domains and CDN aliases
    val KNOWN_SOCIAL_DOMAINS =
        setOf(
            "instagram.com",
            "cdninstagram.com",
            "ig.me",
            "facebook.com",
            "fb.com",
            "fbcdn.net",
            "fbsbx.com",
            "messenger.com",
            "tiktok.com",
            "tiktokcdn.com",
            "tiktokv.com",
            "byteoversea.com",
            "ibytedtos.com",
            "musical.ly",
            "twitter.com",
            "x.com",
            "t.co",
            "twimg.com",
            "reddit.com",
            "redd.it",
            "redditmedia.com",
            "redditstatic.com",
            "snapchat.com",
            "sc-cdn.net",
            "pinterest.com",
            "pinimg.com",
            "threads.net",
            "threads.com",
        )

    fun isSocialWebsite(host: String): Boolean {
        val h = host.lowercase().trimEnd('.')
        return KNOWN_SOCIAL_DOMAINS.any { matches(h, it) }
    }

    // Social app packages (Instagram, TikTok, Facebook, Twitter/X, Reddit, Snapchat, Pinterest, Threads, etc.)
    val KNOWN_SOCIAL_PACKAGES =
        setOf(
            "com.instagram.android",
            "com.instagram.barcelona",
            "com.zhiliaoapp.musically",
            "com.zhiliaoapp.musically.go",
            "com.ss.android.ugc.trill",
            "com.facebook.katana",
            "com.facebook.lite",
            "com.facebook.orca",
            "com.twitter.android",
            "com.twitter.android.lite",
            "com.reddit.frontpage",
            "com.snapchat.android",
            "com.pinterest",
            "com.pinterest.twa",
            "com.tumblr",
            "xyz.blueskyweb.app",
            "com.instagram.lite",
            "com.linkedin.android",
            "com.bereal.ft",
        )

    fun isSocialApp(packageName: String?): Boolean {
        if (packageName.isNullOrBlank()) return false
        val pkg = packageName.lowercase().trim()
        return KNOWN_SOCIAL_PACKAGES.contains(pkg)
    }

    // Supported short-form feed application packages
    val KNOWN_FEED_PACKAGES =
        setOf(
            "com.instagram.android",
            "com.google.android.youtube",
            "com.facebook.katana",
            "com.snapchat.android",
            "com.zhiliaoapp.musically",
            "com.zhiliaoapp.musically.go",
            "com.ss.android.ugc.trill",
            "com.instagram.barcelona",
            "com.instagram.lite",
            "com.facebook.lite",
        )

    fun isKnownFeedPackage(packageName: String?): Boolean {
        if (packageName.isNullOrBlank()) return false
        return KNOWN_FEED_PACKAGES.contains(packageName.lowercase().trim())
    }

    /**
     * Maps variant packages to their canonical platform package name
     * (e.g., Instagram Lite / Threads -> Instagram, Facebook Lite / Messenger -> Facebook).
     */
    fun getCanonicalSocialPackage(pkg: String?): String {
        if (pkg.isNullOrBlank()) return ""
        return when (pkg.lowercase().trim()) {
            "com.instagram.android", "com.instagram.lite", "com.instagram.barcelona" -> "com.instagram.android"
            "com.facebook.katana", "com.facebook.lite", "com.facebook.orca" -> "com.facebook.katana"
            "com.zhiliaoapp.musically", "com.zhiliaoapp.musically.go", "com.ss.android.ugc.trill" -> "com.zhiliaoapp.musically"
            "com.twitter.android", "com.twitter.android.lite" -> "com.twitter.android"
            "com.pinterest", "com.pinterest.twa" -> "com.pinterest"
            else -> pkg.lowercase().trim()
        }
    }

    /**
     * Resolves a web domain / host to its associated platform application package.
     */
    fun socialHostToPackage(host: String): String? {
        val h = host.lowercase().trimEnd('.')
        return when {
            matches(h, "instagram.com") || matches(h, "cdninstagram.com") || matches(h, "ig.me") ||
            matches(h, "threads.net") || matches(h, "threads.com") -> "com.instagram.android"

            matches(h, "facebook.com") || matches(h, "fb.com") || matches(h, "fbcdn.net") ||
            matches(h, "fbsbx.com") || matches(h, "messenger.com") -> "com.facebook.katana"

            matches(h, "tiktok.com") || matches(h, "tiktokcdn.com") || matches(h, "tiktokv.com") ||
            matches(h, "byteoversea.com") || matches(h, "ibytedtos.com") || matches(h, "musical.ly") -> "com.zhiliaoapp.musically"

            matches(h, "snapchat.com") || matches(h, "sc-cdn.net") -> "com.snapchat.android"

            matches(h, "youtube.com") || matches(h, "youtu.be") || matches(h, "ytimg.com") -> "com.google.android.youtube"

            matches(h, "twitter.com") || matches(h, "x.com") || matches(h, "t.co") || matches(h, "twimg.com") -> "com.twitter.android"

            matches(h, "reddit.com") || matches(h, "redd.it") || matches(h, "redditmedia.com") || matches(h, "redditstatic.com") -> "com.reddit.frontpage"

            matches(h, "pinterest.com") || matches(h, "pinimg.com") -> "com.pinterest"

            matches(h, "tumblr.com") -> "com.tumblr"
            matches(h, "bsky.app") || matches(h, "blueskyweb.xyz") -> "xyz.blueskyweb.app"
            matches(h, "linkedin.com") || matches(h, "licdn.com") -> "com.linkedin.android"
            matches(h, "bereal.com") || matches(h, "bereal.team") -> "com.bereal.ft"

            else -> null
        }
    }

    /**
     * Checks if a social package has an explicit user exemption in App Rules
     * (i.e. feedMode == "off" or rule.enabled == false).
     */
    fun isSocialAppExempt(packageName: String?, appRules: List<AppRule>): Boolean {
        if (packageName.isNullOrBlank()) return false
        val canon = getCanonicalSocialPackage(packageName)
        val rule = appRules.firstOrNull {
            getCanonicalSocialPackage(it.packageName) == canon
        } ?: return false
        return !rule.enabled || rule.feedMode == "off"
    }

    /**
     * Checks if a social host belongs to a social app that is explicitly exempted.
     */
    fun isSocialHostExempt(host: String, appRules: List<AppRule>): Boolean {
        val pkg = socialHostToPackage(host) ?: return false
        return isSocialAppExempt(pkg, appRules)
    }

    /**
     * Extracts a normalized hostname from a browser address bar or raw URL string.
     */
    fun extractHost(raw: String?): String? {
        if (raw.isNullOrBlank()) return null
        val trimmed = raw.trim()
        if (trimmed.contains(" ") || !trimmed.contains(".")) return null
        val uriString = if (trimmed.contains("://")) trimmed else "https://$trimmed"
        val parsedHost = try {
            val uri = URI(uriString)
            uri.host ?: trimmed.substringBefore("/").substringBefore("?").substringBefore("#")
        } catch (_: Exception) {
            trimmed.substringBefore("/").substringBefore("?").substringBefore("#")
        } ?: return null
        val host = try {
            IDN.toASCII(parsedHost, IDN.USE_STD3_ASCII_RULES).lowercase().trimEnd('.')
        } catch (_: Exception) {
            parsedHost.lowercase().trimEnd('.')
        }
        if (host.length in 3..253 && host.contains('.') &&
            host.split('.').all { it.isNotEmpty() && it.matches(Regex("[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?")) } &&
            !host.last().isDigit()
        ) {
            return host
        }
        return null
    }

    /**
     * Computes the effective foreground usage including uncommitted live session time,
     * preventing double-counting if UsageStatsManager partially or fully flushed.
     */
    fun effectiveUsage(
        currentUsageStats: Long,
        baselineUsageStats: Long,
        sessionElapsedMs: Long,
    ): Long {
        val safeSessionElapsed = maxOf(0L, sessionElapsedMs)
        val flushedInSession = maxOf(0L, currentUsageStats - baselineUsageStats)
        val uncommitted = maxOf(0L, safeSessionElapsed - flushedInSession)
        return currentUsageStats + uncommitted
    }

    data class LimitVerdict(
        val exceeded: Boolean,
        val effectiveUsageMs: Long,
        val remainingMs: Long,
    )

    /**
     * Determines whether a daily app limit has been reached or exceeded,
     * taking into account active uncommitted session elapsed time.
     */
    fun evaluateLimit(
        limitMinutes: Int,
        currentUsageStats: Long,
        baselineUsageStats: Long,
        sessionElapsedMs: Long,
    ): LimitVerdict {
        if (limitMinutes <= 0) {
            return LimitVerdict(
                exceeded = false,
                effectiveUsageMs = currentUsageStats,
                remainingMs = Long.MAX_VALUE,
            )
        }
        val limitMs = limitMinutes * 60_000L
        val effective = effectiveUsage(currentUsageStats, baselineUsageStats, sessionElapsedMs)
        val exceeded = effective >= limitMs
        val remaining = maxOf(0L, limitMs - effective)
        return LimitVerdict(
            exceeded = exceeded,
            effectiveUsageMs = effective,
            remainingMs = remaining,
        )
    }

    // System and input packages that should not steal foreground identity or dismiss overlays
    val KNOWN_TRANSIENT_PACKAGES =
        setOf(
            "com.android.systemui",
            "android",
            "com.google.android.permissioncontroller",
            "com.android.permissioncontroller",
            "com.google.android.gms",
            "com.google.android.gms.policy_sidecar_aps",
            "com.google.android.ext.services",
            "com.google.android.packageinstaller",
            "com.android.packageinstaller",
            "com.facebook.services",
            "com.facebook.appmanager",
            "com.facebook.system",
            "com.samsung.android.app.cocktailbarservice",
        )

    fun isTransientPackage(pkg: String, customImes: Set<String> = emptySet()): Boolean {
        val lower = pkg.lowercase().trim()
        if (lower.isEmpty()) return true
        if (lower in KNOWN_TRANSIENT_PACKAGES || lower in customImes) return true
        if (lower.contains("inputmethod") || lower.contains("keyboard") ||
            lower.contains("honeyboard") || lower.contains("swiftkey") || lower.contains("gboard")
        ) {
            return true
        }
        return false
    }

    /**
     * Detects if an active screen or package represents an uninstallation or settings tamper
     * attempt targeting Restrainify during active Burst mode.
     */
    fun isUninstallOrSettingsTamper(
        pkg: String,
        root: AccessibilityNodeInfo?,
        targetAppLabel: String = "Restrainify",
        targetPackage: String = "com.restrainify",
    ): Boolean {
        val lower = pkg.lowercase().trim()
        val isInstaller = lower == "com.android.packageinstaller" ||
            lower == "com.google.android.packageinstaller"
        val isSettings = lower == "com.android.settings"

        if (!isInstaller && !isSettings) return false
        if (root == null) return false

        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)
        var count = 0
        val maxNodes = 400
        var foundTargetApp = false
        var foundTamperKeyword = false

        val tamperKeywords = listOf(
            "uninstall",
            "force stop",
            "deactivate this device admin",
            "deactivate this device administrator",
            "deactivate",
            "remove active admin",
        )

        val targetLabelLower = targetAppLabel.lowercase()
        val targetPkgLower = targetPackage.lowercase()

        while (queue.isNotEmpty() && count < maxNodes) {
            val node = queue.removeFirst()
            count++

            val text = (node.text?.toString() ?: "").lowercase()
            val desc = (node.contentDescription?.toString() ?: "").lowercase()
            val viewId = (node.viewIdResourceName ?: "").lowercase()

            val combined = "$text $desc $viewId"

            if (combined.contains(targetLabelLower) || combined.contains(targetPkgLower)) {
                foundTargetApp = true
            }

            if (tamperKeywords.any { combined.contains(it) }) {
                foundTamperKeyword = true
            }

            if (isInstaller && foundTargetApp) {
                return true
            }

            if (isSettings && foundTargetApp && foundTamperKeyword) {
                return true
            }

            for (i in 0 until node.childCount) {
                val child = node.getChild(i)
                if (child != null) queue.add(child)
            }
        }

        return false
    }

    /**
     * Preserves monotonic usage for an application against device clock rollbacks or timezone shifts (FR-APP-008).
     */
    fun monotonicUsage(
        currentUsageStats: Long,
        maxObservedUsageStats: Long,
    ): Long = maxOf(currentUsageStats, maxObservedUsageStats)

    /**
     * Normalizes a host for block deduplication (e.g., matching rules/known adult lists, stripping "www."/"m.").
     */
    fun normalizeBlockHost(host: String, rules: List<DomainRule> = emptyList()): String {
        val h = host.lowercase().trim().trimEnd('.')
        val matchedRule = rules.firstOrNull { it.enabled && matches(h, it.host) }
        if (matchedRule != null) return matchedRule.host
        val matchedAdult = KNOWN_ADULT_DOMAINS.firstOrNull { matches(h, it) }
        if (matchedAdult != null) return matchedAdult
        val matchedProxy = KNOWN_PROXY_DOMAINS.firstOrNull { matches(h, it) }
        if (matchedProxy != null) return matchedProxy
        val matchedSocial = KNOWN_SOCIAL_DOMAINS.firstOrNull { matches(h, it) }
        if (matchedSocial != null) return matchedSocial
        if (h.startsWith("www.")) return h.substring(4)
        if (h.startsWith("m.")) return h.substring(2)
        return h
    }

    /**
     * Determines whether a block event for the given key should be recorded or suppressed due to debouncing.
     */
    fun shouldRecordBlock(
        lastRecordedMs: Long?,
        currentMs: Long,
        cooldownMs: Long = 10_000L,
    ): Boolean {
        if (lastRecordedMs == null) return true
        if (currentMs < lastRecordedMs) return true
        return (currentMs - lastRecordedMs) >= cooldownMs
    }

    // --- In-App Short Form Feed Blocking (Instagram & Social Apps) ---

    object InstagramSelectors {
        const val OPTION_REELS = "ig_reels"
        const val OPTION_STORIES = "ig_stories"
        const val OPTION_EXPLORE = "ig_explore"

        val REELS_VIEW_IDS = listOf(
            "clips_viewer_view_pager",
            "clips_viewer_view_pager_v2",
            "clips_video_container",
            "clips_viewer_container",
            "clips_viewer_root",
            "clips_swipe_refresh_container",
            "clips_action_bar_container",
            "clips_item_container",
            "clips_media_component",
            "clips_author_container",
            "clips_bottom_sheet_container",
            "clips_camera_button",
            "clips_audio_mix_button",
            "music_attribution_label",
        )

        val REELS_KEYWORDS = listOf(
            "reel by ",
            "reels video",
            "watch reel",
            "audio is unavailable",
            "original audio",
            "use audio",
            "remix this reel",
            "open audio page",
            "reel audio",
        )

        val STORIES_VIEW_IDS = listOf(
            "reel_viewer_progress_bar",
            "segments_progress_bar",
            "story_item_top_progress_bar_stub",
            "reel_viewer_header",
            "reel_viewer_header_container",
            "reel_viewer_title",
            "reel_viewer_title_row",
            "reel_viewer_texture_view",
            "reel_viewer_root",
            "reel_viewer_container",
            "reel_viewer_media_container",
            "reel_viewer_media_layout",
            "reel_viewer_media_elements_container",
            "reel_viewer_message_composer",
            "reel_viewer_content_layout",
            "reel_viewer_animator",
            "direct_story_viewer_header",
            "story_viewer_container",
            "story_viewer_fragment",
            "story_viewer",
            "layout_reel_viewer",
        )

        val STORIES_KEYWORDS = listOf(
            "story by ",
            "stories by ",
            "seen story by",
            "like story",
            "unlike story",
            "share story",
            "story options",
            "pause story",
            "resume story",
            "next story",
            "previous story",
            "story sticker",
            "reply to story",
        )

        val EXPLORE_VIEW_IDS = listOf(
            "explore_grid_scrollview",
            "explore_grid",
            "explore_view_pager",
            "explore_content",
            "explore_tab",
            "search_tab",
            "grid_recycler",
            "action_bar_search_edit_text",
        )

        val EXPLORE_TAB_NAMES = listOf(
            "search and explore",
            "explore",
            "search",
        )

        val DM_VIEW_IDS = listOf(
            "row_thread_composer_edittext",
            "direct_text_message_composer",
            "direct_thread_list",
            "direct_private_share_message_box",
        )
        val HOME_ACTION_BAR_IDS = listOf(
            "action_bar_inbox_button",
            "action_bar_textview_custom_title_container",
            "main_feed_action_bar",
            "title_logo",
        )
    }

    data class InstagramScreenInspection(
        val isReelsScreen: Boolean = false,
        val isStoriesScreen: Boolean = false,
        val isExploreScreen: Boolean = false,
        val isHomeScreen: Boolean = false,
        val isDmScreen: Boolean = false,
        val detectedReason: String? = null,
    )

    fun inspectInstagramScreen(
        viewIds: Set<String>,
        descriptions: List<String> = emptyList(),
        textList: List<String> = emptyList(),
        isReelsTabSelected: Boolean = false,
        isHomeTabSelected: Boolean = false,
        isExploreTabSelected: Boolean = false,
        hasHomeActionBar: Boolean = false,
        hasStoryProgress: Boolean = false,
        hasFeedList: Boolean = false,
        hasDedicatedClipsPager: Boolean = false,
        hasActiveStoryViewer: Boolean = false,
    ): InstagramScreenInspection {
        val lowerDesc = descriptions.map { it.lowercase() }
        val lowerText = textList.map { it.lowercase() }

        // 1. Direct Messages check (always allowed - genuine chat threads only, not story reply composers)
        val hasDmViewId = viewIds.any { id -> InstagramSelectors.DM_VIEW_IDS.any { id.contains(it) } }
        val hasDmText = lowerDesc.any { it.contains("type a message") || it.contains("voice message") } ||
            lowerText.any { it.contains("type a message") }
        val hasAnyStoryIndicator = hasStoryProgress || hasActiveStoryViewer || viewIds.any {
            (it.startsWith("reel_viewer_") || it.startsWith("story_viewer_") || InstagramSelectors.STORIES_VIEW_IDS.contains(it)) && !it.contains("tray")
        }
        val isDm = (hasDmViewId || hasDmText) && !hasAnyStoryIndicator
        if (isDm) {
            return InstagramScreenInspection(isDmScreen = true, detectedReason = "DMs active")
        }

        // Active dedicated full-screen clips viewer layout check
        val clipsPagerPresent = hasDedicatedClipsPager || viewIds.any { id ->
            id == "clips_viewer_view_pager" ||
            id == "clips_viewer_view_pager_v2" ||
            id == "clips_viewer_container" ||
            id == "clips_viewer_root" ||
            id == "clips_swipe_refresh_container"
        }

        // Active dedicated full-screen story viewer layout check
        val hasStoryViewId = viewIds.any { id ->
            (id.startsWith("reel_viewer_") || id.startsWith("story_viewer_") || InstagramSelectors.STORIES_VIEW_IDS.any { id.contains(it) }) &&
                !id.contains("tray")
        }
        val hasStoryDesc = lowerDesc.any { d -> InstagramSelectors.STORIES_KEYWORDS.any { d.contains(it) } }
        val hasStoryAction = lowerDesc.any { d ->
            d.contains("like story") || d.contains("unlike story") || d.contains("share story") ||
            d.contains("story options") || d.contains("pause story") || d.contains("resume story") ||
            d.contains("next story") || d.contains("previous story") || d.contains("reply to story")
        }

        // 2. Stories viewer check (Crucial: Evaluated BEFORE background Home feed elements)
        // If an active story viewer is confirmed in the foreground (progress bar at top, story header, active story container, or reel_viewer ID without Home action bar),
        // it MUST take precedence over occluded Home feed elements underneath.
        val isStoryForeground = (hasActiveStoryViewer || hasStoryProgress || hasStoryAction || (hasStoryViewId && !hasHomeActionBar)) && !isReelsTabSelected
        if (isStoryForeground) {
            return InstagramScreenInspection(isStoriesScreen = true, detectedReason = "Stories viewer active")
        }
        // 3. Reels screen check (Crucial: Evaluated BEFORE background Home feed elements)
        // If the Reels tab is selected, or a dedicated clips pager is actively playing, it MUST take precedence over occluded Home feed elements underneath.
        val hasClipsId = viewIds.any { id ->
            id.startsWith("clips_") || InstagramSelectors.REELS_VIEW_IDS.any { id.contains(it) }
        }
        val hasClipsViewerId = viewIds.any { id ->
            id.startsWith("clips_viewer_") ||
            id == "layout_clips_viewer_container" ||
            id == "clips_video_container"
        }
        val hasReelsDesc = lowerDesc.any { d -> InstagramSelectors.REELS_KEYWORDS.any { d.contains(it) } }
        val hasReelsText = lowerText.any { t -> InstagramSelectors.REELS_KEYWORDS.any { t.contains(it) } }

        // Active foreground reels: Reels tab selected, dedicated clips pager active in foreground,
        // or clips viewer present when NOT on Home tab.
        val hasActiveClipsViewer = hasDedicatedClipsPager || (clipsPagerPresent && !isHomeTabSelected) || (hasClipsViewerId && !isHomeTabSelected)
        val isReelsForeground = (isReelsTabSelected || hasActiveClipsViewer || (hasClipsId && !isHomeTabSelected && !hasFeedList)) &&
            !hasStoryProgress && !hasActiveStoryViewer
        if (isReelsForeground) {
            val reason = when {
                isReelsTabSelected -> "Reels tab selected"
                hasDedicatedClipsPager || clipsPagerPresent -> "Clips layout container detected"
                hasClipsViewerId -> "Clips viewer structure detected"
                hasReelsDesc -> "Reel description detected"
                else -> "Reels screen structure detected"
            }
            return InstagramScreenInspection(isReelsScreen = true, detectedReason = reason)
        }

        // 4. Main Page / Home Feed Check (CRITICAL: MUST PREVENT BLOCKING THE MAIN PAGE)
        // If the Home action bar, Home tab, or Home feed post list is active, and Reels tab is not selected:
        // THE USER IS BROWSING THEIR MAIN FEED -> NEVER BLOCK!
        // A detached or lingering clips viewer from a previous session must NOT override the active Home feed.
        val isHome = (hasHomeActionBar || isHomeTabSelected || hasFeedList) && !isReelsTabSelected
        if (isHome) {
            return InstagramScreenInspection(isHomeScreen = true, detectedReason = "Home feed active")
        }

        // 5. Explore tab check
        val hasExploreId = viewIds.any { id -> InstagramSelectors.EXPLORE_VIEW_IDS.any { id.contains(it) } }
        val isExplore = (isExploreTabSelected || hasExploreId) && !isReelsTabSelected
        if (isExplore) {
            return InstagramScreenInspection(isExploreScreen = true, detectedReason = "Explore active")
        }

        // 6. Stories viewer fallback (Only reached if NOT on Home Feed, NOT in DMs, NOT in Explore)
        if ((hasStoryProgress || hasStoryViewId || hasStoryDesc) && !isReelsTabSelected) {
            return InstagramScreenInspection(isStoriesScreen = true, detectedReason = "Stories viewer active")
        }

        // 7. Reels fallback (Only reached if NOT on Home Feed, NOT in DMs, NOT in Stories, NOT in Explore)
        if (hasClipsId || hasReelsDesc || hasReelsText) {
            val reason = when {
                hasReelsDesc -> "Reel description detected"
                hasReelsText -> "Reels keyword detected"
                else -> "Reels screen structure detected"
            }
            return InstagramScreenInspection(isReelsScreen = true, detectedReason = reason)
        }
        if (hasHomeActionBar || hasFeedList) {
            return InstagramScreenInspection(isHomeScreen = true, detectedReason = "Home feed active")
        }

        return InstagramScreenInspection()
    }

    enum class InstagramFeature(val id: String, val label: String) {
        REELS(InstagramSelectors.OPTION_REELS, "Reels"),
        STORIES(InstagramSelectors.OPTION_STORIES, "Stories"),
        EXPLORE(InstagramSelectors.OPTION_EXPLORE, "Explore tab"),
    }

    // --- YouTube In-App Short Form & Granular Blocking ---

    object YouTubeSelectors {
        const val OPTION_SHORTS = "yt_shorts"
        const val OPTION_HOME = "yt_home"
        const val OPTION_EXPLORE = "yt_explore"
        const val OPTION_COMMENTS = "yt_comments"

        val SHORTS_VIEW_IDS = listOf(
            "reel_recycler",
            "reel_watch_player",
            "shorts_player_fragment",
            "reel_player_page_holder",
            "reel_player_view",
            "reel_watch_fragment_root",
            "reel_player_underlay",
            "reel_watch_refresher",
            "reel_player_page_container",
            "reel_player_page_content",
            "reel_player_overlay_root",
            "reel_player_overlay_container",
            "reel_video_interactions",
            "reel_player_footer_container",
        )

        val SHORTS_KEYWORDS = listOf(
            "sound used in this short",
            "remix this short",
            "dislike this short",
            "see more videos using this sound",
        )
        val HOME_VIEW_IDS = listOf(
            "youtube_logo",
            "browse_fragment_layout_coordinator_layout",
            "pane_fragment_container",
        )

        val COMMENTS_VIEW_IDS = listOf(
            "panel_content_touch_wrapper",
            "comments_fragment",
            "comment_thread",
        )

        val COMMENTS_KEYWORDS = listOf(
            "about comments",
            "like this comment",
            "dislike this comment",
            "reply to comment",
            "add a comment",
            "comment...",
        )

        val EXPLORE_KEYWORDS = listOf(
            "explore",
            "trending",
        )

        val REGULAR_PLAYER_VIEW_IDS = listOf(
            "watch_player",
            "watch_while_time_bar_view",
            "watch_while_time_bar_view_overlay",
            "player_collapse_button",
            "player_control_play_pause_replay_button",
            "watch_panel",
            "watch_list",
            "autonav_toggle_button",
            "fullscreen_button",
        )

        val SEARCH_VIEW_IDS = listOf(
            "search_query",
            "search_edit_text",
            "search_clear",
            "voice_search",
            "edit_suggestion",
        )
    }

    data class YouTubeScreenInspection(
        val isShortsScreen: Boolean = false,
        val isHomeScreen: Boolean = false,
        val isCommentsScreen: Boolean = false,
        val isExploreScreen: Boolean = false,
        val isRegularVideoScreen: Boolean = false,
        val isSearchScreen: Boolean = false,
        val isSubscriptionsScreen: Boolean = false,
        val isLibraryScreen: Boolean = false,
        val detectedReason: String? = null,
    )

    fun inspectYouTubeScreen(
        viewIds: Set<String>,
        descriptions: List<String> = emptyList(),
        textList: List<String> = emptyList(),
        isShortsTabSelected: Boolean = false,
        isHomeTabSelected: Boolean = false,
        isSubscriptionsTabSelected: Boolean = false,
        isLibraryTabSelected: Boolean = false,
        isExploreTabSelected: Boolean = false,
        hasShortsLayout: Boolean = false,
        hasRegularVideoPlayer: Boolean = false,
        hasSearchQueryOrBar: Boolean = false,
        hasCommentsOpen: Boolean = false,
        hasYouTubeLogo: Boolean = false,
        hasFeedList: Boolean = false,
    ): YouTubeScreenInspection {
        val lowerDesc = descriptions.map { it.lowercase() }
        val lowerText = textList.map { it.lowercase() }

        // 1. Regular Video Player detection
        val hasRegularPlayerId = viewIds.any { id -> YouTubeSelectors.REGULAR_PLAYER_VIEW_IDS.any { id == it } }
        val isRegularVideo = hasRegularVideoPlayer || hasRegularPlayerId

        // 2. Comments Check (Takes priority if comments sheet is actively open over a video or short)
        val hasCommentViewId = viewIds.any { id -> YouTubeSelectors.COMMENTS_VIEW_IDS.any { id.contains(it) } }
        val hasCommentKeywords = lowerDesc.any { d -> YouTubeSelectors.COMMENTS_KEYWORDS.any { d.contains(it) } } ||
            lowerText.any { t -> YouTubeSelectors.COMMENTS_KEYWORDS.any { t.contains(it) } }
        val isComments = hasCommentsOpen || hasCommentViewId || (hasCommentKeywords && (isRegularVideo || hasShortsLayout))
        if (isComments) {
            return YouTubeScreenInspection(
                isCommentsScreen = true,
                isShortsScreen = (isShortsTabSelected || hasShortsLayout) && !isRegularVideo,
                isRegularVideoScreen = isRegularVideo,
                detectedReason = "YouTube comments panel open",
            )
        }

        // 3. Regular Video Player check (CRITICAL: Must never be blocked by Shorts or Home feed rules)
        if (isRegularVideo && !isShortsTabSelected) {
            return YouTubeScreenInspection(isRegularVideoScreen = true, detectedReason = "Regular video playback active")
        }

        // 4. Dedicated Shorts viewer / tab check
        val hasShortsViewId = viewIds.any { id -> YouTubeSelectors.SHORTS_VIEW_IDS.any { id == it } }
        val hasShortsDesc = lowerDesc.any { d -> YouTubeSelectors.SHORTS_KEYWORDS.any { d.contains(it) } }
        val isShorts = (isShortsTabSelected || hasShortsLayout || (hasShortsViewId && !isHomeTabSelected) || (hasShortsDesc && !isHomeTabSelected)) && !isRegularVideo
        if (isShorts) {
            val reason = when {
                isShortsTabSelected -> "Shorts tab selected"
                hasShortsLayout -> "Shorts layout container detected"
                hasShortsViewId -> "Shorts viewer structure detected"
                else -> "Shorts keyword detected"
            }
            return YouTubeScreenInspection(isShortsScreen = true, detectedReason = reason)
        }

        // 5. Search Screen check (CRITICAL: Search and Search Results MUST NOT be blocked by Home/Shorts rules)
        val hasSearchId = viewIds.any { id -> YouTubeSelectors.SEARCH_VIEW_IDS.any { id.contains(it) } }
        if (hasSearchQueryOrBar || hasSearchId) {
            return YouTubeScreenInspection(isSearchScreen = true, detectedReason = "YouTube search active")
        }

        // 6. Subscriptions & Library check (CRITICAL: Must not be blocked by Home/Shorts rules)
        if (isSubscriptionsTabSelected) {
            return YouTubeScreenInspection(isSubscriptionsScreen = true, detectedReason = "Subscriptions tab active")
        }
        if (isLibraryTabSelected) {
            return YouTubeScreenInspection(isLibraryScreen = true, detectedReason = "Library/You tab active")
        }

        // 7. Home Feed check (Home tab selected, or Home logo + feed list without video or search)
        val hasLogo = hasYouTubeLogo || viewIds.contains("youtube_logo")
        val isHome = isHomeTabSelected || (hasLogo && (hasFeedList || viewIds.contains("results")))
        if (isHome) {
            return YouTubeScreenInspection(isHomeScreen = true, detectedReason = "Home feed active")
        }

        // 8. Explore tab check
        val hasExploreDesc = lowerDesc.any { d -> YouTubeSelectors.EXPLORE_KEYWORDS.any { d.equals(it) || d.contains("explore") } } ||
            lowerText.any { t -> YouTubeSelectors.EXPLORE_KEYWORDS.any { t.equals(it) } }
        if (isExploreTabSelected || (hasExploreDesc && !hasLogo)) {
            return YouTubeScreenInspection(isExploreScreen = true, detectedReason = "Explore active")
        }

        return YouTubeScreenInspection()
    }

    enum class YouTubeFeature(val id: String, val label: String) {
        SHORTS(YouTubeSelectors.OPTION_SHORTS, "Shorts"),
        HOME(YouTubeSelectors.OPTION_HOME, "Home feed"),
        EXPLORE(YouTubeSelectors.OPTION_EXPLORE, "Explore tab"),
        COMMENTS(YouTubeSelectors.OPTION_COMMENTS, "Comments"),
    }

    data class FeedDetectionResult(
        val blocked: Boolean,
        val feature: InstagramFeature? = null,
        val youTubeFeature: YouTubeFeature? = null,
        val eyebrow: String = "Short-form paused",
        val title: String = "Feed restricted.",
        val description: String = "You chose to pause short-form feeds.",
    )

    /**
     * Determines whether a detected Instagram feature should be blocked given the configured options.
     * If options list is empty (legacy or general rule without sub-options specified),
     * short-form video (Reels) and Stories are blocked by default, while Explore is preserved.
     */
    fun shouldBlockInstagramFeature(
        detectedFeature: InstagramFeature,
        configuredOptions: List<String>,
    ): Boolean {
        if (configuredOptions.isEmpty()) {
            return detectedFeature == InstagramFeature.REELS || detectedFeature == InstagramFeature.STORIES
        }
        return configuredOptions.contains(detectedFeature.id)
    }

    /**
     * Determines whether a detected YouTube feature should be blocked given the configured options.
     * If options list is empty (legacy or general rule without sub-options specified),
     * YouTube Shorts is blocked by default, while Home feed, Explore, and Comments are preserved.
     */
    fun shouldBlockYouTubeFeature(
        detectedFeature: YouTubeFeature,
        configuredOptions: List<String>,
    ): Boolean {
        if (configuredOptions.isEmpty()) {
            return detectedFeature == YouTubeFeature.SHORTS
        }
        return configuredOptions.contains(detectedFeature.id)
    }
}
