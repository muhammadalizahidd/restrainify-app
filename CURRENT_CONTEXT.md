# Restrainify Mobile App: Current Context

> Snapshot date: 2026-09-28 (branch `main`, commit `cfc56b6`).
> Source of truth: **the code**. The PRDs and `SCREEN_ROADMAP_AND_TRACKER.md` were used only for orientation.
> `SCREEN_ROADMAP_AND_TRACKER.md` claims 52/52 screens done. That is **not accurate**: several screens exist in code but are unreachable, and several are stubs or demos (see section 9).
> Native (Kotlin) claims come from a code audit. Some UI claims were spot-checked; the rest are audit findings that should be re-verified before you rely on them.

---

## 1. What this project is

Android-first React Native app that helps users quit porn and compulsive short-form scrolling. Protection runs **on-device**. React Native is only the presentation layer, and Kotlin owns the protection truth.

Backend, website and API live in a **separate repo** (`restrainify.com`). This repo has only the Android app and shared TypeScript contracts.

**Stack:** RN 0.86.3, React 19.2.3, Expo SDK 57 (bare workflow, dev-client), TypeScript 5.9, Jest 30, ESLint 10. Android: compileSdk/targetSdk 36, minSdk 26, Room 2.7.2 + SQLCipher, ONNX Runtime 1.29, TFLite 2.16.1. npm workspaces: `apps/mobile`, `packages/contracts`, `packages/config`.

**Invariants that hold in code:** real-time decisions stay on-device; no raw frames are persisted or uploaded; sync is never in the enforcement path; UI reconciles from the native snapshot on foreground.

---

## 2. Architecture as built

```
React Native (apps/mobile/src)
  App -> ProtectionProvider(=OfflineProvider) -> AuthProvider -> SyncProvider -> AppNavigator(=OfflineNavigator)
  OfflineNavigator = useState route + history stack (NOT react-navigation), 4 tabs: Home / Progress / Burst / Settings
  native/OfflineProtection.ts -> NativeModules.RestrainifyProtectionBridge
        getState / execute(action, json) / getInstalledApps / openSettings / startVpn / stopVpn / requestDeviceAdmin
        event: "ProtectionChanged" (JS re-reads full snapshot)
Kotlin (android/app/src/main/java/com/restrainify/protection)
  OfflineRuntime      singleton state+command layer; Room+SQLCipher; produces snapshot
  RestrictionService  AccessibilityService: limits, schedules, burst, feed blocking, URL blocking, overlays, visual AI
  DnsVpnService       local DNS VPN filter
  visual/*            Viddexa (ONNX) + NSFWJS MobileNetV2 (TFLite) dual-model pipeline
  admin/*             device-admin based uninstall friction during Burst
  bridge/*            ProtectionBridgeModule, ProgressRingManager
```

Deep links: `restrainify://<route>?k=v` are parsed by the navigator. The only native-originated one is `restrainify://pending-change?packageName=..&appName=..`.

### Local persistence
- One encrypted Room DB (`restrainify.db`), key wrapped with an AndroidKeystore AES-GCM key.
- Tables: `configuration` (single JSON blob), `events`, `daily`.
- Auth session is kept in `expo-secure-store`.

---

## 3. Feature status (from code)

Legend: **Working**, **Partial** (works but gaps or truthfulness issues), **Unreachable** (implemented, but no in-app entry point), **Stub/Demo**, **Missing**.

### 3.1 Onboarding: Working (short)
- 4 steps: Welcome (Google sign-in) -> Login (returning user) -> Recovery info -> Accessibility setup -> `command("onboard")`.
- Accessibility step polls capability status, sets `accessibilityConsent`, and opens Android settings. It also has "Set up later".
- **Gaps:** Google sign-in is mandatory, with no skip. No goals or usage-access step, so `settings.goals` is never set from UI. `PasswordRecoveryScreen` is a static "no password required" page. The tracker's 6-step onboarding is not what was built.

### 3.2 Home: Working, with truthfulness issues
- `OfflineHome`: header with avatar (opens Account), protection-health line (opens Permissions), `MomentumHeroCard` (streak, 21-day goal hard-coded, screen time vs yesterday, daily coin claim), sign-in banner, `QuickProtectionGrid`, `BurstActionCard`.
- Quick cards open modals: Web filter, Short feeds, App controls, Strict lock, Visual filter.
- **Issues:**
  - The "Visual filter" card is hard-coded `active:false`.
  - The "App controls" active flag is effectively always true (`rules.length || 4`).
  - Screen-time tile has no drill-down (the `onOpenScreenTime` prop is never passed).
- **Strict Mode modal:** real. Starts a 30-minute default lock via `setting strictMinutes` + `strict`. It cannot be turned off while active. No duration picker.
- **Coins:** signed-in users claim via the backend `/api/coins/daily`, then `reward_remote` reconciles locally. Signed-out users are sent to Account. There is no spend UI.

