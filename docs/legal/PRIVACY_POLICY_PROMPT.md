# Restrainify: Google Play Privacy Policy Prompt

**Purpose:** a ready-to-paste prompt for Claude 5.5 that produces a Google Play–compliant privacy policy for Restrainify, plus the companion documents Google reviews alongside it.
**Evidence date:** 2026-10-02. **Code reviewed:** repository HEAD `b392bb9` plus the uncommitted working tree, **after the production-readiness fixes listed in Appendix A** (encrypted DNS, in-app disclosures, release-build cleanup).
**Method:** every product fact below was verified in the code (file paths given). Every Google requirement was taken from Google's own pages (URLs in Appendix B). Google edits these pages often. Re-check Appendix B on the day you submit.

---

## 0. Read this first (owner, not part of the prompt)

**A privacy policy alone will not get the app approved.** Google reviews four things together and rejects when they disagree: the policy, the in-app disclosures, the Data safety form, and the Play Console declarations (Accessibility, VPN, foreground service). The policy has to match what the app really does. The code review found problems that contradicted Google's rules. **Most are now fixed in the app (see the status table in Appendix A); a few are still open and are yours to finish.** The prompt below describes the app *as it is after the fixes*, and keeps one conditional block (the "continue without an account" decision).

**What you must supply** (the prompt tells Claude to leave `[[PLACEHOLDERS]]` rather than invent): legal name, contact email, postal address, backend hosting provider, retention periods, minimum age, and a few other answers. Full list in section 7 of the prompt.

**How to use it:**
1. Finish the items still open in Appendix A (most fixes are already in the app) and test the encrypted-DNS path on a real phone.
2. Open a new Claude 5.5 conversation. Paste everything between `PROMPT START` and `PROMPT END`.
3. Answer its questions from section 7 (or fill the placeholders afterwards).
4. Have a lawyer read the result once. Claude is drafting, not giving legal advice, and this app handles sensitive behavioural-health data.
5. Publish at a stable HTML URL, link it in Play Console, and link it inside the app labelled "Privacy policy".

---

<!-- ===================================================== -->
<!--                    PROMPT START                       -->
<!-- ===================================================== -->

# PROMPT START

## 1. Your role and mission

You are a senior privacy counsel and technical writer who specialises in Google Play Developer Program policy compliance for Android apps that use sensitive permissions. You are drafting the public **Privacy Policy** and the supporting compliance documents for **Restrainify**, an Android app that helps people reduce compulsive pornography use and short-form-video scrolling.

**Success condition:** Google Play review approves the app on the first submission, and a reasonable user reading the policy understands exactly what the app does with their data.

**You must optimise for accuracy over reassurance.** Reviewers reject apps whose policy, in-app text, Data safety form and Console declarations disagree. Do not write anything that is more comforting than the facts in section 3.

## 2. Ground rules (non-negotiable)

1. **Use only the facts in section 3.** They were verified in the code. Do not add capabilities, data, partners or security claims that are not there. If something you need is not in section 3, it is in section 7: leave a visible placeholder `[[LIKE THIS]]` and list it in your final report. **Never invent** a company name, address, email, retention period, vendor, certification, or legal basis.
2. **Never use absolute claims** ("100% private", "never leaves your phone", "we never collect…") unless section 3 proves them for every code path. Prefer precise, scoped wording: *"Screen images are analysed on your device and are not stored or uploaded."*
3. **Keep three things consistent everywhere:** (a) the policy, (b) the Data safety answers you draft, (c) the in-app disclosure texts you draft. If you change a fact in one, change it in all.
4. **Plain language.** Disclosures a user sees in the app must read at roughly a 13-year-old's reading level (Google's guidance). The policy may be more detailed but must stay readable: short sentences, defined terms, no legal filler.
5. **Do not give legal advice** in the output. You may add a short note that a lawyer should review before publishing.
6. **Mark conditional text.** Two facts depend on an engineering decision (section 3.7). Provide both variants as `IF / ELSE` blocks and flag them in your final report so the owner keeps only the true one.

## 3. Verified product facts (your only source of truth)

### 3.1 What the app is

- Name: **Restrainify**. Android only. Package `com.restrainify`. Version `0.1.0` (pre-release).
- It is a **self-restriction** tool chosen and configured by the adult user themselves. It is **not** a monitoring or parental-control product aimed at *other* people, it does not hide itself, and it cannot send the user's activity to anyone else. State this plainly, because Google's Spyware policy targets covert monitoring.
- Core features, all user-initiated:
  - **Safe Browsing:** blocks adult and user-chosen websites by filtering DNS lookups on the device.
  - **Short-form feed blocking:** covers Reels, Shorts, Spotlight, Stories etc. inside Instagram, YouTube, Facebook, Snapchat; TikTok is blocked as a whole app.
  - **App limits and schedules:** daily time limits and time windows for chosen apps.
  - **Visual filter (optional, off by default):** on-device AI that covers explicit images/video in supported apps. Needs Android 14+.
  - **Burst (crisis mode):** a timed lock that restricts chosen apps, and (optionally) makes uninstalling Restrainify harder until the timer ends.
  - **Strict Mode:** a cooldown that stops the user weakening their own protection impulsively.
  - **Recovery tracking:** streak, urge log, relapse log, optional private tracker, daily "focus coins".
  - **Cloud sync and account:** Google sign-in, a cloud-sync toggle (see 3.4), account deletion.
