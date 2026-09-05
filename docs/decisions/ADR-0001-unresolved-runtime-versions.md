# ADR-0001: Runtime Versions Are Not Pinned Yet

## Status

Resolved by [ADR-0002](ADR-0002-runtime-stack.md) and [ADR-0003](ADR-0003-adopt-expo-tooling.md)

## Context

The technical PRD explicitly leaves exact Android, Gradle, Kotlin, React Native, Supabase, and dependency versions unresolved.

## Decision

The initial scaffold defines boundaries and package locations without committing production dependency versions.

## Consequences

Before dependency installation or generated project initialization, engineering must select and record:

- React Native version and initialization strategy.
- Android Gradle Plugin, Kotlin, Gradle, target SDK, and minimum SDK.
- Mobile-facing Supabase/client contract versions.
- State management and dependency injection approach.
