You are working inside the existing **Restrainify mobile app repository**.

Your task is to implement **Viddexa NSFW Detection 2 Nano** end to end as the first version of Restrainify's on-device Visual AI content detection system.

However, before implementing anything, you must also understand the **final intended product architecture and UX** described later in this prompt.

The immediate milestone is still to get **reliable Viddexa inference working and measurable**.

Do NOT prematurely hardcode detection thresholds or add unnecessary models.

But structure the implementation so the final blocker can be added without rewriting the entire screen-capture/AI pipeline.

Do not just explain how to do this.

Inspect the repository, understand the architecture, implement the feature directly, build it, test it, debug issues, and leave the project in a working state.

---

# PRODUCT GOAL

Restrainify protects users from sexual and sexually suggestive visual content appearing in apps such as:

- Instagram
- TikTok
- YouTube Shorts
- Snapchat
- browsers
- other supported applications

The AI should eventually detect:

- Normal / safe content
- Sexy / sexually suggestive content
- Pornographic content
- Hentai
- Drawings

Examples of content Restrainify may eventually block include:

- pornography
- explicit nudity
- sexual acts
- lingerie
- cleavage
- buttocks-focused content
- sexually suggestive poses
- thirst-trap style content
- other soft-porn/suggestive imagery

For V1 we are starting with a whole-frame classifier rather than anatomical object detection.

---

# MODEL

Use:

**Hugging Face:** `viddexa/nsfw-detection-2-nano`

It is an EfficientNet-B0 classifier with roughly 4M parameters.

Its output classes are:

- Normal
- Sexy
- Porn
- Hentai
- Drawing

The model must run **entirely locally on the Android device**.

Captured screen content must NEVER be uploaded to a server or external AI API.

---

# IMPORTANT PRODUCT ARCHITECTURE DECISION

The final Restrainify V1 does NOT need to detect individual breasts, cleavage, buttocks, etc. and selectively blur those exact pixels.

Instead:

```text
sexual/suggestive reel detected
        ↓
cover the ENTIRE media/reel
        ↓
allow user to continue scrolling normally
```

This significantly simplifies the system.

We are NOT implementing:

- YOLO
- body-part detection
- pose detection
- segmentation
- anatomical bounding boxes

for this version.

The entire reel/media viewport will eventually be visually hidden.

---

# FINAL EXPECTED USER EXPERIENCE

This section describes the intended finished behavior.

The current implementation milestone does NOT require all blocking behavior to be enabled immediately, but your architecture must accommodate it cleanly.

## Safe reel

```text
Instagram/TikTok reel
        ↓
AI determines content is safe
        ↓
nothing happens
        ↓
user continues watching normally
```

## Sexual/suggestive reel

```text
Instagram/TikTok reel
        ↓
Viddexa determines content is sexual/suggestive
        ↓
Restrainify immediately displays a blocking overlay
        ↓
underlying reel is no longer visually visible
```

The overlay should conceptually look like:

```text
┌───────────────────────────────┐
│                               │
│                               │
│      Sensitive content        │
│           hidden              │
│                               │
│ Restrainify filtered this     │
│ based on your protection      │
│ settings.                     │
│                               │
│         [Show Reel]           │
│                               │
└───────────────────────────────┘
```

Do NOT use wording such as:

- Porn detected
- NSFW detected
- Explicit woman detected
- etc.

Preferred language:

**Sensitive content hidden**

When the reveal option is unavailable:

**Swipe to continue**

---

# BLOCKER MUST NOT BREAK SCROLLING

This is extremely important.

When the sexual reel is covered:

> The user MUST still be able to swipe up/down normally and move to the next Reel/TikTok/Short.

The blocking overlay exists to block VISUAL CONTENT.

It must NOT trap the user's touch gestures.

Desired behavior:

```text
finger swipe
     ↓
Restrainify blocker
     ↓
blocker does NOT consume swipe
     ↓
Instagram/TikTok underneath receives swipe
     ↓
next reel loads normally
```

The user should never need to close Restrainify or press a special "Next" button.

Scrolling should feel native.

---

# ACCESSIBILITY OVERLAY ARCHITECTURE

Investigate and use the most appropriate native Android architecture.

The intended final implementation should strongly consider using:

```text
WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
```

from Restrainify's AccessibilityService.

The full-screen blocker should be conceptually:

```text
TYPE_ACCESSIBILITY_OVERLAY

FLAG_NOT_TOUCHABLE
FLAG_NOT_FOCUSABLE
FLAG_LAYOUT_IN_SCREEN
```

or the equivalent flags required by the project's actual implementation.

The important behavior is:

