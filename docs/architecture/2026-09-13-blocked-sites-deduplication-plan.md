# Implementation Plan: Blocked Sites Deduplication and Debouncing

## 1. Requested Behavior or Problem
In the "Your progress" page (`ProgressOverviewScreen.tsx`), the "Adult sites blocked" counter (`data.blockedToday`) increases by more than 1 when attempting to open a single blocked website.

### Root Cause
1. **Parallel DNS Queries:** Modern Android and mobile web browsers (Chrome, Firefox, Samsung Internet) query multiple DNS record types in parallel for a single domain navigation:
   - IPv4 (`A` record, `qtype=1`)
   - IPv6 (`AAAA` record, `qtype=28`)
   - HTTPS / SVCB (`qtype=65` for HTTP/3 and Encrypted Client Hello negotiation)
2. **Resolver Retries on Block:** When `DnsVpnService` returns `NXDOMAIN` (RCODE 3), the OS/browser resolver assumes potential packet loss and retries 2–3 times per record type.
3. **Subdomains & Secondary Assets:** Speculative queries (e.g. `www.` variations or static CDNs) generate further parallel queries.
4. **No Deduplication:** In `DnsVpnService.kt`, every single blocked DNS packet unconditionally calls `runtime.recordBlock()`. In `OfflineRuntime.kt`, `recordBlock()` immediately increments `DailyRecord.blocked` by 1. A single navigation to a blocked site therefore produces 3 to 10+ increments within milliseconds.

## 2. Relevant Requirements
- `Restrainify_V1_Product_PRD.md` Section 3.10 (FR-REC-001): "Current streak, longest streak, 30-day porn-free metric, relapse history, blocked counters, and urges-resisted data calculate correctly."
- `Restrainify_V1_Technical_PRD.md` Section 5.1 & ADR-0008: Accurate reporting of blocked website attempts on the progress surface.
- `AGENT.md` Section 1.1: Pre-coding implementation plan.
- `AGENT.md` Section 3: Scope discipline (targeted fix, preserve existing contracts and comments).

## 3. Files Likely to be Affected
- `apps/mobile/android/app/src/main/java/com/restrainify/protection/Policy.kt`: Add pure helper functions `normalizeBlockHost(host, rules)` and `shouldRecordBlock(lastRecordedMs, currentMs, cooldownMs)`.
- `apps/mobile/android/app/src/main/java/com/restrainify/protection/OfflineRuntime.kt`: Update `recordBlock(host: String? = null)` with in-memory debouncing map (`recentBlocks`) and a 10-second cooldown window.
- `apps/mobile/android/app/src/main/java/com/restrainify/protection/webfilter/DnsVpnService.kt`: Pass `query.host` to `runtime.recordBlock(query.host)` in both local verdict and upstream Cloudflare Families block branches.
- `apps/mobile/android/app/src/test/java/com/restrainify/protection/PolicyTest.kt`: Add unit tests for `normalizeBlockHost` and `shouldRecordBlock`.

## 4. Current Implementation Inspected
- `DnsVpnService.kt` lines 85-88 and 106-108:
  ```kotlin
  is Policy.DnsVerdict.Block -> {
      runtime.recordBlock()
      return DnsPacket.error(query, 3)
  }
  ...
  if (upstream == "1.1.1.3" && DnsPacket.isBlockedResponse(data)) {
      runtime.recordBlock()
  }
  ```
- `OfflineRuntime.kt` lines 210-213:
  ```kotlin
  fun recordBlock() { executor.execute {
      try { val day = LocalDate.now().toString(); db.runInTransaction { dao.day((dao.day(day) ?: DailyRecord(day)).let { it.copy(blocked = it.blocked + 1) }) } }
      catch (_: Exception) { failure = "Protection counters could not be saved" }
  } }
  ```
- `RestrictionService.kt` line 522: calls `runtime.recordBlock()` when showing accessibility overlay.

## 5. Proposed Implementation

