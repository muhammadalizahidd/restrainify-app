# Implementation Plan: Reconcile Remote Sync Entities (reward_remote & event_remote)

## 1. Requested Behavior or Problem
During cloud sync (`syncEngine.sync()`), the app pulls remote updates (`/api/sync/pull`) and attempts to reconcile them into the local Android Room database via `SyncContext.tsx`.
Currently, this emits warnings:
```
WARN Error reconciling remote entity change: reward [Error: Unsupported action]
WARN Error reconciling remote entity change: recovery_event [Error: Unsupported action]
```
Because `SyncContext.tsx` calls `offlineProtection.command("reward_remote", { day })` and `offlineProtection.command("event_remote", { id, kind, timestamp, day, note, resisted })`, but `OfflineRuntime.kt`'s `command(action, input)` dispatcher does not implement those action cases. Any unknown action throws `IllegalArgumentException("Unsupported action")`.

Additionally, if a remote event is re-pulled, `ProtectionDao.event` had `OnConflictStrategy.ABORT`, which would crash on duplicate primary key rather than upserting idempotently.

## 2. Relevant Requirements
- `Restrainify_V1_Product_PRD.md` Section 3.13 (FR-SYNC-002, FR-SYNC-004): Local-first, eventual, and idempotent synchronization where duplicate syncs do not corrupt state or crash.
- `AGENT.md` Section 15: Offline and Synchronization (idempotent, conflict-resilient, non-blocking).
- `AGENT.md` Section 1.1: Pre-coding implementation plan.

## 3. Files Likely to be Affected
- `apps/mobile/android/app/src/main/java/com/restrainify/protection/OfflineRuntime.kt`: Add `"reward_remote"` and `"event_remote"` action cases.
- `apps/mobile/android/app/src/main/java/com/restrainify/protection/storage/ProtectionDatabase.kt`: Change `ProtectionDao.event` to `OnConflictStrategy.REPLACE` for idempotent inserts.
- `apps/mobile/src/features/sync/context/SyncContext.tsx`: Support both `recovery_event` and `tracker_event` in remote reconciliation.

## 4. Current Implementation Inspected
- `OfflineRuntime.kt` lines 97-186:
  - Supported actions: `onboard`, `setting`, `domain`, `rule`, `reward`, `event`, `burst`, `resist`, `strict`, `reset`.
  - Fallthrough: `else -> throw IllegalArgumentException("Unsupported action")`.
- `ProtectionDatabase.kt` line 31:
  - `@Insert(onConflict = OnConflictStrategy.ABORT) fun event(value: LocalEvent)`
- `SyncContext.tsx` lines 76-95:
  - Invokes `offlineProtection.command("reward_remote", { day })`.
  - Invokes `offlineProtection.command("event_remote", { id, kind, timestamp, day, note, resisted })`.

## 5. Proposed Implementation
1. In `OfflineRuntime.kt`:
   - Add `"reward_remote"`:
     ```kotlin
     "reward_remote" -> {
         val day = input.getString("day")
         dao.day((dao.day(day) ?: DailyRecord(day)).copy(reward = true))
     }
     ```
   - Add `"event_remote"`:
     ```kotlin
     "event_remote" -> {
         val id = input.getString("id")
         val kind = input.getString("kind")
         require(kind in listOf("relapse", "urge", "tracker", "burst")) { "Invalid event kind" }
         val timestamp = input.optLong("timestamp", System.currentTimeMillis())
         val day = input.optString("day", LocalDate.now().toString())
         val note = input.optString("note", "").trim()
         val resisted = input.optBoolean("resisted", false)
         dao.event(LocalEvent(id, kind, timestamp, day, note, resisted))
     }
     ```
2. In `ProtectionDatabase.kt`:
   - Update `ProtectionDao.event` to `@Insert(onConflict = OnConflictStrategy.REPLACE)` to ensure idempotent reconciliation without constraint aborts.
3. In `SyncContext.tsx`:
   - Extend `recovery_event` branch to also handle `tracker_event`.

## 6. Important Edge Cases
- **Duplicate events from repeat syncs:** `OnConflictStrategy.REPLACE` safely updates existing records without duplicate primary key collisions.
- **Historical reward claims:** `reward_remote` sets `reward = true` for the specified day without checking if it's "today", accurately syncing historical rewards claimed on other devices.
- **Clock difference / timestamp sanitization:** `timestamp` defaults to current epoch milliseconds if missing or non-positive.
- **Unknown event kinds:** Validated against allowed list `listOf("relapse", "urge", "tracker", "burst")`.

## 7. Verification Plan
- Android unit tests: `./gradlew :app:testDebugUnitTest`.
- TypeScript / React Native tests: `npm test --workspaces`.
- Static analysis & linting: `npm run lint --workspaces` and `npm run typecheck --workspaces`.
- Status review: `jj --no-pager status` (no `jj describe` unless told).
