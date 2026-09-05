# Restrainify V1 - Technical Product Requirements Document

**Document type:** Engineering / Technical PRD  
**Source baseline:** `Restrainify-Tech-PRD.pdf`, Version 1.0, Engineering Baseline, 01 September 2026  
**Primary runtime:** Android V1  
**Web platform:** Next.js  
**Architecture:** Local-first protection + offline-first storage + authenticated eventual synchronization

---

## 0. Instructions for AI Engineering Agents

This document is written to be implementation-readable across OpenAI, Anthropic, Google, DeepSeek, and other coding/reasoning models.

Normative terms:

- **MUST** = mandatory architectural or implementation constraint.
- **MUST NOT** = prohibited.
- **SHOULD** = preferred unless profiling/platform evidence justifies deviation.
- **MAY** = optional.

### Source fidelity rule

This technical PRD is derived from the Restrainify technical PDF. It does not silently invent missing implementation details.

The source PDF's table of contents lists **Section 16 - Testing and Observability**, but the body text available in the source jumps from Section 15 to Section 17. Therefore this Markdown preserves the gap explicitly instead of fabricating a Section 16 specification. Test requirements that are stated elsewhere in the PDF - especially the Definition of Done and release gate - are preserved.

### Architecture invariants

The following are non-negotiable V1 invariants:

1. Real-time protection decisions remain on-device.
2. The real-time protection loop does not depend on React Native being active.
3. Cloud synchronization is not required for local enforcement.
4. Raw screenshots/frames are not persisted or uploaded.
5. The app does not perform TLS MITM.
6. The app does not remotely proxy all user traffic through company servers.
7. The app does not promise absolute uninstall prevention for a normal adult consumer Android device.
8. UI state must reconcile with native protection truth after lifecycle transitions.

---

# 1. Engineering Baseline

| Area | V1 choice |
|---|---|
| Mobile UI | React Native |
| Native protection engine | Kotlin |
| Local database | Room + SQLCipher |
| Backend / web | Next.js |
| Server database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Visual inference | TensorFlow Lite |
| Connectivity | Offline-first with eventual synchronization |
| Primary mobile platform | Android |

---

# 2. Purpose and Scope

## 2.1 Product purpose

Restrainify V1 is an Android-first, single-user self-control system intended to reduce exposure to explicit content and high-risk digital triggers while preserving normal phone use outside protected contexts.

Protection MUST remain useful without continuous network access. Cloud services are used for identity, persistence, synchronization, and web access; they MUST NOT be part of the real-time protection loop.

## 2.2 V1 capability ownership

| Capability | Requirement | Primary implementation owner |
|---|---|---|
| Website protection | Adult-domain filtering, custom block/allow lists, manual blocking, overrides, SafeSearch where reliable | Kotlin + local VPN/DNS path |
| Visual protection | On-device explicit/suggestive detection + optional person-region blur | Kotlin + TensorFlow Lite |
| App controls | Per-app usage, daily limits, schedules, supported short-form controls | Kotlin + UsageStats + Accessibility |
| Recovery | Streaks, porn-free days, relapse/urge events, Burst | Room + sync |
| Fap Tracker | Optional user-enabled tracker and history | React Native + Room + API |
| Authentication | Google OAuth + email/password | Supabase Auth |
| Offline mode | Core protection/tracking continue without internet | Room/SQLCipher + native runtime |
| Online sync | Local mutations queued and synced when connectivity returns | Next.js API + Supabase |
| Web platform | Landing page, privacy policy, auth entry points, future authenticated surfaces | Next.js |

## 2.3 Explicit technical non-goals

V1 MUST NOT include:

- cloud inference for each screen frame;
- remote proxying of all user traffic;
- TLS interception / MITM;
- screenshot persistence;
- accountability partners;
- multi-device policy coordination;
- absolute uninstall prevention on an ordinary adult consumer Android device;
- an iOS/desktop protection runtime as part of V1.

---

# 3. System Architecture

## 3.1 Logical architecture

The Android application is local-first.

