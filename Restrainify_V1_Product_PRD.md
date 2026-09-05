# Restrainify V1 - Product Requirements Document

**Document type:** Functional + Non-Functional PRD  
**Audience:** Product managers, designers, QA, founders, and AI coding/planning agents  
**Scope:** Restrainify V1  
**Primary platform:** Android-first consumer application  
**Technical implementation details:** Intentionally excluded from this document

---

## 0. How AI Models Should Read This Document

This document defines **what Restrainify V1 must do**, what the user must experience, what quality standards the product must satisfy, and what is explicitly outside V1.

Normative language is used consistently:

- **MUST** = mandatory for V1 acceptance.
- **MUST NOT** = prohibited behavior.
- **SHOULD** = strongly preferred unless a documented product reason prevents it.
- **MAY** = optional behavior that does not change the required V1 scope.

Requirement IDs are stable references for implementation, QA, issue tracking, and prompts given to AI agents.

### Source alignment note

This PRD consolidates the user-facing requirements from the earlier **Digital Self-Control System - V1 Product Requirements Document** and the later **Restrainify Version 1 Technical Product Requirements Document**.

Where those sources conflict, the later Restrainify engineering baseline is treated as the current V1 direction. In particular, V1 includes user accounts, optional cloud synchronization, a web presence, and an optional Fap Tracker. The earlier document's product features that are not contradicted by the later baseline - including the daily check-in/reward experience - are retained here so that functional scope is not silently lost.

---

# 1. Product Definition

## 1.1 Product purpose

Restrainify V1 is an Android-first, single-user digital self-control and porn-recovery product designed to reduce exposure to explicit content and high-risk digital triggers while preserving normal phone use outside protected contexts.

The product combines:

- adult/porn website protection;
- visual filtering of explicit and sexually suggestive content;
- optional person-specific visual filtering;
- restrictions for short-form social feeds;
- screen-time and per-app controls;
- recovery tracking;
- relapse and urge tracking;
- Burst emergency intervention;
- anti-bypass friction and protection-health feedback;
- a daily check-in/reward loop;
- an optional Fap Tracker;
- user accounts and optional synchronization;
- a public web presence and account entry points.

## 1.2 Core product promise

Restrainify MUST reduce access to known explicit content and high-risk digital triggers without unnecessarily blocking ordinary phone usage.

Restrainify MUST be truthful about its protection state. It MUST NOT claim that a protection feature is working when the required capability is unavailable, disabled, broken, or degraded.

Core protection and local tracking MUST remain useful when the device is temporarily offline.

## 1.3 Primary user

V1 is designed for an **adult individual controlling their own device**.

V1 is not a parent/child monitoring product and does not assume that another person has administrative control over the device.

---

# 2. Product Principles

## PR-01 - Protection before complexity

The product MUST prioritize reliable protection and recovery actions over feature breadth, social features, or gamification.

## PR-02 - Local protection independence

Temporary loss of internet connectivity MUST NOT disable already-enabled local protection features.

## PR-03 - Privacy by default

Screen images used for visual protection MUST NOT be retained as a user history, uploaded for routine visual analysis, or exposed as browsing/screen telemetry.

## PR-04 - Truthful status

Any failed, unsupported, or disabled protection capability MUST be visible to the user as incomplete, partial, or degraded rather than silently treated as active.

## PR-05 - Friction, not entrapment

V1 SHOULD create meaningful friction against impulsively weakening protection, but MUST NOT promise that an adult user can be made completely unable to uninstall or disable the app on a normal consumer device.

## PR-06 - Recovery is broader than a streak

The product MUST preserve historical progress and recovery metrics even when a relapse resets the current streak.

---

# 3. Functional Requirements

## 3.1 Onboarding and Initial Setup

### FR-ONB-001 - Goal selection
The user MUST be able to choose what they want Restrainify to help control, including:

