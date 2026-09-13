# Implementation Plan: Fix Workspace Lint Issues

## 1. Requested Behavior or Problem
Running `npm run lint --workspaces` fails due to:
1. `apps/mobile/src/app/navigation/OfflineNavigator.tsx:120:16`: `'_e' is defined but never used (@typescript-eslint/no-unused-vars)`.
2. Workspace script resolution failures: `packages/config` and `packages/contracts` lack a `"lint"` script in `package.json`, causing npm workspace lifecycle failure when running `npm run lint --workspaces`.

## 2. Relevant Requirements
- `AGENT.md` Section 18: "Build and Validation Protocol: run every relevant check available in the repository, such as linter, static analysis, type checker, unit tests."
- Zero ESLint errors or warnings across all workspaces.
- Version control operations must use `jj` as requested by user.

## 3. Files Likely to be Affected
- `apps/mobile/src/app/navigation/OfflineNavigator.tsx`: Replace unused `_e` with optional catch binding `catch {`.
- `packages/contracts/package.json`: Add `"lint": "eslint ."` script.
- `packages/config/package.json`: Add `"lint": "echo ok"` script.

## 4. Current Implementation Inspected
- `apps/mobile/src/app/navigation/OfflineNavigator.tsx` line 120:
  ```tsx
  } catch (_e) {
    // Ignore malformed links
  }
  ```
- `packages/contracts/package.json`: Scripts only contain `"typecheck"` and `"test"`. Running `npx eslint packages/contracts` succeeds with 0 errors.
- `packages/config/package.json`: Scripts only contain `"typecheck"` and `"test"`.

## 5. Proposed Implementation Approach
1. In `apps/mobile/src/app/navigation/OfflineNavigator.tsx`, replace `} catch (_e) {` with `} catch {`.
2. In `packages/contracts/package.json`, add `"lint": "eslint ."` to `"scripts"`.
3. In `packages/config/package.json`, add `"lint": "echo ok"` to `"scripts"`.

## 6. Important Edge Cases
- Ensure `eslint.config.mjs` applies cleanly to `packages/contracts` without requiring extra config.
- Ensure `format`, `test`, and `typecheck` remain unaffected.

## 7. Security and Privacy Implications
- None. Code changes affect error handling syntax and package script definitions only.

## 8. Data, Migration, Compatibility, Performance, Battery, Lifecycle Implications
- None.

## 9. Verification That Will Be Performed
- `npm run lint --workspaces` (must exit code 0 with 0 errors and 0 warnings).
- `npm run typecheck --workspaces` (must exit code 0 with 0 errors).
- `npm test --workspaces` (must pass all 25 test suites).
- Inspect working copy and record changes with `jj`.