### 3.3 Progress / Recovery: Partial
- Working: 30-day clean-day count, current and longest streak, resisted urges, Reset Streak (logs a `relapse` event, non-destructive), reclaimed-hours estimate (3h/day budget minus usage over 7 days), blocked-today and burst count, 7-day attention line chart.
- **Missing or dead:** calendar, timeline and metrics grid components exist but are **unused**. No screen-time detail or app-usage drill-down screens (the tracker says done, but there are none). No Journal hub or dedicated Urge/Relapse log screens. Urges are logged only through the Burst outcome screen, relapses only through Reset Streak.

### 3.4 Burst (crisis mode): Working
- Duration selector, orb timer, active-restrictions list, pattern-interrupt grid, outcome screen (resisted or not, logs `urge`).
- Start requires accessibility, at least one burst app, and offers a device-admin **uninstall protection** consent (with "start without protection").
- Native: deadline stored as wall clock + elapsedRealtime + boot count. While active, weakening any setting is blocked, burst-flagged apps are overlaid, and uninstall or settings-tamper screens are intercepted.
- **Unreachable:** `BurstSettingsScreen` (deep link only).

### 3.5 Website protection: Working
- `WebFilterModal` (in use) and `WebsiteProtectionScreen` (unreachable): toggle the web filter (starts or stops the VPN), custom allow and block domain rules with search and tabs.
- Native DNS VPN verdict order: user allow -> user block or known adult (8 hard-coded domains) -> proxy and DoH domains -> social domains (if enabled) -> SafeSearch rewrite -> forward upstream to **Cloudflare Family 1.1.1.3**. Real adult coverage therefore comes from Cloudflare, not a bundled list.
- 16 UDP sockets, LRU cache (1024 entries), IPv6 handling, error state after 5 upstream failures.
- Browser URL-bar blocking via accessibility for Chrome, Samsung, Firefox, Edge, Brave, Opera and DuckDuckGo.
- **Gaps:** no UI for `dnsMode`, `safeSearch` or `proxyResistance` (`ResolverConfigCard` is dead). Private DNS mode only opens Android settings.

### 3.6 Short-form protection: Partial
- Working UI: `ShortFormModal` (master switch `shortFormBlockingEnabled`, social-websites toggle, per-app feed options).
- **Actually enforced natively:**
  - **Instagram:** Reels, Stories, Explore, via view-ID and keyword inspection of the accessibility tree. DMs are always allowed.
  - **YouTube:** Shorts, Home, Explore and Comments options. Regular video and search are preserved.
  - **TikTok:** whole-app block only (there is no in-app detection).
- **Not enforced:** Facebook and Snapchat are listed in the UI and default to "experimental", but native has **no detection** for them. Spotlight has no code.

### 3.7 App controls (limits and schedules): Working
- Installed-app list with usage today, per-app daily limit, schedule (overnight supported), day selection, feed mode and burst flag.
- Enforcement: a full-screen accessibility overlay with a "Go home" button, and an "Request an override" button that opens the pending-change screen.
- Usage comes from UsageStats, with clock-rollback protection and split-screen handling.
- **Gaps:** schedule times are typed as text ("10:00 PM"), not a picker. `ScheduleEditorScreen` is effectively unreachable.

### 3.8 Strict mode and pending-change cooldown: Partial
- Native `assertCanWeaken()` blocks weakening commands while burst or strict time remains. It gates settings toggles, domain and rule edits, and reset.
- **There is no native pending-change queue.** `PendingChangeScreen` is a shell: it falls back to a hard-coded 18:42 demo timer, its countdown is client-side only, it has no apply or confirm action, and it ignores the package params that native passes.
- Strict lock is not enforced against disabling the accessibility service or the VPN.

### 3.9 Visual AI: Partial. Backend works, UI is split
- **Native pipeline works (experimental, off by default):**
  - Two models on the same frame: Viddexa NSFW-2-Nano (ONNX) and GantMan MobileNetV2 (TFLite).
  - Frame capture uses `takeScreenshotOfWindow`, so it needs **Android 14+ (SDK 34)**. Below that the failure message is "MediaProjection fallback is not enabled yet".
  - Applies only to Instagram, TikTok, YouTube and Snapchat.
  - Sampling about every 500 ms, latest-frame-only queue, duplicate-frame skipping, continuous ~200 ms sampling once anything looks sexual.
  - Block gates over the latest 5 frames: exact same-category consensus (2 frames for Sexy or Porn, 3 for Hentai) or Porn/Sexy overlap (2 frames).
  - Non-touchable "Content blocked" overlay, with an optional touchable **Show Reel** control that reveals one content item and pauses sampling until the next navigation.
  - Defaults: `visualAiEnabled=false`, `visualAiBlockingEnabled=false`, `allowShowReel=false`. Blocking needs both `visualAiEnabled` and `visualAiBlockingEnabled`.
  - No frames are persisted or sent. Model SHA-256 in the manifest is **not verified** at load.