```text
+---------------------------------------------------------------+
| ANDROID APP                                                   |
|                                                               |
|  React Native UI                                              |
|      |                                                        |
|      v                                                        |
|  Native Bridge                                                |
|      |                                                        |
|      v                                                        |
|  Kotlin Protection Engine                                     |
|    - Protection Orchestrator                                  |
|    - Accessibility / capture                                  |
|    - Visual ML scheduling + overlays                          |
|    - Website filtering                                        |
|    - UsageStats / app limits                                  |
|    - Foreground/background service lifecycle                  |
|    - Room repository                                          |
|      |                                                        |
|      v                                                        |
|  Room + SQLCipher                                             |
+---------------------------------------------------------------+
               | HTTPS + authenticated sync
               v
+---------------------------+       +---------------------------+
| NEXT.JS PLATFORM          |       | SUPABASE                  |
| - API routes              | ----> | - Supabase Auth           |
| - Validation              |       | - PostgreSQL              |
| - Authorization           |       | - Row Level Security      |
| - Sync orchestration      |       | - Optional Storage        |
| - Landing/privacy/auth    |       +---------------------------+
+---------------------------+
```

### ARCH-001
React Native MUST own presentation and user interaction, not protection truth.

### ARCH-002
Kotlin MUST own Android APIs, protection state, capture, ML scheduling, VPN/DNS filtering, UsageStats, native service lifecycle, and Room access.

### ARCH-003
Next.js MUST provide the server-side API boundary and web application.

### ARCH-004
Supabase MUST provide authentication and PostgreSQL persistence.

### ARCH-005
Protection decisions MUST remain on-device.

## 3.2 Component ownership boundaries

| Component | Owns | Must not own |
|---|---|---|
| React Native | Dashboard, settings UI, recovery UI, auth UI, sync status, presentation state | Screen capture, native service lifecycle, direct Room access, protection truth |
| Kotlin engine | Protection orchestrator, Accessibility, visual ML, VPN/DNS, UsageStats, overlays, Room repository, native services | Web rendering/server-side identity |
| Room + SQLCipher | Local settings, counters, recovery data, queued mutations, sync metadata, model metadata | Raw screenshots, full browsing history |
| Next.js backend | API routes, validation, authorization, sync orchestration, web application | Real-time enforcement, screen capture |
| Supabase | Authentication, PostgreSQL persistence, optional Storage | Real-time Android enforcement |

---

# 4. Offline / Online Operation

## 4.1 Design principle

Offline support is a core operating mode, not an error state.

### OFF-001
While offline, the device MUST continue to:

- enforce already-enabled local protections;
- read/write local state;
- record local events;
- update user-visible local state;
- queue eligible synchronized mutations.

### OFF-002
Synchronization MUST NOT be required before a real-time protection decision can be made.

## 4.2 Local data ownership

Room protected by SQLCipher is the operational local data store.

Every synchronizable mutation MUST include enough information to support stable retries and reconciliation, including:

- stable mutation ID;
- stable entity ID;
- operation type;
- payload/schema version;
- timestamps;
- retry/sync state.

React Native MUST NOT directly open Room. Database access is owned by the Kotlin repository layer.

## 4.3 Connectivity state machine

| State | Entry condition | Required behavior | Exit |
|---|---|---|---|
| `OFFLINE` | No usable network | Read/write Room, enqueue mutations, protection operational | Connectivity restored |
| `SYNCING` | Network available + pending work | Push mutations, pull server changes, reconcile, advance cursor | Queue empty or error |
| `ONLINE` | Connected + reconciled | Normal operation; eligible changes sync promptly | Network lost |
| `SYNC_ERROR` | Request/auth/server failure | Retain local data, exponential backoff, expose non-blocking warning | Retry succeeds or auth repaired |

## 4.4 Synchronization sequence

1. User changes a setting or creates an event.
2. The change is committed transactionally to Room.
3. A sync record is created in the same local transaction.
4. Connectivity is monitored.
5. When online, the sync worker authenticates and sends pending mutations to Next.js.
6. Next.js validates authorization and payload schema, writes accepted changes to Supabase, and returns accepted/rejected results.
7. Client pulls newer server state using cursor/version reconciliation.
8. Room is updated.
9. Successfully synchronized mutations are marked complete.
10. Failed mutations remain available for retry or repair.

