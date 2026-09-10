# ADR-0007: Domain 1 Completion Architecture (Website Protection, Visual Protection, Strict Mode, and Account & Profile)

## Status

Accepted

## Date

2026-09-10

## Context

Domain 1 ("Home Page & Associated Drill-Downs") is the foundational operational surface of Restrainify. The Home screen (`MAIN-01`) acts as the anchor from which every primary protection subsystem and user configuration is directly accessible.

With Steps 0 through 6 complete (`MAIN-01`, `TOOL-02`, `BURST-01`, `BURST-02`, `PROG-02`, `PROG-03`, `PROG-04`), the final four screens complete Domain 1:
1. `SET-WEB-01` **Website Protection**: Quick Card 1 on Home (`Web filter · Blocks triggers`). Provides granular control over local DNS VPN routing, Cloudflare Families upstream filtering, adult domain blocking, SafeSearch enforcement, and custom domain overrides.
2. `SET-VIS-01` **Visual Protection**: Quick Card 2 on Home (`Visual AI · Local blur`). Manages on-device explicit and suggestive visual blur, person blur mode selection (`off`, `blur_women`, `blur_men`, `blur_everyone`), protected app context selection, and strict privacy guarantees.
3. `SET-STRICT-01` **Strict Mode & Anti-Bypass**: Quick Card 3 on Home (`Strict lock · Anti-bypass`). Implements disable friction and weakening cooldowns with truthful, policy-compliant terminology (strictly avoiding impossible adult Android uninstall-prevention claims).
4. `SET-ACCOUNT-01` **Account & Profile**: Top right avatar button on Home. Manages authenticated session overview, security credentials, logout, and account deletion, emphasizing that local protection continues uninterrupted during transient network or authentication outages.

## Decision

We implement these four screens using a **unified native-mapped design token architecture**:

### 1. Direct Native Backend Function Mapping
- **Website Protection (`SET-WEB-01`)**:
  - Bound to `snapshot.settings.websiteEnabled` and `snapshot.settings.dnsMode` (`"vpn" | "private"`).
  - Interacts with native `offlineProtection.startVpn()` and `stopVpn()`, which command `DnsVpnService` on Android.
  - Toggles SafeSearch and Proxy resistance, and reports custom domain rules count (`snapshot.settings.domains.length`).
- **Visual Protection (`SET-VIS-01`)**:
  - Reads `snapshot.capabilities.accessibility` and `snapshot.settings.accessibilityConsent`.
  - Implements the 4-mode segmented person blur selector aligned with `PersonBlurMode` from `@restrainify/contracts`.
  - Enforces the documented privacy boundary: 100% on-device inference, zero frame retention, zero screenshot history.
- **Strict Mode (`SET-STRICT-01`)**:
  - Bound to `snapshot.settings.strictMinutes` and `snapshot.strictRemainingMs`.
  - Commands native `command("strict")` and `command("setting", { key: "strictMinutes", value })`.
  - Adheres to `assertCanWeaken()` invariant: configuration changes to weaken protection are blocked while cooldown is active.
- **Account & Profile (`SET-ACCOUNT-01`)**:
  - Shows authenticated local user identity with avatar initial.
  - Exposes session status and credential management.
  - Reassures user that local SQLite/SQLCipher protection operates independently of cloud connectivity.

### 2. Design System Alignment (`DESIGN.md`)
- Space Grotesk typography, subtle borders (`borderSubtle`), and neutral card surfaces.
- High-contrast trust blue `#254C91` and `#316FCB` for active selections.
- Green `#1F6B4B` / `successSurface` for active protection and `Current` badges.
- Amber `#9A681F` / `warning` for action-required notices.
- Red `#B64E55` / `dangerSurface` strictly reserved for destructive account actions.
- Zero em dashes (`—`) across all UI strings and labels.

### 3. Navigation Stack Integration
- `QuickProtectionGrid.tsx` maps:
  - Card 1 -> `"website-protection"`
  - Card 2 -> `"visual-protection"`
  - Card 3 -> `"strict-mode"`
- `OfflineHome.tsx` avatar button maps to `"account"`.
- `OfflineNavigator.tsx` registers all four sub-screens with in-screen back navigation returning cleanly to Home.

## Consequences

- Domain 1 reaches 100% completion (11 of 11 screens).
- Overall Restrainify V1 screen implementation reaches 23.4% (11 of 47 screens).
- Every widget and metric card on the Home Screen has a fully functioning, native-backed drill-down screen.
