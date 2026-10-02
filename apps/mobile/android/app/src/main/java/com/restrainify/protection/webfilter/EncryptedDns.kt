package com.restrainify.protection.webfilter

import java.io.ByteArrayOutputStream
import java.io.EOFException
import java.io.IOException
import java.io.InputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedQueue
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.SSLPeerUnverifiedException
import javax.net.ssl.SSLSocket
import javax.net.ssl.SSLSocketFactory

/** Wire-format helpers for DNS over TLS (RFC 7858) and DNS over HTTPS (RFC 8484). No Android types, so they are unit tested. */
internal object EncryptedDnsWire {
    private const val MAX_MESSAGE = 65_535
    private const val MIN_DNS_MESSAGE = 12

    /** DoT messages are prefixed with their length as a 16-bit big-endian integer. */
    fun frame(query: ByteArray): ByteArray {
        require(query.size in 1..MAX_MESSAGE) { "Invalid DNS message size" }
        val framed = ByteArray(query.size + 2)
        framed[0] = (query.size shr 8).toByte()
        framed[1] = query.size.toByte()
        System.arraycopy(query, 0, framed, 2, query.size)
        return framed
    }

    fun readFramed(input: InputStream): ByteArray {
        val high = input.read()
        val low = input.read()
        if (high < 0 || low < 0) throw EOFException("DNS connection closed")
        val length = (high shl 8) or low
        if (length < MIN_DNS_MESSAGE) throw IOException("DNS response too short")
        return readFully(input, length)
    }

    fun dohRequest(host: String, query: ByteArray): ByteArray {
        val head = "POST /dns-query HTTP/1.1\r\n" +
            "Host: $host\r\n" +
            "Accept: application/dns-message\r\n" +
            "Content-Type: application/dns-message\r\n" +
            "Content-Length: ${query.size}\r\n" +
            "Connection: close\r\n\r\n"
        return head.toByteArray(Charsets.US_ASCII) + query
    }

    fun parseDohResponse(input: InputStream): ByteArray {
        val statusLine = readLine(input) ?: throw EOFException("DoH connection closed")
        val status = statusLine.split(' ').getOrNull(1)?.toIntOrNull() ?: throw IOException("Malformed DoH status line")
        var length = -1
        var chunked = false
        while (true) {
            val line = readLine(input) ?: throw EOFException("DoH headers truncated")
            if (line.isEmpty()) break
            val colon = line.indexOf(':')
            if (colon <= 0) continue
            val name = line.substring(0, colon).trim().lowercase()
            val value = line.substring(colon + 1).trim()
            if (name == "content-length") length = value.toIntOrNull() ?: -1
            if (name == "transfer-encoding" && value.lowercase().contains("chunked")) chunked = true
        }
        if (status != 200) throw IOException("DoH returned HTTP $status")
        val body = when {
            chunked -> readChunked(input)
            length in 0..MAX_MESSAGE -> readFully(input, length)
            length < 0 -> input.readBytes()
            else -> throw IOException("DoH response too large")
        }
        if (body.size < MIN_DNS_MESSAGE || body.size > MAX_MESSAGE) throw IOException("Invalid DoH message size")
        return body
    }

    private fun readChunked(input: InputStream): ByteArray {
        val out = ByteArrayOutputStream()
        while (true) {
            val sizeLine = readLine(input) ?: throw EOFException("Chunk header truncated")
            val size = sizeLine.substringBefore(';').trim().toIntOrNull(16) ?: throw IOException("Malformed chunk size")
            if (size == 0) break
            if (out.size() + size > MAX_MESSAGE) throw IOException("DoH response too large")
            out.write(readFully(input, size))
            readLine(input)
        }
        return out.toByteArray()
    }

    fun readFully(input: InputStream, length: Int): ByteArray {
        val buffer = ByteArray(length)
        var offset = 0
        while (offset < length) {
            val read = input.read(buffer, offset, length - offset)
            if (read < 0) throw EOFException("Connection closed mid-message")
            offset += read
        }
        return buffer
    }

    private fun readLine(input: InputStream): String? {
        val line = StringBuilder()
        while (line.length < 8192) {
            val next = input.read()
            if (next < 0) return if (line.isEmpty()) null else line.toString()
            if (next == '\n'.code) return line.toString().trimEnd('\r')
            line.append(next.toChar())
        }
        throw IOException("HTTP line too long")
    }
}

/**
 * Sends DNS lookups to Cloudflare over an encrypted connection. DNS over TLS (port 853) is tried first, reusing
 * connections; DNS over HTTPS (port 443) is the fallback for networks that block 853. It never falls back to
 * unencrypted DNS: if neither works the lookup fails.
 *
 * Every socket is passed to [protectSocket] first so it bypasses the VPN tunnel (1.1.1.1 is routed into it).
 */