### 5.1 Pure Logic in `Policy.kt`
1. `normalizeBlockHost(host: String, rules: List<DomainRule> = emptyList()): String`
   - Normalizes host by lowercasing, trimming trailing dots.
   - If `host` matches an active user rule, returns the rule's host.
   - If `host` matches `KNOWN_ADULT_DOMAINS`, returns the matched adult domain.
   - If `host` matches `KNOWN_PROXY_DOMAINS`, returns the matched proxy domain.
   - If `host` matches `KNOWN_SOCIAL_DOMAINS`, returns the matched social domain.
   - Otherwise, strips `"www."` and `"m."` prefixes if present.
2. `shouldRecordBlock(lastRecordedMs: Long?, currentMs: Long, cooldownMs: Long = 10_000L): Boolean`
   - Returns `true` if `lastRecordedMs == null`.
   - Returns `true` if `currentMs < lastRecordedMs` (clock rollback guard).
   - Returns `true` if `(currentMs - lastRecordedMs) >= cooldownMs`.
   - Returns `false` otherwise (within cooldown window).

### 5.2 Runtime Debouncing in `OfflineRuntime.kt`
1. Maintain a synchronized/thread-safe cache:
   ```kotlin
   private val recentBlocks = java.util.concurrent.ConcurrentHashMap<String, Long>()
   ```
2. Update `recordBlock`:
   ```kotlin
   fun recordBlock(host: String? = null) {
       if (host != null) {
           val key = Policy.normalizeBlockHost(host, domainRules)
           val now = SystemClock.elapsedRealtime()
           val shouldRecord = synchronized(recentBlocks) {
               val last = recentBlocks[key]
               if (Policy.shouldRecordBlock(last, now)) {
                   recentBlocks[key] = now
                   if (recentBlocks.size > 256) {
                       recentBlocks.entries.removeIf { (now - it.value) >= 60_000L }
                   }
                   true
               } else {
                   false
               }
           }
           if (!shouldRecord) return
       }
       executor.execute {
           try {
               val day = LocalDate.now().toString()
               db.runInTransaction {
                   dao.day((dao.day(day) ?: DailyRecord(day)).let { it.copy(blocked = it.blocked + 1) })
               }
           } catch (_: Exception) {
               failure = "Protection counters could not be saved"
           }
       }
   }
   ```
3. In `OfflineRuntime.kt` `"reset"` action, add `recentBlocks.clear()`.

### 5.3 Callsite Updates in `DnsVpnService.kt`
- Pass `query.host` to `runtime.recordBlock(query.host)` in both the local `Policy.DnsVerdict.Block` verdict and the `upstream == "1.1.1.3" && DnsPacket.isBlockedResponse(data)` branch.

## 6. Important Edge Cases
- **Parallel IPv4, IPv6, HTTPS queries:** Arrive within ~10–50ms of each other; deduplicated under the same normalized key.
- **Apex domain vs www subdomain:** `www.pornhub.com` and `pornhub.com` both normalize to `pornhub.com`; deduplicated together.
- **Distinct blocked sites:** Visiting `site-a.com` followed immediately by `site-b.com` records 1 block for `site-a.com` and 1 block for `site-b.com` because their keys differ.
- **Subsequent intentional visits:** A user retrying after the 10-second cooldown window correctly registers a second blocked attempt.
- **Overlays / App restrictions:** `RestrictionService` calls `recordBlock()` without a host parameter; continues to work without disruption.
- **Memory bounded:** Entries older than 60s are pruned if map exceeds 256 items, preventing memory leaks.
- **Monotonic clock:** Uses `SystemClock.elapsedRealtime()` so system time changes or NTP adjustments do not break cooldown timers.

## 7. Security and Privacy Implications
- Host names are kept strictly in-memory in a transient volatile map and are never written to disk, databases, logs, or sync payloads.
- Preserves Restrainify's zero-knowledge privacy guarantee (no browsing history persisted).

## 8. Verification Plan
- Android unit tests:
  - Add test cases in `PolicyTest.kt` verifying `normalizeBlockHost` and `shouldRecordBlock`.
  - Run `./gradlew :app:testDebugUnitTest` (scoped to `:app`).
- TypeScript test suites:
  - Run `npm test --workspaces`.
  - Run `npm run typecheck --workspaces`.
  - Run `npm run lint --workspaces`.
- Jujutsu VCS:
  - Review changes with `jj --no-pager diff`.
  - Check status with `jj --no-pager status` (no `jj describe` unless told).