## 4.5 Conflict policy

| Conflict | V1 policy |
|---|---|
| Independent settings | Last server-accepted version wins, keyed by stable setting/entity ID |
| Duplicate event | Idempotency key prevents duplicate insertion |
| Concurrent blocklist edit | Server version determines final state; client refreshes/reconciles |
| Rejected mutation | Preserve local failure state and expose repair path; never silently discard user data |
| Protection during conflict | Continue using last valid local configuration until reconciliation completes |

---

# 5. Authentication and Accounts

## 5.1 Authentication methods

Android and web MUST support:

- Google OAuth;
- email/password authentication.

Authentication MUST use Supabase Auth. Application data MUST be associated with the authenticated Supabase user ID.

Next.js is the controlled API boundary for application-data access.

## 5.2 Account lifecycle

| Flow | Requirement |
|---|---|
| Signup | Email/password or Google OAuth; create application profile after verified authentication |
| Login | Restore authenticated session and initialize user's local data namespace |
| Session refresh | Use supported Supabase session/token lifecycle; stale tokens are not valid sync credentials |
| Logout | Stop authenticated synchronization and clear session credentials; local protection follows local-data policy |
| Password reset | Use Supabase Auth recovery flow |
| Account deletion | Authenticated deletion removes server data and clears account-bound local data |

## 5.3 Offline authentication behavior

- A previously authenticated device MAY continue local protection while offline.
- A fresh installation without authentication cannot access server data until authentication completes.
- Expired/revoked sessions MUST NOT cause queued local changes to be discarded.
- Queued changes remain encrypted locally and synchronization resumes after re-authentication.

---

# 6. Protection Runtime

## 6.1 Runtime states

| State | Meaning |
|---|---|
| `ACTIVE` | Protection is healthy and required services are available |
| `STANDBY` | Protection healthy; visual subsystem sleeping |
| `PARTIAL` | Some protection paths active while another is unavailable |
| `DEGRADED` | Required permission/service/selector/VPN/capture path failed |
| `VISUAL_WARMING` | Eligible protected context entered; model/capture resources preparing |
| `VISUAL_ACTIVE` | Visual capture and inference permitted |
| `VISUAL_THROTTLED` | Adaptive backoff active after stable safe results or resource pressure |

## 6.2 Protection Orchestrator

The Kotlin Protection Orchestrator is the single native rules coordinator for:

- website protection;
- visual protection;
- short-form/social protection;
- app limits and schedules;
- cooldown/strict-state enforcement;
- health state.

It MUST remain authoritative even when the React Native UI is not active.

## 6.3 Trigger policy

### RUN-TRIG-001
Before requesting any screen capture, the orchestrator MUST check that the foreground package is in the eligible protected-app set.

### RUN-TRIG-002
Accessibility window/content-change events are the primary visual trigger inside eligible apps.

### RUN-TRIG-003
A timer MAY be used as a fallback.

### RUN-TRIG-004
Initial sampling target: approximately **1-3 seconds** in protected contexts.

### RUN-TRIG-005
Stable safe results SHOULD cause increasing backoff.

### RUN-TRIG-006
Risky results MAY temporarily re-check at approximately **250-500 ms** until the overlay is stable.

### RUN-TRIG-007
Leaving the protected app MUST immediately cancel the visual scheduler.

## 6.4 Capture implementation

Preferred path: AccessibilityService screenshot capability where supported.

Fallback path: MediaProjection where required.

Constraints:

- MediaProjection MUST use required user consent.
- MediaProjection MUST comply with required foreground-service behavior.
- A persistent MediaProjection session MUST NOT be kept active merely because protection is enabled.
- Capture failures MUST transition to a degraded capability state instead of tight retry loops.

---

# 7. Visual AI Pipeline

## 7.1 Model stack

