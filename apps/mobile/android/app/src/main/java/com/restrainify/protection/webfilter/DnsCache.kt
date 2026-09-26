package com.restrainify.protection.webfilter

import java.util.LinkedHashMap

/**
 * Thread-safe LRU DNS response cache with TTL expiration.
 *
 * Rewrites transaction ID on cache hits to match the querying client.
 */
class DnsCache(
    private val maxEntries: Int = 1024,
    private val clock: () -> Long = { System.currentTimeMillis() },
) {
    data class Entry(val data: ByteArray, val expiresMs: Long)

    private val lock = Any()
    private val map = object : LinkedHashMap<String, Entry>(maxEntries, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Entry>?): Boolean {
            return size > maxEntries
        }
    }

    fun get(host: String, qtype: Int, txIdHigh: Byte, txIdLow: Byte): ByteArray? {
        val key = "$qtype:${host.lowercase()}"
        val now = clock()
        synchronized(lock) {
            val entry = map[key] ?: return null
            if (now >= entry.expiresMs) {
                map.remove(key)
                return null
            }
            val response = entry.data.clone()
            if (response.size >= 2) {
                response[0] = txIdHigh
                response[1] = txIdLow
            }
            return response
        }
    }

    fun put(host: String, qtype: Int, data: ByteArray, ttlSeconds: Int) {
        if (data.size < 12) return
        val clampedTtl = ttlSeconds.coerceIn(10, 3600)
        val expires = clock() + clampedTtl * 1000L
        val key = "$qtype:${host.lowercase()}"
        synchronized(lock) {
            map[key] = Entry(data.clone(), expires)
        }
    }

    fun clear() {
        synchronized(lock) {
            map.clear()
        }
    }

    val size: Int get() = synchronized(lock) { map.size }
}