- porn/adult websites;
- sexually suggestive or soft-porn visual content;
- specific person categories for visual filtering;
- Reels/Shorts/Spotlight-style feeds;
- selected applications;
- excessive app usage.

### FR-ONB-002 - Capability explanation
Before asking the user to enable a sensitive device capability, Restrainify MUST explain in plain language:

- what capability is needed;
- which feature depends on it;
- what the app can access because of it;
- what happens if the user does not enable it.

### FR-ONB-003 - Website-protection setup
Onboarding MUST guide the user through selecting and activating the best available website-protection option for their device.

### FR-ONB-004 - Visual-protection consent
Visual screen analysis MUST require a separate, prominent explanation and affirmative user consent before activation.

### FR-ONB-005 - App-control configuration
The user MUST be able to select protected apps and configure applicable limits or schedules during setup or later in Settings.

### FR-ONB-006 - Recovery baseline
The user MUST be able to establish a recovery start point so recovery statistics can be initialized.

### FR-ONB-007 - Ready-state truthfulness
The main dashboard MUST clearly show which protections are active and which setup steps are incomplete before presenting the user as fully protected.

### FR-ONB-008 - Account setup
V1 MUST support user account creation and login using:

- email/password; and
- Google sign-in.

### FR-ONB-009 - Offline continuity after setup
A previously configured user MUST continue to receive local protection during temporary internet loss.

---

## 3.2 Dashboard / Home

The dashboard is the primary home screen and MUST answer three questions quickly:

1. **Am I protected?**
2. **How am I doing?**
3. **What can I do right now if I am at risk?**

### FR-DASH-001 - Protection health
The dashboard MUST show the current health of all major enabled protection categories, including website protection, visual protection, app controls, and anti-bypass/protection-resistance state.

### FR-DASH-002 - Recovery snapshot
The dashboard MUST show core recovery status, including current streak and meaningful historical recovery progress.

### FR-DASH-003 - Today's activity
The dashboard MUST show useful current-day summaries such as:

- blocked website attempts;
- filtered risky content count;
- total screen time;
- selected app usage.

### FR-DASH-004 - Burst access
Burst MUST be prominently accessible from the dashboard without requiring the user to navigate through Settings.

### FR-DASH-005 - Daily reward status
The dashboard MUST show whether today's daily check-in reward is available or already claimed.

### FR-DASH-006 - Sync state
If synchronization is enabled, the user SHOULD be able to see whether their data is up to date, offline, syncing, or experiencing a non-blocking synchronization problem.

---

## 3.3 Website Protection

### FR-WEB-001 - Adult-domain blocking
Restrainify MUST block known pornographic/adult domains when website protection is active.

### FR-WEB-002 - Maintained protection list
The product MUST support a maintained adult-domain database that can evolve over time.

### FR-WEB-003 - Custom blocked domains
The user MUST be able to manually add domains to a personal block list.

### FR-WEB-004 - Allow-list exceptions
The user MUST be able to define explicit allowed-domain exceptions where permitted by the active protection policy.

### FR-WEB-005 - Domain management
For user-managed domains, the user MUST be able to add, remove, enable, and disable entries.

### FR-WEB-006 - SafeSearch
Restrainify SHOULD enforce SafeSearch or equivalent safer-search behavior where it can do so reliably.

### FR-WEB-007 - Bypass/proxy domain resistance
Restrainify SHOULD block known bypass/proxy domains where feasible.

### FR-WEB-008 - Scoped overrides
The user MAY create scoped exceptions or overrides for domains, apps, features, or schedules when allowed by the current protection policy.

### FR-WEB-009 - Strict-mode constraints
When Strict Mode is enabled, overrides or weakening actions MAY be restricted or delayed according to the user's configured strictness rules.

### FR-WEB-010 - Protection failure visibility
If website protection stops, conflicts with another device feature, or becomes unavailable, the app MUST clearly report the degraded state.