| Component | V1 decision | Runtime policy |
|---|---|---|
| MobileNetV3-Small INT8 | Primary explicit/suggestive classifier or detector | Load only in `VISUAL_WARMING` / `VISUAL_ACTIVE` |
| Lightweight person detector | Optional region detector for person-specific blur | Load only when feature enabled and fast pass is positive/ambiguous |
| TensorFlow Lite | Android inference runtime | CPU first; profile NNAPI/GPU before using them |
| PyTorch -> ONNX -> TFLite | Training/export path | Deploy versioned immutable artifacts |

## 7.2 Inference contract

### ML-001 - Input preprocessing
Content regions MUST be normalized and resized for the fast pass to **224x224**, using the same preprocessing expected by training.

### ML-002 - Output contract
Inference output MUST include:

- `risk_score` in `[0,1]`;
- `category`;
- `confidence_bucket`;
- optional `region` / bounding box.

### ML-003 - Threshold configuration
Thresholds MUST be calibrated offline and stored in signed configuration/model metadata.

### ML-004 - Frame lifetime
Frames and intermediate tensors MUST exist only for the inference transaction and MUST be released immediately after the decision.

## 7.3 Privacy boundary

The visual model:

- receives pixels;
- returns risk scores and optional region boxes;
- MUST NOT identify specific people;
- MUST NOT create biometric profiles;
- MUST NOT generate identity embeddings;
- MUST NOT send image content to the server;
- MUST NOT persist screenshots/frames in V1.

## 7.4 Model lifecycle

| Event | Required action |
|---|---|
| Install | Ship baseline model |
| Update available | Download signed/versioned metadata and model assets over HTTPS |
| Validation | Verify checksum, schema, input size, output signature |
| Activation | Activate only after validation succeeds |
| Validation/update failure | Keep previous model active |
| Rollback | Restore last known-good model |

---

# 8. Website, App, and Short-Form Protection

## 8.1 Website filtering

V1 supports two website-filtering paths:

1. user-configured Android Private DNS; and
2. local `VpnService` fallback.

Neither path may decrypt TLS payloads.

Filtering operates on domain/DNS metadata and local policy rules.

### WEB-TECH-001
The app MUST NOT install a user CA for V1 website filtering.

### WEB-TECH-002
The app MUST NOT perform TLS MITM.

### WEB-TECH-003
The local VPN path MUST perform filtering locally rather than relay all traffic through a company VPS.

### WEB-TECH-004
Protection health MUST reflect VPN stops and VPN conflicts.

## 8.2 Manual website blocking

User-entered domains MUST be normalized before storage.

Each blocked-domain record includes:

- stable ID;
- normalized domain;
- enabled state;
- source;
- created timestamp;
- updated timestamp;
- synchronization metadata.

## 8.3 Overrides

Overrides MAY target:

- domain;
- application;
- feature;
- schedule.

Evaluation order MUST be:

1. base rules;
2. scoped overrides;
3. final enforcement.

Strict Mode MAY constrain or prohibit protection-weakening overrides.

## 8.4 App limits

UsageStatsManager is the source for app usage counters.

When a limit/schedule is reached, the Kotlin protection runtime uses the supported blocking overlay/navigation mechanism for the selected app.

Reboot, timezone changes, and date changes MUST NOT incorrectly reset limit state.

## 8.5 Short-form controls

Accessibility selectors/adapters MUST be versioned per supported app/version.

If an adapter no longer matches the current app UI:

- mark the feature `DEGRADED`;
- do not silently report success.

When feed-level suppression is unreliable, V1 MAY fall back to whole-app restriction.

V1 deliberately uses deterministic versioned adapters rather than an autonomous navigation agent.

---

# 9. Settings and Configuration

## 9.1 Settings model

Settings MUST be typed records rather than an opaque configuration blob.

Each setting requires:

- stable key;
- value type;
- enabled state where applicable;
- schema version;
- updated timestamp;
- synchronization metadata.

Ownership:

- React Native renders settings;
- Kotlin validates enforcement-affecting settings;
- Room stores the local operational copy;
- server validates/persists synchronized copy.

## 9.2 V1 settings

