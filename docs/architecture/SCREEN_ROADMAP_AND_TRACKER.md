# Restrainify V1: Screen Roadmap & Implementation Tracker

> **Master Specification Reference:** [`restrainify-v1-ui-architecture-mobile-fixed.html`](file:///d:/Restrainify/restrainify-app/restrainify-v1-ui-architecture-mobile-fixed.html)  
> **Design System:** Orbit / Clarity (Space Grotesk typography, calm slate/navy `#10264D`, high-contrast trust blue `#254C91` / `#316FCB`, dark mode `#0B1018`, truthful capability reporting)  
> **Engineering Protocol:** Learn-by-Doing Engineering (What → Why → Where → Alternatives → Implement → Verify → Connect)  
> **Active Running Environment:** React Native bare workflow + Kotlin native background services (`OfflineRuntime.kt`, `DnsVpnService`, `RestrictionService`, `ProgressRingManager`) running on real Android device via Metro Fast Refresh.

---

## Progress Dashboard

```
Total Screens in Specification: 47
[█████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 11 / 47 Screens Complete (23.4%)
Domain 1: Home Page & Associated Drill-Downs: 11 / 11 Complete (100% DONE)
Active Module: Domain 2 — Recovery & Journal Domain (0 / 10 Complete)
```

---

## Domain 1: Home Page & Associated Drill-Downs (COMPLETE ✅)

Every screen in this domain is directly opened by tapping a widget on the Home Screen (`MAIN-01`). We build, map to native backend, test, and verify these screens in the strict execution sequence below.

| Step | Screen ID | Screen Name | Entry Point on Home | Native Backend Function Mapping | Status |
|:---:|:---|:---|:---|:---|:---:|
| **0** | `MAIN-01` | **Home Dashboard** | Main App Launch | `recovery.current`, `reward`, `capabilities`, `usage.todayMs`, `usage.week` | ✅ **DONE** |
| **1** | `TOOL-02` | **Protection Health** | Top status row (`• Protection active / needs attention`) & `100% Protection health` metric card | `capabilities.vpn`, `capabilities.accessibility`, `capabilities.usage`, `capabilities.vpnError`, `openSettings()` | ✅ **DONE** |
| **2** | `BURST-01` | **Burst Active (Crisis Mode)** | Bottom `Need help right now? / BURST` soft danger card | `burstRemainingMs`, `command("burst")`, `settings.burstMinutes`, `settings.rules` | ✅ **DONE** |
| **3** | `BURST-02` | **Burst Outcome (Urge Log)** | Triggered after Burst cooldown finishes or completion preview | `command("resist")`, `events` (`resisted: true/false`), `LocalEvent` | ✅ **DONE** |
| **4** | `PROG-02` | **Recovery Progress & Calendar** | Momentum Hero Card (`DAY 14 · DAYS CLEAN`) | `recovery.current`, `recovery.longest`, `recovery.cleanDays`, `eventsOfKind("relapse")` | ✅ **DONE** |
| **5** | `PROG-03` | **Screen Time Breakdown** | `Screen time` metric & `Your attention, reclaimed.` 7-day bar chart | `usage.todayMs`, `usage.week`, `usage.apps`, daily attention target calculation | ✅ **DONE** |
| **6** | `PROG-04` | **App Usage Detail** | Tapping any app row inside Screen Time | `usage.apps` (`packageName`, `ms`), per-app session stats | ✅ **DONE** |
| **7** | `SET-WEB-01`| **Website Protection** | Quick Card 1 (`Web filter · Blocks triggers`) | `settings.websiteEnabled`, `settings.dnsMode`, `command("setting")`, `command("domain")` | ✅ **DONE** |
| **8** | `SET-VIS-01`| **Visual Protection** | Quick Card 2 (`Visual AI · Local blur`) | On-device ML capability status, person-oriented blur selector, privacy boundary | ✅ **DONE** |
| **9** | `SET-STRICT-01`| **Strict Mode & Anti-Bypass** | Quick Card 3 (`Strict lock · Anti-bypass`) | `settings.strictMinutes`, `strictRemainingMs`, `assertCanWeaken()`, `command("strict")` | ✅ **DONE** |
| **10**| `SET-ACCOUNT-01`| **Account & Profile** | Top right avatar button (`A`) | Local user profile, session state, password management, auth lifecycle | ✅ **DONE** |

---

## Domain 2: Recovery & Journal Domain

Structured recovery tracking, crisis management tools, and urge/relapse logging without diary bloat.

| Screen ID | Screen Name | Description | Status |
|:---|:---|:---|:---:|
| `PROG-01` | **Progress Overview** | Combined recovery pulse + attention reclaimed overview | ⏳ **NEXT** |
| `JOUR-01` | **Recovery Journal Hub** | Structured event timeline (urges, relapses, interventions) | 🔲 Pending |
| `JOUR-02` | **Log an Urge** | 2-choice urge logger: "I resisted it" vs "I didn't" + optional trigger note | 🔲 Pending |
| `JOUR-03` | **Log a Relapse** | Date, time, trigger note, streak reset without erasing history | 🔲 Pending |
| `JOUR-04` | **Fap Tracker Hub** | Optional, user-controlled tracker history (uncoupled from protection) | 🔲 Pending |
| `JOUR-05` | **Log Tracker Event** | Minimal event timestamp logger | 🔲 Pending |
| `TOOL-01` | **Tools Action Hub** | Action-oriented surface: Burst primary button + health check | 🔲 Pending |
| `SET-REC-01` | **Recovery Settings** | Streak calculation toggle and recovery baseline date | 🔲 Pending |
| `SET-BURST-01`| **Burst Settings** | Triggering app selection, website strengthening policy, duration | 🔲 Pending |
| `SET-FAP-01` | **Fap Tracker Settings** | Independent enable/disable toggle | 🔲 Pending |

---

## Domain 3: Protection & Settings Configuration Domain

Granular control over device-level filtering, anti-bypass friction, and system integrations.

| Screen ID | Screen Name | Description | Status |
|:---|:---|:---|:---:|
| `SET-01` | **Settings Hub** | Feature-organized settings anchor (Protection, Resistance, Recovery, Preferences) | 🔲 Pending |
| `SET-WEB-02` | **Blocked & Allowed Domains**| Searchable custom domain rules manager (add/remove/toggle) | 🔲 Pending |
| `SET-WEB-03` | **Scoped Overrides** | Time- and target-scoped exceptions governed by Strict Mode | 🔲 Pending |
| `SET-VIS-02` | **Protected Contexts** | App selector for visual protection on supported apps | 🔲 Pending |
| `SET-SOC-01` | **Short-Form Protection** | Reels, Shorts, Spotlight & TikTok fallback controls | 🔲 Pending |
| `SET-APP-01` | **App Controls Hub** | Controlled apps list with daily allowances and active schedules | 🔲 Pending |
| `SET-APP-02` | **App Limit & Schedule** | Per-app daily allowance dropdown and schedule list | 🔲 Pending |
| `SET-APP-03` | **Schedule Editor** | Start/End time and 7-day repeat selector | 🔲 Pending |
| `STATE-STRICT-02`| **Pending Change Cooldown** | Countdown timer before a weakening change is permitted | 🔲 Pending |
| `SET-NOT-01` | **Notifications** | Recovery reminders, health alerts, and daily reward notification toggles | 🔲 Pending |
| `SET-SYNC-01` | **Cloud Sync** | Local-first synchronization status and offline conflict resilience | 🔲 Pending |
| `SET-DATA-01` | **Data & Privacy** | On-device ML boundaries, browsing privacy, local reset | 🔲 Pending |
| `SET-ACCOUNT-02`| **Delete Account** | Authenticated destructive action (server account deletion) | 🔲 Pending |
| `STATE-DATA-02` | **Reset Local Data** | Device-only reset (distinct from deleting server account) | 🔲 Pending |

---

## Domain 4: Onboarding & Authentication Flow

Clear disclosure, explicit affirmative consent, and personal goal selection.

| Screen ID | Screen Name | Description | Status |
|:---|:---|:---|:---:|
| `ONB-01` | **Welcome & Entry** | Value proposition, Google OAuth, Email/Password entry | 🔲 Pending |
| `ONB-03` | **Login** | Returning user authentication | 🔲 Pending |
| `ONB-04` | **Password Recovery** | Password reset link delivery | 🔲 Pending |
| `ONB-05` | **Goal Selection** | Setup Step 1/6: Adult sites, Visual content, Short-form feeds, App usage | 🔲 Pending |
| `ONB-06` | **Website Setup** | Setup Step 2/6: Capability explanation before Android system prompt | 🔲 Pending |
| `ONB-07` | **Visual Consent** | Setup Step 3/6: On-device privacy disclosure & explicit affirmative consent | 🔲 Pending |
| `ONB-08` | **Apps & Feeds Selection** | Setup Step 4/6: Select high-risk surfaces (Instagram, YouTube, etc.) | 🔲 Pending |
| `ONB-09` | **Recovery Baseline** | Setup Step 5/6: Initialize streak start point (Today vs past date) | 🔲 Pending |
| `ONB-10` | **Protection Ready** | Setup Step 6/6: Truthful verification summary (e.g. 4 of 5 ready) | 🔲 Pending |

---

## Domain 5: System & Enforcement Overlays

Real-time device enforcement states, camera blur covers, and pre-permission disclosures.

| Screen ID | Screen Name | Description | Status |
|:---|:---|:---|:---:|
| `STATE-01` | **Pre-Permission Disclosure** | Plain-language Android permission explainer before OS dialog | 🔲 Pending |
| `STATE-02` | **Permission Denied Fallback**| Truthful degraded explanation when permission is refused | 🔲 Pending |
| `STATE-03` | **Degraded State Repair** | Actionable capability repair interface | 🔲 Pending |
| `STATE-04` | **App Limit Reached** | Blocking screen when daily app allowance expires | 🔲 Pending |
| `STATE-05` | **Scheduled Block Overlay** | Blocking screen during active scheduled time window | 🔲 Pending |
| `STATE-06` | **Short-Form Feed Block** | Overlay blocking Reels/Shorts while keeping the rest of the app accessible | 🔲 Pending |
| `STATE-07` | **Offline / Sync Issue** | Non-blocking banner with local queue retry | 🔲 Pending |
| `STATE-08` | **Visual Content Cover** | Real-time on-screen blur overlay over detected explicit media | 🔲 Pending |

---

## Verification Standard Per Step

For every screen built:
1. **Explain the Concept:** What it is, why this project needs it, where it lives, tradeoffs considered.
2. **Implement React Native Code:** Styled with Orbit / Clarity design tokens, Space Grotesk typography, and dark/light modes.
3. **Map Native Backend:** Connect to `OfflineRuntime.kt` commands or snapshot state.
4. **Automated Verification:**
   - `npm run typecheck --workspaces` (0 errors)
   - `npm test` (100% passing tests)
   - `npm run lint --workspaces` (0 warnings, 0 errors)
5. **Live Device Verification:** Verify via Metro Fast Refresh on the connected physical device.
6. **Update Tracker:** Mark step as `[x] DONE` in this document.
