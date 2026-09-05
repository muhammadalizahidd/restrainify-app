# Dependency Audit Notes

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