- **Audience:** adults. The app is about pornography use. It must not be directed at children. `[[MINIMUM AGE: owner to confirm, recommend 18+]]`.
- **The user must sign in with Google to get past onboarding** (no skip option exists in `OnboardingFlow.tsx` / `WelcomeScreen.tsx`). So account data is *required*, not optional. Write it that way.

### 3.2 Android permissions and system capabilities (what is on the device and why)

Source: `android/app/src/main/AndroidManifest.xml`, `res/xml/*.xml`, merged release manifest.

| Capability | Granted how | What the app does with it | Leaves the device? |
|---|---|---|---|
| `INTERNET`, `ACCESS_NETWORK_STATE` | install-time | Sign-in, cloud sync, daily coins, DNS forwarding, connectivity check | Yes: see 3.4 |
| **AccessibilityService** (`BIND_ACCESSIBILITY_SERVICE`; `isAccessibilityTool="false"`; capabilities: retrieve window content, take screenshots, report view IDs, include not-important views; events: window state/content changes, clicks, scrolls, selections) | User turns it on in Android Settings after an in-app disclosure | See 3.3 below | **No.** Nothing read through it is stored or uploaded, except a blocked-item counter |
| `PACKAGE_USAGE_STATS` (Usage access) | User grants in Android Settings after an in-app disclosure | Reads app foreground time to enforce limits and show screen-time stats | **No** |
| **VpnService** (`BIND_VPN_SERVICE`, special-use foreground service) | User approves Android's VPN dialog | Local DNS filter (3.3) | Only DNS lookups, to Cloudflare. See 3.4 |
| `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE` | install-time | Two foreground services keep protection running with a visible notification: `DnsVpnService` (subtype "Local DNS filtering and parental content protection") and `ProtectionForegroundService` (subtype "Real-time device usage and content protection") | No |
| `POST_NOTIFICATIONS` | runtime (Android 13+) | Shows the persistent protection-status notifications. **No marketing or remote push notifications exist** (no FCM / push SDK) | No |
| `RECEIVE_BOOT_COMPLETED` | install-time | After a reboot, ends an expired Burst's device-admin lock | No |
| **Device administrator** (`BIND_DEVICE_ADMIN` receiver; `<uses-policies />` is **empty**) | User activates it from an in-app consent screen, only when starting Burst with Uninstall Protection | Android then requires the user to deactivate it before uninstalling. **No device-admin policies are used** (no wipe, lock, camera, password rules). Auto-revoked when Burst ends | No |
| App list via `<queries>` (launcher intent). **`QUERY_ALL_PACKAGES` is not used** | install-time | Lists launchable apps so the user can pick apps to control | **No** |
| Clipboard write | user tap on a copy button | Copies text the user asked to copy (e.g. a DNS hostname) | No |
| `USE_BIOMETRIC`, `USE_FINGERPRINT` | **removed** from the release manifest (a library had merged them in; the app never used them) | Do not mention biometrics in the policy | n/a |

`allowBackup="false"`: app data is excluded from Android cloud backup and device-to-device transfer.

### 3.3 Exactly what each capability reads, and what happens to it

**AccessibilityService** (`RestrictionService.kt`, `res/xml/restrictions_accessibility.xml`). Everything is processed in memory to make an immediate block/allow decision. It is deterministic and rule-based (fixed lists of app and view identifiers). It does not use AI to decide actions, and does not act autonomously beyond the rules the user configured. It reads:
1. **Which app is in the foreground** (package name) to apply limits, schedules, Burst restrictions.
2. **View identifiers and content descriptions** of elements inside Instagram, YouTube, Facebook, Snapchat (and TikTok where applicable) to recognise short-form feeds (Reels/Shorts/Spotlight/Stories/Explore) and show a block screen.
3. **The address-bar URL/host of supported browsers** (Chrome, Samsung Internet, Firefox, Edge, Brave, Opera, DuckDuckGo) to compare against the block list when Safe Browsing/social blocking is on. The URL is matched in memory and is not stored or transmitted.
4. **During an active Burst with Uninstall Protection on:** visible text on the Android package-installer and Settings screens, scanned for the words "Restrainify", "uninstall", "force stop", "deactivate device admin", to detect uninstall/disable attempts, then shows a lock screen and returns the user Home.
5. **Window screenshots (Android 14+ only) when the user has turned the Visual filter on:** captured with `takeScreenshotOfWindow` for Instagram, TikTok, YouTube, Snapchat and Facebook, analysed by two AI models bundled inside the app (`viddexa_nsfw_2_nano.onnx`, `nsfw_mobilenet_v2_140_224.tflite`), then released. **No frame is written to disk, logged, or uploaded** (code review found no file/MediaStore writes in `visual/`). The only things kept in memory are a small non-reversible 8×8 brightness fingerprint used to skip duplicate frames, and the model's category scores. The only lasting effect is incrementing a "blocked" counter. The visual filter is **off by default**, needs explicit consent in-app, and can be switched off at any time.
6. It **draws overlays** (accessibility overlay windows) and performs **Back/Home** actions only to show or leave a block screen.

