# Dependency Audit Notes

## 2026-09-05: Metro/image-size high-severity findings resolved

The 8 high-severity findings from 2026-09-03 (React Native 0.87.1 -> Metro -> `image-size`, `GHSA-w3rx-r6r6-pgpr`, `GHSA-5p2g-fcmc-qvqq`) are resolved by downgrading to `react-native@0.86.3` (see `docs/decisions/ADR-0003-adopt-expo-tooling.md`).

Remaining after the change:

- `npm audit` reports 10 moderate-severity findings, all in dev-only `@expo` configuration tooling (`@expo/prebuild-config`, `@expo/inline-modules` via `@expo/config`/`@expo/config-plugins`).
- These packages are dependencies of the `expo` CLI used for tooling; the bare workflow does not execute them at build or runtime.
- No high-severity findings remain. Recheck when Expo publishes patched `@expo/config-plugins` releases.

## 2026-09-03

`npm audit` reports 8 high-severity findings through React Native 0.87.1's Metro dependency chain:

- package: `image-size`
- advisories: `GHSA-w3rx-r6r6-pgpr`, `GHSA-5p2g-fcmc-qvqq`
- impact class: denial of service through image parser infinite loops
- path: React Native -> Metro -> image-size

`npm audit fix --force` proposes installing `react-native@0.86.3`, which would be a breaking downgrade from the accepted React Native 0.87 baseline.

Decision for now:

- Do not force-downgrade React Native during initial scaffold setup.
- Treat this as a release-blocking upstream dependency risk.
- Recheck after React Native/Metro publish a compatible patched chain.
- Avoid processing untrusted image files through Metro in production workflows.

Superseded on 2026-09-05 by the React Native 0.86.3 downgrade above.
