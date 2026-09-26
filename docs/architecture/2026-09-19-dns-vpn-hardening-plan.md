# Implementation Plan: Hardening Android Local DNS VPN Service

## 1. Requested Behavior or Problem
The current local Android DNS VPN implementation (`DnsVpnService.kt`, `DnsPacket.kt`, `Policy.kt`) suffers from critical security, performance, and stability issues:
1. **Concurrency Bottleneck & Dropped Queries:** `DnsVpnService` uses a fixed 2-thread pool with a 64-item `ArrayBlockingQueue` and `AbortPolicy`. Normal mobile app launches generate 50–100+ concurrent DNS lookups, triggering `RejectedExecutionException`, returning SERVFAIL (RCODE 2), and breaking browsing.
2. **Socket Thrashing & High Latency:** Every single DNS query allocates a new `DatagramSocket`, performs an IPC `protect(socket)` call to the Android system server, connects, waits, and destroys the socket.
3. **Zero DNS Caching:** Every query for the same domain generates a network round-trip to Cloudflare (`1.1.1.3` / `1.1.1.1`), inflating latency and battery consumption.
4. **Private DNS (DoT / Port 853) & IPv6 Leakage:** Android's default Private DNS ("Automatic") queries port 853 TLS directly over the physical network, bypassing `10.111.0.2:53 UDP`. Furthermore, IPv6 DNS queries are ignored by `DnsPacket` and leak to the carrier's IPv6 DNS servers.
5. **UI Error State Flapping:** A single transient network timeout sets `vpnError`, causing constant flickering between healthy and error states.
6. **Manifest Service Type & Always-On:** `foregroundServiceType` is set to `systemExempted` (which causes Google Play rejections), and `SUPPORTS_ALWAYS_ON` is `false`.

## 2. Relevant Requirements
- `Restrainify_V1_Product_PRD.md` Section 3.1 & 7 (AC-01): Truthful, reliable local website blocking without internet disruption.
- `Restrainify_V1_Technical_PRD.md` Section 3.2: High-throughput, low-latency, resilient local DNS filtering.
- `AGENT.md` Section 1.1: Pre-coding implementation plan mandatory.
- `AGENT.md` Section 4 & 5: Production code quality, simplicity, robust error handling.

## 3. Files to be Affected
- `apps/mobile/android/app/src/main/java/com/restrainify/protection/webfilter/DnsPacket.kt`:
  - Support IPv6 packet parsing and response generation.
  - Robust handling of EDNS(0) and TTL extraction.
- `apps/mobile/android/app/src/main/java/com/restrainify/protection/webfilter/DnsVpnService.kt`:
  - Route IPv6 DNS (`fd00:1111::2`) and capture well-known DNS endpoints.
  - Expand worker pool (dynamic sizing, bounded queue, sensible backpressure).
  - Reusable socket pool / thread-local protected datagram sockets.
  - In-memory LRU TTL DNS cache.
  - Debounced consecutive failure tracking before setting `vpnError`.
- `apps/mobile/android/app/src/main/AndroidManifest.xml`:
  - Update `foregroundServiceType` to `specialUse` (or compliant type) and enable `SUPPORTS_ALWAYS_ON`.
- `apps/mobile/android/app/src/test/java/com/restrainify/protection/PolicyTest.kt`:
  - Add test cases for DNS packet IPv6 parsing, cache TTL handling, and response creation.

## 4. Current Implementation Inspected
- `DnsVpnService.kt`:
  - Lines 50–52: Routes only `10.111.0.2/32`, no IPv6 DNS address/route.
  - Lines 56–67: `ThreadPoolExecutor(2, 2, 0, TimeUnit.MILLISECONDS, ArrayBlockingQueue(64), ThreadPoolExecutor.AbortPolicy())`.
  - Lines 97–112: `DatagramSocket().use { ... check(protect(socket)) ... }`.
  - Line 114: `runtime.vpnError = "DNS resolver unreachable..."` on single catch.
- `DnsPacket.kt`:
  - Line 9: Rejects all non-IPv4 packets (`(packet[0].toInt() and 255) != 0x45`).
- `AndroidManifest.xml`:
  - Lines 40–42: `foregroundServiceType="systemExempted"` and `SUPPORTS_ALWAYS_ON="false"`.

## 5. Proposed Implementation Details

### 5.1 In-Memory TTL Cache (`DnsCache`)
- Implement a thread-safe LRU cache with entries indexed by `(host, qtype)`.
- Extract TTL from answers in upstream DNS responses (clamped to min 10s, max 3600s).
- Return cached responses immediately without hitting upstream.
- Clean expired entries periodically or on LRU eviction.

### 5.2 Threading & Concurrency
- Replace fixed 2-thread pool with `min(16, max(4, Runtime.getRuntime().availableProcessors() * 2))` threads and an `ArrayBlockingQueue(512)`.
- Use a `DiscardOldestPolicy` or controlled fallback to prevent `RejectedExecutionException` crashes.

### 5.3 Socket Pool / Reusable Sockets
- Create a managed pool of pre-protected `DatagramSocket` instances (`ConcurrentLinkedQueue<DatagramSocket>`).
- Reusing sockets avoids frequent allocations, `protect()` IPC syscalls, and file descriptor exhaustion.

### 5.4 Anti-Leak & IPv6 Support
- Add IPv6 tunnel address `fd00:1111::1/128`, DNS server `fd00:1111::2`, and route `fd00:1111::2/128`.
- In `DnsPacket.kt`, handle IPv6 packets (`0x60`, next header 17).
- Compute valid IPv6 UDP checksums on generated IPv6 responses.

### 5.5 Resilience & Error Debouncing
- Require 3 consecutive upstream timeouts/failures within a 15-second window before setting `runtime.vpnError`.
- Clear consecutive failure counter on any successful lookup.

### 5.6 Manifest & Store Configuration
- Set `SUPPORTS_ALWAYS_ON` to `true`.
- Adjust `foregroundServiceType` to `specialUse` with property description.

## 6. Edge Cases & Safety
- Clock changes / timezone shifts: Cache uses `SystemClock.elapsedRealtime()` rather than `System.currentTimeMillis()` to avoid invalidation on clock rollback.
- Thread interruption during VPN stop: Properly close socket pool and flush queued tasks.
- Packet buffer safety: Validate buffer boundaries and handle truncated queries without crashes.

## 7. Verification Plan
- Unit tests:
  - Verify IPv4 and IPv6 DNS packet parsing and response generation.
  - Verify DNS cache insertion, hit, expiration, and eviction.
  - Verify DNS verdict evaluation with various host permutations.
- Build verification:
  - `./gradlew :app:compileDebugKotlin`
  - `./gradlew :app:testDebugUnitTest`
  - `npm run check` (typecheck & jest tests)