The app does not record, store or transmit keystrokes, passwords, messages or contacts, and it does not transmit anything it reads through the AccessibilityService. It only inspects the specific items listed above. Do **not** claim it "cannot see" text or "does not read screen content": Android lets an accessibility service see more than the app uses, and the app does read the items listed above in memory. The accurate claim is that these are **not stored or uploaded**. `[[ENGINEERING TO CONFIRM before publishing: no code path logs or stores accessibility node text beyond the cases above (see Appendix A item 6 about logging)]]`

**Usage access** (`OfflineRuntime.kt`): reads foreground-time events for launcher-visible apps. Stores only a **per-day total** of screen time in the encrypted local database; per-app figures are calculated on demand for display. Usage data is **not part of any sync payload** (`packages/contracts/src/sync.ts`) and is not transmitted.

**Local DNS filter** (`webfilter/DnsVpnService.kt`, `Policy.kt`): a local VPN that routes **only** DNS: the app's own placeholder resolver address plus eight well-known public DNS resolver addresses (1.1.1.1, 1.0.0.1, 8.8.8.8, 8.8.4.4, 9.9.9.9, 149.112.112.112 and two OpenDNS addresses), so that apps using those resolvers are filtered too. There is **no default route**, so ordinary web/app traffic does **not** pass through the tunnel and is neither inspected nor logged. For each DNS lookup the app: applies the user's allow/block lists and a small built-in blocklist, then **forwards unblocked lookups to Cloudflare**: `1.1.1.3` (Cloudflare "for Families", which blocks malware and adult content) by default, or `1.1.1.1` for domains the user has explicitly allowed. **The connection is encrypted:** DNS over TLS (port 853) first, with DNS over HTTPS (port 443) as the fallback, and the certificate's host name is verified (`family.cloudflare-dns.com` / `one.one.one.one`). **It never falls back to unencrypted DNS**; if neither works, the lookup fails (`webfilter/EncryptedDns.kt`). SafeSearch can rewrite a few search-engine hostnames. Results are cached **in memory only** (up to 1,024 entries, each kept for no longer than its DNS time-to-live, capped at one hour). The app **does not log or store DNS queries**; it stores only counts of blocked lookups per day. "Private DNS" mode does not use the VPN; it only opens Android's Private DNS settings, and the app sees no queries in that mode.

**Installed apps:** the launcher-visible app list (name + package) is read on demand to let the user choose apps; chosen apps' package names are kept in local rules. App rules are **not synced** to the server.

### 3.4 Data that leaves the device, and where it goes

Source: `features/auth/api/authApi.ts`, `features/sync/**`, `features/coins/api/coinsApi.ts`, `packages/contracts/src/{sync,coins}.ts`, `OfflineProvider.tsx`.

All app-to-server traffic goes over **HTTPS** to `https://restrainify.com` (production; `usesCleartextTraffic="false"`). The backend is in a separate repository; repository documentation names **Supabase** (authentication and PostgreSQL) and **Next.js API routes**. **Hosting provider, regions, retention and backups are unknown: see section 7.**

| # | What | Fields | When | Recipient |
|---|---|---|---|---|
| 1 | **Google sign-in** | Google ID token → server. Server returns and stores account profile: internal user ID, **email**, **full name**, **profile-picture URL**, provider = "google", last sign-in time. Scopes requested: `profile`, `email` | Sign-in; token refresh | Google (sign-in), Restrainify backend |
| 2 | **Session tokens** | Access/refresh token | Sign-in, refresh, logout | Backend (stored on device in Android-Keystore-backed secure storage) |
| 3 | **Account settings** | Server-side settings record: strict mode on/off, emergency-unlock delay minutes, explicit-content filter on/off, short-form filter on/off | Sync | Backend |
| 4 | **App settings sync** | Only these settings: theme, recovery on/off, tracker on/off, website protection on/off, DNS mode, Burst and Strict durations, recovery start date, SafeSearch, proxy-resistance, social-websites switch, cloud-sync switch. **Permission consents, Visual filter switches and app rules are never uploaded** (`features/sync/syncableSettings.ts`) | After a setting changes | Backend |
| 5 | **Recovery events** | Type (`relapse`, `urge`, `burst`), timestamp, day, whether the urge was resisted, **optional free-text note (≤500 characters, user-typed)** | After the user logs it | Backend |
| 6 | **Tracker events** (optional feature, off by default) | Timestamp, day, optional note | After the user logs it | Backend |
| 7 | **Custom domain rules** | Website hostnames the user adds to their allow/block list | After the user edits the list | Backend |
| 8 | **Daily coins** | Coin balance, claimed days, and the device **time zone / local day** for the daily claim | When the user claims | Backend |
| 9 | **Active-user ping** | `lastActiveAt` time, platform = "android", app version string, sent at most once per 6 hours while signed in | App foreground | Backend |
| 10 | **Random device/install ID** | `dev_<random>` generated by the app (not the Android ID, not an advertising ID) | With sync requests | Backend |
| 11 | **DNS lookups** | The hostnames being looked up by apps on the phone, while Safe Browsing (VPN mode) is on. Sent **encrypted** (DNS over TLS, fallback DNS over HTTPS) | Each lookup that is not blocked locally | **Cloudflare** (`1.1.1.3` / `1.1.1.1`): a third party governed by Cloudflare's own resolver privacy terms |
| 12 | **Account deletion request** | Authenticated request to delete the account and its server data | When the user confirms | Backend |