### FR-WEB-011 - No false universal claim
Restrainify MUST NOT market or present website protection as universally invisible, impossible to disable, or guaranteed across every Android setup.

---

## 3.4 Visual Protection

### FR-VIS-001 - Local visual analysis
Restrainify MUST be able to analyze supported screen content for explicit and sexually suggestive material when visual protection is enabled.

### FR-VIS-002 - Explicit-content detection
The visual protection system MUST detect explicit nudity or pornographic visual content within the supported protection scope.

### FR-VIS-003 - Suggestive-content detection
The visual protection system MUST support detection of sexually suggestive / soft-porn content within the supported protection scope.

### FR-VIS-004 - Rapid cover or blur
When content is classified as risky, Restrainify MUST cover or blur it quickly enough to meaningfully reduce exposure.

### FR-VIS-005 - Person-specific filtering
The user MUST be able to choose person-oriented filtering behavior for supported contexts, including:

- blur women;
- blur men;
- blur everyone.

### FR-VIS-006 - Supported-context scope
Visual protection SHOULD run only in supported or user-selected contexts rather than indiscriminately affecting the entire device.

### FR-VIS-007 - Privacy of captured visual content
Temporary screen images used for visual protection MUST be discarded after the protection decision and MUST NOT appear in a user-accessible screenshot history.

### FR-VIS-008 - No advanced sensitivity controls in V1
V1 MUST NOT expose advanced sensitivity presets or advanced per-app visual tuning unless the V1 scope is explicitly amended.

### FR-VIS-009 - Degraded-state behavior
If visual analysis cannot operate in a supported context, Restrainify MUST show that protection is degraded rather than silently claiming coverage.

### FR-VIS-010 - No identity profiling
Visual protection MUST NOT be presented as identifying specific real-world individuals or creating identity/biometric profiles.

---

## 3.5 Social-Media / Short-Form Feed Protection

### FR-SOC-001 - Supported short-form feeds
Where reliable, V1 MUST support restricting or suppressing high-risk short-form feeds such as:

- Instagram Reels;
- YouTube Shorts;
- Facebook Reels;
- Snapchat Spotlight.

### FR-SOC-002 - TikTok fallback
If reliable feed-only restriction cannot be maintained for TikTok, V1 MAY restrict the whole TikTok app instead.

### FR-SOC-003 - User selection
The user MUST be able to choose which supported social apps/features are restricted.

### FR-SOC-004 - Fail visibly
If a supported social app changes and Restrainify can no longer reliably identify the target feed, the feature MUST report a degraded/broken state.

### FR-SOC-005 - No unsupported promise
The app MUST NOT claim granular feed blocking for an app/version where reliable feed-level control cannot be maintained.

### FR-SOC-006 - Social website blocking
The user MUST be able to enable or disable supported social-website blocking where included in their protection configuration.

---

## 3.6 Screen-Time and App Controls

### FR-APP-001 - Total screen time
The user MUST be able to view total daily screen time.

### FR-APP-002 - Per-app usage
The user MUST be able to view per-app screen time for supported usage tracking.

### FR-APP-003 - Session duration
The product SHOULD show useful app-session duration information.

### FR-APP-004 - Daily/weekly trends
The product MUST provide basic daily and weekly usage views.

### FR-APP-005 - Daily app limits
The user MUST be able to define daily usage limits for selected applications.

### FR-APP-006 - Scheduled blocking
The user MUST be able to schedule blocking/restriction windows for selected applications.

### FR-APP-007 - Enforcement after limit
When an enabled app limit or schedule is reached, Restrainify MUST enforce the configured restriction for that app.

### FR-APP-008 - Time-change integrity
Ordinary reboot, timezone changes, or device date changes MUST NOT incorrectly reset or corrupt usage limits and recovery calculations.

---

## 3.7 Recovery Tracking

### FR-REC-001 - Current streak
The user MUST be able to view their current porn-free streak.

### FR-REC-002 - Longest streak
The user MUST be able to view their longest recorded streak.

