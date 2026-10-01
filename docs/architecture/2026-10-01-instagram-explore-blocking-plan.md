# Implementation Plan: Instagram Explore Tab Blocking

## 1. Requested Behavior or Problem
When a user enables Instagram's `ig_explore` in-app blocking option, entering the Explore tab must show the short-form restriction overlay. The first fix prevented generic Home chrome from masking Explore. The second fix prevents `clips_*` preview nodes from masking a positively selected Explore tab. Device testing then showed the selected-tab event can be followed by a root scan without selected state; direct event enforcement briefly creates the overlay, but the next ambiguous scan removes it. The service must retain the last confirmed Instagram bottom-tab selection until it receives a different tab-selection event.

## 2. Relevant Requirements
- `Restrainify_V1_Product_PRD.md` FR-SOC-003: the user must be able to choose restricted supported app features.
- `Restrainify_V1_Product_PRD.md` FR-SOC-004 and AC-04: supported target-feed restrictions must work demonstrably and fail visibly when an adapter no longer matches.
- `Restrainify_V1_Technical_PRD.md` Section 8.5: short-form controls use deterministic, versioned accessibility selectors.
- `AGENT.md` Sections 1.1, 3, 17, and 29: plan before code, targeted scope, behavior tests, and regression coverage.

## 3. Files Likely to Be Affected
- `apps/mobile/android/app/src/main/java/com/restrainify/protection/Policy.kt`: retain the pure classifier precedence fix for Explore and Reel-preview nodes.
- `apps/mobile/android/app/src/main/java/com/restrainify/protection/service/RestrictionService.kt`: immediately enforce a configured Explore restriction from Instagram's `search_tab` selection event rather than waiting for unreliable root-node selected state.
- `apps/mobile/android/app/src/test/java/com/restrainify/protection/PolicyTest.kt`: regression coverage for an Explore tab containing Instagram's currently emitted `clips_*` nodes.

## 4. Current Implementation Inspected
- `RestrictionService.onAccessibilityEvent()` receives Instagram `TYPE_VIEW_SELECTED` and `TYPE_VIEW_CLICKED` events but only requests a later generic re-evaluation.
- A connected TECNO KM6 device has Restrainify's accessibility service bound and Instagram focused. Its Explore screenshot remains visible after the classifier precedence fixes are installed.
- Restrainify's ADB logs show `com.instagram.android:id/search_tab` as a `TYPE_VIEW_SELECTED` event together with `clips_author_username`, `like_count`, `comment_count`, and `scrubber` events.
- The direct `search_tab` handler is invoked and triggers a Restrainify accessibility window event, proving the event is a reliable immediate enforcement signal.
- The generic tree inspector then derives no stable `isExploreTabSelected`, returns no block result, and removes the just-created short-form overlay. It needs a transient, in-memory confirmed-tab state to bridge the event and hierarchy scan.

## 5. Proposed Implementation
1. Keep the regression case for a selected Explore tab containing `clips_author_username`; it must classify as Explore, not Reels.
2. Track the last confirmed Instagram bottom-tab selection in `RestrictionService`, updating it from `search_tab`, Home, Reels, and Profile tab selection events only.
3. Pass the confirmed Explore selection into the root classifier until a different tab selection clears it. The generic enforcement then continues to return the existing Explore block result and preserves the displayed overlay.
4. Keep immediate `search_tab` enforcement so selection is blocked before the grid finishes rendering.
5. Build and install the debug APK on the connected device. Verify the Explore overlay remains visible in an ADB screenshot.

## 6. Important Edge Cases
- Retained or shared Home action-bar nodes must not suppress a positively selected Explore tab.
- Instagram's Explore grid can include `clips_*` content nodes; these must not turn Explore into Reels.
- The confirmed tab state is in-memory only and changes only on a bottom-tab selection event; no app activity, content, or user data is persisted.
- `search_tab` only causes an overlay for an enabled Instagram rule in experimental mode with `ig_explore` selected; all other Instagram sub-options preserve their current behavior.
- A selected Reels tab and a direct fullscreen Reels viewer still classify as Reels.
- DMs and foreground Story viewers retain their existing precedence and are not converted into Explore blocks.

## 7. Security and Privacy Impact
The change only changes local, on-device accessibility-tree classification. It adds no permissions, network traffic, persistent data, logging, or capture of user content.

## 8. Verification Plan
1. Run the focused Android regression test before the policy change to demonstrate the Explore-versus-Reels precedence defect.
2. Run `./gradlew :app:testDebugUnitTest --tests com.restrainify.protection.PolicyTest` after the change.
3. Run `./gradlew :app:installDebug`, use ADB to select Instagram Explore, and confirm the restriction overlay with a device screenshot.
