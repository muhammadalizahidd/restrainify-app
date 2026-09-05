# Restrainify Mobile App

Android-first Restrainify V1 implementation workspace.

This repository is intentionally scaffolded around the approved source documents:

- `AGENT.md`
- `DESIGN.md`
- `Restrainify_V1_Product_PRD.md`
- `Restrainify_V1_Technical_PRD.md`

Every implementation task must read those documents first. They define the mandatory product behavior, technical boundaries, privacy constraints, and UI rules.

## Architecture

```text
apps/
  mobile/          React Native presentation layer and native bridge contracts
packages/
  contracts/       Shared TypeScript contracts for sync, health, and API payloads
  config/          Shared lint, TypeScript, and environment conventions
supabase/
  migrations/      PostgreSQL/RLS migrations
docs/
  architecture/    Implementation plans and system notes
  decisions/       Architecture decision records for unresolved PRD choices
  security/        Threat model and privacy notes
  testing/         Validation strategy and release gates
```

## Non-Negotiable Invariants

- Real-time protection decisions stay on-device.
- React Native never owns protection truth.
- Kotlin owns Android protection runtime, Room access, service lifecycle, UsageStats, Accessibility, VPN/DNS filtering, and visual ML scheduling.
- Cloud sync never sits in the real-time protection path.
- Raw screen frames are never persisted or uploaded.
- The product must not claim absolute uninstall prevention.
- UI state must reconcile from native truth on app foreground.

## Web Ownership

The public website, web auth surfaces, and web/API backend live in the separate `restrainify.com` repository. This repository owns the Android mobile app and shared mobile-facing contracts only.

## Brand Token Gate

`DESIGN.md` requires extracting exact colors from `restrainify.com` before visual implementation. The live site could not be inspected from this environment during scaffold creation, so the mobile design token file contains temporary values and a release-blocking note. Replace those values with verified production website tokens before implementing final UI styling.

## Getting Started

The initial runtime stack is recorded in `docs/decisions/ADR-0002-runtime-stack.md`.

```bash
npm install
npm run check
```

On Windows PowerShell in this local environment, the bare `npm` shim may point at a broken roaming profile path. Use `C:\Program Files\nodejs\npm.cmd` directly if that happens.