- visually covers the relevant application content
- does not consume ordinary swipe gestures
- lets touch pass to Instagram/TikTok underneath
- does not steal focus
- can be shown/removed quickly

Do NOT blindly use `TYPE_APPLICATION_OVERLAY` if AccessibilityService already provides a safer/more appropriate trusted overlay path.

Inspect Android requirements and choose the correct implementation.

---

# SEPARATE VISUAL BLOCKER FROM INTERACTIVE CONTROLS

Do NOT make the entire full-screen blocker touchable just because there may be a "Show Reel" button.

Use separate overlay responsibilities.

Conceptually:

```text
FULL-SCREEN BLOCKING WINDOW
--------------------------------
not touchable
covers content visually
passes gestures through


SMALL CONTROL WINDOW
--------------------------------
touchable
contains Show Reel
only exists when Show Reel is enabled
```

This prevents the large blocker from breaking Instagram/TikTok swipe gestures.

The interactive control overlay should only occupy the minimum region required for the button/control.

---

# SHOW REEL SETTING

Restrainify will contain a setting:

```text
Soft Porn Detection
    ↓
Allow "Show Reel"
    ON / OFF
```

Use the project's existing settings architecture if one exists.

Do NOT hardcode this setting in unrelated AI classes.

## Show Reel OFF

When sexual/suggestive content is blocked:

```text
Sensitive content hidden

Swipe to continue
```

There is no reveal control.

The only normal action is to scroll past the content.

## Show Reel ON

When sexual/suggestive content is blocked:

```text
Sensitive content hidden

[ Show Reel ]
```

The user may intentionally reveal the current reel.

---

# SHOW REEL MUST ONLY APPLY TO THE CURRENT CONTENT

This is critical.

Pressing:

```text
Show Reel
```

must NOT:

- disable Visual AI globally
- disable soft-porn detection
- turn protection off
- whitelist the app
- disable protection for the next reel

It only reveals the **currently detected content instance**.

Conceptually:

```text
currentContentFingerprint = ABC123

user taps Show Reel

revealedContentFingerprint = ABC123
```

While the screen still represents ABC123:

```text
do not show blocker
```

When the user scrolls:

```text
newContentFingerprint = XYZ456
```

the reveal exception automatically disappears.

XYZ456 gets evaluated normally.

---

# CONTENT INSTANCE / SCREEN CHANGE TRACKING

Do not rely purely on timestamps.

Create or leave room for a lightweight content-instance mechanism.

Potential signals include:

- major frame difference
- perceptual hash
- Accessibility scroll events
- Accessibility content-change events
- active window/app change
- combination of the above

Avoid storing screenshots.

A lightweight perceptual fingerprint is acceptable.

Conceptually:

```text
Reel A
hash A
    ↓
blocked

Show Reel
    ↓
hash A temporarily allowed

user scrolls
    ↓
hash B
    ↓
override reset
    ↓
classify B normally
```

This functionality does NOT need to become overly complicated during the first Viddexa experiment.

Design the abstraction so it can be implemented properly later.

---

# SCREEN CAPTURE ARCHITECTURE

Inspect the existing project before deciding.

The current project may already have:

- MediaProjection
- AccessibilityService
- foreground service
- screen capture
- overlays

Reuse existing infrastructure.

Do NOT create duplicate pipelines unnecessarily.

The capture architecture should ideally be abstracted behind something like:

```text
ScreenFrameSource
```

so the model pipeline is not permanently tied to one capture API.

---

# ANDROID 14+ TARGET ARCHITECTURE

On Android API 34+ investigate using:

```text
AccessibilityService.takeScreenshotOfWindow()
```

for target-window capture.

This is especially useful for the final blocker because the accessibility overlay may be visually covering Instagram/TikTok while the AI still needs to examine the underlying application window.

Conceptually:

```text
Instagram window
       ↓
AccessibilityService
       ↓
takeScreenshotOfWindow(targetWindowId)
       ↓
actual Instagram contents
WITHOUT Restrainify overlay
       ↓
Viddexa
```

This allows:

```text
blocker remains visible
        +
AI can still inspect underlying reel
```

which is ideal.

Ensure the accessibility service declares whatever screenshot capability Android requires.

Handle cases where screenshot capture fails, including:

- invalid window
- secure window / FLAG_SECURE content
- insufficient accessibility access
- rate limiting
- unsupported API

Do not crash.

---

# PRE-ANDROID-14 FALLBACK

Do not destroy older-device support unnecessarily.

If `takeScreenshotOfWindow()` is unavailable, preserve or implement a fallback based on the project's existing capture system, likely:

