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
}