**Not sent anywhere (verified):** usage statistics, per-app screen time, installed-app list, app rules, browser URLs, screenshots/frames, model scores, the blocked-site list contents beyond what the user typed in row 7, and any contacts, location, photos, files, messages, microphone/camera data.

**Sync is gated by a toggle** (`cloudSyncEnabled`, on by default). When the toggle is off, new changes are not queued for upload (verified in `syncEngine.enqueue`). Whether the server keeps data that was synced earlier is a backend fact the code cannot show: say it remains until the account is deleted **unless the owner states otherwise** `[[CONFIRM: server retention after sync is turned off]]`.

### 3.4a Consents are recorded on the device only

Before each sensitive capability the app shows its own full-screen disclosure with **"Agree"** and **"Not now"**: Accessibility (also shown during onboarding), Usage access, Website protection (VPN), and the Visual filter (screen analysis). Agreement is stored on the device (`accessibilityConsent`, `vpnConsent`, `visualConsent`) and is **not uploaded**. The VPN cannot start without `vpnConsent`; the bridge and the service both enforce this. Reflect the substance of these disclosure texts in the policy's section 5 (`features/enforcement/screens/PermissionDisclosureScreen.tsx`, `AccessibilitySetupScreen.tsx`).

### 3.5 Data stored only on the device

- A local database encrypted with **SQLCipher**; its key is protected by the **Android Keystore**. It holds: app configuration and rules, recovery/urge/relapse/burst/tracker events (with notes), per-day coin and blocked-count totals, per-day screen-time totals.
- Sign-in session tokens and cached profile in secure storage.
- The sync queue and sync cursor, until sent.
- The user can wipe this with **Delete local data** (does not delete the server account).

### 3.6 Third-party code in the app

- **Google Play Services / Google Sign-In** (`@react-native-google-signin/google-signin`): handles sign-in; subject to Google's privacy policy.
- **ONNX Runtime and TensorFlow Lite:** run the two bundled models fully on-device. The models are inside the APK; nothing is downloaded.
- **SQLCipher, Room, React Native, Expo modules, Space Grotesk font:** local libraries, no network use of their own for tracking.
- **No** analytics SDK, advertising SDK, crash-reporting SDK, attribution SDK or social SDK is present (checked `package.json`, `build.gradle.kts`, source). **No ads. No data is sold. No data is used for advertising.**

### 3.7 One fact that depends on an engineering decision. Provide both variants.

**(A) DNS encryption: resolved.** Lookups to Cloudflare are encrypted (DNS over TLS, fallback DNS over HTTPS). State this plainly, answer "encrypted in transit: yes" in Data safety, and do not mention plain DNS.

**(B) In-app sign-in requirement.** Currently required. `IF the owner adds a "continue without an account" path:` account data becomes optional. `ELSE:` required.

### 3.8 Account and deletion mechanics (verified)

- **In-app path:** Settings → "Delete account" opens a confirmation (type DELETE); it signs the user out of Google, calls `POST /api/account/delete`, and clears local account state. `AccountScreen.tsx`, `DeleteAccountModal.tsx`.
- **Local data:** Settings → "Delete local data" wipes the on-device database; it does **not** delete the server account.
- **Log out** signs out and clears the session; it does not delete data.
- **Web deletion path:** Google requires one outside the app. A publish-ready draft exists at `docs/legal/web/delete-account.html` (steps verified against the app; retention rows and contact details are placeholders). In section 8a, review and finalise **that** page instead of starting from scratch, and keep it consistent with the policy.

## 4. What Google Play requires (checklist your output must satisfy)

Quotes are from Google's pages, fetched 2026-10-02 (URLs in Appendix B).

**4.1 User Data policy: the privacy policy itself**
- Must be linked in the Play Console field **and** "a privacy policy link or text within the app itself".
- Must disclose: "Developer information and a privacy point of contact or a mechanism to submit inquiries"; "The types of personal and sensitive user data your app accesses, collects, uses, and shares; and any parties with which any personal or sensitive user data is shared"; "Secure data handling procedures"; "The developer's data retention and deletion policy".
- Must be "clearly labeled as a privacy policy (for example, listed as 'privacy policy' in title)", on "an active, publicly accessible and non-geofenced URL (no PDFs)" and "non-editable".
- The Data safety form "must be consistent with the disclosures made in the app's privacy policy."
- Developers must "not sell personal and sensitive user data".