### FR-REC-003 - 30-day recovery view
The user MUST be able to see the number of porn-free days within the last 30 days.

### FR-REC-004 - Historical progress
Historical recovery progress MUST remain visible after a relapse.

### FR-REC-005 - Blocked-attempt counters
The product SHOULD track and display useful recovery counters such as blocked adult-site attempts and filtered triggering-content events.

### FR-REC-006 - Relapse logging
The user MUST be able to manually log a relapse with date/time and an optional short trigger/reason.

### FR-REC-007 - Urge tracking
The product MUST support recording urges and whether they were successfully resisted.

### FR-REC-008 - Recovery enable/disable
Where recovery tracking is configurable, the user MUST be able to enable or disable that tracking without silently changing unrelated protection behavior.

### FR-REC-009 - Recovery sync
If cloud synchronization is enabled, eligible recovery records SHOULD synchronize to the user's account while local protection remains independent of synchronization success.

---

## 3.8 Burst Intervention

Burst is the V1 emergency intervention for moments of immediate risk. It MUST prioritize immediate action over long motivational content.

### FR-BURST-001 - One-tap activation
The user MUST be able to activate Burst in one direct action from a prominent location.

### FR-BURST-002 - Temporary high protection
Burst MUST immediately activate a temporary higher-protection state for configured triggering apps/sites/features.

### FR-BURST-003 - Cooldown
Burst MUST start a short cooldown/lock period during which the temporary protection state cannot be weakened from inside the app.

### FR-BURST-004 - Physical interruption prompt
Burst SHOULD offer one or two short real-world interruption actions, such as leaving the room, walking, exercising, or breathing.

### FR-BURST-005 - Urge event
Activating Burst MUST record an urge/intervention event.

### FR-BURST-006 - Resisted outcome
The user MUST be able to mark a Burst episode as successfully resisted/completed.

---

## 3.9 Anti-Bypass and Strict Mode

### FR-AB-001 - Settings cooldown
Weakening selected protected settings MAY create a delayed change request rather than taking effect immediately.

### FR-AB-002 - Cancellation before weakening
Where a weakening cooldown exists, the user SHOULD be able to cancel the pending weakening request before it becomes effective.

### FR-AB-003 - Local PIN / strict controls
V1 MAY allow a local PIN or strict-mode control for selected in-app protected settings.

### FR-AB-004 - Service-health detection
The product MUST detect when required protection capabilities are disabled or unavailable and immediately show a degraded state.

### FR-AB-005 - Uninstall resistance language
V1 MUST describe adult self-protection as **uninstall resistance / disable friction**, not guaranteed uninstall prevention.

### FR-AB-006 - In-app disable/uninstall request friction
The app MAY provide an in-app request/cooldown flow before intentional protection weakening or uninstall guidance.

### FR-AB-007 - No trapping claim
V1 MUST NOT claim that an adult user can be permanently trapped in the app or made absolutely unable to uninstall it on an ordinary consumer device.

---

## 3.10 Daily Check-In and Reward

### FR-CHK-001 - Daily claim
The user MUST be able to claim one daily reward per local calendar day.

### FR-CHK-002 - Balance
The product MUST maintain the user's current internal reward/currency balance.

### FR-CHK-003 - Lifetime earning
The product MAY show lifetime earned rewards.

### FR-CHK-004 - Reward feedback
The user MUST receive clear feedback after successfully claiming the daily reward.

### FR-CHK-005 - No mature economy requirement
V1 does NOT require a store, marketplace, spending system, or mature gamified economy.

---

## 3.11 Optional Fap Tracker

### FR-FAP-001 - Optional feature
The Fap Tracker MUST be opt-in / user-controlled.

### FR-FAP-002 - Event logging
When enabled, the user MUST be able to record tracker events.

### FR-FAP-003 - History
When enabled, the user MUST be able to view local tracker history and derived counts.

