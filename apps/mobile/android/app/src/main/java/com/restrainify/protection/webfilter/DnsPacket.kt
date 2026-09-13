package com.restrainify.protection.webfilter

/** Small DNS-only IPv4/UDP codec. Reject fragments, compressed questions and malformed lengths. */
object DnsPacket {
    data class Query(val packet: ByteArray, val dns: ByteArray, val host: String, val questionEnd: Int, val qtype: Int = 1)
    private fun u16(b: ByteArray, p: Int) = ((b[p].toInt() and 255) shl 8) or (b[p+1].toInt() and 255)
    private fun put16(b: ByteArray, p: Int, n: Int) { b[p] = (n ushr 8).toByte(); b[p+1] = n.toByte() }
    fun parse(packet: ByteArray): Query? {
        if (packet.size < 40 || (packet[0].toInt() and 255) != 0x45 || packet[9].toInt() != 17) return null
        if (u16(packet, 6) and 0x3fff != 0 || u16(packet, 2) != packet.size || u16(packet, 22) != 53) return null
        val length = u16(packet, 24)
        if (length < 20 || length + 20 != packet.size) return null
        val dns = packet.copyOfRange(28, packet.size)
        if (u16(dns, 4) != 1 || dns[2].toInt() and 0xf8 != 0) return null
        var cursor = 12; val labels = mutableListOf<String>()
        while (cursor < dns.size) {
            val size = dns[cursor++].toInt() and 255
            if (size == 0) break
            if (size > 63 || cursor + size >= dns.size) return null
            val label = String(dns, cursor, size, Charsets.US_ASCII).lowercase()
            if (!label.matches(Regex("[a-z0-9_-]+"))) return null
            labels.add(label); cursor += size
        }
        if (labels.isEmpty() || cursor + 4 > dns.size || cursor > 267 || u16(dns, cursor + 2) != 1) return null
        val qtype = u16(dns, cursor)
        return Query(packet, dns, labels.joinToString("."), cursor + 4, qtype)
    }
    fun error(query: Query, code: Int): ByteArray {
        val response = query.dns.copyOf(query.questionEnd)
        response[2] = (0x80 or (query.dns[2].toInt() and 1)).toByte(); response[3] = (0x80 or code).toByte()
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
        response[p++] = 0xc0.toByte(); response[p++] = 0x0c.toByte()
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
    fun response(query: Query, dns: ByteArray): ByteArray {
        require(dns.size in 12..4096)
        val output = ByteArray(28 + dns.size)
        output[0] = 0x45; put16(output, 2, output.size); output[8] = 64; output[9] = 17
        query.packet.copyInto(output, 12, 16, 20); query.packet.copyInto(output, 16, 12, 16)
        put16(output, 20, 53); put16(output, 22, u16(query.packet, 20)); put16(output, 24, dns.size + 8)
        // IPv4 permits zero UDP checksum. The IP header checksum is mandatory.
        var sum = 0; for (i in 0 until 20 step 2) sum += u16(output, i)
        while (sum ushr 16 != 0) sum = (sum and 65535) + (sum ushr 16)
        put16(output, 10, sum.inv() and 65535); dns.copyInto(output, 28)
        return output
    }
}
