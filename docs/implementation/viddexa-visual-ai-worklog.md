# Viddexa Visual AI Work Log

## Status

In progress — Viddexa is integrated; the next experiment adds the official GantMan MobileNetV2 TFLite model and replaces one-model blocking with strict two-model top-class consensus.

## Dual-model implementation plan (2026-09-13)

### Requested behavior

Run Viddexa and GantMan/NSFWJS MobileNetV2 against the same transient Android frame. Block only when both models independently have a sexual top class (`SEXY`, `PORN`, or `HENTAI`), without requiring category equality. Preserve both raw distributions and timings in local development diagnostics.

### Updated decision rule (2026-09-13)

The user superseded the initial consensus rule: a block now requires an exact matching sexual top category from both models. `SEXY + SEXY`, `PORN + PORN`, and `HENTAI + HENTAI` block. Every mixed pair, including `SEXY + PORN`, allows. The system-wide diagnostics continue to show both top categories and votes so this stricter experiment can be assessed.

## Accessibility startup crash fix plan (2026-09-13)

### Problem

Enabling the AccessibilityService starts a separate `ProtectionForegroundService` declared as `systemExempted`. On target SDK 36 Android rejects that foreground-service type unless the caller also qualifies through exact-alarm or VPN permissions, so the service crashes before Visual AI can report active.

### Fix and verification

- Remove the unused separate foreground service and its calls from the AccessibilityService lifecycle. The bound `AccessibilityService` remains the owner of restrictions and Visual AI; no exact-alarm permission is requested or implied.
- Keep the distinct VPN foreground-service declaration untouched because it has a separate lifecycle and platform role.
- Build the Android app after the change; physical device confirmation remains required because accessibility enablement is platform-controlled.

## Visual AI status diagnosis plan (2026-09-13)

### Problem

The Visual Protection page reports only “Visual AI is off.” That combines three independent prerequisites: Android Accessibility being connected, the user’s explicit in-app Accessibility consent, and the `visualAiEnabled` sampling setting. It makes a correctly enabled Android service appear broken.

### Evidence and change

- Android diagnostics confirm `com.restrainify/.protection.service.RestrictionService` is enabled, bound, and running on the connected device while Instagram is foreground. Overlay permission is not a prerequisite because the implementation uses Accessibility overlays.
- Replace the ambiguous banner with the exact missing prerequisite. Do not infer consent from Android’s permission: the user must still explicitly accept the on-device-processing disclosure.
- The current Settings hub has no "Protection setup" route. Users who completed onboarding without visual consent have no in-app way to grant that consent. Add the explicit, privacy-preserving consent switch to the Visual Protection screen itself and make the Settings hub badge reflect the actual three-prerequisite state.
- Verify TypeScript type checking. Native device behavior remains a user-run check.

## Short-form master switch plan (2026-09-13)

### Requested behavior

Provide a persistent option to turn off short-form content blocking.

### Approach and boundaries

- Add a default-on `shortFormBlockingEnabled` configuration setting, expose it through the native snapshot, and bind the Short-form protection switch to it.
- Gate only feed-specific (`experimental`) Reels/Shorts detection. Daily limits, schedules, Burst, and explicit whole-app restrictions remain independent so turning off content detection cannot silently weaken unrelated protections.
- Update the Settings hub badge to reflect the master switch, and type-check the TypeScript client.

## Per-reel reveal pause plan (2026-09-13)

### Requested behavior

After a user selects "Show Reel," stop capture and inference for that revealed reel until an actual scroll or app/window transition. A single dual-model final `BLOCK` decision must remain sufficient to cover a reel immediately.

### Inspected behavior and approach

- `DualModelDecisionEngine` already returns `BLOCK` from one same-frame exact-category consensus; there is no current two-frame temporal gate.
- `ContentInstanceTracker` retains the reveal exception but the sampler continues running, wasting work and updating diagnostics after reveal.
- Add a service-local reveal-pause flag. Suppress new captures, scheduled samples, queued capture results, and late inference callbacks while paused. Clear it only for a scroll or genuine app/window transition; retain the existing material-frame confirmation before clearing a content latch.
- Do not change the exact-category consensus rule without confirmation: treating any two sexual votes as a block would override the user’s prior `Sexy+Porn` allow policy and may increase false positives.

## NSFWJS Porn fast-path plan (2026-09-13)