| Feature | User controls | Notes |
|---|---|---|
| Fap Tracker | Enable/disable | Optional |
| X/social website blocking | Enable/disable | Applied through active local filtering path |
| Manual website blocking | Add/remove/enable/disable domains | Local-first + synchronized |
| Overrides | Create/edit/remove scoped exceptions | Supports schedules and policy constraints |
| Visual protection | Enable/disable; supported blur behavior | Eligible contexts only |
| App limits | Per-app enable/disable, daily limits, schedules | UsageStats-backed |
| Short-form controls | Enable/disable per supported app | Versioned adapters |
| Burst mode | Enable/configure | Temporary high-protection intervention |
| Recovery tracking | Enable/disable | Local-first event model |
| Notifications | Enable/configure | Subject to Android permission |
| Cloud sync | Enable/disable where permitted | Never disables local protection |
| Strict mode | Enable/configure cooldowns | Can constrain weakening changes |

## 9.3 Update semantics

1. Setting change arrives from React Native.
2. Kotlin validates any enforcement-affecting change.
3. Valid change is applied locally first.
4. Local UI reflects accepted local state immediately.
5. Mutation is queued for sync.
6. Server may reject invalid/unauthorized change.
7. Rejection MUST be visible.
8. Server rejection MUST NOT silently overwrite local enforcement state without reconciliation.

---

# 10. Recovery, Fap Tracker, and Burst

## 10.1 Recovery data

Recovery tracking includes:

- streaks;
- porn-free days;
- urges;
- relapses;
- Burst interventions;
- Burst outcomes.

Recovery events are stored locally first and synchronized as append-only records.

## 10.2 Fap Tracker

The Fap Tracker is optional and user-controlled.

When enabled:

- user can record an event;
- local history is available;
- derived counts are available.

When disabled:

- new tracker events MUST NOT be created.

Tracker data MUST NOT affect website/app protection unless a separate explicit product rule is configured.

## 10.3 Burst

Burst is a temporary high-protection state.

Triggering Burst MUST:

1. write a local Burst event;
2. apply configured temporary protection changes;
3. expose active/completion state;
4. allow successful completion/resisted outcome to be recorded.

## 10.4 Recovery privacy boundary

Recovery and tracker data are user-account data when synchronization is enabled.

They MUST NOT:

- become visual-model input;
- be included in screen-capture telemetry.

---

# 11. Background Execution and Battery

## 11.1 Service layout

| Service / worker | Runs when | Responsibilities |
|---|---|---|
| Protection foreground service | Protection enabled | Orchestrator, health monitor, rule state, native event handling, optional VPN coordination |
| Visual ML worker | Eligible protected visual context | Capture, preprocessing, TFLite inference, overlay decisions |
| WorkManager backstop | OS-scheduled opportunities | Liveness checks and repair attempts; **not** visual inference loop |
| Sync worker | Connectivity + pending work | Upload mutations, pull server changes, reconcile local state |

## 11.2 Battery rules

### BAT-TECH-001
No capture call is permitted unless:

- the foreground package is eligible; and
- the display is interactive.

### BAT-TECH-002
Busy-poll loops are prohibited.

### BAT-TECH-003
Visual models SHOULD unload after leaving protected contexts, subject to a short grace period.

### BAT-TECH-004
Battery benchmarks MUST measure the combined React Native, Kotlin, database, networking, and ML workload.

### BAT-TECH-005
OEM-specific battery/autostart restrictions MUST surface as protection-health failures rather than remain hidden.

---

# 12. Data Model and Privacy

## 12.1 Local storage entities

| Entity | Stored locally | Explicitly not stored |
|---|---|---|
| `protection_settings` | Modes, flags, schedules, timestamps | Raw screen data |
| `blocked_domains` | Domain, source, enabled, timestamps | Full browsing history |
| `domain_events` | Minimal category/hash, action, timestamp | Full URL path/query |
| `app_rules` / `usage_daily` | Package, limits, aggregate time/session counts | Continuous screen telemetry |
| `filter_events` | Timestamp, app package, category, confidence bucket | Screenshots |
| `recovery_events` | User-entered recovery events/outcomes | Unrelated device data |
| `fap_tracker_events` | Event ID, timestamp, optional user metadata | Screen content |
| `ml_models` | Name, version, checksum, active state | Training dataset |
| `sync_queue` | Mutation ID, entity ID, operation, payload/version, retry state | Raw screen frames |

