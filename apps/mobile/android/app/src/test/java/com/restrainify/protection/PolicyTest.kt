package com.restrainify.protection

import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDate
import com.restrainify.protection.webfilter.DnsPacket

class PolicyTest {
    @Test fun domainBoundaries() {
        assertEquals("example.org", Policy.domain("https://EXAMPLE.org/path?q=x"))
        assertTrue(Policy.matches("www.example.org", "example.org"))
        assertFalse(Policy.matches("notexample.org", "example.org"))
        assertThrows(IllegalArgumentException::class.java) { Policy.domain("https://user:pass@example.org") }
    }
    @Test fun overnightSchedulesUsePreviousWeekday() {
        assertTrue(Policy.scheduled(60, 2, 22*60, 6*60, setOf(1)))
        assertFalse(Policy.scheduled(60, 1, 22*60, 6*60, setOf(1)))
        assertFalse(Policy.scheduled(6*60, 2, 22*60, 6*60, setOf(1)))
    }
    @Test fun relapsePreservesLongestHistory() {
        val result = Policy.recovery(LocalDate.parse("2026-08-01"), LocalDate.parse("2026-09-10"), setOf(LocalDate.parse("2026-09-09")))
        assertEquals(0L, result.current); assertEquals(39L, result.longest); assertEquals(29, result.cleanDays)
    }
    @Test fun newUserDoesNotGetThirtyFreeDays() {
        assertEquals(1, Policy.recovery(LocalDate.parse("2026-09-10"), LocalDate.parse("2026-09-10"), emptySet()).cleanDays)
    }
    @Test fun malformedPacketsAreIgnored() {
        for (size in 0..39) assertNull(DnsPacket.parse(ByteArray(size)))
        assertNull(DnsPacket.parse(ByteArray(128) { 0xff.toByte() }))
    }
    @Test fun adultDomainsAreDetected() {
        assertTrue(Policy.isKnownAdultDomain("pornhub.com"))
        assertTrue(Policy.isKnownAdultDomain("www.pornhub.com"))
        assertTrue(Policy.isKnownAdultDomain("sub.domain.xvideos.com"))
        assertTrue(Policy.isKnownAdultDomain("onlyfans.com"))
        assertTrue(Policy.isKnownAdultDomain("chaturbate.com"))
        assertFalse(Policy.isKnownAdultDomain("wikipedia.org"))
        assertFalse(Policy.isKnownAdultDomain("google.com"))
    }
    @Test fun safeSearchIpMapping() {
        assertArrayEquals(Policy.GOOGLE_SAFESEARCH_IP, Policy.safeSearchIp("google.com"))
        assertArrayEquals(Policy.GOOGLE_SAFESEARCH_IP, Policy.safeSearchIp("www.google.com"))
        assertArrayEquals(Policy.GOOGLE_SAFESEARCH_IP, Policy.safeSearchIp("google.co.uk"))
        assertArrayEquals(Policy.BING_SAFESEARCH_IP, Policy.safeSearchIp("bing.com"))
        assertArrayEquals(Policy.BING_SAFESEARCH_IP, Policy.safeSearchIp("www.bing.com"))
        assertArrayEquals(Policy.YOUTUBE_RESTRICTED_IP, Policy.safeSearchIp("youtube.com"))
        assertArrayEquals(Policy.YOUTUBE_RESTRICTED_IP, Policy.safeSearchIp("m.youtube.com"))
        assertArrayEquals(Policy.DUCKDUCKGO_SAFESEARCH_IP, Policy.safeSearchIp("duckduckgo.com"))
        assertNull(Policy.safeSearchIp("forcesafesearch.google.com"))
        assertNull(Policy.safeSearchIp("example.org"))
    }
    @Test fun proxyAndSocialDetection() {
        assertTrue(Policy.isProxyOrBypass("proxysite.com"))
        assertTrue(Policy.isProxyOrBypass("www.hide.me"))
        assertTrue(Policy.isProxyOrBypass("dns.google"))
        assertTrue(Policy.isProxyOrBypass("one.one.one.one"))
        assertTrue(Policy.isProxyOrBypass("doh.cleanbrowsing.org"))
        assertTrue(Policy.isProxyOrBypass("dns.controld.com"))
        assertFalse(Policy.isProxyOrBypass("restrainify.com"))

        assertTrue(Policy.isSocialWebsite("instagram.com"))
        assertTrue(Policy.isSocialWebsite("www.tiktok.com"))
        assertTrue(Policy.isSocialWebsite("x.com"))
        assertTrue(Policy.isSocialWebsite("fb.com"))
        assertTrue(Policy.isSocialWebsite("m.facebook.com"))
        assertTrue(Policy.isSocialWebsite("redd.it"))
        assertTrue(Policy.isSocialWebsite("t.co"))
        assertTrue(Policy.isSocialWebsite("threads.net"))
        assertTrue(Policy.isSocialWebsite("threads.com"))
        assertTrue(Policy.isSocialWebsite("pinterest.com"))
        assertTrue(Policy.isSocialWebsite("cdninstagram.com"))
        assertFalse(Policy.isSocialWebsite("github.com"))

        assertTrue(Policy.isSocialApp("com.instagram.android"))
        assertTrue(Policy.isSocialApp("com.instagram.barcelona"))
        assertTrue(Policy.isSocialApp("com.zhiliaoapp.musically"))
        assertTrue(Policy.isSocialApp("com.facebook.katana"))
        assertTrue(Policy.isSocialApp("com.twitter.android"))
        assertTrue(Policy.isSocialApp("com.reddit.frontpage"))
        assertTrue(Policy.isSocialApp("com.snapchat.android"))
        assertTrue(Policy.isSocialApp("com.pinterest"))
        assertTrue(Policy.isSocialApp("com.instagram.lite"))
        assertTrue(Policy.isSocialApp("com.linkedin.android"))
        assertTrue(Policy.isSocialApp("com.bereal.ft"))
        assertFalse(Policy.isSocialApp("com.google.android.youtube"))
        assertFalse(Policy.isSocialApp("com.android.settings"))
        assertFalse(Policy.isSocialApp(null))
    }
    @Test fun extractHostFromAddressBar() {
        assertEquals("instagram.com", Policy.extractHost("instagram.com"))
        assertEquals("www.instagram.com", Policy.extractHost("https://www.instagram.com/reels"))
        assertEquals("m.facebook.com", Policy.extractHost("http://m.facebook.com/watch"))
        assertEquals("tiktok.com", Policy.extractHost("tiktok.com/@creator"))
        assertEquals("x.com", Policy.extractHost("https://x.com/home"))
        assertEquals("reddit.com", Policy.extractHost("reddit.com/r/technology"))
        assertEquals("threads.net", Policy.extractHost("threads.net/@user"))
        assertNull(Policy.extractHost("Search or enter web address"))
        assertNull(Policy.extractHost(""))
        assertNull(Policy.extractHost(null))
        assertNull(Policy.extractHost("not a url at all"))
        assertNull(Policy.extractHost("192.168.1.1"))
    }
    @Test fun dnsPacketSynthesisAndBlockInspection() {
        val qname = byteArrayOf(6, 'g'.code.toByte(), 'o'.code.toByte(), 'o'.code.toByte(), 'g'.code.toByte(), 'l'.code.toByte(), 'e'.code.toByte(), 3, 'c'.code.toByte(), 'o'.code.toByte(), 'm'.code.toByte(), 0)
        val dnsBytes = ByteArray(12 + qname.size + 4)
        dnsBytes[0] = 0x12; dnsBytes[1] = 0x34
        dnsBytes[2] = 0x01; dnsBytes[3] = 0x00 // standard query
        dnsBytes[4] = 0x00; dnsBytes[5] = 0x01 // 1 question
        qname.copyInto(dnsBytes, 12)
        val qpos = 12 + qname.size
        dnsBytes[qpos] = 0x00; dnsBytes[qpos + 1] = 0x01 // QTYPE = A
        dnsBytes[qpos + 2] = 0x00; dnsBytes[qpos + 3] = 0x01 // QCLASS = IN

        val packet = ByteArray(28 + dnsBytes.size)
        packet[0] = 0x45
        packet[2] = (packet.size ushr 8).toByte(); packet[3] = packet.size.toByte()
        packet[9] = 17 // UDP
        packet[20] = 0x30; packet[21] = 0x39 // src port
        packet[22] = 0x00; packet[23] = 53 // dst port 53
        val udpLen = 8 + dnsBytes.size
        packet[24] = (udpLen ushr 8).toByte(); packet[25] = udpLen.toByte()
        dnsBytes.copyInto(packet, 28)

        val query = DnsPacket.parse(packet)
        assertNotNull(query)
        assertEquals("google.com", query!!.host)
        assertEquals(1, query.qtype)

        val safe = DnsPacket.syntheticA(query, Policy.GOOGLE_SAFESEARCH_IP)
        assertFalse(DnsPacket.isBlockedResponse(safe))

        val blocked = DnsPacket.syntheticA(query, byteArrayOf(0, 0, 0, 0))
        assertTrue(DnsPacket.isBlockedResponse(blocked))

        val nodata = DnsPacket.nodata(query)
        assertFalse(DnsPacket.isBlockedResponse(nodata))
    }
    @Test fun evaluateDnsPolicyVerdicts() {
        val rules = listOf(
            Policy.DomainRule("work.example.com", allow = true, enabled = true),
            Policy.DomainRule("custom-blocked.com", allow = false, enabled = true),
            Policy.DomainRule("disabled.com", allow = false, enabled = false)
        )

        // Allowed rule forwards to unfiltered resolver
        val allowed = Policy.evaluateDns("work.example.com", 1, rules, safeSearch = true, proxyResistance = true, socialWebsites = true)
        assertTrue(allowed is Policy.DnsVerdict.Forward && allowed.upstream == "1.1.1.1")

        // Explicit block rule blocks
        val explicitBlocked = Policy.evaluateDns("custom-blocked.com", 1, rules, safeSearch = true, proxyResistance = true, socialWebsites = false)
        assertTrue(explicitBlocked is Policy.DnsVerdict.Block)

        // Adult domain blocks
        val adultBlocked = Policy.evaluateDns("pornhub.com", 1, rules, safeSearch = true, proxyResistance = true, socialWebsites = false)
        assertTrue(adultBlocked is Policy.DnsVerdict.Block)

        // Proxy resistance blocks
        val proxyBlocked = Policy.evaluateDns("proxysite.com", 1, rules, safeSearch = true, proxyResistance = true, socialWebsites = false)
        assertTrue(proxyBlocked is Policy.DnsVerdict.Block)

        // Social websites blocks when enabled
        val socialBlocked = Policy.evaluateDns("instagram.com", 1, rules, safeSearch = true, proxyResistance = true, socialWebsites = true)
        assertTrue(socialBlocked is Policy.DnsVerdict.Block)

        // Social websites allowed when disabled
        val socialAllowed = Policy.evaluateDns("instagram.com", 1, rules, safeSearch = false, proxyResistance = false, socialWebsites = false)
        assertTrue(socialAllowed is Policy.DnsVerdict.Forward && socialAllowed.upstream == "1.1.1.3")

        // SafeSearch VIP synthesis
        val safeSearch = Policy.evaluateDns("google.com", 1, rules, safeSearch = true, proxyResistance = true, socialWebsites = false)
        assertTrue(safeSearch is Policy.DnsVerdict.SafeSearch && safeSearch.ip.contentEquals(Policy.GOOGLE_SAFESEARCH_IP))

        // Default ordinary domain forwards to Cloudflare Families
        val ordinary = Policy.evaluateDns("wikipedia.org", 1, rules, safeSearch = true, proxyResistance = true, socialWebsites = false)
        assertTrue(ordinary is Policy.DnsVerdict.Forward && ordinary.upstream == "1.1.1.3")
    }