```text
MediaProjection
```

However, do NOT create a fragile solution that repeatedly exposes sexual content by intentionally flashing the blocker on/off.

Keep capture behind an abstraction so Android 14+ and older devices can have different implementations.

If an ideal fully-hidden-under-overlay capture cannot be achieved safely on older Android versions, document the limitation clearly instead of creating unstable behavior.

For the initial Viddexa test build, MediaProjection is still acceptable.

---

# CURRENT IMPLEMENTATION MILESTONE

For THIS task, the most important outcome is still:

> Viddexa runs correctly against live Android screen frames and exposes reliable raw probabilities.

Do NOT let the future blocker architecture prevent completing this first milestone.

We need real-world measurements before deciding:

- exact threshold values
- whether Viddexa alone is enough
- whether NSFWJS is needed
- whether a cascade is needed
- how aggressive soft-porn detection should be

---

# 1. INSPECT THE EXISTING PROJECT FIRST

Before making changes:

- inspect relevant mobile architecture
- determine React Native / bare RN / Expo/prebuild/etc.
- inspect Android native modules
- inspect accessibility services
- inspect MediaProjection
- inspect foreground services
- inspect overlays
- inspect AndroidManifest.xml
- inspect Gradle files
- inspect target/min SDK
- inspect Kotlin version
- inspect existing settings/state architecture

Reuse working architecture.

Do not rewrite unrelated systems.

The heavy Visual AI pipeline must remain native Android/Kotlin.

Do NOT continuously send screenshots through React Native JS.

React Native should only receive lightweight state/results where necessary.

---

# 2. PREPARE VIDDEXA

Do NOT bundle PyTorch or Hugging Face Transformers into Android.

Preferred deployment:

```text
Hugging Face / PyTorch
        ↓
ONNX
        ↓
ONNX Runtime Android
```

For this first implementation:

- FP32 first
- no quantization yet
- no retraining
- no fine-tuning
- no model-weight changes

We need a trustworthy accuracy baseline.

Preserve exactly:

- model labels
- label ordering
- input dimensions
- resize behavior
- crop behavior
- normalization
- preprocessing parameters

Never guess these values.

Read them from Viddexa's actual Hugging Face configuration.

---

# 3. VERIFY PYTORCH VS ONNX

Create a Python verification utility.

Given the same image:

```text
image
 ├── Hugging Face/PyTorch
 └── ONNX Runtime
```

Compare:

- Normal
- Sexy
- Porn
- Hentai
- Drawing

The probabilities must be extremely close.

If not:

STOP.

Debug:

- preprocessing
- export
- output order
- softmax
- normalization

Do not proceed with a knowingly incorrect Android model.

---

# 4. ANDROID MODEL WRAPPER

Integrate a stable pinned version of:

```text
ONNX Runtime Android
```

Do not leave `latest.release` in final Gradle configuration.

Create a clean classifier wrapper conceptually similar to:

```text
ViddexaClassifier
```

Responsibilities:

- initialize model once
- retain ONNX session
- accept Bitmap/frame
- preprocess
- run inference
- apply softmax when necessary
- map indexes correctly
- return scores
- report inference latency

Conceptual structure:

```kotlin
data class NsfwScores(
    val normal: Float,
    val sexy: Float,
    val porn: Float,
    val hentai: Float,
    val drawing: Float,
    val inferenceMs: Long
)
```

Do not embed product blocking thresholds inside this class.

---

# 5. IMAGE PREPROCESSING

Android preprocessing must exactly reproduce Viddexa's expected processor.

Verify actual requirements for:

- RGB ordering
- resizing
- center crop
- rescaling
- mean normalization
- standard deviation normalization
- HWC → CHW
- Float32 tensor creation

Keep preprocessing isolated and testable.

Incorrect preprocessing can completely invalidate inference.

---

# 6. LIVE FRAME PIPELINE

For the current milestone:

```text
Android screen
       ↓
ScreenFrameSource
       ↓
frame sampler
       ↓
ImagePreprocessor
       ↓
ViddexaClassifier
       ↓
NsfwScores
```

Use MediaProjection if that is currently the appropriate/easiest source.

Keep the abstraction compatible with future Accessibility window capture.

---

# 7. BATTERY-EFFICIENT FRAME SAMPLING

Never run AI at display frame rate.

Absolutely avoid:

```text
60 FPS
→ 60 Viddexa calls/sec
```

Start testing around:

```text
~2 inference samples/sec
```

Make it configurable.

Never create a stale inference queue.

If inference is still running:

```text
discard old intermediate frames
keep newest relevant frame
```

The system should favor freshness over processing every frame.