class EncryptedDnsClient(private val protectSocket: (Socket) -> Boolean) {
    data class Endpoint(val ip: String, val hostName: String)

    private class PooledConnection(val socket: SSLSocket, val createdAt: Long)

    private val idle = ConcurrentHashMap<String, ConcurrentLinkedQueue<PooledConnection>>()

    fun resolve(upstreamIp: String, query: ByteArray): ByteArray {
        val endpoint = ENDPOINTS[upstreamIp] ?: throw IllegalArgumentException("Unsupported resolver")
        try {
            return overTls(endpoint, query)
        } catch (_: Exception) {
            // Fall through to DNS over HTTPS.
        }
        return overHttps(endpoint, query)
    }

    fun close() {
        for (queue in idle.values) {
            var pooled = queue.poll()
            while (pooled != null) {
                closeQuietly(pooled.socket)
                pooled = queue.poll()
            }
        }
        idle.clear()
    }

    private fun overTls(endpoint: Endpoint, query: ByteArray): ByteArray {
        val queue = idle.getOrPut(endpoint.ip) { ConcurrentLinkedQueue() }
        val now = System.currentTimeMillis()
        while (true) {
            val pooled = queue.poll() ?: break
            if (pooled.socket.isClosed || now - pooled.createdAt > MAX_IDLE_MS) {
                closeQuietly(pooled.socket)
                continue
            }
            try {
                val response = exchange(pooled.socket, query)
                queue.offer(PooledConnection(pooled.socket, System.currentTimeMillis()))
                return response
            } catch (_: Exception) {
                closeQuietly(pooled.socket)
            }
        }
        val fresh = connect(endpoint, DOT_PORT)
        try {
            val response = exchange(fresh, query)
            if (queue.size < MAX_POOLED) queue.offer(PooledConnection(fresh, System.currentTimeMillis())) else closeQuietly(fresh)
            return response
        } catch (error: Exception) {
            closeQuietly(fresh)
            throw error
        }
    }

    private fun exchange(socket: SSLSocket, query: ByteArray): ByteArray {
        socket.outputStream.write(EncryptedDnsWire.frame(query))
        socket.outputStream.flush()
        return EncryptedDnsWire.readFramed(socket.inputStream)
    }

    private fun overHttps(endpoint: Endpoint, query: ByteArray): ByteArray {
        val socket = connect(endpoint, DOH_PORT)
        try {
            socket.outputStream.write(EncryptedDnsWire.dohRequest(endpoint.hostName, query))
            socket.outputStream.flush()
            return EncryptedDnsWire.parseDohResponse(socket.inputStream)
        } finally {
            closeQuietly(socket)
        }
    }

    private fun connect(endpoint: Endpoint, port: Int): SSLSocket {
        val plain = Socket()
        try {
            if (!protectSocket(plain)) throw IOException("Could not exclude the DNS socket from the VPN")
            plain.connect(InetSocketAddress(endpoint.ip, port), CONNECT_TIMEOUT_MS)
            val factory = SSLSocketFactory.getDefault() as SSLSocketFactory
            val ssl = factory.createSocket(plain, endpoint.hostName, port, true) as SSLSocket
            ssl.soTimeout = READ_TIMEOUT_MS
            ssl.startHandshake()
            // A raw SSLSocket does not check the certificate's host name on its own.
            if (!HttpsURLConnection.getDefaultHostnameVerifier().verify(endpoint.hostName, ssl.session)) {
                closeQuietly(ssl)
                throw SSLPeerUnverifiedException("Resolver certificate does not match ${endpoint.hostName}")
            }
            return ssl
        } catch (error: Exception) {
            closeQuietly(plain)
            throw error
        }
    }

    private fun closeQuietly(socket: Socket?) {
        try { socket?.close() } catch (_: Exception) {}
    }

    companion object {
        private const val DOT_PORT = 853
        private const val DOH_PORT = 443
        private const val CONNECT_TIMEOUT_MS = 3_000
        private const val READ_TIMEOUT_MS = 3_000
        private const val MAX_IDLE_MS = 8_000L
        private const val MAX_POOLED = 8

        /** Cloudflare's resolvers. The host name is used for SNI and certificate verification. */
        val ENDPOINTS: Map<String, Endpoint> = mapOf(
            "1.1.1.3" to Endpoint("1.1.1.3", "family.cloudflare-dns.com"),
            "1.1.1.1" to Endpoint("1.1.1.1", "one.one.one.one"),
        )
    }
}