## 12.2 Server storage

Supabase PostgreSQL stores authenticated user data required by V1, including synchronized:

- settings;
- blocklists;
- overrides;
- recovery events;
- Fap Tracker events;
- synchronization metadata;
- other V1 application records.

All user-scoped tables MUST be associated with authenticated user ownership and protected by appropriate Row Level Security policies.

The exact SQL schema is an implementation artifact; it MUST preserve the ownership boundaries in this PRD.

## 12.3 Data handling invariants

- Frames are processed in memory and discarded.
- Raw screenshot/frame data MUST NOT be persisted.
- Raw screenshot/frame data MUST NOT be uploaded.
- Room data MUST be encrypted at rest using SQLCipher.
- Local reset MUST remove applicable product configuration, history, recovery data, model metadata, and cached update artifacts.
- Network calls MUST NOT be part of the visual protection loop.

---

# 13. Next.js Web Platform

## 13.1 Public landing page

Next.js provides the public Restrainify landing page.

It MUST describe:

- product purpose;
- protection model;
- supported capabilities;
- privacy position.

It MUST NOT imply unimplemented V1 capabilities.

## 13.2 Privacy policy

A public privacy policy is required before production release.

It MUST cover:

- on-device visual processing;
- local storage;
- synchronized account data;
- authentication;
- server persistence;
- deletion behavior;
- diagnostics;
- the fact that raw screen frames are not uploaded in V1.

## 13.3 Backend/API layer

Next.js server routes are the application API boundary.

Every application-data request MUST:

- authenticate the user;
- validate payload schema;
- enforce ownership;
- perform idempotency checks where required;
- return deterministic error states.

## 13.4 Web authentication

Web login/signup uses the same Supabase Auth identity system as mobile.

Authenticated web functionality MUST enforce the same user-ownership model as mobile synchronization.

---

# 14. API and Synchronization Contracts

## 14.1 Mobile -> Next.js API

The source specifies the following representative routes:

| Operation | Purpose |
|---|---|
| `POST /api/sync/push` | Submit pending local mutations with idempotency IDs |
| `POST /api/sync/pull` | Fetch server changes after client cursor/version |
| `GET /api/profile` | Fetch authenticated profile/config metadata |
| `POST /api/models/metadata` | Fetch available model metadata; assets remain versioned/validated |
| `POST /api/account/delete` | Start authenticated account-deletion workflow |

Exact route names are implementation details. The contract requirements are:

- authenticated ownership;
- schema validation;
- idempotency;
- deterministic errors;
- cursor-based reconciliation.

## 14.2 Sync mutation envelope

```ts
interface SyncMutation {
  mutation_id: string;       // globally unique, stable across retries
  entity_id: string;         // stable affected entity ID
  operation: "create" | "update" | "delete";
  schema_version: number | string;
  client_updated_at: string; // diagnostics / ordering support
  payload: unknown;          // validated entity mutation
}
```

The exact serialization format is not fixed by the source; semantic fields above are required.

---

# 15. React Native <-> Kotlin Native Bridge

## 15.1 React Native -> Kotlin commands

| Command | Purpose |
|---|---|
| `getDashboardState()` | Cold-start and foreground reconciliation |
| `getProtectionHealth()` | Return web, visual, usage, native-service health |
| `updateProtectionSettings(patch)` | Apply validated local settings |
| `triggerBurst()` | Activate Burst and log event |
| `markBurstResisted(id)` | Record successful Burst completion |
| `addCustomBlockedDomain(domain)` | Add local custom blocked domain |
| `removeCustomBlockedDomain(domain)` | Remove local custom blocked domain |
| `logRelapse(timestamp, category, note)` | Write local recovery event |

## 15.2 Kotlin -> React Native events