### FR-FAP-004 - Disabled behavior
When disabled, new tracker events MUST NOT be created.

### FR-FAP-005 - Protection independence
The Fap Tracker MUST NOT change website/app protection unless a separate explicit product rule says it should.

### FR-FAP-006 - Sync behavior
If synchronization is enabled, eligible tracker history MAY synchronize to the user's account.

---

## 3.12 Account and Authentication

### FR-AUTH-001 - Email/password signup
Users MUST be able to create an account using email/password.

### FR-AUTH-002 - Google sign-in
Users MUST be able to create or access an account using Google sign-in.

### FR-AUTH-003 - Login
Users MUST be able to log back into an existing account.

### FR-AUTH-004 - Session continuity
A valid signed-in user SHOULD remain signed in according to normal secure session behavior.

### FR-AUTH-005 - Password recovery
Users MUST have a password recovery/reset flow for email/password accounts.

### FR-AUTH-006 - Logout
Users MUST be able to log out.

### FR-AUTH-007 - Account deletion
Users MUST have an authenticated account-deletion workflow.

### FR-AUTH-008 - Offline protection after authentication
Temporary authentication or network issues MUST NOT automatically switch off existing local protection.

---

## 3.13 Cloud Synchronization

### FR-SYNC-001 - Optional synchronization
Where allowed by product configuration, the user MUST be able to enable or disable cloud synchronization.

### FR-SYNC-002 - Local-first behavior
User changes and locally generated events MUST be usable locally before synchronization completes.

### FR-SYNC-003 - Eventual synchronization
Pending eligible changes SHOULD synchronize automatically when connectivity returns.

### FR-SYNC-004 - No duplicate user events
Repeated synchronization attempts MUST NOT create duplicate user events.

### FR-SYNC-005 - No silent data loss
If synchronization rejects or cannot reconcile a user change, the product MUST retain enough local state to expose a repair/retry path rather than silently discarding the change.

### FR-SYNC-006 - Non-blocking failure
A synchronization problem MUST NOT disable core local protection.

### FR-SYNC-007 - Conflict transparency
Where conflicting edits occur, the resulting state MUST be deterministic and the local product MUST eventually reflect the accepted state.

---

## 3.14 Settings

V1 settings MUST be organized by feature rather than exposed as an undifferentiated configuration screen.

### FR-SET-001 - Required settings categories
V1 MUST provide user controls for applicable features, including:

- Fap Tracker;
- social/X website blocking where supported;
- manual website blocking;
- scoped overrides;
- visual protection;
- person-specific blur behavior;
- app limits;
- schedules;
- short-form controls;
- Burst configuration;
- recovery tracking;
- notifications;
- cloud synchronization;
- Strict Mode/cooldowns.

### FR-SET-002 - Immediate local feedback
After a valid settings change, the interface SHOULD immediately show the locally accepted state.

### FR-SET-003 - Invalid-state handling
Invalid or unsupported settings MUST NOT be silently accepted as though protection has changed successfully.

---

## 3.15 Notifications

### FR-NOT-001 - User control
Users MUST be able to configure relevant Restrainify notifications where notifications are part of V1.

### FR-NOT-002 - Graceful denial
If notification permission is denied or unavailable, core protection MUST continue wherever the notification itself is not required for enforcement.

---

## 3.16 Local Data and Reset

### FR-DATA-001 - Local reset
Users MUST have a way to reset/delete locally stored Restrainify product data.

### FR-DATA-002 - Account deletion clarity
Account deletion MUST distinguish server/account deletion from ordinary local logout where the behaviors differ.

### FR-DATA-003 - Sensitive visual content
Raw screen captures MUST NOT become part of the user's stored history.

### FR-DATA-004 - Minimal browsing history
Restrainify SHOULD avoid presenting or retaining detailed browsing-history data when aggregate/category information is sufficient for the product feature.

---

## 3.17 Web Experience

