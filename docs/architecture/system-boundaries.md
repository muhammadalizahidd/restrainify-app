# System Boundaries

## React Native

Owns presentation, navigation, form state, auth screens, settings screens, dashboard rendering, recovery screens, sync status display, and native bridge calls.

Must not own Android protection truth, screen capture, native service lifecycle, or direct Room database access.

## Kotlin Protection Runtime

Owns the Protection Orchestrator, Accessibility, MediaProjection fallback, visual ML scheduling, overlays, website filtering, UsageStats, app limits, foreground service lifecycle, Room repositories, sync worker integration, and native health state.

## Room + SQLCipher

Owns local operational data: settings, blocklists, aggregate counters, recovery events, Fap Tracker events, model metadata, and sync queue.

It must not store raw screenshots, raw frames, or full browsing histories.

## Web Repository

The public website, auth surfaces, API routes, request validation, user authorization, sync orchestration, account deletion workflow, and model metadata route live in the separate `restrainify.com` repository.

That backend must not participate in real-time enforcement or receive visual frame payloads.

## Supabase

Owns authentication and user-scoped PostgreSQL persistence with Row Level Security.
