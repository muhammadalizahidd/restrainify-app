package com.restrainify.protection.webfilter

/** Small DNS IPv4 and IPv6 UDP codec. Rejects fragments, compressed questions and malformed lengths. */
object DnsPacket {
    data class Query(
        val packet: ByteArray,
        val dns: ByteArray,
        val host: String,
        val questionEnd: Int,
        val qtype: Int = 1,
        val isIpv6: Boolean = false,
    )

    private fun u16(b: ByteArray, p: Int) = ((b[p].toInt() and 255) shl 8) or (b[p + 1].toInt() and 255)
    private fun put16(b: ByteArray, p: Int, n: Int) {
        b[p] = (n ushr 8).toByte()
        b[p + 1] = n.toByte()
    }

    fun parse(packet: ByteArray): Query? {
        if (packet.size < 40) return null
        val version = (packet[0].toInt() and 0xF0) ushr 4
        val isIpv6 = version == 6
        val dnsOffset: Int

        if (!isIpv6) {
            if ((packet[0].toInt() and 255) != 0x45 || packet[9].toInt() != 17) return null
            if (u16(packet, 6) and 0x3fff != 0 || u16(packet, 2) != packet.size || u16(packet, 22) != 53) return null
            val length = u16(packet, 24)
            if (length < 20 || length + 20 != packet.size) return null
            dnsOffset = 28
        } else {
            if (packet.size < 48 || packet[6].toInt() != 17) return null
            val payloadLen = u16(packet, 4)
            if (payloadLen + 40 != packet.size) return null
            val dstPort = u16(packet, 42)
            if (dstPort != 53) return null
            val udpLength = u16(packet, 44)
            if (udpLength < 20 || udpLength + 40 != packet.size) return null
            dnsOffset = 48
        }

        val dns = packet.copyOfRange(dnsOffset, packet.size)
        if (u16(dns, 4) != 1 || dns[2].toInt() and 0xf8 != 0) return null
        var cursor = 12
        val labels = mutableListOf<String>()
        while (cursor < dns.size) {
            val size = dns[cursor++].toInt() and 255
            if (size == 0) break
            if (size > 63 || cursor + size >= dns.size) return null
            val label = String(dns, cursor, size, Charsets.US_ASCII).lowercase()
            if (!label.matches(Regex("[a-z0-9_-]+"))) return null
            labels.add(label)
            cursor += size
        }
        if (labels.isEmpty() || cursor + 4 > dns.size || cursor > 267 || u16(dns, cursor + 2) != 1) return null
        val qtype = u16(dns, cursor)
        return Query(packet, dns, labels.joinToString("."), cursor + 4, qtype, isIpv6)
    }

    fun error(query: Query, code: Int): ByteArray {
        val response = query.dns.copyOf(query.questionEnd)
        response[2] = (0x80 or (query.dns[2].toInt() and 1)).toByte()
        response[3] = (0x80 or code).toByte()
        for (i in 6..11) response[i] = 0
        return response
    }

    fun syntheticA(query: Query, ip: ByteArray, ttlSeconds: Int = 300): ByteArray {
        require(ip.size == 4)
        val response = ByteArray(query.questionEnd + 16)
        query.dns.copyInto(response, 0, 0, query.questionEnd)
        response[2] = (0x81 or (query.dns[2].toInt() and 1)).toByte()
        response[3] = 0x80.toByte()
        put16(response, 4, 1)
        put16(response, 6, 1)
        put16(response, 8, 0)
        put16(response, 10, 0)
        var p = query.questionEnd
        response[p++] = 0xc0.toByte()
        response[p++] = 0x0c.toByte()
        put16(response, p, 1); p += 2
        put16(response, p, 1); p += 2
        response[p++] = (ttlSeconds ushr 24).toByte()
        response[p++] = (ttlSeconds ushr 16).toByte()
        response[p++] = (ttlSeconds ushr 8).toByte()
        response[p++] = ttlSeconds.toByte()
        put16(response, p, 4); p += 2
        ip.copyInto(response, p, 0, 4)
        return response
    }

    fun nodata(query: Query): ByteArray {
        val response = query.dns.copyOf(query.questionEnd)
        response[2] = (0x81 or (query.dns[2].toInt() and 1)).toByte()
        response[3] = 0x80.toByte()
        put16(response, 4, 1)
        put16(response, 6, 0)
        put16(response, 8, 0)
        put16(response, 10, 0)
        return response
    }

