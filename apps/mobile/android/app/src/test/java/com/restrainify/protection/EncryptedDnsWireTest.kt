package com.restrainify.protection

import com.restrainify.protection.webfilter.EncryptedDnsClient
import com.restrainify.protection.webfilter.EncryptedDnsWire
import java.io.ByteArrayInputStream
import java.io.EOFException
import java.io.IOException
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class EncryptedDnsWireTest {
    private val message = ByteArray(40) { (it + 1).toByte() }

    @Test fun framesWithBigEndianLengthPrefix() {
        val framed = EncryptedDnsWire.frame(message)
        assertEquals(42, framed.size)
        assertEquals(0, framed[0].toInt())
        assertEquals(40, framed[1].toInt())
        assertArrayEquals(message, framed.copyOfRange(2, framed.size))
    }

    @Test fun readsAFramedMessageAndLeavesTheRestOfTheStream() {
        val stream = ByteArrayInputStream(EncryptedDnsWire.frame(message) + byteArrayOf(9, 9))
        assertArrayEquals(message, EncryptedDnsWire.readFramed(stream))
        assertEquals(2, stream.available())
    }

    @Test fun rejectsTruncatedOrTinyFrames() {
        try { EncryptedDnsWire.readFramed(ByteArrayInputStream(byteArrayOf(0, 40, 1, 2))); fail() } catch (_: EOFException) {}
        try { EncryptedDnsWire.readFramed(ByteArrayInputStream(byteArrayOf(0, 3, 1, 2, 3))); fail() } catch (_: IOException) {}
        try { EncryptedDnsWire.readFramed(ByteArrayInputStream(byteArrayOf())); fail() } catch (_: EOFException) {}
    }

    @Test fun buildsADohPostRequest() {
        val request = String(EncryptedDnsWire.dohRequest("family.cloudflare-dns.com", message), Charsets.ISO_8859_1)
        assertTrue(request.startsWith("POST /dns-query HTTP/1.1\r\nHost: family.cloudflare-dns.com\r\n"))
        assertTrue(request.contains("Content-Type: application/dns-message\r\n"))
        assertTrue(request.contains("Content-Length: 40\r\n"))
        assertTrue(request.contains("Connection: close\r\n\r\n"))
    }

    private fun http(headers: String, body: ByteArray) =
        ByteArrayInputStream(("HTTP/1.1 200 OK\r\n$headers\r\n\r\n").toByteArray(Charsets.US_ASCII) + body)

    @Test fun parsesDohResponseWithContentLength() {
        val response = http("Content-Length: 40\r\nContent-Type: application/dns-message", message)
        assertArrayEquals(message, EncryptedDnsWire.parseDohResponse(response))
    }

    @Test fun parsesChunkedDohResponse() {
        val chunked = "14\r\n".toByteArray() + message.copyOfRange(0, 20) +
            "\r\n14\r\n".toByteArray() + message.copyOfRange(20, 40) + "\r\n0\r\n\r\n".toByteArray()
        assertArrayEquals(message, EncryptedDnsWire.parseDohResponse(http("Transfer-Encoding: chunked", chunked)))
    }

    @Test fun rejectsNon200AndShortBodies() {
        try { EncryptedDnsWire.parseDohResponse(ByteArrayInputStream("HTTP/1.1 502 Bad Gateway\r\n\r\n".toByteArray())); fail() } catch (_: IOException) {}
        try { EncryptedDnsWire.parseDohResponse(http("Content-Length: 4", byteArrayOf(1, 2, 3, 4))); fail() } catch (_: IOException) {}
    }

    @Test fun onlyKnownCloudflareResolversAreSupported() {
        assertNotNull(EncryptedDnsClient.ENDPOINTS["1.1.1.3"])
        assertNotNull(EncryptedDnsClient.ENDPOINTS["1.1.1.1"])
        assertEquals(2, EncryptedDnsClient.ENDPOINTS.size)
        try { EncryptedDnsClient { true }.resolve("8.8.8.8", message); fail() } catch (_: IllegalArgumentException) {}
    }
}
