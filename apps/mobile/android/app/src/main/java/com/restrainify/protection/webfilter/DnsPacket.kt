package com.restrainify.protection.webfilter

/** Small DNS-only IPv4/UDP codec. Reject fragments, compressed questions and malformed lengths. */
object DnsPacket {
    data class Query(val packet: ByteArray, val dns: ByteArray, val host: String, val questionEnd: Int)
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
        return Query(packet, dns, labels.joinToString("."), cursor + 4)
    }
    fun error(query: Query, code: Int): ByteArray {
        val response = query.dns.copyOf(query.questionEnd)
        response[2] = (0x80 or (query.dns[2].toInt() and 1)).toByte(); response[3] = (0x80 or code).toByte()
        for (i in 6..11) response[i] = 0
        return response
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