    @Test fun appLimitNoLimitConfigured() {
        val verdictZero = Policy.evaluateLimit(0, 100_000L, 100_000L, 50_000L)
        assertFalse(verdictZero.exceeded)
        assertEquals(Long.MAX_VALUE, verdictZero.remainingMs)

        val verdictNegative = Policy.evaluateLimit(-1, 100_000L, 100_000L, 50_000L)
        assertFalse(verdictNegative.exceeded)
        assertEquals(Long.MAX_VALUE, verdictNegative.remainingMs)
    }

    @Test fun appLimitUnderAllowanceWithoutSession() {
        // Limit: 30 minutes (1,800,000 ms), Used so far: 10 minutes (600,000 ms)
        val verdict = Policy.evaluateLimit(30, 600_000L, 600_000L, 0L)
        assertFalse(verdict.exceeded)
        assertEquals(600_000L, verdict.effectiveUsageMs)
        assertEquals(1_200_000L, verdict.remainingMs)
    }

    @Test fun appLimitMidSessionEnforcementWithoutOsFlush() {
        // Limit: 30 minutes (1,800,000 ms)
        // Baseline from UsageStatsManager when session started: 28 minutes (1,680,000 ms)
        // UsageStatsManager has NOT flushed yet (currentUsageStats == 1,680,000 ms)
        // Active session elapsed: 2 minutes (120,000 ms)
        val verdict = Policy.evaluateLimit(30, 1_680_000L, 1_680_000L, 120_000L)
        assertTrue(verdict.exceeded)
        assertEquals(1_800_000L, verdict.effectiveUsageMs)
        assertEquals(0L, verdict.remainingMs)
    }