| Event | Payload |
|---|---|
| `onProtectionHealthChanged` | web / visual / usage / anti-bypass health |
| `onScreenTimeTick` | `totalMs`, `deltaPercentVsYesterday` |
| `onFilterEvent` | `appPackage`, `category`, `confidenceBucket`, `timestamp` |
| `onBlockEvent` | `domainCategory`, `timestamp` |
| `onBurstStateChanged` | `active`, `cooldownEndsAt` |
| `onSyncStateChanged` | offline / syncing / online / error + pending count |

## 15.3 Reconciliation invariant

When the React Native app becomes active:

1. it MUST request current native protection state;
2. it MUST replace cached protection state before presenting a trusted status;
3. stale JavaScript state MUST NOT report protection as active after native protection has degraded.

---

# 16. Android Permissions and Platform Constraints

| Capability | Purpose | Constraint |
|---|---|---|
| AccessibilityService | Foreground/window events, supported UI automation, screenshot capability where available | Policy-sensitive; disclosure + affirmative consent required |
| Usage Access | Per-app screen time and limit enforcement | User grants in Android Settings |
| VpnService | Local website-filtering fallback | VPN state visible; can conflict with another VPN |
| MediaProjection | Fallback pixel capture | User consent + required foreground-service treatment |
| Notification permission | Reminders/service status | Subject to permission and OS behavior |
| Battery optimization exception | Improve service survival on selected devices | Must be justified; OEM behavior not guaranteed |

### PLATFORM-001
A normal adult consumer app MUST NOT claim that it can make itself impossible to uninstall.

### PLATFORM-002
V1 uses in-app friction/cooldowns rather than OS-level trapping.

### PLATFORM-003
Foreground services are user-visible and subject to current Android service-type restrictions.

### PLATFORM-004
Accessibility, MediaProjection, foreground-service, notification, target-SDK, and Google Play requirements MUST be revalidated immediately before release.

---

# 17. Security Requirements

| Area | Requirement |
|---|---|
| Transport | HTTPS/TLS for all client-server traffic |
| Authentication | Supabase Auth; supported session/token lifecycle |
| Authorization | Next.js validates authenticated user ownership on every application-data request |
| Server database | Supabase PostgreSQL + Row Level Security for user-scoped data |
| Local storage | Room encrypted with SQLCipher |
| Sync integrity | Stable mutation IDs, schema validation, idempotency, server-side validation |
| Model integrity | Checksum/schema/signature validation before activation |
| Privacy | No raw frames in disk logs, analytics, or server payloads |
| Logging | Log decisions, timings, and state transitions; do not log screen content |

## 17.1 Threat model minimum coverage

Threat modeling MUST cover at least:

- stolen-device local data;
- token compromise;
- replayed sync mutations;
- unauthorized cross-user data access;
- malformed synchronization payloads;
- malicious/corrupted model assets;
- VPN conflicts;
- Accessibility service failure;
- server-side authorization errors.

---

# 18. Testing and Observability - Source Gap

The source PDF lists **Testing and Observability** in its contents, but does not provide a corresponding Section 16 body before Section 17 begins.

Therefore, an AI agent MUST NOT assume an unstated canonical test matrix, telemetry provider, crash-reporting vendor, analytics SDK, exact performance threshold, or observability stack from this source.

However, the source explicitly requires the completed system to pass:

- security validation;
- privacy validation;
- performance validation;
- lifecycle validation;
- device-matrix validation;
- offline/online validation;
- OEM behavior validation;
- Play-policy validation.

It also explicitly requires logging to contain decisions, timings, and state transitions rather than raw screen content.

A separate test plan SHOULD be authored before production if one does not already exist.

---

# 19. Risks and Engineering Decisions

| Risk | V1 decision / mitigation |
|---|---|
| Battery cost | Foreground gate, event triggers, adaptive backoff, model unload |
| Social UI changes | Versioned selectors, degraded states, maintenance cadence, whole-app fallback |
| False positives | Tune precision at product threshold; track ambiguous cases separately |
| OEM background killing | Foreground service, WorkManager liveness, onboarding guidance |
| Multiple VPN apps | Surface conflict and provide Private DNS path where appropriate |
| Model update failure | Checksum/schema validation + last-known-good rollback |
| Sync conflict | Versioned server reconciliation + idempotent event writes |
| Privacy leakage | No raw frames in storage, network, or diagnostics |
| Platform policy changes | Release gate immediately before production submission |

