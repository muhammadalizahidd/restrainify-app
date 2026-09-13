package com.restrainify.protection

import java.net.IDN
import java.net.URI
import java.time.LocalDate
import java.time.temporal.ChronoUnit

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

        if (socialWebsites && isSocialWebsite(h)) {
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

    // Social website domains
    val KNOWN_SOCIAL_DOMAINS =
        setOf(
            "instagram.com",
            "facebook.com",
            "tiktok.com",
            "twitter.com",
            "x.com",
            "reddit.com",
            "snapchat.com",
            "pinterest.com",
            "threads.net",
        )

    fun isSocialWebsite(host: String): Boolean {
        val h = host.lowercase().trimEnd('.')
        return KNOWN_SOCIAL_DOMAINS.any { matches(h, it) }
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
        )

    fun isTransientPackage(pkg: String, customImes: Set<String> = emptySet()): Boolean {
        val lower = pkg.lowercase().trim()
        if (lower in KNOWN_TRANSIENT_PACKAGES || lower in customImes) return true
        if (lower.contains("inputmethod") || lower.contains("keyboard") ||
            lower.contains("honeyboard") || lower.contains("swiftkey") || lower.contains("gboard")
        ) {
            return true
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
}