    @Test fun appLimitMidSessionPartialFlushDoesNotDoubleCount() {
        // Limit: 30 minutes (1,800,000 ms)
        // Baseline: 20 minutes (1,200,000 ms)
        // Active session elapsed: 5 minutes (300,000 ms)
        // OS partially flushed 2 minutes: currentUsageStats = 22 minutes (1,320,000 ms)
        // Effective should be 20m baseline + 5m session = 25 minutes (1,500,000 ms)
        val verdict = Policy.evaluateLimit(30, 1_320_000L, 1_200_000L, 300_000L)
        assertFalse(verdict.exceeded)
        assertEquals(1_500_000L, verdict.effectiveUsageMs)
        assertEquals(300_000L, verdict.remainingMs)
    }

    @Test fun appLimitMidSessionFullFlush() {
        // Limit: 30 minutes (1,800,000 ms)
        // Baseline: 20 minutes (1,200,000 ms)
        // Active session elapsed: 10 minutes (600,000 ms)
        // OS fully flushed 10 minutes: currentUsageStats = 30 minutes (1,800,000 ms)
        val verdict = Policy.evaluateLimit(30, 1_800_000L, 1_200_000L, 600_000L)
        assertTrue(verdict.exceeded)
        assertEquals(1_800_000L, verdict.effectiveUsageMs)
        assertEquals(0L, verdict.remainingMs)
    }