- **UI:**
  - `VisualProtectionScreen` is real (consent switch, enable, block, Show Reel, live per-class diagnostics), but has **no entry point**.
  - `VisualAiModal`, which Home opens, is a **stub** (local state, an "Example unsupported app" row, and it never calls `command`). Verified in code.

### 3.10 Fap tracker: Unreachable
- `FapTrackerScreen`, `LogTrackerEventScreen` and `FapTrackerSettingsScreen` are fully implemented (metrics, timeline, enable toggle, event logging). **None is linked from any tab or card.** The only in-app `open("fap-tracker")` is a back link inside the tracker's own settings screen.
- `tracker_event` is never enqueued for sync, although the pull side handles it.

### 3.11 Account, auth and sync
- **Settings tab = `AccountScreen` only.** It has Google sign-in, cloud-sync toggle, device-permissions modal (Usage Access only), privacy link, log out, "Delete local data" (`command("reset")`), and "Delete account" (backend).
- **There is no Settings hub.** No screens for notifications, theme, recovery baseline, or a dedicated Cloud Sync or Data & Privacy page. Theme and `recoveryEnabled` are only written by sync pulls.
- **Auth:** Google sign-in (`@react-native-google-signin`) -> `POST /api/auth/google` -> tokens in SecureStore, refresh if within 300 s of expiry, logout and delete-account calls.
- **Sync (client side):** entity kinds `settings`, `reward`, `recovery_event`, `tracker_event`, `domain_rule`. Offline queue in SecureStore (dedupes by entity and operation), push then pull with a cursor, reconcile into Room through `reward_remote` and `event_remote`. Runs on login and app foreground, heartbeat at most every 6 hours. Conflict handling is server last-writer-wins.
- **Sync gaps:** rejected or retry mutations stay in the queue forever (no retry cap, no backoff). Reward payload sets `lifetimeEarned` to balance. Setting payloads are partial. `OfflineProvider` enqueues mutations but does not trigger a sync itself.
- Endpoints used: `/api/auth/{google,refresh,me,logout}`, `/api/account/delete`, `/api/sync/{push,pull}`, `/api/user/activity`, `/api/coins/daily`.

### 3.12 Enforcement screens (`features/enforcement`): Mostly demo
- `PermissionDisclosureScreen` and `PermissionDeniedScreen` are **real** and widely used (they set consent and open Android settings).
- `AppLimitReachedScreen`, `ScheduledBlockScreen`, `VisualCoverScreen`, `SyncIssueScreen` and `DegradedStateScreen` are **in-app previews or demos**, opened only through deep links. The actual blocking overlays are drawn natively by `RestrictionService`.

### 3.13 Recovery streak logic: Working
- Streak runs from the baseline date to today and resets on relapse days. It returns current, longest and clean-days-in-last-30. Baseline cannot be moved into the future or after a relapse. Reward is a local 10-per-day counter.

---

## 4. What is shipped in native vs. what is JS-only

| Concern | Owner |
|---|---|
| Enforcement decisions (limits, schedules, burst, feeds, URLs, DNS, visual AI) | Kotlin |
| Strict/burst weakening lock | Kotlin (`assertCanWeaken`) |
| Recovery streak, events, rewards, usage | Kotlin (Room) |
| Cooldown-request flow (pending change) | JS shell only, **not implemented** |
| Auth, coins, cloud sync | JS |
| Notifications and reminders | **None** (only POST_NOTIFICATIONS declared; two foreground-service notifications) |

---

## 5. Tests

- **Jest:** 23 files, about 240 `it(` blocks, mostly pure-logic tests for home, burst, onboarding and auth, protection, recovery, settings, sync, coins and auth API. Not covered: `AuthContext`, `SyncContext`, `googleAuth`, `activityReporter`.
- **Kotlin JVM:** 5 files, 47 `@Test`s (`PolicyTest`, `ProtectionOrchestratorTest`, visual decision engine and both frame gates). Not covered: `OfflineRuntime`, `RestrictionService`, `DnsVpnService`, bridge, admin classes, classifiers, overlays. No instrumented tests.
- Native tests were repeatedly **blocked by an external Gradle file-hash lock** (see the Viddexa work log), so recent Kotlin changes may not have been compiled or tested.
- `tests/orbit-clarity.test.cjs` reads an HTML file that does not exist in the repo and would fail (it is not part of the Jest run).

---

## 6. Build and release status