## 19.1 Deliberate architectural decisions

These choices are explicitly intentional in V1:

- The visual model does not run on every screen.
- The protection loop does not depend on React Native.
- Social protection uses deterministic versioned adapters, not an autonomous navigation agent.
- Frames are not sent to a server for cloud inference.
- Cloud synchronization is not a prerequisite for local enforcement.

---

# 20. Implementation Order

The source defines the following implementation sequence:

1. Create Android project, React Native New Architecture boundary, Kotlin protection module, and foreground service.
2. Create Room + SQLCipher schema, repositories, and local settings/event model.
3. Implement Protection Orchestrator and `ACTIVE` / `STANDBY` / `PARTIAL` / `DEGRADED` state model.
4. Implement foreground-app detection and protected-app allowlist before ML.
5. Implement Accessibility screenshot abstraction and MediaProjection fallback.
6. Integrate MobileNetV3-Small into the TFLite pipeline and overlay controller.
7. Implement local website filtering, manual blocklist, and override evaluation.
8. Implement UsageStats app limits and versioned social adapters.
9. Implement settings screens and feature-specific configuration.
10. Implement recovery, Burst, and optional Fap Tracker.
11. Implement Supabase Auth with Google and email/password.
12. Implement Next.js landing page, privacy policy, and authenticated API boundary.
13. Implement server PostgreSQL schema, RLS policies, and sync endpoints.
14. Implement offline queue, connectivity monitor, push/pull synchronization, and conflict handling.
15. Implement React Native/native state reconciliation and sync-state events.
16. Complete lifecycle, offline/online, security, privacy, OEM, and Play-policy validation.

---

# 21. Technical Definition of Done

V1 is technically complete when all of the following are true:

- protection works while the main app UI is closed, within platform constraints;
- local protections remain functional offline;
- authenticated data synchronizes correctly when online;
- settings, recovery, and Fap Tracker events reconcile without duplication;
- raw frames never leave device memory;
- native and React Native state reconcile after lifecycle interruptions;
- public web pages are available;
- privacy documentation is available;
- the combined Android + Next.js + Supabase system passes required security, privacy, performance, lifecycle, and device-matrix validation;
- all supported capability failures surface truthful partial/degraded states.

---

# 22. Release Gate

Immediately before production submission, engineering MUST revalidate current requirements affecting:

- Android foreground services;
- Accessibility;
- MediaProjection;
- notification permissions;
- target SDK;
- Google Play policy;
- VPN behavior/declarations;
- privacy/data disclosures.

Any capability whose behavior differs across Android versions or OEM devices MUST expose a truthful health/degraded state rather than silently claiming coverage.

---

# 23. Explicitly Unresolved / Not Fully Specified by the Source

An AI agent MUST treat the following as unresolved rather than inventing a decision:

1. Exact minimum/maximum supported Android versions.
2. Exact Gradle/AGP/Kotlin/React Native/Next.js/Supabase library versions.
3. Exact React Native state-management library.
4. Exact dependency-injection framework.
5. Exact SQL table DDL and migrations.
6. Exact API JSON schema beyond the semantic sync envelope.
7. Exact retry counts/timeouts/backoff constants beyond exponential backoff behavior.
8. Exact Burst cooldown duration.
9. Exact Strict Mode cooldown durations.
10. Exact ML risk thresholds and confidence-bucket boundaries.
11. Exact visual overlay design and animation.
12. Exact supported social-app versions/selectors.
13. Exact analytics/crash-reporting/observability vendor.
14. Exact performance SLOs and battery percentage budget.
15. Detailed Section 16 Testing and Observability content, because it is absent from the source body.
16. Daily check-in/coin implementation, which exists in the older functional PRD but is not specified in this Restrainify technical source.

These require separate decisions/specifications before implementation agents should hard-code them.

