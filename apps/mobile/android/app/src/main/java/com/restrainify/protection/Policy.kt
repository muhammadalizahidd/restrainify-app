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
        val host = IDN.toASCII(uri.host ?: throw IllegalArgumentException("Enter a valid domain"), IDN.USE_STD3_ASCII_RULES).lowercase().trimEnd('.')
        require(host.length <= 253 && host.contains('.') && host.split('.').all { it.matches(Regex("[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?")) } && !host.last().isDigit()) { "Enter a valid domain" }
        return host
    }
    fun matches(host: String, rule: String) = host == rule || host.endsWith(".$rule")
    fun scheduled(minute: Int, weekday: Int, start: Int, end: Int, days: Set<Int>): Boolean =
        if (start < end) weekday in days && minute in start until end
        else (weekday in days && minute >= start) || ((if (weekday == 1) 7 else weekday - 1) in days && minute < end)

    data class Recovery(val current: Long, val longest: Long, val cleanDays: Int)
    fun recovery(start: LocalDate, today: LocalDate, relapses: Set<LocalDate>): Recovery {
        val valid = relapses.filter { !it.isBefore(start) && !it.isAfter(today) }.sorted()
        var cursor = start
        var longest = 0L
        valid.forEach { longest = maxOf(longest, ChronoUnit.DAYS.between(cursor, it)); cursor = it.plusDays(1) }
        val current = maxOf(0, ChronoUnit.DAYS.between(cursor, today))
        longest = maxOf(longest, current)
        val clean = (0L..29L).map { today.minusDays(it) }.count { !it.isBefore(start) && it !in relapses }
        return Recovery(current, longest, clean)
    }
}
