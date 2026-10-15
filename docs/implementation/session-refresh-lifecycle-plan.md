# Session refresh lifecycle repair plan

## Problem

The mobile app can route refresh requests to an emulator-only fallback, refreshes only on the initial `AuthProvider` mount, and sends cached access tokens to protected sync and coin endpoints without first ensuring they are current. A successful refresh may also be lost after a secure-storage write error.

## Requirements and scope

- Keep Supabase refresh tokens in `expo-secure-store`; never log token values.
- Preserve offline local protection and queued local mutations when the network is unavailable.
- Use the existing Next.js `POST /api/auth/refresh` contract; no direct mobile Supabase client or API contract changes.
- Refresh credentials before expiry while the app is active, when the app returns to foreground, and before protected mobile API work.
- Keep the change within the mobile app plus its environment documentation and context record.

## Affected files

- `apps/mobile/src/features/auth/api/authApi.ts`: safe production API default.
- `apps/mobile/src/features/auth/context/AuthContext.tsx`: authoritative session lifecycle, serialized refresh, scheduling, foreground handling, and an access-token accessor for protected work.
- `apps/mobile/src/features/auth/storage/authStorage.ts`: propagate token-persistence failures so rotated tokens are not treated as safely stored when they are not.
- `apps/mobile/src/features/sync/context/SyncContext.tsx` and `apps/mobile/src/features/dashboard/screens/OfflineHome.tsx`: obtain a current token before protected API calls.
- `apps/mobile/src/features/auth/services/sessionRefresh.ts` and tests: deterministic expiry policy and single-flight refresh behavior.
- `.env.example`, `README.md`, and `CURRENT_CONTEXT.md`: document the required public build variables and remove stale statements.

## Design

1. Use `https://restrainify.com` as the compiled fallback API origin. Development and staging override it through `EXPO_PUBLIC_API_URL`.
2. Treat a missing `expiresAt` as refresh-required, preserving compatibility with older stored sessions that do not contain expiry metadata.
3. Keep one in-flight refresh promise. Callers that need an expiring session await that promise rather than rotating the same Supabase refresh token concurrently.
4. Persist the returned complete `MobileSession` before publishing it to React state. If persistence fails, retain the prior stored token/session and surface no false success.
5. Use a one-shot timer for the five-minute pre-expiry boundary only while the app is active. Re-evaluate when Android returns to the foreground. No polling or background wake loop.
6. Expose a `getAccessToken()` context method. It returns a non-expiring access token or `null` after a failed refresh; sync and coins then avoid knowingly sending a stale bearer token.

## Edge cases

- Offline at refresh time: keep cached identity/local protection and mutation queue; do not send a known-stale bearer token.
- Logout, account deletion, and a new sign-in while a refresh is in flight: stale refresh results cannot replace the newer session.
- Refresh-token rotation: all concurrent consumers receive the same replacement session, which is written before publication.
- Missing or expired stored expiry metadata: refresh before any authenticated network action.

## Security and privacy review

The change retains tokens only in `expo-secure-store`, preserves the existing server-side refresh validation, adds no credentials, and logs only generic failure messages. The API origin is public configuration, not a secret. No user data, token values, or sensitive local content is included in the new control flow.

## Verification

- Add deterministic unit coverage for expiry decisions and single-flight refresh/persist ordering.
- Run focused auth, sync, and coins Jest suites.
- Run mobile TypeScript and lint checks.
- Execute a deterministic smoke scenario through the session-refresh helper, including token rotation and a concurrent caller.
