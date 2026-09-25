package com.restrainify.protection

import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDate
import com.restrainify.protection.webfilter.DnsCache
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

        // Known feed packages
        assertTrue(Policy.isKnownFeedPackage("com.instagram.android"))
        assertTrue(Policy.isKnownFeedPackage("com.google.android.youtube"))
        assertTrue(Policy.isKnownFeedPackage("com.facebook.katana"))
        assertTrue(Policy.isKnownFeedPackage("com.snapchat.android"))
        assertTrue(Policy.isKnownFeedPackage("com.zhiliaoapp.musically"))
        assertFalse(Policy.isKnownFeedPackage("com.android.settings"))

        // Host to package resolution
        assertEquals("com.instagram.android", Policy.socialHostToPackage("instagram.com"))
        assertEquals("com.instagram.android", Policy.socialHostToPackage("www.instagram.com"))
        assertEquals("com.instagram.android", Policy.socialHostToPackage("cdninstagram.com"))
        assertEquals("com.instagram.android", Policy.socialHostToPackage("threads.net"))
        assertEquals("com.facebook.katana", Policy.socialHostToPackage("facebook.com"))
        assertEquals("com.facebook.katana", Policy.socialHostToPackage("m.facebook.com"))
        assertEquals("com.zhiliaoapp.musically", Policy.socialHostToPackage("tiktok.com"))
        assertEquals("com.google.android.youtube", Policy.socialHostToPackage("youtube.com"))
        assertEquals("com.snapchat.android", Policy.socialHostToPackage("snapchat.com"))
        assertEquals("com.twitter.android", Policy.socialHostToPackage("x.com"))
        assertNull(Policy.socialHostToPackage("github.com"))

        // Social app & host exemptions
        val exemptRules = listOf(
            Policy.AppRule("com.instagram.android", enabled = false, feedMode = "off"),
            Policy.AppRule("com.google.android.youtube", enabled = true, feedMode = "experimental"),
            Policy.AppRule("com.facebook.katana", enabled = true, limitMinutes = 30, feedMode = "off"),
        )
        // Instagram is exempt (enabled=false, feedMode=off)
        assertTrue(Policy.isSocialAppExempt("com.instagram.android", exemptRules))
        assertTrue(Policy.isSocialAppExempt("com.instagram.lite", exemptRules))
        assertTrue(Policy.isSocialAppExempt("com.instagram.barcelona", exemptRules))
        assertTrue(Policy.isSocialHostExempt("instagram.com", exemptRules))
        assertTrue(Policy.isSocialHostExempt("www.instagram.com", exemptRules))
        assertTrue(Policy.isSocialHostExempt("threads.net", exemptRules))

        // Facebook is exempt because feedMode is "off"
        assertTrue(Policy.isSocialAppExempt("com.facebook.katana", exemptRules))
        assertTrue(Policy.isSocialHostExempt("facebook.com", exemptRules))

        // YouTube has feedMode "experimental" (not exempt)
        assertFalse(Policy.isSocialAppExempt("com.google.android.youtube", exemptRules))

        // TikTok has no rule (not exempt)
        assertFalse(Policy.isSocialAppExempt("com.zhiliaoapp.musically", exemptRules))
        assertFalse(Policy.isSocialHostExempt("tiktok.com", exemptRules))
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

        // Social websites blocks when enabled and no exemption
        val socialBlocked = Policy.evaluateDns("instagram.com", 1, rules, safeSearch = true, proxyResistance = true, socialWebsites = true)
        assertTrue(socialBlocked is Policy.DnsVerdict.Block)

        // Social websites allows when app rule is disabled/exempt
        val appExemptRules = listOf(Policy.AppRule("com.instagram.android", enabled = false, feedMode = "off"))
        val socialExempt = Policy.evaluateDns("instagram.com", 1, rules, safeSearch = true, proxyResistance = true, socialWebsites = true, appRules = appExemptRules)
        assertTrue(socialExempt is Policy.DnsVerdict.Forward && socialExempt.upstream == "1.1.1.3")

        // Subdomain cdninstagram.com is also allowed when Instagram is exempt
        val cdnExempt = Policy.evaluateDns("scontent.cdninstagram.com", 1, rules, safeSearch = true, proxyResistance = true, socialWebsites = true, appRules = appExemptRules)
        assertTrue(cdnExempt is Policy.DnsVerdict.Forward && cdnExempt.upstream == "1.1.1.3")

        // Non-exempt social domain (tiktok.com) is still blocked
        val tiktokBlocked = Policy.evaluateDns("tiktok.com", 1, rules, safeSearch = true, proxyResistance = true, socialWebsites = true, appRules = appExemptRules)
        assertTrue(tiktokBlocked is Policy.DnsVerdict.Block)

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

    @Test fun dnsPacketIpv6ParseAndResponse() {
        val dnsBytes = byteArrayOf(
            0x12, 0x34, // tx id
            0x01, 0x00, // standard query
            0x00, 0x01, // 1 question
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x07, 'e'.code.toByte(), 'x'.code.toByte(), 'a'.code.toByte(), 'm'.code.toByte(), 'p'.code.toByte(), 'l'.code.toByte(), 'e'.code.toByte(),
            0x03, 'c'.code.toByte(), 'o'.code.toByte(), 'm'.code.toByte(),
            0x00, // end name
            0x00, 0x01, // qtype A
            0x00, 0x01  // qclass IN
        )
        val udpLen = 8 + dnsBytes.size
        val packet = ByteArray(40 + udpLen)

        // IPv6 Header (40 bytes)
        packet[0] = 0x60 // Version 6
        packet[4] = (udpLen ushr 8).toByte()
        packet[5] = udpLen.toByte()
        packet[6] = 17 // Next header: UDP
        packet[7] = 64 // Hop limit
        // Source IPv6 (bytes 8..23) = 2001:db8::1
        packet[8] = 0x20; packet[9] = 0x01; packet[10] = 0x0d; packet[11] = 0xb8.toByte(); packet[23] = 0x01
        // Dest IPv6 (bytes 24..39) = fd00:1111::2
        packet[24] = 0xfd.toByte(); packet[26] = 0x11; packet[27] = 0x11; packet[39] = 0x02

        // UDP Header (8 bytes) at offset 40
        packet[40] = 0xd4.toByte(); packet[41] = 0x31 // src port 54321
        packet[42] = 0x00; packet[43] = 53 // dst port 53
        packet[44] = (udpLen ushr 8).toByte()
        packet[45] = udpLen.toByte()
        packet[46] = 0; packet[47] = 0 // Checksum

        dnsBytes.copyInto(packet, 48)

        val query = DnsPacket.parse(packet)
        assertNotNull(query)
        assertTrue(query!!.isIpv6)
        assertEquals("example.com", query.host)
        assertEquals(1, query.qtype)

        val safe = DnsPacket.syntheticA(query, byteArrayOf(93.toByte(), 184.toByte(), 216.toByte(), 34.toByte()))
        val response = DnsPacket.response(query, safe)
        assertEquals(0x60, response[0].toInt() and 0xF0) // IPv6 version
        assertEquals(17, response[6].toInt()) // Next Header: UDP
        assertEquals(53, ((response[40].toInt() and 255) shl 8) or (response[41].toInt() and 255)) // src port 53
        assertEquals(54321, ((response[42].toInt() and 255) shl 8) or (response[43].toInt() and 255)) // dst port 54321
        val checksum = ((response[46].toInt() and 255) shl 8) or (response[47].toInt() and 255)
        assertNotEquals(0, checksum) // IPv6 requires valid non-zero UDP checksum
    }

    @Test fun dnsPacketTtlExtraction() {
        val queryDns = byteArrayOf(
            0x12, 0x34, 0x81.toByte(), 0x80.toByte(),
            0x00, 0x01, // 1 question
            0x00, 0x01, // 1 answer
            0x00, 0x00, 0x00, 0x00,
            // Question: test.com
            0x04, 't'.code.toByte(), 'e'.code.toByte(), 's'.code.toByte(), 't'.code.toByte(),
            0x03, 'c'.code.toByte(), 'o'.code.toByte(), 'm'.code.toByte(), 0x00,
            0x00, 0x01, 0x00, 0x01,
            // Answer: pointer to test.com, type A, class IN, TTL 600, len 4, 1.2.3.4
            0xc0.toByte(), 0x0c.toByte(),
            0x00, 0x01, 0x00, 0x01,
            0x00, 0x00, 0x02, 0x58.toByte(), // TTL = 600s
            0x00, 0x04,
            0x01, 0x02, 0x03, 0x04
        )
        val extracted = DnsPacket.extractTtl(queryDns)
        assertEquals(600, extracted)

        // Min clamp check (under 10 clamped to 10)
        val shortTtlDns = queryDns.clone()
        shortTtlDns[34] = 0x00; shortTtlDns[35] = 0x03 // TTL = 3s
        assertEquals(10, DnsPacket.extractTtl(shortTtlDns))
    }

    @Test fun dnsCacheHitAndExpiration() {
        var currentTime = 1_000_000L
        val cache = DnsCache(maxEntries = 10, clock = { currentTime })

        val mockResponse = byteArrayOf(0x99.toByte(), 0x88.toByte(), 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A)
        cache.put("api.example.com", 1, mockResponse, ttlSeconds = 30)

        // Cache hit: Transaction ID is rewritten to match the client's TxID
        val hit = cache.get("api.example.com", 1, 0x12.toByte(), 0x34.toByte())
        assertNotNull(hit)
        assertEquals(0x12.toByte(), hit!![0])
        assertEquals(0x34.toByte(), hit[1])
        assertEquals(mockResponse.size, hit.size)

        // Case insensitivity
        val hitUpper = cache.get("API.EXAMPLE.COM", 1, 0xAA.toByte(), 0xBB.toByte())
        assertNotNull(hitUpper)
        assertEquals(0xAA.toByte(), hitUpper!![0])

        // Advance time before expiry (29 seconds)
        currentTime += 29_000L
        assertNotNull(cache.get("api.example.com", 1, 0x01.toByte(), 0x02.toByte()))

        // Advance time past expiry (total 31 seconds)
        currentTime += 2_000L
        assertNull(cache.get("api.example.com", 1, 0x01.toByte(), 0x02.toByte()))
    }

    @Test fun dnsCacheCapacityLruEviction() {
        val cache = DnsCache(maxEntries = 2)
        val dummy = ByteArray(16) { it.toByte() }

        cache.put("first.com", 1, dummy, 300)
        cache.put("second.com", 1, dummy, 300)
        assertEquals(2, cache.size)

        // Access first.com so second.com becomes LRU
        assertNotNull(cache.get("first.com", 1, 0.toByte(), 0.toByte()))

        // Put third.com -> second.com should be evicted
        cache.put("third.com", 1, dummy, 300)
        assertEquals(2, cache.size)

        assertNotNull(cache.get("first.com", 1, 0.toByte(), 0.toByte()))
        assertNotNull(cache.get("third.com", 1, 0.toByte(), 0.toByte()))
        assertNull(cache.get("second.com", 1, 0.toByte(), 0.toByte()))
    }

    @Test fun instagramFeatureBlockingOptions() {
        // 1. Granular: only Reels selected
        val onlyReels = listOf("ig_reels")
        assertTrue(Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.REELS, onlyReels))
        assertFalse(Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.STORIES, onlyReels))
        assertFalse(Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.EXPLORE, onlyReels))

        // 2. Granular: only Stories selected
        val onlyStories = listOf("ig_stories")
        assertFalse(Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.REELS, onlyStories))
        assertTrue(Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.STORIES, onlyStories))
        assertFalse(Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.EXPLORE, onlyStories))

        // 3. Granular: Explore tab selected
        val exploreOnly = listOf("ig_explore")
        assertFalse(Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.REELS, exploreOnly))
        assertFalse(Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.STORIES, exploreOnly))
        assertTrue(Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.EXPLORE, exploreOnly))

        // 4. Default / Legacy rule (empty options list): Blocks Reels & Stories, preserves Explore
        val defaultEmpty = emptyList<String>()
        assertTrue(Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.REELS, defaultEmpty))
        assertTrue(Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.STORIES, defaultEmpty))
        assertFalse(Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.EXPLORE, defaultEmpty))

        // 5. Combined: Reels and Stories
        val reelsAndStories = listOf("ig_reels", "ig_stories")
        assertTrue(Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.REELS, reelsAndStories))
        assertTrue(Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.STORIES, reelsAndStories))
        assertFalse(Policy.shouldBlockInstagramFeature(Policy.InstagramFeature.EXPLORE, reelsAndStories))

        // 6. AppRule with options field preservation
        val rule = Policy.AppRule(
            packageName = "com.instagram.android",
            enabled = true,
            feedMode = "experimental",
            options = listOf("ig_reels", "ig_stories", "ig_explore"),
        )
        assertEquals(3, rule.options.size)
        assertTrue(rule.options.contains("ig_reels"))
        assertTrue(rule.options.contains("ig_stories"))
        assertTrue(rule.options.contains("ig_explore"))

        // 7. Verify Selector Collections include canonical Instagram containers
        assertTrue(Policy.InstagramSelectors.REELS_VIEW_IDS.contains("clips_viewer_view_pager"))
        assertTrue(Policy.InstagramSelectors.REELS_VIEW_IDS.contains("clips_video_container"))
        assertTrue(Policy.InstagramSelectors.STORIES_VIEW_IDS.contains("reel_viewer_container"))
        assertTrue(Policy.InstagramSelectors.STORIES_VIEW_IDS.contains("segments_progress_bar"))
        assertTrue(Policy.InstagramSelectors.EXPLORE_VIEW_IDS.contains("explore_grid"))
    }

    @Test fun instagramReelsScreenDetection() {
        // 1. Bottom navigation: Reels tab selected
        val reelsTabInspection = Policy.inspectInstagramScreen(
            viewIds = setOf("tab_bar", "tab_button"),
            descriptions = listOf("reels, tab 4 of 5"),
            isReelsTabSelected = true,
        )
        assertTrue(reelsTabInspection.isReelsScreen)
        assertFalse(reelsTabInspection.isHomeScreen)
        assertFalse(reelsTabInspection.isDmScreen)

        // 2. Full-screen clips view pager layout (e.g. opened from home feed or direct link)
        val clipsPagerInspection = Policy.inspectInstagramScreen(
            viewIds = setOf("clips_viewer_view_pager", "clips_item_container"),
            descriptions = listOf("video player"),
        )
        assertTrue(clipsPagerInspection.isReelsScreen)
        assertEquals("Clips layout container detected", clipsPagerInspection.detectedReason)

        // 3. Reels content description ("Reel by...")
        val reelDescInspection = Policy.inspectInstagramScreen(
            viewIds = setOf("media_item"),
            descriptions = listOf("Reel by natgeo", "Original audio - Arctic Wonders"),
        )
        assertTrue(reelDescInspection.isReelsScreen)
        assertEquals("Reel description detected", reelDescInspection.detectedReason)

        // 4. Reels keywords (watch reel, original audio)
        val audioKeywordInspection = Policy.inspectInstagramScreen(
            viewIds = setOf("media_container"),
            descriptions = listOf("audio is unavailable"),
            textList = listOf("use audio"),
            isHomeTabSelected = false,
        )
        assertTrue(audioKeywordInspection.isReelsScreen)

        // 5. Header title is "Reels"
        val headerTitleInspection = Policy.inspectInstagramScreen(
            viewIds = setOf("clips_viewer_title"),
            textList = listOf("reels"),
            isHomeTabSelected = false,
        )
        assertTrue(headerTitleInspection.isReelsScreen)
    }

    @Test fun instagramNonReelsScreensPreservation() {
        // 1. Direct Messages screen: NEVER blocked even if text has keywords
        val dmInspection = Policy.inspectInstagramScreen(
            viewIds = setOf("row_thread_composer_edittext", "action_bar_title"),
            descriptions = listOf("type a message...", "voice message"),
            textList = listOf("Hey check out this reel!"),
        )
        assertTrue(dmInspection.isDmScreen)
        assertFalse(dmInspection.isReelsScreen)

        // 2. Home Feed: Home tab selected with Instagram action bar (Inbox DM icon)
        val homeInspection = Policy.inspectInstagramScreen(
            viewIds = setOf("action_bar_inbox_button", "action_bar_textview_custom_title_container"),
            descriptions = listOf("home, tab 1 of 5"),
            isHomeTabSelected = true,
            hasHomeActionBar = true,
        )
        assertTrue(homeInspection.isHomeScreen)
        assertFalse(homeInspection.isReelsScreen)
        assertFalse(homeInspection.isStoriesScreen)

        // 3. Stories Viewer: Story segments progress bar active
        val storyInspection = Policy.inspectInstagramScreen(
            viewIds = setOf("segments_progress_bar", "reel_viewer_texture_view"),
            descriptions = listOf("story by photographer", "reply to photographer..."),
            isReelsTabSelected = false,
        )
        assertTrue(storyInspection.isStoriesScreen)
        assertFalse(storyInspection.isReelsScreen)

        // 4. Explore tab: Explore grid active
        val exploreInspection = Policy.inspectInstagramScreen(
            viewIds = setOf("explore_grid_scrollview", "explore_grid"),
            descriptions = listOf("search and explore, tab 2 of 5"),
            isExploreTabSelected = true,
        )
        assertTrue(exploreInspection.isExploreScreen)
        assertFalse(exploreInspection.isReelsScreen)

        // 5. Main Page (Home feed) with inline reel post preview and bottom Reels tab icon: MUST NOT BE BLOCKED
        val mainPageInspection = Policy.inspectInstagramScreen(
            viewIds = setOf("action_bar_inbox_button", "stories_tray", "feed_recycler_view"),
            descriptions = listOf("Instagram", "Reels, tab 4 of 5", "Reel by friend_account", "Like", "Comment"),
            textList = listOf("Sponsored", "original audio", "View all 12 comments"),
            hasHomeActionBar = true,
            isHomeTabSelected = true,
            isReelsTabSelected = false,
        )
        assertTrue(mainPageInspection.isHomeScreen)
        assertFalse(mainPageInspection.isReelsScreen)

        // 6. Transition from Reels back to Home feed: must cleanly detect Home and drop Reels state
        val backToHomeInspection = Policy.inspectInstagramScreen(
            viewIds = setOf("action_bar_inbox_button", "main_feed", "stories_tray"),
            descriptions = listOf("Home", "Stories tray", "Like"),
            textList = listOf("Instagram"),
            hasHomeActionBar = true,
            hasFeedList = true,
            isHomeTabSelected = true,
            isReelsTabSelected = false,
        )
        assertTrue(backToHomeInspection.isHomeScreen)
        assertFalse(backToHomeInspection.isReelsScreen)
        assertEquals("Home feed active", backToHomeInspection.detectedReason)

        // 7. Transition back to Home when clips viewer viewIds remain cached in view hierarchy:
        // Active Home indicators must take precedence over detached/cached clips viewer IDs
        val backToHomeWithCachedClips = Policy.inspectInstagramScreen(
            viewIds = setOf("clips_viewer_view_pager", "clips_viewer_container", "action_bar_inbox_button", "main_feed", "stories_tray"),
            descriptions = listOf("Home, tab 1 of 5", "Reels, tab 4 of 5", "Reel by friend"),
            textList = listOf("Instagram", "original audio"),
            hasHomeActionBar = true,
            hasFeedList = true,
            isHomeTabSelected = true,
            isReelsTabSelected = false,
            hasDedicatedClipsPager = false, // Not active in foreground
        )
        assertTrue("Home feed must be detected even if clips view pager was previously inflated", backToHomeWithCachedClips.isHomeScreen)
        assertFalse("Reels must not block when user returned to Home feed", backToHomeWithCachedClips.isReelsScreen)

        // 8. Scrolled Home feed: action bar scrolled off screen, but Home tab selected
        val scrolledHomeFeed = Policy.inspectInstagramScreen(
            viewIds = setOf("clips_viewer_view_pager", "feed_recycler_view", "clips_video_container"),
            descriptions = listOf("Home, tab 1 of 5", "Reels, tab 4 of 5", "Reel by artist"),
            textList = listOf("original audio"),
            hasHomeActionBar = false,
            hasFeedList = true,
            isHomeTabSelected = true,
            isReelsTabSelected = false,
        )
        assertTrue("Scrolled Home feed must remain accessible", scrolledHomeFeed.isHomeScreen)
        assertFalse("Scrolled Home feed must not trigger Reels block", scrolledHomeFeed.isReelsScreen)

        // 9. Stories tray on Home feed: Tray contains "story by" avatars, but Home feed is active
        val homeFeedWithStoriesTray = Policy.inspectInstagramScreen(
            viewIds = setOf("action_bar_inbox_button", "stories_tray", "tray_recycler_view", "feed_recycler_view"),
            descriptions = listOf("Home, tab 1 of 5", "story by friend1", "story by friend2", "seen story by friend3"),
            textList = listOf("Instagram", "Like", "Comment"),
            hasHomeActionBar = true,
            hasFeedList = true,
            isHomeTabSelected = true,
            isReelsTabSelected = false,
        )
        assertTrue("Home feed with stories tray must be detected as Home", homeFeedWithStoriesTray.isHomeScreen)
        assertFalse("Home feed with stories tray must not trigger Stories block", homeFeedWithStoriesTray.isStoriesScreen)

        // 10. Transition back from Stories to Home feed with cached segments_progress_bar in viewIds
        val backToHomeFromStories = Policy.inspectInstagramScreen(
            viewIds = setOf("segments_progress_bar", "reel_viewer_texture_view", "action_bar_inbox_button", "main_feed", "stories_tray"),
            descriptions = listOf("Home, tab 1 of 5", "story by friend1"),
            textList = listOf("Instagram"),
            hasHomeActionBar = true,
            hasFeedList = true,
            isHomeTabSelected = true,
            isReelsTabSelected = false,
            hasStoryProgress = false, // Not active in foreground
        )
        assertTrue("Returning from Stories must detect Home feed", backToHomeFromStories.isHomeScreen)
        assertFalse("Returning from Stories must drop Stories block", backToHomeFromStories.isStoriesScreen)

        // 11. Active Stories viewer (full screen, no home elements visible)
        val activeStoryViewer = Policy.inspectInstagramScreen(
            viewIds = setOf("segments_progress_bar", "reel_viewer_texture_view", "story_viewer_container"),
            descriptions = listOf("story by friend", "reply to friend..."),
            textList = listOf("Send message"),
            hasHomeActionBar = false,
            hasFeedList = false,
            isHomeTabSelected = false,
            isReelsTabSelected = false,
            hasStoryProgress = true,
        )
        assertTrue("Active full-screen story viewer must be blocked", activeStoryViewer.isStoriesScreen)
        assertFalse("Active story viewer must not be detected as Home", activeStoryViewer.isHomeScreen)

        // 12. Active Stories viewer opened ON TOP OF Home feed:
        // Home feed nodes (action bar, feed recycler, bottom tabs) remain in tree behind the story,
        // but active story viewer indicators in foreground take precedence
        val storyViewerOverHomeFeed = Policy.inspectInstagramScreen(
            viewIds = setOf("segments_progress_bar", "reel_viewer_texture_view", "message_composer", "action_bar_inbox_button", "feed_recycler_view"),
            descriptions = listOf("Home, tab 1 of 5", "story by friend", "reply to friend..."),
            textList = listOf("Instagram", "reply to friend..."),
            hasHomeActionBar = true,
            hasFeedList = true,
            isHomeTabSelected = true,
            isReelsTabSelected = false,
            hasStoryProgress = true,
            hasActiveStoryViewer = true,
        )
        assertTrue("Active story viewer in foreground must be blocked even when Home nodes exist in tree underneath", storyViewerOverHomeFeed.isStoriesScreen)
        assertFalse("Story viewer must not be mistaken for Home feed", storyViewerOverHomeFeed.isHomeScreen)
    }

    @Test fun youtubeFeatureBlockingOptions() {
        // 1. Granular: only Shorts selected
        val onlyShorts = listOf("yt_shorts")
        assertTrue(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.SHORTS, onlyShorts))
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.HOME, onlyShorts))
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.EXPLORE, onlyShorts))
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.COMMENTS, onlyShorts))

        // 2. Granular: only Home feed selected
        val onlyHome = listOf("yt_home")
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.SHORTS, onlyHome))
        assertTrue(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.HOME, onlyHome))
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.EXPLORE, onlyHome))
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.COMMENTS, onlyHome))

        // 3. Granular: only Comments selected
        val onlyComments = listOf("yt_comments")
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.SHORTS, onlyComments))
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.HOME, onlyComments))
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.EXPLORE, onlyComments))
        assertTrue(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.COMMENTS, onlyComments))

        // 4. Granular: only Explore selected
        val onlyExplore = listOf("yt_explore")
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.SHORTS, onlyExplore))
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.HOME, onlyExplore))
        assertTrue(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.EXPLORE, onlyExplore))
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.COMMENTS, onlyExplore))

        // 5. Default / Legacy rule (empty options list): Blocks Shorts, preserves Home, Explore, Comments
        val defaultEmpty = emptyList<String>()
        assertTrue(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.SHORTS, defaultEmpty))
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.HOME, defaultEmpty))
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.EXPLORE, defaultEmpty))
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.COMMENTS, defaultEmpty))

        // 6. Combined: Shorts and Comments
        val shortsAndComments = listOf("yt_shorts", "yt_comments")
        assertTrue(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.SHORTS, shortsAndComments))
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.HOME, shortsAndComments))
        assertFalse(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.EXPLORE, shortsAndComments))
        assertTrue(Policy.shouldBlockYouTubeFeature(Policy.YouTubeFeature.COMMENTS, shortsAndComments))

        // 7. AppRule with YouTube options preservation
        val rule = Policy.AppRule(
            packageName = "com.google.android.youtube",
            enabled = true,
            feedMode = "experimental",
            options = listOf("yt_shorts", "yt_home", "yt_comments"),
        )
        assertEquals(3, rule.options.size)
        assertTrue(rule.options.contains("yt_shorts"))
        assertTrue(rule.options.contains("yt_home"))
        assertTrue(rule.options.contains("yt_comments"))
        assertFalse(rule.options.contains("yt_explore"))

        // 8. Verify Selector Collections include canonical YouTube containers
        assertTrue(Policy.YouTubeSelectors.SHORTS_VIEW_IDS.contains("reel_recycler"))
        assertTrue(Policy.YouTubeSelectors.SHORTS_VIEW_IDS.contains("reel_watch_player"))
        assertTrue(Policy.YouTubeSelectors.SHORTS_VIEW_IDS.contains("reel_player_page_container"))
        assertTrue(Policy.YouTubeSelectors.COMMENTS_VIEW_IDS.contains("panel_content_touch_wrapper"))
        assertTrue(Policy.YouTubeSelectors.REGULAR_PLAYER_VIEW_IDS.contains("watch_player"))
        assertTrue(Policy.YouTubeSelectors.REGULAR_PLAYER_VIEW_IDS.contains("watch_while_time_bar_view"))
        assertTrue(Policy.YouTubeSelectors.SEARCH_VIEW_IDS.contains("search_query"))
    }

    @Test fun youtubeShortsScreenDetection() {
        // 1. Bottom navigation: Shorts tab selected
        val shortsTab = Policy.inspectYouTubeScreen(
            viewIds = setOf("pivot_bar", "text"),
            descriptions = listOf("Shorts"),
            isShortsTabSelected = true,
        )
        assertTrue(shortsTab.isShortsScreen)
        assertFalse(shortsTab.isHomeScreen)
        assertFalse(shortsTab.isRegularVideoScreen)

        // 2. Fullscreen Shorts player container (reel_recycler + reel_watch_player)
        val shortsPlayer = Policy.inspectYouTubeScreen(
            viewIds = setOf("reel_recycler", "reel_watch_player", "reel_player_page_container", "reel_time_bar"),
            descriptions = listOf("Remix this Short along with 37 other remixes", "like this video"),
            hasShortsLayout = true,
        )
        assertTrue(shortsPlayer.isShortsScreen)
        assertFalse(shortsPlayer.isHomeScreen)
        assertFalse(shortsPlayer.isRegularVideoScreen)

        // 3. Shorts keyword detection (active action keywords)
        val shortsKeyword = Policy.inspectYouTubeScreen(
            viewIds = setOf("action_bar_root"),
            descriptions = listOf("sound used in this short", "remix this short"),
        )
        assertTrue(shortsKeyword.isShortsScreen)
        assertFalse(shortsKeyword.isHomeScreen)

        // 4. Home feed with a Shorts carousel must NOT be detected as Shorts
        val homeWithShortsCarousel = Policy.inspectYouTubeScreen(
            viewIds = setOf("youtube_logo", "results", "pivot_bar"),
            descriptions = listOf("YouTube", "Home", "Is Charging While Using Your Phone Killing the Battery? - play Short"),
            isHomeTabSelected = true,
            hasYouTubeLogo = true,
            hasFeedList = true,
            hasShortsLayout = false,
        )
        assertTrue("Home feed must be detected as Home", homeWithShortsCarousel.isHomeScreen)
        assertFalse("Home feed with Shorts carousel must NOT be detected as Shorts", homeWithShortsCarousel.isShortsScreen)
    }
    @Test fun youtubeCommentsScreenDetection() {
        // 1. Comments opened over regular video player
        val commentsOnVideo = Policy.inspectYouTubeScreen(
            viewIds = setOf("watch_player", "panel_content_touch_wrapper", "information_button", "close_button"),
            descriptions = listOf("Comments", "About comments", "Like this comment along with 7 other people"),
            hasRegularVideoPlayer = true,
            hasCommentsOpen = true,
        )
        assertTrue("Comments screen must be detected when panel is open over video", commentsOnVideo.isCommentsScreen)
        assertTrue("Regular video flag should also be recorded", commentsOnVideo.isRegularVideoScreen)
        assertFalse(commentsOnVideo.isHomeScreen)

        // 2. Comments opened over Shorts player
        val commentsOnShorts = Policy.inspectYouTubeScreen(
            viewIds = setOf("reel_recycler", "reel_watch_player", "panel_content_touch_wrapper"),
            descriptions = listOf("Comments", "Like this comment"),
            hasShortsLayout = true,
            hasCommentsOpen = true,
        )
        assertTrue("Comments screen must be detected when open over Shorts", commentsOnShorts.isCommentsScreen)
        assertTrue("Shorts screen must also be detected", commentsOnShorts.isShortsScreen)
        assertFalse(commentsOnShorts.isHomeScreen)
    }

    @Test fun youtubeHomeFeedScreenDetection() {
        // 1. Home tab selected with YouTube logo and feed results
        val homeFeed = Policy.inspectYouTubeScreen(
            viewIds = setOf("youtube_logo", "results", "pivot_bar"),
            descriptions = listOf("YouTube", "Home"),
            isHomeTabSelected = true,
            hasYouTubeLogo = true,
            hasFeedList = true,
        )
        assertTrue(homeFeed.isHomeScreen)
        assertFalse(homeFeed.isShortsScreen)
        assertFalse(homeFeed.isRegularVideoScreen)
        assertFalse(homeFeed.isSearchScreen)
    }

    @Test fun youtubeNonBlockedSurfacesPreservation() {
        // 1. Regular video playback MUST NEVER be detected as Shorts or Home Feed
        val regularVideo = Policy.inspectYouTubeScreen(
            viewIds = setOf("watch_player", "watch_while_time_bar_view", "player_collapse_button", "watch_panel", "watch_list"),
            descriptions = listOf("Minimize", "Play video", "like this video along with 19,413,408 other people"),
            hasRegularVideoPlayer = true,
            isShortsTabSelected = false,
            hasShortsLayout = false,
        )
        assertTrue(regularVideo.isRegularVideoScreen)
        assertFalse("Regular video playback must NOT be flagged as Shorts", regularVideo.isShortsScreen)
        assertFalse("Regular video playback must NOT be flagged as Home feed", regularVideo.isHomeScreen)
        assertFalse("Regular video playback must NOT be flagged as Comments when comments closed", regularVideo.isCommentsScreen)

        // 2. Search Screen & Search Results MUST NOT be blocked
        val searchScreen = Policy.inspectYouTubeScreen(
            viewIds = setOf("search_query", "search_edit_text", "voice_search", "results"),
            textList = listOf("kotlin coroutines"),
            hasSearchQueryOrBar = true,
            isHomeTabSelected = false,
            isShortsTabSelected = false,
        )
        assertTrue(searchScreen.isSearchScreen)
        assertFalse(searchScreen.isHomeScreen)
        assertFalse(searchScreen.isShortsScreen)

        // 3. Subscriptions Tab MUST NOT be blocked
        val subscriptionsTab = Policy.inspectYouTubeScreen(
            viewIds = setOf("pivot_bar", "results"),
            descriptions = listOf("Subscriptions: New content is available"),
            isSubscriptionsTabSelected = true,
        )
        assertTrue(subscriptionsTab.isSubscriptionsScreen)
        assertFalse(subscriptionsTab.isHomeScreen)
        assertFalse(subscriptionsTab.isShortsScreen)

        // 4. Library / You Tab MUST NOT be blocked
        val libraryTab = Policy.inspectYouTubeScreen(
            viewIds = setOf("pivot_bar", "results"),
            descriptions = listOf("You"),
            isLibraryTabSelected = true,
        )
        assertTrue(libraryTab.isLibraryScreen)
        assertFalse(libraryTab.isHomeScreen)
        assertFalse(libraryTab.isShortsScreen)
    }
}