---

# 8. STATIC FRAME SKIPPING

If straightforward, add lightweight duplicate-frame detection.

Possible implementation:

```text
frame
 ↓
tiny downscaled preview
 ↓
difference/perceptual hash
 ↓
same screen?
 ├── YES → skip AI
 └── NO  → run AI
```

Do not overengineer this during first integration.

---

# 9. DEBUG / TESTING INTERFACE

Do NOT automatically block reels yet based on guessed thresholds.

Expose raw model results.

Show/log:

- Normal
- Sexy
- Porn
- Hentai
- Drawing
- inference latency
- sample rate
- skipped frame count

It should be easy to open:

- Instagram
- TikTok
- browser
- YouTube

and observe Viddexa's results during testing.

Never save screenshots.

Never log actual captured screen content.

---

# 10. FUTURE DECISION ENGINE

Create a clean place for future classification policy.

Conceptually:

```text
VisualAiDecisionEngine
```

It will eventually accept something like:

```text
NsfwScores
```

and produce:

```text
ALLOW
BLOCK
UNCERTAIN
```

Do NOT choose thresholds now.

Later we will benchmark:

- Viddexa alone
- different Sexy thresholds
- different Porn thresholds
- NSFWJS alone
- Viddexa + NSFWJS
- AND policies
- OR policies
- weighted fusion
- cascade/second-opinion strategies

So do not tightly couple Viddexa directly to overlay visibility.

Correct future architecture:

```text
ViddexaClassifier
       ↓
NsfwScores
       ↓
DecisionEngine
       ↓
ProtectionAction
       ↓
BlockOverlayController
```

---

# 11. FINAL BLOCKING COMPONENTS TO PLAN FOR

The architecture should leave obvious integration points for:

```text
BlockOverlayController
```

Responsibilities:

- show blocker
- remove blocker
- update blocker
- maintain touch pass-through
- handle orientation/display changes

And:

```text
RevealControlController
```

Responsibilities:

- show/hide Show Reel button
- react to setting
- reveal current content instance only

And:

```text
ContentInstanceTracker
```

Responsibilities:

- determine whether content changed
- reset current-reel reveal override
- avoid re-evaluating identical static frames unnecessarily

Do not necessarily fully implement all three during the raw-model milestone unless doing so is trivial and clearly beneficial.

But do not architect Viddexa in a way that makes these difficult later.

---

# 12. FULL-SCREEN BLOCKER VISUAL DESIGN

The final blocker should hide the sexual stimulus strongly.

Do NOT use a weak blur where body shape remains obvious.

Acceptable options include:

- opaque/frosted panel
- extremely strong blur
- heavily downsampled + blurred captured frame
- dark protective overlay

Preferred final appearance:

```text
strong visual masking

Restrainify shield/logo

Sensitive content hidden

Swipe to continue

[Show Reel] only if enabled
```

The important requirement is that sexual details should not remain meaningfully visible through the blocker.

---

# 13. REEL SCROLL LIFECYCLE

Final expected state machine:

```text
NEW CONTENT
    ↓
CAPTURE
    ↓
CLASSIFY
    ↓
SAFE?
 ┌──┴──┐
YES   NO
 │      │
ALLOW  BLOCK
 │      │
 │    show overlay
 │      ↓
 │  user swipes
 │      ↓
 └── NEW CONTENT
```

If current reel was manually revealed:

```text
BLOCKED REEL
     ↓
Show Reel
     ↓
reveal current content
     ↓
user scrolls
     ↓
new content instance
     ↓
reveal exception cleared
     ↓
protection resumes
```

---

# 14. ACCESSIBILITY EVENTS

If AccessibilityService exists/is added, investigate useful events such as:

- TYPE_VIEW_SCROLLED
- TYPE_WINDOW_CONTENT_CHANGED
- TYPE_WINDOWS_CHANGED
- active-window/app changes

Use them as signals that content may need immediate re-evaluation.

Do not blindly run AI for every accessibility event.

Use them to schedule or prioritize the next frame classification.

---

# 15. PRIVACY

This feature must remain privacy-first.

Captured frames:

- stay local
- are never uploaded
- are never written to gallery
- are never written to disk
- are never sent to analytics
- are never persisted as user history

Only transient in-memory processing is allowed.

Release frames/buffers promptly.

A content fingerprint/hash may be kept temporarily if required for current-content tracking, but it must not be reversible into the original image.

---

# 16. ACCESSIBILITY DISCLOSURE / PLAY STORE REQUIREMENTS

If AccessibilityService is used for this functionality:

