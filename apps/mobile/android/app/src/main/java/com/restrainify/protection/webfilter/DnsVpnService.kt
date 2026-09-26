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
import java.util.concurrent.atomic.AtomicInteger

class DnsVpnService : VpnService() {
    private val running = AtomicBoolean(false)
    private var tunnel: ParcelFileDescriptor? = null
    private var input: FileInputStream? = null
    private var output: FileOutputStream? = null
    private var thread: Thread? = null
    private var requests: ExecutorService? = null
    private val socketPool = ConcurrentLinkedQueue<DatagramSocket>()
    private val cache = DnsCache(1024)
    private val consecutiveFailures = AtomicInteger(0)
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
        startForeground(
            42,
            Notification.Builder(this, "dns")
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setContentTitle("Restrainify DNS protection")
                .setContentText("Local domain rules are running. Tap to view coverage.")
                .setContentIntent(pending)
                .setOngoing(true)
                .build(),
        )

        thread = Thread({
            try {
                val builder = Builder()
                    .setSession("Restrainify · local DNS")
                    .setMtu(1500)
                    .setBlocking(true)
                    .addAddress("10.111.0.1", 32)
                    .addDnsServer("10.111.0.2")
                    .addRoute("10.111.0.2", 32)
                    .allowFamily(OsConstants.AF_INET)
                    .allowFamily(OsConstants.AF_INET6)
                    .setConfigureIntent(pending)

                try {
                    builder.addAddress("fd00:1111::1", 128)
                    builder.addDnsServer("fd00:1111::2")
                    builder.addRoute("fd00:1111::2", 128)
                } catch (e: Exception) {
                    android.util.Log.w("Restrainify", "IPv6 tunnel configuration not supported", e)
                }

                val interceptedIps = listOf(
                    "1.1.1.1", "1.0.0.1",
                    "8.8.8.8", "8.8.4.4",
                    "9.9.9.9", "149.112.112.112",
                    "208.67.222.222", "208.67.220.220",
                )
                for (ip in interceptedIps) {
                    try { builder.addRoute(ip, 32) } catch (_: Exception) {}
                }

                val descriptor = builder.establish() ?: error("VPN permission unavailable")
                tunnel = descriptor
                runtime.vpnActive = true
                runtime.vpnError = null
                runtime.changed?.invoke()

                val inStream = FileInputStream(descriptor.fileDescriptor)
                input = inStream
                val outStream = FileOutputStream(descriptor.fileDescriptor)
                output = outStream

                val cpus = Runtime.getRuntime().availableProcessors()
                val coreThreads = maxOf(4, cpus)
                val maxThreads = maxOf(16, cpus * 2)
                val exec = ThreadPoolExecutor(
                    coreThreads,
                    maxThreads,
                    60L,
                    TimeUnit.SECONDS,
                    LinkedBlockingQueue(512),
                    ThreadPoolExecutor.CallerRunsPolicy(),
                )
                requests = exec

                val bytes = ByteArray(8192)
                while (running.get()) {
                    val count = inStream.read(bytes)
                    if (count < 0) break
                    val query = DnsPacket.parse(bytes.copyOf(count)) ?: continue
                    exec.execute {
                        val response = resolve(query)
                        if (running.get()) {
                            try {
                                synchronized(outStream) {
                                    outStream.write(DnsPacket.response(query, response))
                                }
                            } catch (_: Exception) {
                                stopSelf()
                            }
                        }
                    }
                }
            } catch (_: Exception) {
                if (running.get()) runtime.vpnError = "VPN stopped. Open Website protection to reconnect."
            } finally {
                stopVpn()
            }
        }, "restrainify-dns").also { it.start() }

        return START_STICKY
    }

    private fun acquireSocket(): DatagramSocket {
        var socket = socketPool.poll()
        while (socket != null && (socket.isClosed || !socket.isBound)) {
            socket = socketPool.poll()
        }
        if (socket != null) return socket

        val newSocket = DatagramSocket()
        check(protect(newSocket))
        newSocket.soTimeout = 2500
        return newSocket
    }

    private fun releaseSocket(socket: DatagramSocket) {
        if (!running.get() || socket.isClosed) {
            try { socket.close() } catch (_: Exception) {}
            return
        }
        if (socketPool.size < 16) {
            socketPool.offer(socket)
        } else {
            try { socket.close() } catch (_: Exception) {}
        }
    }

    private fun onSuccess() {
        val prev = consecutiveFailures.getAndSet(0)
        if (prev >= 5 && runtime.vpnError != null) {
            runtime.vpnError = null
            runtime.changed?.invoke()
        }
    }

    private fun onFailure() {
        val fails = consecutiveFailures.incrementAndGet()
        if (fails >= 5 && runtime.vpnError == null) {
            runtime.vpnError = "DNS resolver unreachable. Check your connection."
            runtime.changed?.invoke()
        }
    }

    private fun resolve(query: DnsPacket.Query): ByteArray {
        val cached = cache.get(query.host, query.qtype, query.dns[0], query.dns[1])
        if (cached != null) {
            return cached
        }

        val verdict = Policy.evaluateDns(
            host = query.host,
            qtype = query.qtype,
            rules = runtime.domainRules,
            safeSearch = runtime.safeSearchEnabled,
            proxyResistance = runtime.proxyResistanceEnabled,
            socialWebsites = runtime.socialWebsitesEnabled,
            appRules = runtime.appRules,
        )

        when (verdict) {
            is Policy.DnsVerdict.Block -> {
                runtime.recordBlock(query.host)
                return DnsPacket.error(query, 3)
            }
            is Policy.DnsVerdict.SafeSearch -> {
                if (query.qtype == 1) {
                    val resp = DnsPacket.syntheticA(query, verdict.ip)
                    cache.put(query.host, 1, resp, 300)
                    return resp
                }
                return DnsPacket.nodata(query)
            }
            is Policy.DnsVerdict.Forward -> {
                val upstream = verdict.upstream
                val socket = acquireSocket()
                return try {
                    val upstreamAddr = InetAddress.getByName(upstream)
                    val outPacket = DatagramPacket(query.dns, query.dns.size, upstreamAddr, 53)
                    socket.send(outPacket)
                    val inPacket = DatagramPacket(ByteArray(4096), 4096)
                    socket.receive(inPacket)
                    val data = inPacket.data.copyOf(inPacket.length)
                    require(data.size >= 12 && data[0] == query.dns[0] && data[1] == query.dns[1] && data[2].toInt() and 0x80 != 0)

                    onSuccess()

                    if (upstream == "1.1.1.3" && DnsPacket.isBlockedResponse(data)) {
                        runtime.recordBlock(query.host)
                    } else {
                        val ttl = DnsPacket.extractTtl(data)
                        cache.put(query.host, query.qtype, data, ttl)
                    }
                    releaseSocket(socket)
                    data
                } catch (_: Exception) {
                    releaseSocket(socket)
                    onFailure()
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
        while (true) {
            val s = socketPool.poll() ?: break
            try { s.close() } catch (_: Exception) {}
        }
        cache.clear()
        consecutiveFailures.set(0)
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