### Requested behavior

Block immediately whenever the NSFWJS MobileNetV2 model's highest-probability class is `PORN`, regardless of the Viddexa prediction.

### Approach and verification

- Preserve exact same-category consensus for every non-Porn NSFWJS result.
- Record an explicit `nsfwJsPornOverride` decision reason in diagnostics so `BLOCK` without a matching category is not misleading during calibration.
- Update JVM unit coverage for the override and its non-Porn boundary. Run TypeScript checking and Kotlin compilation if Gradle's external file lock allows it.

## NSFWJS Porn fast-path removal plan (2026-09-13)

### Problem and fix

Live calibration found NSFWJS-only Porn predictions produce false positives. Remove that override and its diagnostic field, restoring the prior exact same-category two-model consensus for every category. Restore mixed-vote regression coverage and type-check the client.

## NSFWJS Porn 3-of-5 gate plan (2026-09-13)

### Requested behavior

Block the current reel when NSFWJS reports `PORN` on at least three of its latest five analyzed frames. This is a replacement for the removed one-frame NSFWJS override.

### Approach and boundaries

- Keep the exact same-category dual-model result as an immediate independent block path.
- Add a bounded in-memory, per-content five-frame gate. It records only NSFWJS top categories, never pixels or probabilities, and resets on a confirmed reel/app transition or service shutdown.
- Surface the 3-of-5 trigger as an explicit decision reason in local diagnostics. Keep Show Reel's pause behavior intact.
- Add deterministic unit cases for below-threshold, threshold, rolling-window eviction, and reset behavior; type-check TypeScript and attempt native verification without downloading anything.

## Porn/Sexy overlap and continuous sampling plan (2026-09-13)

### Requested behavior

Add a second per-reel block condition: two of the latest five analyzed frames have both model top classes in `{PORN, SEXY}` (including a mixed Porn + Sexy pair). Once either classifier reports any sexual category for a reel, continuously feed the bounded worker the newest available frames until a confirmed reel/app transition.

### Approach and boundaries

- Add a separate in-memory 2-of-5 Porn/Sexy overlap gate alongside the NSFWJS Porn 3-of-5 gate. Exact same-category consensus remains immediate.
- Do not queue stale frames: suspicious mode removes normal duplicate/throttle skipping and requests captures at a bounded 150 ms cadence, while the existing one-slot worker always replaces pending work with the latest frame.
- Reset both gates and suspicious mode on the existing accessibility scroll/window navigation signal or service shutdown. This avoids mixing evidence from separate reels; a comment-panel scroll merely restarts evidence collection for the same reel. Show both gates in local diagnostics.
- Add pure Kotlin tests for overlap threshold/reset and run available static checks without downloads.

## Exact-consensus temporal confirmation plan (2026-09-13)

### Requested behavior

Require two frames of exact same-category sexual consensus (`SEXY+SEXY`, `PORN+PORN`, or `HENTAI+HENTAI`) before blocking, rather than blocking from a single frame.

### Approach and verification

- Add an independent per-reel 2-of-5 exact-consensus gate and remove the direct one-frame block branch from the effective pipeline decision.
- Keep the existing NSFWJS Porn 3-of-5 and Porn/Sexy overlap 2-of-5 gates unchanged.
- Record the exact-consensus gate count in diagnostics and add unit cases for threshold/reset. Run TypeScript checking and native tests when the external Gradle lock permits.

## Capture-diagnostic flicker fix plan (2026-09-13)

### Problem

The passive score overlay replaces valid results with transient `takeScreenshotOfWindow` failures even when neighboring frames are captured and classified successfully. The continuous latest-frame mode increases the visibility of those normal Android capture races.

### Fix and verification

- Keep the last valid diagnostic visible. Count capture failures and surface a capture error only after three consecutive failures with no successful capture for two seconds.
- Reset that counter on each successful capture and lower suspicious-mode capture cadence from 150 ms to 200 ms while retaining the latest-frame-only queue behavior.
- Type-check the client and attempt Kotlin compilation without downloading dependencies.

## Hentai exact-consensus threshold plan (2026-09-13)

### Requested behavior

Keep exact `SEXY + SEXY` and `PORN + PORN` confirmation at two of the latest five frames, but require three of the latest five exact `HENTAI + HENTAI` frames before blocking.

### Approach and verification