    fun extractTtl(dns: ByteArray, defaultTtl: Int = 300): Int {
        if (dns.size < 12) return defaultTtl
        val ancount = u16(dns, 6)
        if (ancount == 0) return defaultTtl
        val qdcount = u16(dns, 4)
        var cursor = 12
        for (i in 0 until qdcount) {
            while (cursor < dns.size) {
                val len = dns[cursor++].toInt() and 255
                if (len == 0) break
                if ((len and 0xc0) == 0xc0) {
                    if (cursor < dns.size) cursor++
                    break
                }
                cursor += len
            }
            cursor += 4
            if (cursor > dns.size) return defaultTtl
        }
        if (cursor >= dns.size) return defaultTtl
        val first = dns[cursor].toInt() and 255
        if ((first and 0xc0) == 0xc0) {
            cursor += 2
        } else {
            while (cursor < dns.size) {
                val len = dns[cursor++].toInt() and 255
                if (len == 0) break
                if ((len and 0xc0) == 0xc0) {
                    if (cursor < dns.size) cursor++
                    break
                }
                cursor += len
            }
        }
        if (cursor + 10 > dns.size) return defaultTtl
        val ttl = ((u16(dns, cursor + 4).toLong() and 0xFFFF) shl 16) or (u16(dns, cursor + 6).toLong() and 0xFFFF)
        return ttl.coerceIn(10L, 3600L).toInt()
    }

    fun isBlockedResponse(dns: ByteArray): Boolean {
        if (dns.size < 12) return false
        val rcode = dns[3].toInt() and 0x0f
        if (rcode == 3 || rcode == 5) return true
        val ancount = u16(dns, 6)
        if (ancount == 0) return false
        val qdcount = u16(dns, 4)
        var cursor = 12
        for (i in 0 until qdcount) {
            while (cursor < dns.size) {
                val len = dns[cursor++].toInt() and 255
                if (len == 0) break
                if ((len and 0xc0) == 0xc0) {
                    if (cursor < dns.size) cursor++
                    break
                }
                cursor += len
            }
            cursor += 4
            if (cursor > dns.size) return false
        }
        for (i in 0 until ancount) {
            if (cursor >= dns.size) break
            val first = dns[cursor].toInt() and 255
            if ((first and 0xc0) == 0xc0) {
                cursor += 2
            } else {
                while (cursor < dns.size) {
                    val len = dns[cursor++].toInt() and 255
                    if (len == 0) break
                    if ((len and 0xc0) == 0xc0) {
                        if (cursor < dns.size) cursor++
                        break
                    }
                    cursor += len
                }
            }
            if (cursor + 10 > dns.size) break
            val type = u16(dns, cursor)
            val rdlength = u16(dns, cursor + 8)
            cursor += 10
            if (cursor + rdlength > dns.size) break
            if (type == 1 && rdlength == 4) {
                if (dns[cursor] == 0.toByte() && dns[cursor + 1] == 0.toByte() && dns[cursor + 2] == 0.toByte() && dns[cursor + 3] == 0.toByte()) {
                    return true
                }
            } else if (type == 28 && rdlength == 16) {
                if ((0 until 16).all { dns[cursor + it] == 0.toByte() }) {
                    return true
                }
            }
            cursor += rdlength
        }
        return false
    }

    private fun computeIpv6UdpChecksum(packet: ByteArray, srcOffset: Int, dstOffset: Int, udpOffset: Int, udpLen: Int): Int {
        var sum = 0L
        for (i in 0 until 16 step 2) sum += u16(packet, srcOffset + i)
        for (i in 0 until 16 step 2) sum += u16(packet, dstOffset + i)
        sum += udpLen
        sum += 17 // Next Header: UDP
        val end = udpOffset + udpLen
        var i = udpOffset
        while (i < end - 1) {
            sum += u16(packet, i)
            i += 2
        }
        if (i < end) {
            sum += (packet[i].toInt() and 255) shl 8
        }
        while (sum ushr 16 != 0L) {
            sum = (sum and 65535L) + (sum ushr 16)
        }
        return (sum.toInt().inv()) and 65535
    }

    fun response(query: Query, dns: ByteArray): ByteArray {
        require(dns.size in 12..4096)
        if (query.isIpv6) {
            val output = ByteArray(48 + dns.size)
            output[0] = 0x60
            put16(output, 4, dns.size + 8)
            output[6] = 17
            output[7] = 64
            // Swap IPv6 source (bytes 8..23 in query) and destination (bytes 24..39 in query)
            query.packet.copyInto(output, 8, 24, 40)
            query.packet.copyInto(output, 24, 8, 24)
            // UDP header at offset 40
            put16(output, 40, 53)
            put16(output, 42, u16(query.packet, 40))
            put16(output, 44, dns.size + 8)
            output[46] = 0
            output[47] = 0
            dns.copyInto(output, 48)
            val csum = computeIpv6UdpChecksum(output, 8, 24, 40, dns.size + 8)
            put16(output, 46, if (csum == 0) 0xFFFF else csum)
            return output
        } else {
            val output = ByteArray(28 + dns.size)
            output[0] = 0x45
            put16(output, 2, output.size)
            output[8] = 64
            output[9] = 17
            query.packet.copyInto(output, 12, 16, 20)
            query.packet.copyInto(output, 16, 12, 16)
            put16(output, 20, 53)
            put16(output, 22, u16(query.packet, 20))
            put16(output, 24, dns.size + 8)
            var sum = 0
            for (i in 0 until 20 step 2) sum += u16(output, i)
            while (sum ushr 16 != 0) sum = (sum and 65535) + (sum ushr 16)
            put16(output, 10, sum.inv() and 65535)
            dns.copyInto(output, 28)
            return output
        }
    }
}