- `app.json`: package `com.restrainify`, scheme `restrainify`, Android only. **No `plugins` and no permissions.** Permissions come from the native manifest.
- Release build type exists but **falls back to the committed debug keystore** if no upload key is supplied. `minify` and `shrink` are off. `versionCode 1` / `0.1.0`.
- **No production API URL.** `EXPO_PUBLIC_API_URL` falls back to `http://10.0.2.2:3000`. `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` are missing from `.env.example`. The network security config allows cleartext to dev IPs, including `192.168.1.8`, in the main `res/xml`.
- No CI. `supabase/` is a placeholder (comments only, no schema). `packages/config` is a stub (`echo ok` scripts).
- ~40 MB of ML models bundled in the APK.

---

## 7. Dead or stale code (safe cleanup candidates)

- **JS:** `features/core/appModel.ts` and `dashboardFixture.ts` (test-only), `RecoveryCalendarCard`, `RecoveryHeroCard`, `RecoveryMetricsGrid`, `RecoveryTimeline`, `ResolverConfigCard`, `SectionHeader`, `SurfaceCard`, `AppScreen`, `OnboardingAuthCard`, `native/ProtectionBridge.ts`, and `authService.ts` (stale "stubbed" header, duplicates `AuthContext`).
- **Kotlin:** `SyncMutation.kt`, `FramePrivacyBoundary.kt`, `usage/` (README only), three unused `ProtectionRuntimeState` values, and `ProtectionForegroundService` (shows a notification but does no work and is never stopped).
- **Docs:** the `visual` README says TFLite but one model is ONNX. `validation-strategy.md` references a `ScreenTime.test.ts` that does not exist.

---

## 8. Known risks

1. **Adult-domain filtering depends on Cloudflare 1.1.1.3.** It needs internet, and a third party sees hostnames. The bundled list is only 8 domains.
2. Uninstall protection is **Burst-only**, English-text-based, and does not guard against disabling the accessibility service or the VPN. The device admin has no policies (it only forces a "deactivate admin" step).
3. `snapshot()` runs up to 7 UsageStats queries on every call, and it is called on every `changed` event.
4. The sync queue lives in SecureStore (size limits), with no retry policy.
5. Visual AI needs Android 14+, and the model hash is not verified.
6. Truthfulness UI bugs (Home card active states, the demo timer) contradict the app's "truthful capability reporting" principle.

---

## 9. Gap list versus the roadmap tracker (what to fix or wire, not new features)

Structure already exists for these, but they are not reachable or not real:

| Item | State in code | Needed |
|---|---|---|
| Settings hub | Missing (tab = AccountScreen) | Build hub linking existing screens: Burst settings, Fap settings, Visual protection, Web, Short-form, App controls, Permissions |
| Fap tracker (3 screens) | Built, unlinked | Add entry point (Settings hub or Progress) |
| `BurstSettingsScreen` | Built, unlinked | Link from Settings hub / Burst tab |
| `VisualProtectionScreen` | Built, unlinked | Link it, and replace stub `VisualAiModal` with real screen or wire the modal to `command` |
| `WebsiteProtectionScreen`, `ShortFormProtectionScreen` full screens | Built, modals used instead | Decide: keep modals only or link screens |
| DNS mode / SafeSearch / proxy resistance / theme | Native + settings exist, no UI | Add toggles (`ResolverConfigCard` already exists) |
| Recovery calendar and timeline | Components built, unused | Mount in Progress screen |
| Screen-time and app-usage drill-downs | No screens (only data) | Missing, data is available (`usage.week`, `usage.apps`) |
| Journal hub, Urge log, Relapse log screens | Missing | Only event logging paths exist |
| Pending-change cooldown | JS shell, demo timer | Native request queue plus apply and cancel, or remove the screen |
| Facebook / Snapchat feed blocking | UI lists them, no native detection | Implement inspectors or hide from UI |
| Home card `active` truthfulness | Hard-coded | Bind to snapshot state |
| Notifications / reminders | Nothing | Missing entirely |
| Onboarding goals, usage-access step | Missing | Goals never set |
| Production API URL, Google plugin config, release signing | Not configured | Needed before a release build |
| Sync retry / backoff and `tracker_event` enqueue | Missing | Small fixes |

---

## 10. Where to look

- Navigation and routes: `apps/mobile/src/app/navigation/OfflineNavigator.tsx`
- State and commands (JS): `app/providers/OfflineProvider.tsx`, `native/OfflineProtection.ts` (snapshot types)
- State and commands (native): `android/.../protection/OfflineRuntime.kt`, `Policy.kt`
- Enforcement: `service/RestrictionService.kt`, `webfilter/DnsVpnService.kt`
- Visual AI: `protection/visual/*`, work log at `docs/implementation/viddexa-visual-ai-worklog.md`
- Shared contracts: `packages/contracts/src/*`
- Decisions: `docs/decisions/ADR-0001` to `ADR-0013`; plans in `docs/architecture/`