- Make the exact-consensus gate threshold category-specific without changing the independent NSFWJS Porn or Porn/Sexy overlap gates.
- Add a pure Kotlin regression test proving two Hentai confirmations allow and the third blocks.
- Run the existing TypeScript static check and diff validation; native Gradle verification remains dependent on the external lock being released.

### Inspected system and model choice

- The existing native Kotlin pipeline has one bounded latest-frame worker, Viddexa ONNX Runtime inference, an accessibility screenshot source, an in-memory content latch, and a system-wide diagnostic overlay.
- The official GantMan v1.1.0 MobileNetV2 release includes an Android-ready 224x224 float TFLite artifact. Using that direct artifact avoids TFJS on the React Native bridge and avoids an unverified conversion.
- Its source ordering is `drawings, hentai, neutral, porn, sexy`; `neutral` will map to the shared `NORMAL` internal category.

### Change set

1. Add a shared `ContentCategory` and full `ClassifierResult`, retaining all five scores and inference time for both classifiers.
2. Add a Kotlin TFLite MobileNetV2 classifier with its own documented NHWC/RGB/[0,1] preprocessing and deterministic resource cleanup.
3. Replace the Viddexa-only pipeline callback with a same-frame dual-inference result. Start sequentially in the bounded worker: this is safer for a background accessibility service and produces an honest combined latency. No additional screenshots or queues.
4. Add a small replaceable `ContentDecisionStrategy`; select consensus/AND as the only enabled strategy. It will use each model's top category, with no arbitrary probability threshold.
5. Extend native and React Native diagnostics plus the system overlay to expose both score distributions, both votes, final decision, individual timing, and combined timing. Never expose pixels.
6. Update the blocker to consume the fusion result and retain the existing per-content reveal/latch behavior.
7. Add pure Kotlin tests for every specified mixed-category fusion acceptance case; run type checking, relevant Kotlin tests, and compile once local Gradle artifacts are available.

### Privacy, performance, and lifecycle

- Frames remain in memory only and are copied once for bounded work. Both classifiers receive the same sampled frame.
- No frames, model inputs, or scores leave the device; no screenshots are written to disk.
- The existing static-frame and retry/watchdog behavior remains the owner of capture cadence. A single worker prevents queue growth and unbounded concurrent ML memory.
- The TFLite interpreter and model buffer will close with the existing pipeline lifecycle.

### Required local artifact before code can be completed

- `nsfw_mobilenet_v2_140_224.zip` from GantMan's official v1.1.0 release, containing `saved_model.tflite`. This must be placed as `apps/mobile/android/app/src/main/assets/models/nsfw_mobilenet_v2_140_224.tflite`.

## Implementation plan (2026-09-13)

### Requested behavior

Run Viddexa NSFW Detection 2 Nano locally against Android screen frames. Surface its five raw class probabilities and latency while preserving a clean route to a future, non-touchable reel-cover overlay.

### Inspected system

- Expo prebuild React Native application, Android min SDK 26 / target SDK 36.
- `RestrictionService` is the existing `AccessibilityService` and owns trusted accessibility overlays.
- There is no capture implementation, model asset, ONNX Runtime dependency, or visual classifier yet.
- The existing visual package is a TFLite-oriented placeholder only; it does not persist frames.
- Native protection state and settings live in `OfflineRuntime`; React Native receives only lightweight state through `ProtectionBridgeModule`.

### Change set

1. Add native visual-AI data types, a single-frame-source abstraction, duplicate-frame fingerprinting, bounded latest-frame sampling, and a future threshold-free decision boundary.
2. Add `ViddexaClassifier` with explicit preprocessing and ONNX Runtime lifecycle ownership. Do not add a detection threshold or send frames across the React Native bridge.
3. Add Android 14+ accessibility-window capture capability metadata and a capture-source boundary, retaining a documented MediaProjection fallback seam.
4. Wire visual sampling only when an eligible foreground context and user-enabled visual protection are present; expose aggregate diagnostics, never pixels.
5. Add focused JVM/unit coverage where dependency-free; add model parity tooling and model-install documentation.
6. Add the pinned ONNX Runtime Android dependency and model asset location. The actual model download/export will be a user-run step because it can be a substantial download.
7. Add a non-touchable, system-wide development score overlay and implement the non-touchable full-screen sensitive-content cover.
8. Apply the user-approved V1 policy: block when `Sexy`, `Porn`, or `Hentai` is the highest-probability class; allow `Normal` and `Drawing`. Support a one-content “Show Reel” exception through a separate small touchable window.
9. Replace event-only capture with bounded continuous sampling, periodically re-evaluate static frames, latch a blocked reel until an explicit scroll/content transition or scoped reveal, and use temporal consensus rather than a single frame for blocking.