Do NOT falsely declare Restrainify to be an accessibility tool for disabilities unless it genuinely qualifies.

Design onboarding so Restrainify can provide:

- a clear in-app explanation of why Accessibility access is needed
- what screen/app information is accessed
- that Visual AI operates locally
- what the service does
- explicit affirmative user consent before sending the user to enable the service

Keep implementation compatible with the declaration/disclosure requirements expected by Google Play.

Do not hide AccessibilityService usage.

---

# 17. MEMORY MANAGEMENT

This protection system may run for hours.

Be strict about:

- closing Image instances
- releasing screenshot hardware buffers
- recycling/reusing Bitmaps appropriately
- closing ONNX tensors/results
- avoiding Bitmap churn
- avoiding Activity-context leaks
- shutting down ONNX sessions
- clean AccessibilityService lifecycle
- clean MediaProjection lifecycle
- clean executor/thread lifecycle
- preventing duplicate model initialization
- preventing duplicate overlays
- removing overlay windows correctly

A solution that slowly consumes hundreds of MB is unacceptable.

---

# 18. PERFORMANCE INSTRUMENTATION

Track lightweight development metrics:

- model load time
- inference latency
- inference count
- frames skipped
- static frames skipped
- capture latency if measurable

Make future profiling possible for:

- CPU
- RAM
- battery drain
- thermal behavior

Do not add a large telemetry system.

---

# 19. DO NOT OVERENGINEER

For this milestone, do NOT add:

- YOLO
- NanoDet
- RTMDet
- pose estimation
- segmentation
- anatomical blur detection
- custom model training
- backend AI
- cloud moderation APIs
- NSFWJS yet
- guessed production thresholds
- complex machine-learning abstractions
- unrelated UI redesigns

Implement Viddexa correctly.

But make the architecture compatible with the final blocking behavior described above.

---

# 20. BUILD AND DEBUG EVERYTHING

After implementation:

1. Export/prepare Viddexa.
2. Verify Hugging Face vs ONNX.
3. Verify preprocessing.
4. Build Android project.
5. Fix Gradle issues.
6. Fix Kotlin issues.
7. Fix ONNX dependency issues.
8. Verify model loading.
9. Verify live screen inference.
10. Verify label mapping.
11. Verify sampling.
12. Verify stale frames don't queue.
13. Verify memory resources close correctly.
14. Verify capture service stops/restarts.
15. If AccessibilityService already exists, ensure your changes don't break it.
16. Ensure future overlay/controller integration points are clean.

Do not leave errors you can resolve yourself as TODOs.

---

# 21. FINAL DELIVERABLE

When complete, report:

## What changed

Important files added/modified.

## Model pipeline

Describe:

```text
ScreenFrameSource
→ frame sampling
→ preprocessing
→ ONNX Runtime
→ Viddexa
→ NsfwScores
```

## Model verification

Show:

- Hugging Face output
- ONNX output
- whether they match

## Android result

Show sample Android inference if available.

## Performance

Report:

- model file size
- app-size impact
- model load time
- average inference time
- sampling frequency
- memory observations

## Architecture readiness

Explicitly explain how your implementation can later connect to:

```text
DecisionEngine
→ BlockOverlayController
→ ContentInstanceTracker
→ Show Reel current-content override
```

without rewriting the model pipeline.

## Remaining issues

Only genuine unresolved problems.

## Physical-device testing

Give the shortest instructions needed to test it.

---

# FINAL PRODUCT CONTRACT

Keep this final objective in mind throughout implementation:

```text
Instagram / TikTok / browser
            ↓
    screen content captured
            ↓
        Viddexa
            ↓
     Decision Engine
            ↓
     sexual content?
       │          │
      NO         YES
       │          │
     allow     BLOCK REEL
                  ↓
      accessibility overlay
                  ↓
      underlying app remains
        fully scrollable
                  ↓
       user swipes past it
                  ↓
         new reel/content
                  ↓
             re-evaluate
```

If **Show Reel = ON**:

```text
blocked content
      ↓
[Show Reel]
      ↓
reveal CURRENT reel only
      ↓
user scrolls
      ↓
override is destroyed
      ↓
protection resumes
```

If **Show Reel = OFF**:

```text
blocked content
      ↓
no reveal option
      ↓
Swipe to continue
```

On Android 14+, the preferred eventual architecture should evaluate whether:

```text
AccessibilityService.takeScreenshotOfWindow()
```

can provide the underlying application's pixels while the accessibility blocker remains visible.

The Visual AI architecture should be designed with that end state in mind.

Most importantly:

**Implement the feature. Do not return a tutorial or implementation plan instead of actually modifying the repository.**