### FR-WEBAPP-001 - Public landing page
V1 MUST include a public Restrainify landing page explaining the product, supported protection capabilities, and privacy position.

### FR-WEBAPP-002 - No exaggerated claims
The public website MUST NOT advertise protection capabilities that are not actually implemented in V1.

### FR-WEBAPP-003 - Privacy policy
A public privacy policy MUST be available before production release.

### FR-WEBAPP-004 - Authentication entry points
The web experience MUST provide login/signup entry points that correspond to the same user account identity used by the app.

### FR-WEBAPP-005 - Authenticated future surfaces
V1 MAY expose authenticated web surfaces, but they MUST respect the same per-user data ownership boundaries as mobile account data.

---

# 4. Non-Functional Requirements

## 4.1 Privacy

### NFR-PRIV-001
Raw screen frames used for visual filtering MUST NOT be stored as persistent user data.

### NFR-PRIV-002
Raw screen frames MUST NOT be uploaded for routine V1 visual inference.

### NFR-PRIV-003
Recovery/tracker data MUST NOT be used as visual-model input unless a future version explicitly changes this policy with user disclosure.

### NFR-PRIV-004
The product SHOULD minimize browsing/event data and retain only what is needed for protection, counters, recovery, and synchronization.

### NFR-PRIV-005
The user MUST be able to delete/reset applicable local product data.

### NFR-PRIV-006
The public privacy policy MUST accurately describe on-device visual processing, local data, synchronized account data, deletion behavior, diagnostics, and screen-frame handling.

---

## 4.2 Security

### NFR-SEC-001
Account data MUST be protected against unauthorized cross-user access.

### NFR-SEC-002
Authentication credentials/session material MUST be handled securely and MUST NOT be treated as valid after they are known to be expired or revoked.

### NFR-SEC-003
Synchronized changes MUST be protected against accidental duplication, replay, malformed requests, and unauthorized modification.

### NFR-SEC-004
Downloaded protection/model updates MUST be validated before becoming active.

### NFR-SEC-005
Logs and diagnostics MUST NOT contain raw screen content.

---

## 4.3 Offline Availability and Resilience

### NFR-OFF-001
Core enabled protection MUST remain functional during temporary network loss.

### NFR-OFF-002
Local user actions and eligible events MUST continue to be recorded offline.

### NFR-OFF-003
Cloud synchronization MUST be eventual and MUST NOT sit in the real-time protection decision path.

### NFR-OFF-004
Failed synchronization SHOULD recover automatically when possible and otherwise expose a non-blocking repair state.

---

## 4.4 Performance and Exposure Reduction

### NFR-PERF-001
Visual filtering latency MUST be measured on real supported devices.

### NFR-PERF-002
Risky content MUST be covered fast enough that the feature provides meaningful exposure reduction.

### NFR-PERF-003
The product MUST avoid wasteful continuous screen analysis when the user is outside eligible protected contexts.

### NFR-PERF-004
The product SHOULD adapt work intensity when content remains safely classified or when the device is under resource pressure.

---

## 4.5 Battery and Resource Efficiency

### NFR-BAT-001
Protection MUST be designed to avoid unnecessary continuous high-frequency processing.

### NFR-BAT-002
Battery impact MUST be measured before release using realistic combined workloads.

### NFR-BAT-003
The app MUST avoid busy-poll behavior.

### NFR-BAT-004
If a device vendor's battery-management behavior prevents reliable protection, the user MUST be informed through protection-health feedback.

---

## 4.6 Reliability and Lifecycle

### NFR-REL-001
Core protection SHOULD continue while the primary app interface is closed.

### NFR-REL-002
The app MUST recover correctly from normal lifecycle interruptions such as foreground/background transitions and device reboot within platform limits.

### NFR-REL-003
Protection status shown in the interface MUST reflect the current real protection state, not stale cached state.

### NFR-REL-004
Supported social-feed restrictions MUST fail visibly after incompatible app changes.