### Edge cases and safeguards

- Ignore stale frames while inference is running; retain at most the newest frame.
- Skip duplicate frames using a non-reversible in-memory fingerprint.
- Close screenshots, hardware buffers, tensors, results, and sessions deterministically.
- Handle secure/unsupported/invalid-window capture as a degraded condition rather than crashing.
- Android 14+ target-window capture is implemented. Pre-Android-14 is intentionally reported as unavailable in this milestone because the repository had no existing MediaProjection consent/service pipeline; it will not flash a blocker or claim coverage.
- Never persist, log, upload, or bridge captured pixels.
- Do not show a blocker from model scores in this milestone; no threshold is selected.
- A future visual cover must use a separate `FLAG_NOT_TOUCHABLE` accessibility overlay so feed scrolling passes through.

### Verification planned

- TypeScript lint/type/test commands already defined by the workspace.
- Android compile/unit test once required Gradle artifacts are present locally; if Gradle must download them, ask the user before running it.
- Python PyTorch-vs-ONNX parity utility after the user supplies the model/export environment and a test image.
- No visual/device verification will be claimed because it requires a physical-device check.

## Completed work

- 2026-09-13: Inspected the prompt, Android build files, manifest, existing accessibility service, privacy boundary, React Native bridge, visual-protection UI, technical PRD, and enforcement overlay ADR.
- 2026-09-13: Recorded this plan before production-code changes.
- 2026-09-13: Added the native visual-AI seams: transient frame source, Android 14+ accessibility-window capture source, non-reversible duplicate-frame fingerprint, bounded latest-frame sampler, raw Viddexa score contract, threshold-free decision engine, and ONNX classifier lifecycle.
- 2026-09-13: Wired raw-score diagnostics into the existing accessibility service and Visual Protection screen. No overlay is controlled by model output.
- 2026-09-13: Added Viddexa settings (`visualAiEnabled`, `allowShowReel`) to the encrypted local configuration and declared Android accessibility screenshot capability.
- 2026-09-13: Added the pinned ONNX Runtime Android 1.29.0 declaration and the reproducible `tools/export_viddexa.py` export/parity utility.
- 2026-09-13: TypeScript mobile typecheck passed with the workspace-local TypeScript binary.
- 2026-09-13: Exported the Viddexa ONNX asset (16,073,015 bytes) from the official Hugging Face model. The export manifest captures its actual contract: RGB nearest-neighbor resize to 224×224, no center crop, rescale `1/255`, mean `[0.485, 0.456, 0.406]`, and standard deviation `[0.47853944, 0.4732864, 0.47434163]`.
- 2026-09-13: Verified PyTorch-to-ONNX probability parity on a local image: maximum absolute difference `0.0000012517` (passing the `0.0001` guard).
- 2026-09-13: Android `:app:compileDebugKotlin` passed after resolving the ONNX Runtime result accessor and RGB float conversion.
- 2026-09-13: Added a safe configuration migration for new Visual AI settings and explicit future contracts for the pass-through blocker, reveal control, and single-content reveal override.
- 2026-09-13: Scope expanded to show score diagnostics over the protected app during live testing and to implement the passive accessibility blocker window without selecting production thresholds.
- 2026-09-13: User approved top-class blocking for Sexy, Porn, and Hentai; implementation now wires the policy to the blocker and scoped reveal control.
- 2026-09-13: Automatic blocking temporarily disabled by default for score calibration after live testing showed excessive blocking. The passive system-wide score overlay remains active.
- 2026-09-13: Live testing reported skipped static posts and cover flicker/unblocking. Scope expanded to continuous frame scheduling, static-frame probes, temporal decision consensus, and a per-reel block latch.
- 2026-09-13: Live testing reported sampler dropouts. Diagnose and harden active visual-context ownership so unrelated accessibility events do not replace a supported foreground window.
- 2026-09-13: Live testing reported missed sexual reels and covers clearing during ordinary interaction. Reworked the temporal gate to two of the latest three sexual top-class samples (with a high-confidence explicit fast path), made scroll events candidate transitions rather than immediate unblocks, require a materially different frame before clearing a reel latch, and added a two-second capture watchdog/retry path.
- 2026-09-13: User installed the official GantMan v1.1.0 MobileNetV2 TFLite asset at the planned Android asset path; verified the copied 24,414,436-byte asset exactly matches the extracted source.
- 2026-09-13: Added the native TFLite MobileNetV2 classifier, a shared five-category result contract, strict replaceable two-model AND consensus, same-frame sequential dual inference, fusion diagnostics in the native overlay and React Native screen, TFLite asset no-compression, and unit coverage for every requested consensus/mixed-vote case.
- 2026-09-13: TypeScript mobile typecheck passed. Native Kotlin unit/build verification is currently blocked before Gradle configuration by an externally held/inaccessible `android/.gradle/.../fileHashes.lock`; no Kotlin build result is claimed yet.
- 2026-09-13: Resolved Android target-SDK foreground-service crash when enabling Accessibility: removed the separate unused `systemExempted` protection foreground service and its lifecycle calls. The bound AccessibilityService remains responsible for restrictions and Visual AI. TypeScript typecheck passed; Android compilation remains blocked by the externally held Gradle file-hash lock.
- 2026-09-13: Added a persistent, default-on Short-form content blocking switch. It gates only feed-specific Reels/Shorts detection; daily limits, schedules, Burst, and explicit whole-app restrictions are unchanged. Settings status now reports Off when the switch is disabled. TypeScript typecheck passed.
- 2026-09-13: Show Reel now pauses Visual AI capture and inference for that revealed reel. A scroll or genuine app/window transition resumes sampling; late in-flight results are ignored while paused. One exact dual-model final `BLOCK` decision remains sufficient to block immediately. TypeScript typecheck passed; native Gradle compilation could not start because the external `android/.gradle/.../fileHashes.lock` remains inaccessible.
- 2026-09-13: Added the user-requested NSFWJS Porn fast-path: NSFWJS top-class `PORN` blocks without Viddexa confirmation. All non-Porn NSFWJS results retain exact two-model category consensus. Diagnostics identify the override, and JVM regression coverage covers it. TypeScript typecheck passed; native compilation remains blocked by the external Gradle lock.
- 2026-09-13: Removed the one-frame NSFWJS Porn override after live false positives. Added an in-memory per-reel NSFWJS Porn rolling gate: three Porn classifications in the latest five samples block; exact two-model consensus still blocks immediately. The counter and threshold status appear in diagnostics, and gate unit coverage was added. TypeScript typecheck passed; Gradle test output did not reach a completion result in this environment.
- 2026-09-13: Added a second per-reel gate: two of the latest five frames where both model top categories are Porn or Sexy (including a mixed pair) block. Once either model reports any sexual category, capture advances to bounded 150 ms latest-frame mode until the next accessibility navigation signal; stale frames are replaced rather than queued. System diagnostics expose both counters. TypeScript typecheck passed; Kotlin tests could not start because the external Gradle file-hash lock is inaccessible.
- 2026-09-13: Replaced one-frame exact sexual consensus with a per-reel 2-of-5 gate for the same matching category: two `SEXY+SEXY`, two `PORN+PORN`, or two `HENTAI+HENTAI` frames are required. No blocking rule can now trigger on one frame alone. Added gate coverage and system diagnostic count. TypeScript typecheck passed; Kotlin tests remain blocked by the external Gradle file-hash lock.
- 2026-09-13: Fixed score-overlay capture-error flicker. One-off Android window-capture failures no longer overwrite valid scores; only three consecutive failures with no capture success for two seconds surface an error. Suspicious latest-frame capture is bounded at 200 ms. TypeScript typecheck passed; native compilation remains blocked by the external Gradle file-hash lock.
- 2026-09-13: Made exact same-category Hentai consensus require three of the latest five frames. Exact Sexy and Porn consensus remain two of five; the independent NSFWJS Porn and Porn/Sexy overlap gates are unchanged. Added regression coverage for the Hentai threshold.

## Blockers requiring a user-run step

- No model/export blocker remains. Physical-device inference, performance measurement, and visual behavior remain unverified because they require an installed development build and device interaction.
