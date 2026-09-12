package com.restrainify.protection.webfilter

import android.app.*
import android.content.Context
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
    private var input: FileInputStream? = null
    private var output: FileOutputStream? = null
    private var thread: Thread? = null
    private var requests: ExecutorService? = null
    private val sockets = ConcurrentHashMap.newKeySet<DatagramSocket>()
    private lateinit var runtime: OfflineRuntime
    override fun onCreate() {
        super.onCreate()
        instance = this
        runtime = OfflineRuntime.get(this)
    }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        instance = this
        if (intent?.action == ACTION_STOP) {
            stopVpn()
            return START_NOT_STICKY
        }
        if (!runtime.ready || !runtime.configuration.optBoolean("websiteEnabled") || runtime.configuration.optString("dnsMode") != "vpn") {
            stopVpn()
            return START_NOT_STICKY
        }
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
                val inStream = FileInputStream(descriptor.fileDescriptor); input = inStream
                val outStream = FileOutputStream(descriptor.fileDescriptor); output = outStream
                val exec = ThreadPoolExecutor(2, 2, 0, TimeUnit.MILLISECONDS, ArrayBlockingQueue(64), ThreadPoolExecutor.AbortPolicy())
                requests = exec
                val bytes = ByteArray(8192)
                while (running.get()) {
                    val count = inStream.read(bytes); if (count < 0) break
                    val query = DnsPacket.parse(bytes.copyOf(count)) ?: continue
                    try { exec.execute {
                        val response = resolve(query)
                        if (running.get()) try { synchronized(outStream) { outStream.write(DnsPacket.response(query, response)) } } catch (_: Exception) { stopSelf() }
                    } } catch (_: RejectedExecutionException) {
                        synchronized(outStream) { outStream.write(DnsPacket.response(query, DnsPacket.error(query, 2))) }
                    }
                }
            } catch (_: Exception) {
                if (running.get()) runtime.vpnError = "VPN stopped. Open Website protection to reconnect."
            } finally { stopVpn() }
        }, "restrainify-dns").also { it.start() }
        return START_STICKY
    }
    private fun resolve(query: DnsPacket.Query): ByteArray {
        val verdict = Policy.evaluateDns(
            host = query.host,
            qtype = query.qtype,
            rules = runtime.domainRules,
            safeSearch = runtime.safeSearchEnabled,
            proxyResistance = runtime.proxyResistanceEnabled,
            socialWebsites = runtime.socialWebsitesEnabled,
        )
        when (verdict) {
            is Policy.DnsVerdict.Block -> {
                runtime.recordBlock()
                return DnsPacket.error(query, 3)
            }
            is Policy.DnsVerdict.SafeSearch -> {
                if (query.qtype == 1) return DnsPacket.syntheticA(query, verdict.ip)
                return DnsPacket.nodata(query)
            }
            is Policy.DnsVerdict.Forward -> {
                val upstream = verdict.upstream
                return try {
                    DatagramSocket().use { socket ->
                        sockets.add(socket)
                        try {
                            check(protect(socket)); socket.soTimeout = 2500
                            socket.connect(InetAddress.getByName(upstream), 53)
                            socket.send(DatagramPacket(query.dns, query.dns.size))
                            val response = DatagramPacket(ByteArray(4096), 4096); socket.receive(response)
                            val data = response.data.copyOf(response.length)
                            require(data.size >= 12 && data[0] == query.dns[0] && data[1] == query.dns[1] && data[2].toInt() and 0x80 != 0)
                            runtime.vpnError = null
                            if (upstream == "1.1.1.3" && DnsPacket.isBlockedResponse(data)) {
                                runtime.recordBlock()
                            }
                            data
                        } finally { sockets.remove(socket) }
                    }
                } catch (_: Exception) {
                    runtime.vpnError = "DNS resolver unreachable. Check your connection."
                    DnsPacket.error(query, 2)
                }
            }
        }
    }
    fun stopVpn() {
        if (!running.getAndSet(false) && tunnel == null) {
            runtime.vpnActive = false
            runtime.changed?.invoke()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return
        }
        sockets.forEach { try { it.close() } catch (_: Exception) {} }
        requests?.shutdownNow()
        requests = null
        try { input?.close() } catch (_: Exception) {}
        try { output?.close() } catch (_: Exception) {}
        try { tunnel?.close() } catch (_: Exception) {}
        input = null
        output = null
        tunnel = null
        thread?.interrupt()
        runtime.vpnActive = false
        runtime.changed?.invoke()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }
    override fun onRevoke() {
        runtime.vpnError = "VPN access was revoked or another VPN took over."
        stopVpn()
    }
    override fun onDestroy() {
        stopVpn()
        if (instance == this) instance = null
        super.onDestroy()
    }
    companion object {
        const val ACTION_STOP = "com.restrainify.action.STOP_VPN"
        @Volatile var instance: DnsVpnService? = null
        fun stop(context: Context) {
            val inst = instance
            if (inst != null) {
                inst.stopVpn()
            } else {
                try {
                    context.startService(Intent(context, DnsVpnService::class.java).setAction(ACTION_STOP))
                } catch (_: Exception) {
                    context.stopService(Intent(context, DnsVpnService::class.java))
                }
            }
        }
    }
}