    @Test fun appLimitAlreadyExceededAtStart() {
        // Limit: 30 minutes (1,800,000 ms)
        // Baseline & Current: 40 minutes (2,400,000 ms)
        val verdict = Policy.evaluateLimit(30, 2_400_000L, 2_400_000L, 0L)
        assertTrue(verdict.exceeded)
        assertEquals(2_400_000L, verdict.effectiveUsageMs)
        assertEquals(0L, verdict.remainingMs)
    }

    @Test fun transientPackageDetection() {
        // System packages must be transient
        assertTrue(Policy.isTransientPackage("com.android.systemui"))
        assertTrue(Policy.isTransientPackage("android"))
        assertTrue(Policy.isTransientPackage("com.google.android.permissioncontroller"))
        assertTrue(Policy.isTransientPackage("com.android.permissioncontroller"))
        assertTrue(Policy.isTransientPackage("com.google.android.gms"))
        assertTrue(Policy.isTransientPackage("com.facebook.services"))
        assertTrue(Policy.isTransientPackage("com.facebook.appmanager"))
        assertTrue(Policy.isTransientPackage(""))

        // Common keyboards / IMEs must be transient
        assertTrue(Policy.isTransientPackage("com.google.android.inputmethod.latin"))
        assertTrue(Policy.isTransientPackage("com.samsung.android.honeyboard"))
        assertTrue(Policy.isTransientPackage("com.touchtype.swiftkey"))
        assertTrue(Policy.isTransientPackage("com.syntellia.fleksy.keyboard"))
        assertTrue(Policy.isTransientPackage("com.custom.thirdparty.keyboard"))

        // Custom device IMEs passed from InputMethodManager
        assertTrue(Policy.isTransientPackage("com.oem.special.ime", setOf("com.oem.special.ime")))

        // User applications and launchers must NOT be transient
        assertFalse(Policy.isTransientPackage("com.instagram.android"))
        assertFalse(Policy.isTransientPackage("com.google.android.youtube"))
        assertFalse(Policy.isTransientPackage("com.zhiliaoapp.musically"))
        assertFalse(Policy.isTransientPackage("com.google.android.apps.nexuslauncher"))
        assertFalse(Policy.isTransientPackage("com.sec.android.app.launcher"))
        assertFalse(Policy.isTransientPackage("com.android.launcher3"))
    }

