# Validation Strategy

The source technical PRD contains a testing and observability gap, so this document is a starting strategy rather than a canonical release matrix.

## Required Validation Areas

- Security validation.
- Privacy validation.
- Offline/online behavior.
- Sync idempotency and conflict handling.
- Android lifecycle and reboot behavior.
- OEM battery/service survival behavior.
- Visual-filter latency and false-positive measurement.
- App limits across date, reboot, and timezone changes.
- Accessibility, MediaProjection, VPN, notification, and Google Play policy review before release.

## Scaffold Verification

Until feature tests exist, `npm test` is configured to pass with no tests. Add focused tests with the first behavior-bearing implementation.
