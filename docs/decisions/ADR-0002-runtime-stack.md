# ADR-0002: Initial Runtime Stack

## Status

Superseded by [ADR-0003](ADR-0003-adopt-expo-tooling.md) (2026-09-05)

## Date

2026-09-03

## Context

The technical PRD leaves exact dependency versions unresolved. The project now needs an executable baseline while preserving the PRD architecture:

- Android-first mobile app.
- React Native presentation layer.
- Kotlin native protection runtime.
- External `restrainify.com` web/API boundary.
- Supabase Auth and PostgreSQL.
- Local-first/offline-first operation.

Current version checks used:

- React Native release documentation lists 0.87.x as active and recommends the stable `latest` channel for production apps.
- React Native 0.87 release notes require Node.js >= 22.13.0, Kotlin 2.0+, AGP 9 support, and compile SDK 37.
- Android Developers AGP documentation shows AGP 9.4.0 and Gradle 9.6.0 compatibility, but React Native 0.87 specifically documents AGP 9 adoption guidance.
- npm registry metadata returned React Native 0.87.1, React 19.2.8, TypeScript 7.0.2, and Phosphor React Native 3.0.6.
- TypeScript 7.0.2 was rejected for this baseline because `typescript-eslint` 8.42.0 supports TypeScript `<6.0.0`; use the newest TypeScript 5.x line instead.

## Decision

Use this initial stack:

| Area | Version / Choice |
| --- | --- |
| Node.js | >= 22.13.0 |
| npm | >= 10.9.0 |
| TypeScript | 5.9.3 |
| React Native | 0.87.1 |
| React / React DOM | 19.2.8 |
| Android Gradle Plugin | 9.0.1 for RN compatibility first, with ADR review before moving to 9.4.x |
| Gradle | 9.4.1 |
| Kotlin | 2.2.0 |
| compile SDK | 37 |
| min SDK | 26, provisional |
| target SDK | 37, provisional pending release-policy review |
| Icons | Phosphor later, when the first icon UI is implemented |
| ESLint | 10.0.1 |
| State management | React state/context initially; add a library only when a feature requires it |
| Dependency injection | Manual composition initially; revisit for native modules after Kotlin runtime grows |

## Rationale

React Native 0.87.1 is the current active stable mobile baseline and aligns with the technical PRD's React Native New Architecture direction. AGP 9.0.1 is selected over newer AGP 9.4.x for the first Android skeleton because React Native 0.87 release notes call out AGP 9 migration behavior and opt-out flags; upgrading AGP can be a later dedicated Android build decision.

The provisional Android SDK choices must be revalidated before production. The product PRD explicitly leaves the Android device/version matrix unresolved.

## Consequences

- All dependency versions are pinned; no dynamic version ranges for production dependencies.
- The first executable milestone can focus on `getProtectionHealth()` and native/UI reconciliation.
- Android policy, target SDK, permission, foreground-service, VPN, Accessibility, and MediaProjection requirements remain release gates.
- `restrainify.com` brand colors remain unverified and must be extracted before final UI implementation.
- React Native 0.87.1 currently carries a Metro/image-size audit finding; see `docs/security/dependency-audit.md`.
- React Native's packaged ESLint config and `eslint-config-next` were not added because their transitive lint plugins currently conflict with ESLint 10. The root flat ESLint config is the project lint source of truth.

## References

- React Native releases: https://reactnative.dev/releases/
- React Native 0.87 release notes: https://reactnative.dev/blog/2026/08/11/react-native-0.87
- Android Gradle Plugin releases: https://developer.android.com/build/releases/about-agp
- Supabase JavaScript docs: https://supabase.com/docs/reference/javascript/introduction
