# ADR-0012: Domain 4 (Onboarding & Authentication Flow) Architecture

## Status
Accepted and Implemented

## Date
2026-09-11

## Context
Domain 4 of the Restrainify mobile application provides the initial user touchpoint: transparent disclosure, explicit affirmative consent, returning-user authentication, and a structured 6-step defense configuration wizard across 9 dedicated screens.

Prior to this work, the app launched directly into an unstyled legacy offline placeholder (`Onboarding` in `features/offline/RecoveryScreens.tsx`), lacking authentication boundaries, granular permission disclosures, truthful readiness verification, and goal selection.

Delivering Domain 4 introduces a production-ready onboarding architecture conforming to the approved Orbit / Clarity design system (`DESIGN.md`), `SCREEN_ROADMAP_AND_TRACKER.md`, and strict compliance standards (`AGENT.md`, OWASP, GDPR/affirmative consent).

The 9 screens built:
1. `ONB-01`: **Welcome & Entry** (`WelcomeScreen.tsx`)
2. `ONB-03`: **Login** (`LoginScreen.tsx`)
3. `ONB-04`: **Password Recovery** (`PasswordRecoveryScreen.tsx`)
4. `ONB-05`: **Goal Selection** (`GoalSelectionScreen.tsx` — Step 1/6)
5. `ONB-06`: **Website Setup** (`WebsiteSetupScreen.tsx` — Step 2/6)
6. `ONB-07`: **Visual Consent** (`VisualConsentScreen.tsx` — Step 3/6)
7. `ONB-08`: **Apps & Feeds Selection** (`AppsFeedsSelectionScreen.tsx` — Step 4/6)
8. `ONB-09`: **Recovery Baseline** (`RecoveryBaselineScreen.tsx` — Step 5/6)
9. `ONB-10`: **Protection Ready** (`ProtectionReadyScreen.tsx` — Step 6/6)

---

## Decision

### 1. Service Boundary Pattern for Authentication (`authService.ts`)
Instead of embedding direct auth API logic or third-party SDK calls inside screens, we established a strict service boundary in `features/auth/authService.ts`.
- Encapsulates input validation (strict regex for email, 8+ characters for password, confirmation match).
- Currently provides clean local stubbing while Supabase Auth is not yet wired.
- When Supabase Auth is integrated, **only `authService.ts` changes**; all screen components remain 100% untouched.
- Security-safe password reset behavior: `sendPasswordReset()` always returns success regardless of whether the email exists in local storage or remote database, preventing account enumeration attacks.

### 2. Finite State Machine (FSM) Flow Orchestrator (`OnboardingFlow.tsx`)
The user onboarding journey consists of both branching paths (Sign Up vs Login vs Password Recovery) and sequential wizard steps (Steps 1 through 6).
- Orchestrated via `OnboardingFlow.tsx` which manages state: `"welcome" | "login" | "recovery" | "goals" | "website" | "visual" | "apps" | "baseline" | "ready"`.
- Clean backward and forward transitions with state persistence to `OfflineRuntime.kt`.
- Returning users logging in directly invoke `command("onboard")` and proceed to the main dashboard.

### 3. Truthful Protection Readiness Audit (`ProtectionReadyScreen.tsx` — PR-04)
Rather than displaying a misleading generic "All set!" screen with unverified green checks, the final readiness screen inspects real device state:
- Evaluates `snapshot.settings.websiteEnabled && snapshot.capabilities.vpn`
- Evaluates `snapshot.settings.accessibilityConsent && snapshot.capabilities.accessibility`
- Queries active app rules and recovery tracking configuration
- Calculates dynamic truthful tally (e.g. "3 of 4 protections active") with warning badges for skipped or permission-denied layers.

### 4. Native Kotlin Extension (`OfflineRuntime.kt`)
Extended the native offline engine:
- Added `"goals"` key in `OfflineRuntime.kt:defaults()` initialized to an empty JSON array `[]`.
- Added `"goals"` setting validator in `OfflineRuntime.kt:command("setting")` verifying allowed values (`["websites", "visual", "feeds", "apps"]`).
- Updated TypeScript types in `OfflineProtection.ts:OfflineSnapshot.settings.goals: string[]`.

---

## Frontend → Backend Function Mapping

| Screen ID | Frontend Component | Native Backend Function (`OfflineRuntime.kt`) | Method / Invariant Enforced |
|:---|:---|:---|:---|
| `ONB-01` | `WelcomeScreen` | `authService.signUpWithEmail()` | Validates email & password >= 8 chars before proceeding to Goal Selection. |
| `ONB-03` | `LoginScreen` | `authService.signInWithEmail()` + `command("onboard")` | Validates credentials; upon success invokes `OfflineRuntime.kt:68` (`onboardingComplete = true`). |
| `ONB-04` | `PasswordRecoveryScreen` | `authService.sendPasswordReset()` | Non-enumerating reset trigger; security invariant preserves user privacy. |
| `ONB-05` | `GoalSelectionScreen` | `command("setting", { key: "goals", value: [...] })` | Persists goal array; requires >= 1 goal; validates against allowed goal set in `OfflineRuntime.kt:85-90`. |
| `ONB-06` | `WebsiteSetupScreen` | `command("setting", { key: "websiteEnabled", value: true })` + `offlineProtection.startVpn()` | Plain-language VPN capability explanation before triggering local DNS filter. |
| `ONB-07` | `VisualConsentScreen` | `command("setting", { key: "accessibilityConsent", value: true })` + `offlineProtection.settings("accessibility")` | Plain-language on-device ML disclosure; requires explicit affirmative consent switch before activating. |
| `ONB-08` | `AppsFeedsSelectionScreen` | `command("rule", { packageName, feedMode, enabled, burst, days })` + `offlineProtection.apps()` | Saves app-specific rules; discloses feed-level vs full-app restrictions (e.g. TikTok whole-app requirement). |
| `ONB-09` | `RecoveryBaselineScreen` | `command("setting", { key: "recoveryStart", value })` + `command("setting", { key: "recoveryEnabled", value })` | Preserves existing clean history; validates date `!isAfter(today)` and guards against post-relapse manipulation. |
| `ONB-10` | `ProtectionReadyScreen` | Reads `snapshot.settings.*` + `snapshot.capabilities.*`; invokes `command("onboard")` | Truthful audit summary; finalizes onboarding state via `OfflineRuntime.kt:68`. |

---

## Consequences & Verification
- **Test Coverage:** Full test suite in `Domain4OnboardingAuth.test.ts` covers auth validation, goal serialization, affirmative consent, capability truthfulness, baseline date guards, and readiness counting.
- **Backwards Compatibility:** Legacy `Onboarding` component cleanly replaced in `OfflineNavigator.tsx`.
- **Theme Support:** All 9 screens adhere strictly to the tokenized palette in `brandTokens.ts` supporting both light and dark themes.