### NFR-REL-005
The product MUST be tested across a meaningful supported Android/OEM device matrix, including major Android vendors rather than relying only on one reference device.

---

## 4.7 Usability

### NFR-UX-001
Onboarding SHOULD configure protection efficiently and MUST NOT become a long unnecessary questionnaire.

### NFR-UX-002
The dashboard MUST prioritize protection status, recovery progress, current activity, and emergency action.

### NFR-UX-003
Permission and privacy explanations MUST use plain language.

### NFR-UX-004
Degraded states MUST be actionable where a user can repair them.

### NFR-UX-005
The product MUST avoid wording that implies impossible guarantees such as absolute adult uninstall prevention.

---

## 4.8 Accuracy and Quality

### NFR-ML-001
Visual-filter precision and false-positive rate MUST be measured before release.

### NFR-ML-002
Person-region blur accuracy and visual-cover latency MUST be measured on the supported device matrix.

### NFR-ML-003
False positives must be treated as a major product-quality risk because excessive incorrect filtering can cause users to disable protection.

### NFR-ML-004
Model/update failure MUST fall back to a known working state rather than silently replacing a working version with a broken one.

---

## 4.9 Compliance and Trust

### NFR-COMP-001
Every sensitive permission/capability MUST have a user-facing disclosure that accurately matches its real use.

### NFR-COMP-002
The app MUST obtain affirmative consent where the platform requires it.

### NFR-COMP-003
Production release MUST include a final review of current Android and app-store rules affecting protection, screen access, background operation, notifications, website filtering, and privacy disclosures.

### NFR-COMP-004
If a platform or device limitation makes a capability unavailable, Restrainify MUST expose that limitation truthfully.

---

## 4.10 Maintainability of Supported Protection Behavior

### NFR-MAINT-001
Protection behaviors that depend on third-party app interfaces MUST be maintainable as those apps change.

### NFR-MAINT-002
A broken third-party integration MUST be detectable and MUST NOT silently remain marked healthy.

### NFR-MAINT-003
The product MUST support evolving protection lists/models without requiring loss of user data or recovery history.

---

# 5. Product Success Metrics

These metrics do not define implementation technology; they define whether V1 is working as a product.

| Metric | What it measures |
|---|---|
| Protection activation rate | Users who complete setup and actually enable core protections |
| Protected Active Users - 30 day | Users who still have core protection enabled after 30 days |
| Visual-filter precision / false-positive rate | Trustworthiness of visual filtering |
| Median visual cover latency | Time before risky content is covered |
| Battery impact | Whether protection is sustainable in daily use |
| Bypass / disable rate | Whether protection friction is useful without becoming hostile |
| Crash / protection survival rate | Reliability across devices and lifecycle events |
| Recovery engagement | Check-ins, Burst use, relapse logs, urge outcomes, dashboard return |
| Sync reliability | Successful eventual synchronization without duplication/data loss |
| Degraded-state repair rate | Whether users can restore failed protection capabilities |

---

# 6. V1 Non-Goals / Explicit Exclusions

Unless separately approved as a scope change, V1 does **not** include:

- Focus Mode as a separate product mode.
- Islamic mode or faith-specific content.
- An education/content library.
- Behavioral trigger intelligence, correlations, or predictive risk scoring.
- Accountability partners or remote accountability alerts.
- Multi-device protection-policy coordination.
- Parent/child roles or a family dashboard.
- AI/LLM coaching or chat.
- Advanced visual sensitivity levels.
- Advanced per-app visual tuning.
- A mature coin store, rewards marketplace, or complex game economy.
- Cloud-based visual inference for each screen frame.
- Remote routing of all user traffic through Restrainify servers.
- Decryption/interception of encrypted third-party app traffic.
- Persistent screenshot history.
- Absolute uninstall prevention for a normal adult consumer device.
- A V1 iOS or desktop protection implementation.

---

# 7. Acceptance Criteria

