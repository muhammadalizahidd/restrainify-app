# Restrainify V1 Delivery Plan

## Requested behavior

Build the end-to-end Android-first V1 defined by the product and technical PRDs. The mobile client must let an adult user configure protection, understand its actual health, use recovery, Burst, daily rewards, optional tracking, settings, and an optional account/sync path without overstating unavailable protection.

## Requirements and repository state inspected

- `Restrainify_V1_Product_PRD.md`: onboarding, dashboard, protection configuration, recovery, Burst, reward, Fap Tracker, authentication, sync, and feature-oriented settings.
- `Restrainify_V1_Technical_PRD.md`: React Native presentation boundary; Kotlin owns protection state, foreground service, local data and bridge commands; no raw frames in storage or network; optional Supabase/Next.js sync.
- `AGENT.md`: plan before production changes, validation after each meaningful module, privacy/security, accessibility, truthful status.
- Existing mobile code currently contains only a dashboard prototype, typed contracts, and Kotlin placeholders. The repository does not contain the separate `restrainify.com` Next.js/API codebase, Supabase project credentials, model assets, or the exact unresolved policy values identified by the PRD.

## Delivery approach

1. Establish a typed local application domain: validation, durable local state, recovery calculations, daily reward idempotency, Burst lifecycle, tracker enablement, domain rules, app limits, and sync queue semantics.
2. Replace the prototype-only navigation with an accessible mobile flow: onboarding, home, protection, recovery, tracker, settings, account/sync and feature-specific forms. UI state will be driven by the local domain rather than fixture values.
3. Implement the Kotlin protection health/state model and React Native bridge boundary. It will report actual capability availability and never claim real web, visual, or UsageStats enforcement until Android setup and services confirm it.
4. Add the Android foreground-service lifecycle and required capability disclosures with denial/degraded paths. Do not implement raw screen persistence, cloud visual inference, fake person recognition, or prohibited uninstall trapping.
5. Add sync/auth adapters behind explicit environment configuration. Without the separate Next.js API repository and Supabase credentials, these will remain disconnected and visibly offline/configuration-required; local protection and data remain functional.
6. Replace the placeholder Supabase migration with owner-scoped schema and RLS-ready SQL that matches the shared sync envelope, while retaining it as an external deployment artifact.
7. Add focused deterministic tests for calculations, validation, persistence/retry rules, and truthful-state mapping. Run TypeScript, lint, and module-relevant tests after each completed module; do not start Metro, an emulator, or `npm run android` unless the user asks.

## Files and modules expected to change

- `packages/contracts`: dashboard, domain, settings, recovery, and sync contracts plus validation.
- `apps/mobile/src`: local data repository, native bridge adapter, application state provider, navigation and all V1 feature screens.
- `apps/mobile/android`: protection orchestrator, foreground service, bridge implementation, capability health and manifest configuration.
- `supabase/migrations`: user-owned tables, RLS policies, idempotent mutation records and deletion support.
- package manifests and lockfile only for required, maintained Expo-compatible dependencies.
- `docs`: privacy, architecture, setup and validation guidance as implementation makes the current placeholder documents stale.

## Important edge cases

- Cold start and foreground reconciliation must replace cached protection health with native health.
- Offline local updates must queue eligible sync mutations without duplication or data loss.
- A daily reward may be claimed once per local calendar day, even after app restart.
- Tracker events cannot be created while the tracker is disabled.
- A pending strict-mode weakening request can be cancelled and cannot take effect early.
- Burst cannot be represented as active after its native/local expiry.
- Invalid, duplicate, or malformed custom domains and mutations are rejected locally before persistence.
- Permission denial, missing service, unavailable native capability, missing backend configuration, and sync errors surface as degraded/configuration-required states.

## Security, privacy, compatibility, lifecycle, and battery

- No raw screenshots, frames, URLs with paths/queries, tokens, or recovery notes are logged or placed in sync payloads beyond user-approved recovery data.
- Native visual functionality remains a capability boundary; it will not be simulated as active.
- Auth configuration must come from environment variables; no credentials are committed.
- Android service work is event-driven and user-visible. No polling or visual inference loop will run in React Native.
- Existing local data requires a versioned migration path. External schema changes preserve user ownership and RLS.

## Verification

- Unit tests: recovery metrics, reward/day rules, Burst, tracker gating, settings/domain validation, sync idempotency and merge rules.
- Static checks: TypeScript and ESLint after each module.
- Native checks: Kotlin/Gradle compilation when the Android implementation changes, performed only on user request to run Android builds.
- Manual device validation remains required for Android permissions, accessibility, usage access, MediaProjection/VPN behavior, lifecycle, OEM battery behavior, visual latency, and Play-policy release review.
