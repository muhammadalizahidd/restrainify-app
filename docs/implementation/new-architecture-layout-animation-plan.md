# New Architecture layout-animation compatibility plan

## Problem

React Native's `UIManager.setLayoutAnimationEnabledExperimental` is a no-op in the New Architecture and logs a warning every time Restrainify enables it. The app uses the New Architecture (`BuildConfig.IS_NEW_ARCHITECTURE_ENABLED`), so the legacy Android opt-in has no effect.

## Scope

- Remove only the two obsolete opt-in calls from `OfflineUI.tsx` and `ShortFormModal.tsx`.
- Retain `LayoutAnimation.configureNext`; it remains the code that defines the transitions.
- Remove imports that become unused.
- Do not alter animation timing, reduce-motion behavior, or platform-specific keyboard handling.

## Verification

- Typecheck the mobile workspace.
- Run the mobile Jest suite.
- Confirm no `setLayoutAnimationEnabledExperimental` call remains under `apps/mobile/src`.
