package com.restrainify.protection.webfilter

import android.app.*
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.system.OsConstants
import com.restrainify.MainActivity
import com.restrainify.protection.OfflineRuntime
import com.restrainify.protection.Policy
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.*
import java.util.concurrent.*
import java.util.concurrent.atomic.AtomicBoolean

class DnsVpnService : VpnService() {
    private val running = AtomicBoolean(false)
    private var tunnel: ParcelFileDescriptor? = null
    private var thread: Thread? = null
    private val requests = ThreadPoolExecutor(2, 2, 0, TimeUnit.MILLISECONDS, ArrayBlockingQueue(64), ThreadPoolExecutor.AbortPolicy())
    private val sockets = ConcurrentHashMap.newKeySet<DatagramSocket>()
    private lateinit var runtime: OfflineRuntime
    override fun onCreate() { super.onCreate(); runtime = OfflineRuntime.get(this) }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!runtime.ready || !runtime.configuration.optBoolean("websiteEnabled") || runtime.configuration.optString("dnsMode") != "vpn") { stopSelf(); return START_NOT_STICKY }
        if (!running.compareAndSet(false, true)) return START_STICKY
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel("dns", "Website protection", NotificationManager.IMPORTANCE_LOW))
        val pending = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        startForeground(42, Notification.Builder(this, "dns").setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentTitle("Restrainify DNS protection").setContentText("Local domain rules are running. Tap to view coverage.").setContentIntent(pending).setOngoing(true).build())
        thread = Thread({
            try {
                val descriptor = Builder().setSession("Restrainify · local DNS").setMtu(1500).setBlocking(true)
                    .addAddress("10.111.0.1", 32).addDnsServer("10.111.0.2").addRoute("10.111.0.2", 32)
                    .allowFamily(OsConstants.AF_INET6).setConfigureIntent(pending).establish() ?: error("VPN permission unavailable")
                tunnel = descriptor; runtime.vpnActive = true; runtime.vpnError = null; runtime.changed?.invoke()
                val input = FileInputStream(descriptor.fileDescriptor); val output = FileOutputStream(descriptor.fileDescriptor)
                val bytes = ByteArray(8192)
                while (running.get()) {
                    val count = input.read(bytes); if (count < 0) break
                    val query = DnsPacket.parse(bytes.copyOf(count)) ?: continue
                    try { requests.execute {
                        val response = resolve(query)
                        if (running.get()) try { synchronized(output) { output.write(DnsPacket.response(query, response)) } } catch (_: Exception) { stopSelf() }
                    } } catch (_: RejectedExecutionException) {
                        synchronized(output) { output.write(DnsPacket.response(query, DnsPacket.error(query, 2))) }
                    }
                }
            } catch (_: Exception) {
                if (running.get()) runtime.vpnError = "VPN stopped. Open Website protection to reconnect."
            } finally { runtime.vpnActive = false; runtime.changed?.invoke(); stopSelf() }
        }, "restrainify-dns").also { it.start() }
        return START_STICKY
    }
    private fun resolve(query: DnsPacket.Query): ByteArray {
        val domains = runtime.configuration.optJSONArray("domains")
        val rules = if (domains == null) emptyList() else (0 until domains.length()).map { domains.getJSONObject(it) }.filter { it.optBoolean("enabled") }
        val allowed = rules.any { it.optBoolean("allow") && Policy.matches(query.host, it.getString("host")) }
        val blocked = !allowed && rules.any { !it.optBoolean("allow") && Policy.matches(query.host, it.getString("host")) }
        if (blocked) { runtime.recordBlock(); return DnsPacket.error(query, 3) }
        // Cloudflare Families resolves ordinary DNS and filters maintained adult/malware categories.
        // Explicit user exceptions use the unfiltered resolver. No app traffic is sent to our servers.
        return try {
            DatagramSocket().use { socket ->
                sockets.add(socket)
                try {
                    check(protect(socket)); socket.soTimeout = 2500
                    socket.connect(InetAddress.getByName(if (allowed) "1.1.1.1" else "1.1.1.3"), 53)
                    socket.send(DatagramPacket(query.dns, query.dns.size))
                    val response = DatagramPacket(ByteArray(4096), 4096); socket.receive(response)
                    val data = response.data.copyOf(response.length)
                    require(data.size >= 12 && data[0] == query.dns[0] && data[1] == query.dns[1] && data[2].toInt() and 0x80 != 0)
                    runtime.vpnError = null
                    data
                } finally { sockets.remove(socket) }
            }
        } catch (_: Exception) { runtime.vpnError = "DNS resolver unreachable. Check your connection."; DnsPacket.error(query, 2) }
    }
    override fun onRevoke() { runtime.vpnError = "VPN access was revoked or another VPN took over."; stopSelf() }
    override fun onDestroy() {
        running.set(false); sockets.forEach { it.close() }; requests.shutdownNow()
        try { tunnel?.close() } catch (_: Exception) { /* Descriptor already closed by Android. */ }
        tunnel = null; thread?.interrupt(); runtime.vpnActive = false; runtime.changed?.invoke()
        stopForeground(STOP_FOREGROUND_REMOVE); super.onDestroy()
    }
}