    @Test fun monotonicUsageClockRollbackProtection() {
        // Usage naturally progresses: 20m -> 35m
        assertEquals(35 * 60_000L, Policy.monotonicUsage(35 * 60_000L, 20 * 60_000L))

        // Clock rolled backwards: reported usage drops to 10m, but 45m was already observed
        assertEquals(45 * 60_000L, Policy.monotonicUsage(10 * 60_000L, 45 * 60_000L))

        // Timezone shifted backward or midnight query returned 0: maintains 50m
        assertEquals(50 * 60_000L, Policy.monotonicUsage(0L, 50 * 60_000L))
    }

    @Test fun normalizeBlockHostVariations() {
        // Adult site subdomains normalize to the root adult domain
        assertEquals("pornhub.com", Policy.normalizeBlockHost("pornhub.com"))
        assertEquals("pornhub.com", Policy.normalizeBlockHost("www.pornhub.com"))
        assertEquals("pornhub.com", Policy.normalizeBlockHost("static.pornhub.com"))
        assertEquals("pornhub.com", Policy.normalizeBlockHost("ci.pornhub.com."))
        assertEquals("xvideos.com", Policy.normalizeBlockHost("sub.domain.xvideos.com"))

        // Custom domain rules normalize to the configured rule host
        val rules = listOf(
            Policy.DomainRule("custom-blocked.com", allow = false, enabled = true),
            Policy.DomainRule("disabled.com", allow = false, enabled = false)
        )
        assertEquals("custom-blocked.com", Policy.normalizeBlockHost("custom-blocked.com", rules))
        assertEquals("custom-blocked.com", Policy.normalizeBlockHost("www.custom-blocked.com", rules))
        assertEquals("custom-blocked.com", Policy.normalizeBlockHost("api.custom-blocked.com", rules))

        // Disabled rules do not normalize non-adult domains
        assertEquals("disabled.com", Policy.normalizeBlockHost("www.disabled.com", rules))

        // Generic domains strip www. and m. prefixes
        assertEquals("example.org", Policy.normalizeBlockHost("www.example.org"))
        assertEquals("example.org", Policy.normalizeBlockHost("m.example.org"))
        assertEquals("example.org", Policy.normalizeBlockHost("example.org"))
        assertEquals("example.org", Policy.normalizeBlockHost("  EXAMPLE.ORG.  "))
    }

    @Test fun shouldRecordBlockCooldownDebounce() {
        val now = 100_000L

        // First block for a host (lastRecordedMs == null) must be recorded
        assertTrue(Policy.shouldRecordBlock(null, now))

        // Immediate retry (10ms later) must be suppressed (within 10s cooldown)
        assertFalse(Policy.shouldRecordBlock(now, now + 10L))

        // Parallel AAAA / HTTPS queries (500ms later) must be suppressed
        assertFalse(Policy.shouldRecordBlock(now, now + 500L))

        // Subsequent queries within cooldown (9,999ms later) must be suppressed
        assertFalse(Policy.shouldRecordBlock(now, now + 9_999L))

        // Queries at exactly the cooldown threshold (10,000ms later) must be recorded
        assertTrue(Policy.shouldRecordBlock(now, now + 10_000L))

        // Queries well after the cooldown threshold (30,000ms later) must be recorded
        assertTrue(Policy.shouldRecordBlock(now, now + 30_000L))

        // Clock rollback safety: if clock rolls backwards, must record to avoid permanent lock
        assertTrue(Policy.shouldRecordBlock(now, now - 5_000L))

        // Custom cooldown window
        assertFalse(Policy.shouldRecordBlock(now, now + 2_000L, cooldownMs = 5_000L))
        assertTrue(Policy.shouldRecordBlock(now, now + 5_000L, cooldownMs = 5_000L))
    }
}