**4.2 Prominent disclosure and consent** (applies to Accessibility, VPN, usage access, device admin, screen capture, and any data use outside the user's reasonable expectation)
- Disclosure "must be within the app itself, not only in the app description or on a website"; must not be only "in a privacy policy or terms of service"; "must be displayed in the normal usage of the app and not require the user to navigate into a menu or settings"; "must describe the data being accessed or collected"; "must explain how the data will be used and/or shared".
- Consent must "require affirmative user action"; navigating away or an auto-dismissing message must not count as consent; consent must come **before** the data is accessed.
- Best practices: state **why**, **what** and **how**; show it right before the permission request; offer "Agree" and a decline like "Not now"; avoid jargon; degrade gracefully if the user declines.

**4.3 AccessibilityService policy.** Because `isAccessibilityTool="false"`, Restrainify must (a) show the prominent disclosure, (b) complete the Play Console **Accessibility permission declaration**: reasons, data collected/shared, and a **video** of the disclosure and feature, and (c) stay within "deterministic, rule-based automation". Restrainify's behaviour is deterministic and rule-based; say so. Never set `isAccessibilityTool="true"`: the app is not for people with disabilities.

**4.4 VpnService policy.** Allowed for "parental control" and "device security" style tools and "network-related tools" when disclosed. Needs the **VPN declaration** in Console, a documented use in the store listing, a prominent disclosure, and encryption of data "from the device to the VPN tunnel endpoint". Restrainify's tunnel has no remote endpoint, and the DNS lookups it forwards to Cloudflare are encrypted (3.7A).

**4.5 Foreground services (Android 14+).** `specialUse` requires a Console declaration: description of the feature, user impact if deferred or interrupted, and a **demo video**; the manifest subtype strings must give a reviewer enough information.

**4.6 Account deletion.** In-app path **and** "a web link resource where users can request app account deletion and associated data deletion". The page must load without error, make the deletion pathway "prominently featured and easily discoverable", and "reference the app or developer name". User data tied to the account must be deleted; "temporary account deactivation, disabling, or 'freezing'" does not count; any retained data must be explained in the privacy policy with reasons (security, fraud prevention, regulatory).

**4.7 Data safety.** "Collection" is data transmitted off the device by the app (including by SDKs). Data processed only on the device need not be declared. Must state whether data is encrypted in transit and whether users can request deletion. The developer alone is responsible for accuracy.

**4.8 Health Content and Services.** Every app must complete the **Health apps declaration**. Restrainify tracks behavioural recovery, urges and relapses, which is health-adjacent. Treat it as health-related: describe it accurately, add a "not a medical device / not a substitute for professional care" disclaimer, and handle the data as sensitive.

**4.9 Google API Services User Data Policy (Google sign-in).** Publish an affirmative statement: *"Restrainify's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements."* Only `profile` and `email` are requested.

**4.10 Permissions policy.** Only request permissions "necessary to implement current features or services … promoted in your Google Play listing", and never use sensitive data for anything beyond the disclosed purpose.

**4.11 Device and Network Abuse / Spyware.** Do not describe features that "interfere with" other apps outside what the user configured; make clear every restriction is the user's own choice and can be turned off; state there is no hidden or covert operation (a visible notification is shown while protection runs).

## 5. Required structure of the privacy policy

Title the page exactly **"Restrainify Privacy Policy"**. Put **Effective date** and **Version** at the top. Use these sections, in this order. Under each is what it must say.

1. **Who we are and how to contact us.** Legal entity, address, and a privacy contact email `[[...]]`. One line stating that this policy covers the Restrainify Android app and `restrainify.com`.
2. **The short version.** A 6–8 bullet plain-language summary that is **fully accurate**. It must state: the app runs protection on your device; what leaves the device (account, synced recovery data, DNS lookups to Cloudflare); that screen images are analysed on-device and never stored or uploaded; no ads, no sale of data, no analytics SDKs; sign-in is required; how to delete.
3. **What Restrainify is and who it is for.** Self-restriction by the user, adults only `[[MIN AGE]]`, not a medical device, not a substitute for professional help. No covert monitoring; nobody else can see your activity.
4. **Information we collect and how we use it.** Use a **table** mirroring 3.4 (data / why / stored where / shared with). Then a separate subsection **"Information that stays on your device"** mirroring 3.3 and 3.5. Name every item. Treat the recovery logs and notes as **sensitive data about your health and sexual-content habits**, and say so.
5. **Sensitive permissions, explained.** One sub-section each, matching the in-app disclosures word for word where possible: **Accessibility service**; **Usage access**; **Local DNS filter (VPN service)**; **Screen analysis (Visual filter)**; **Device administrator (Burst uninstall protection)**; **Foreground service and notifications**. For each: what it is, why we need it, exactly what is read, that it is optional where it is, what is stored/uploaded (usually nothing), what happens if you decline, and how to turn it off in Android Settings.
6. **Who we share information with.** Exhaustive list: Google (sign-in), our backend infrastructure providers `[[hosting / database / email providers]]`, Cloudflare (DNS lookups), and legal disclosure. State that we **do not sell** personal data, do not use it for advertising, and do not share it for analytics. Distinguish "service providers acting on our instructions" from independent third parties such as Cloudflare, whose own terms apply (link them).
7. **Legal bases (if you serve the EEA/UK).** Contract for account and sync. **Explicit consent** for sensitive recovery data (health / sex-life data are special-category data) and for device permissions. Legitimate interests only for narrowly security-related processing. `[[CONFIRM with counsel]]`.
8. **How long we keep information.** Per category, with `[[retention periods]]`. State what happens on deletion, any backup lag, and any retained data with the reason (security, fraud, legal). Say that on-device data stays until you delete it or uninstall.
9. **Your choices and rights.** Turn off sync; change or revoke each permission; delete local data; delete the account (in-app path + web page link); export/access/correct/object/restrict where law gives it (GDPR/UK GDPR, CCPA/CPRA, other); how to submit a request; response times; appeals. State that **no consent is bundled**: each permission is separate and declining one does not block the rest.
10. **Account and data deletion.** The exact in-app steps (3.8) and the link to the standalone deletion page. Distinguish "Delete local data" from "Delete account" and "Log out".
11. **Security.** Only what is true: HTTPS to our servers; local database encrypted with SQLCipher and a key protected by Android Keystore; tokens in secure storage; app data excluded from Android backup. Add that website lookups are sent to Cloudflare over an encrypted connection (DNS over TLS, with DNS over HTTPS as a fallback). Add: "no system is perfectly secure." Do not claim certifications.
12. **Children.** Not directed at children; we do not knowingly collect data from anyone under `[[MIN AGE]]`; how to contact us to remove such data.
13. **International transfers.** `[[where backend and Cloudflare/Google process data]]`; safeguards `[[SCCs etc., confirm]]`.
14. **Google user data (Limited Use) statement.** The sentence from 4.9, verbatim.
15. **Cookies and the website.** Only if `restrainify.com` uses cookies/analytics `[[CONFIRM]]`; otherwise say the app uses none.
16. **Changes to this policy.** How and when users are told (in-app notice for material changes), plus the version history.
17. **Contact and complaints.** Email, postal address, EU/UK representative or DPO if applicable `[[...]]`, and the right to complain to a supervisory authority.

## 6. Claim traps: do NOT write these

| Do not write | Why | Write instead |
|---|---|---|
| "Zero browsing data … ever leaves your phone" (earlier builds; removed from the app) | DNS hostnames go to Cloudflare; custom domains sync to our server | "Screen images and app usage stay on your device. Website lookups are checked on-device, and lookups that are not blocked are sent to Cloudflare's DNS service." |
| "DNS queries are resolved entirely on your device" (earlier builds; removed from the app) | False; they are forwarded to Cloudflare | See above |
| "We don't collect browsing history" | You read browser URLs in memory and forward DNS lookups | "We don't store your browsing history. We read the web address in supported browsers in memory to apply your block list." |
| "100% private / 100% offline" | Sign-in and sync exist | Scoped statements only |
| "We never access your screen" | The service reads view IDs/text and can screenshot | Describe exactly what is read and that it is not stored or uploaded |
| "Cannot be uninstalled" / "prevents uninstall" | Android always lets users deactivate the admin or remove the app | "Makes uninstalling harder until your Burst ends; you can still do it" |
| "Your data is anonymous" | Account email/name are stored | Avoid |
| "End-to-end encrypted" | Not implemented | Avoid |
| "Compliant with GDPR/HIPAA" | Unverifiable | Avoid compliance badges |
| Vague catch-alls ("we may collect other information") | Reviewers reject vagueness | Name every data type |

## 7. Information you must request from the owner (never guess)

Ask the owner for each of these (or leave the placeholder):
1. Legal entity name, registered address, country `[[LEGAL NAME]] [[ADDRESS]]`
2. Privacy contact email and a separate support email `[[PRIVACY EMAIL]]`
3. Minimum age `[[MIN AGE]]` (recommend 18+)
4. Backend hosting provider and region; database provider (Supabase region); email/log/monitoring vendors; whether server logs (IP addresses, request logs) are kept and for how long
5. Retention period for: account profile, synced recovery events, tracker events, domain rules, coins, activity pings, server logs, backups; deletion lag after an account-deletion request
6. Whether `restrainify.com` uses cookies or analytics
7. EU/UK representative or DPO, if you target the EEA/UK
8. (Resolved: DNS encryption is implemented. Skip.)
9. Whether a "continue without an account" path will exist (3.7B)
10. Regions where the app will be offered (drives which laws to name)
11. Terms of Service URL and the support URL
12. Whether any payments or subscriptions will exist at launch (none are in the code)

## 8. Companion deliverables (produce all of them)

Google reviews these together with the policy. Draft each so it is consistent with the policy.

**8a. Account-deletion web page** (separate URL, e.g. `restrainify.com/delete-account`). Must name "Restrainify", show the steps prominently (in-app steps from 3.8 + a web request method such as an email/form `[[...]]`), state exactly what is deleted and what is retained and for how long, and the processing time.

**8b. Data safety form answers.** A table with one row per Google data type. Recommended starting position, to confirm against the backend:
| Google category → type | Collected? | Shared? | Purpose | Required / optional | Encrypted in transit | Deletable |
|---|---|---|---|---|---|---|
| Personal info → Name | Yes | No (processors only) | Account management | Required | Yes | Yes |
| Personal info → Email address | Yes | No | Account management | Required | Yes | Yes |
| Personal info → User IDs | Yes (account ID + random device ID) | No | Account management, app functionality | Required | Yes | Yes |
| Personal info → Other info (profile-picture URL) | Yes `[[confirm stored]]` | No | Account management | Required | Yes | Yes |
| **Health and fitness → Health info** (recovery/urge/relapse logs and notes; recommended conservative declaration) | Yes | No | App functionality (sync/backup) | Required for sync; creating logs is optional | Yes | Yes |
| App activity → Other user-generated content (free-text notes) | Yes | No | App functionality | Optional | Yes | Yes |
| App activity → Other actions (custom domain rules, daily-claim and active-user ping) | Yes | No | App functionality | Required | Yes | Yes |
| **Web browsing → Web browsing history** (DNS hostnames sent to Cloudflare) | Yes | **Yes, with Cloudflare** `[[confirm service-provider exemption with counsel]]` | App functionality (filtering) | Required for Safe Browsing (optional feature) | **Yes (DNS over TLS / HTTPS)** | N/A |
| Device or other IDs (random install ID) | Yes | No | App functionality | Required | Yes | Yes |
| Location, Contacts, Messages, Photos/Videos, Audio, Files, Calendar, Financial, Installed apps, Usage stats, Screen content | **No** (processed on-device only, never sent) | | | | | |

Also state: **no data is sold; none is used for advertising or analytics; users can request deletion** (in-app + web). For each "collected" row choose the purposes Google offers and keep them identical to the policy wording.

**8c. In-app prominent-disclosure texts** (≤90 words each, 13-year-old reading level, with "Agree" and "Not now" buttons) for: (1) Accessibility service, (2) Usage access, (3) Local DNS filter / VPN, (4) Visual filter / screen analysis, (5) Device administrator / Burst Uninstall Protection, (6) Google sign-in and sync of recovery data. Each must follow the **why / what / how** pattern and name the data type explicitly. Use this skeleton: *"Restrainify uses [capability] to [core purpose]. It reads [exact data]. [Stored/uploaded: exact answer]. You can turn it off any time in Android Settings."*

**8d. Play Console declaration drafts:** (1) Accessibility permission declaration (reasons, data, "deterministic rule-based", video script: show onboarding disclosure → Agree → Android settings → enable → a blocked reel); (2) VPN declaration (local DNS filter; no remote tunnel endpoint; routes only DNS); (3) Foreground service `specialUse` declaration for both services, with the user-impact text and a demo-video script; (4) Health apps declaration notes and the disclaimer sentence for the store listing; (5) target audience (adults), content-rating notes (the app discusses sexual-content addiction but contains no sexual content); (6) a short store-listing paragraph that documents the VPN/Accessibility use.

**8e. A one-page "consistency matrix"**: rows = each data item in 3.4; columns = policy section / Data-safety row / in-app disclosure / Console declaration; every cell filled, so the owner can see no contradiction.

## 9. Writing and publishing rules

- Language: plain English, active voice, short sentences, defined terms ("**we**" = the Restrainify team, "**you**" = the user). Avoid legalese; no walls of text; use headings and tables.
- Deliver the policy as clean **HTML** (semantic headings, a table of contents, anchor links, responsive, no scripts) and as Markdown. **Not a PDF.** One stable URL, not geofenced, not behind login, not editable by users, indexable, title tag "Restrainify Privacy Policy".
- First screen must show the title, effective date and contact. Keep a **changelog** section.
- The in-app link is now labelled "**Privacy policy**" (it was "Terms and conditions" and opened the privacy URL). Produce a separate short **Terms of Service** page outline only if the owner asks.
- Add `[[...]]` placeholders in **bold** so none survives into production unnoticed, and finish with a table of every placeholder.

## 10. Self-audit before you answer (do this, then show the results)

Run each check and report pass/fail with a one-line reason:
1. Every data type in 3.4 appears in the policy table, the Data safety table and the matrix.
2. No claim in section 6's "do not write" column appears anywhere.
3. Every sensitive capability in 3.2 has a policy sub-section **and** an in-app disclosure draft **and** (if Google requires) a Console declaration draft.
4. Retention and deletion are covered for **every** category, including backups and logs, or are clearly placeholder-flagged.
5. The Limited Use sentence is present verbatim.
6. The policy says the account is required (or the alternate if 3.7B changed).
7. DNS wording says the lookups sent to Cloudflare are encrypted, everywhere, and nowhere mentions plain DNS.
8. No absolute or unprovable claims; no invented vendors, dates, certifications, addresses.
9. Reading level: disclosures ≈ 13-year-old; policy summary readable by a non-lawyer.
10. All placeholders listed in a final table with who must supply them.

**Final response format:** (1) the privacy policy (Markdown + HTML), (2) deletion page, (3) Data safety table, (4) six in-app disclosures, (5) Console declaration drafts, (6) consistency matrix, (7) self-audit results, (8) placeholder table, (9) a short list of **assumptions you made** and **questions for the owner**.

# PROMPT END

<!-- ===================================================== -->
<!--                     PROMPT END                        -->
<!-- ===================================================== -->

---

## Appendix A: Production-readiness status (owner and engineering)

These were the gaps found while verifying the code against Google's rules. A policy cannot fix an app that contradicts it, so they were fixed in the app. Status after the work on 2026-10-02:

| # | Item | Status | What was done / what remains |
|---|---|---|---|
| 1 | VPN started with no in-app disclosure | **Fixed** | A full-screen "Turn on website protection" disclosure (with **Agree** / **Not now**) now comes first. The VPN cannot start without the stored `vpnConsent`; both the bridge (`ProtectionBridgeModule.kt`) and the service (`DnsVpnService.kt`) refuse. The Short-form setup flows used to switch the VPN on as a side effect; they now do that only if the user already accepted the disclosure. |
| 2 | Wrong statements in required disclosures | **Fixed** | Removed "resolved entirely on your device" (VPN) and "Zero browsing data… ever leave your phone" (onboarding). New wording names exactly what is read and what is sent. The text Android shows on its own Accessibility settings page (`strings.xml`) was updated to match. |
| 3 | Incomplete disclosures; "Continue" instead of "Agree" | **Fixed** | Accessibility, Usage access, VPN and a new **Visual filter** (screen analysis) disclosure each state why / what / how in plain language, with **Agree** and **Not now**. The onboarding Accessibility step says "Agree and open Settings". The Visual filter now needs its own one-time consent (`visualConsent`). |
| 4 | DNS forwarded unencrypted | **Fixed (needs device test)** | Replaced with DNS over TLS to Cloudflare, falling back to DNS over HTTPS, hostname-verified, **never plain DNS** (`EncryptedDns.kt`). Endpoints were verified from a PC (TLS 1.3, valid certificate for both host names, DoH answers correctly) and the wire format has 8 unit tests, **but the real connection on a phone through the VPN has not been exercised**. If a network blocks both ports 853 and 443 to Cloudflare, lookups fail (fail-closed) and the app shows its "DNS resolver unreachable" error after 5 failures. |
| 5 | No web page for account deletion | **Content ready, not published** | `docs/legal/web/delete-account.html` is publish-ready. Fill the highlighted placeholders (contact email, retention rows, dates). **The backend owner must confirm the "what is deleted" list matches what `POST /api/account/delete` really removes.** Then publish and enter the URL in Play Console. |
| 6 | Unused permissions and dev leftovers in release | **Fixed** | `USE_BIOMETRIC` / `USE_FINGERPRINT` removed (verified in the merged release manifest). The main network config no longer allows cleartext to dev IPs (debug builds keep their own). Verbose logging of foreground-app names is debug-only. *Correction to the earlier note:* the Expo dev client is already debug-only; it does not appear in the release manifest. |
| 7 | In-app label | **Fixed** | "Terms and conditions" is now "Privacy policy". |
| + | Data minimisation (found while fixing) | **Fixed** | Setting changes were all queued for upload, including consents. Only the settings in the shared sync contract are uploaded now (`syncableSettings.ts`, unit-tested). |

**Still open: not part of the fixes above, and yours to decide:**
- **Account is mandatory** at onboarding, yet the Account screen still has an "offline" state. Keep it required and make the text consistent, or add a real no-account path (then account data becomes optional; prompt section 3.7B).
- **Release signing:** a release-bundle script now exists (`npm run bundle:release`, `scripts/build-release-bundle.sh`) and refuses to build without `apps/mobile/android/app/release.keystore`. Keep that keystore safe and out of git, and enrol in Play App Signing. (Without the keystore file, Gradle would silently sign with the debug key, so always use the script for store builds.)
- **Health-adjacent data.** Recovery logs and notes sync to the server. Add a one-time consent line before the first sync (prompt section 8c, item 6); the Health apps declaration and disclaimer are needed in Play Console.
- **Publishing:** the privacy policy page, the deletion page, and the Play Console entries below.
- **Existing test installs:** anyone who already had website protection on will have it stop until they accept the new disclosure once (intended; affects pre-release builds only).

**Play Console items to complete (not policy text):** Accessibility declaration (with video), VPN declaration, foreground-service `specialUse` declaration (with video), Health apps declaration, Data safety form, target audience and content rating, account-deletion URL, privacy-policy URL, store-listing text that documents the VPN/Accessibility use.

## Appendix B: Sources (fetched or searched 2026-10-02; re-check on submission day)

- User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Prominent disclosure best practices: https://support.google.com/googleplay/android-developer/answer/11150561
- AccessibilityService API policy: https://support.google.com/googleplay/android-developer/answer/10964491
- VpnService policy: https://support.google.com/googleplay/android-developer/answer/12564964
- Permissions and APIs that access sensitive information: https://support.google.com/googleplay/android-developer/answer/16558241 (older: .../9888170)
- Data safety section: https://support.google.com/googleplay/android-developer/answer/10787469
- Account deletion requirements: https://support.google.com/googleplay/android-developer/answer/13327111
- Foreground services requirements: https://support.google.com/googleplay/android-developer/answer/13392821
- Health apps declaration: https://support.google.com/googleplay/android-developer/answer/14738291
- Health Content and Services policy: https://support.google.com/googleplay/android-developer/answer/16679511
- Device and Network Abuse: https://support.google.com/googleplay/android-developer/answer/16559646
- Spyware policy: https://support.google.com/googleplay/android-developer/answer/14745000
- Google API Services User Data Policy: https://developers.google.com/terms/api-services-user-data-policy
- Cloudflare public DNS resolver privacy (verify URL before linking): https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/

**Limits of this research:** page contents were retrieved through an automated summariser, so treat the quoted phrases as accurate to the best of that tool and verify the wording on Google's page before relying on a quote in a submission. I could not read `restrainify.com`'s backend, so retention, hosting, server logging and what the server stores beyond the client payloads are unverified and are listed as owner questions.
