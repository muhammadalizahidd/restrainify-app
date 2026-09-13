# Viddexa Visual AI Work Log

## Status

In progress — Viddexa is integrated; the next experiment adds the official GantMan MobileNetV2 TFLite model and replaces one-model blocking with strict two-model top-class consensus.

## Dual-model implementation plan (2026-09-13)

### Requested behavior

Run Viddexa and GantMan/NSFWJS MobileNetV2 against the same transient Android frame. Block only when both models independently have a sexual top class (`SEXY`, `PORN`, or `HENTAI`), without requiring category equality. Preserve both raw distributions and timings in local development diagnostics.

### Updated decision rule (2026-09-13)

The user superseded the initial consensus rule: a block now requires an exact matching sexual top category from both models. `SEXY + SEXY`, `PORN + PORN`, and `HENTAI + HENTAI` block. Every mixed pair, including `SEXY + PORN`, allows. The system-wide diagnostics continue to show both top categories and votes so this stricter experiment can be assessed.

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

## Blockers requiring a user-run step

- No model/export blocker remains. Physical-device inference, performance measurement, and visual behavior remain unverified because they require an installed development build and device interaction.