V1 is product-complete only when all mandatory requirements above are satisfied and the following end-to-end conditions hold.

## AC-01 - Website protection
Known test adult domains are blocked when website protection is active; user-defined allow/block behavior works; protection status remains truthful.

## AC-02 - Visual filtering
Supported explicit/suggestive test content is classified locally and risky content is covered/blurred without persistent screenshot storage.

## AC-03 - Person filtering
Selected person-specific blur mode produces usable region-level filtering with measured accuracy and acceptable latency on the supported device set.

## AC-04 - Short-form feeds
Each supported social app has a demonstrated target-feed restriction for supported versions, and broken/unsupported versions show a degraded state.

## AC-05 - App limits
Per-app usage, limits, and schedules remain logically correct across normal lifecycle events, reboot, and ordinary date/time changes.

## AC-06 - Recovery
Current streak, longest streak, 30-day porn-free metric, relapse history, blocked counters, and urges-resisted data calculate correctly.

## AC-07 - Burst
One action activates the intended temporary protection state, starts its cooldown, records the intervention, and allows completion/resisted outcome.

## AC-08 - Daily reward
Exactly one daily check-in reward can be claimed per local calendar day and the user's balance updates correctly.

## AC-09 - Fap Tracker
When enabled, events and history work; when disabled, new events are not created; the feature does not silently change protection behavior.

## AC-10 - Account lifecycle
Signup, login, session continuation, logout, password recovery, and account deletion work as defined.

## AC-11 - Offline behavior
Core protection and local tracking continue during temporary internet loss.

## AC-12 - Synchronization
Eligible settings/events synchronize after connectivity returns without duplication or silent loss; sync failure does not disable local protection.

## AC-13 - Anti-bypass
Configured in-app cooldowns cannot be bypassed from inside the app during their active period, disabled capabilities are detected, and the product does not claim prohibited absolute adult uninstall trapping.

## AC-14 - Privacy
Testing confirms raw screen frames do not become persistent history or routine server payloads.

## AC-15 - Stability
No release-blocking crashes remain on the supported device matrix and battery/latency measurements are completed before production release.

## AC-16 - Web and legal surfaces
The public landing page, privacy policy, and required account entry points are available and accurately describe V1 behavior.

---

# 8. Scope Gaps That Require an Explicit Product Decision

The source documents do not fully define the following. An implementation agent MUST NOT invent them as settled product policy:

1. **Daily reward spending:** V1 defines earning and balance, but not what coins are spent on.
2. **Exact Burst duration:** Burst requires a temporary cooldown, but the exact duration/preset is not fixed.
3. **Exact Strict Mode delays:** Cooldowns are required conceptually, but exact durations per setting are not fixed.
4. **Exact notification catalog:** Notifications are configurable, but exact reminder types/cadence are not defined.
5. **Exact supported Android versions/devices:** A device matrix is required, but the minimum Android version is not specified in the source.
6. **Exact authenticated web functionality beyond auth entry points:** Future authenticated surfaces are allowed, but detailed web-dashboard features are not defined.
7. **Exact cloud-sync defaults:** The source permits cloud sync configuration but does not definitively state whether it is on or off by default.
8. **Exact visual/person-filter threshold values:** Product behavior is defined, but threshold numbers belong in the technical/ML specification.

Any of these decisions should be recorded as an explicit PRD amendment before an AI coding agent treats them as requirements.

---

# 9. Definition of Done for Product Scope

Restrainify V1 is functionally complete when:

- the user can configure and understand their protection;
- core protection works while the main UI is closed where the platform permits;
- local protection remains usable offline;
- website, visual, social-feed, screen-time, recovery, Burst, anti-bypass, daily check-in, optional Fap Tracker, account, and sync behaviors meet this PRD;
- protection states are truthful and degraded states are visible;
- user data and screen-content privacy boundaries are respected;
- the web landing/privacy/auth surfaces exist;
- product acceptance criteria and non-functional quality gates are met.

