package com.restrainify.protection.visual

import android.graphics.Bitmap
import android.os.SystemClock
import android.util.Log
import java.io.Closeable
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException

/** Bounded sampler: while inference runs, only the newest frame is retained. */
class VisualAiPipeline(
    private val viddexaClassifier: () -> ViddexaClassifier,
    private val nsfwJsClassifier: () -> NsfwJsMobileNetV2Classifier,
    private val decisionEngine: DualModelDecisionEngine,
    private val onDiagnostics: (VisualAiDiagnostics) -> Unit,
    private val onFrameClassified: (fingerprint: Long, viddexa: ClassifierResult, nsfwJs: ClassifierResult, decision: DualModelDecision) -> Unit,
    private val sampleIntervalMs: Long = 500L,
    private val staticResampleMs: Long = 2_000L,
) : Closeable {
    private val executor: ExecutorService = Executors.newSingleThreadExecutor()
    private var viddexaModel: ViddexaClassifier? = null
    private var nsfwJsModel: NsfwJsMobileNetV2Classifier? = null
    private var pending: Bitmap? = null
    private var pendingFingerprint: Long? = null
    private var pendingDecisionGeneration = 0L
    private var running = false
    private var lastSubmittedAt = 0L
    private var lastFingerprint: Long? = null
    private var lastInferenceAt = 0L
    private var diagnostics = VisualAiDiagnostics()
    private val pornSexyOverlapFrameGate = PornSexyOverlapFrameGate()
    private val exactSexualConsensusFrameGate = ExactSexualConsensusFrameGate()
    private var decisionGeneration = 0L
    private var continuousLatestSampling = false
    private var closed = false
    private var inferenceStartedAt = 0L
    private var modelLoadFailedAt = 0L
    private var modelsReloadNotBefore = 0L

    /** How long the current inference has been running, or 0 when idle. Used by the service watchdog to spot a hung native call. */
    @Synchronized fun inferenceRunningForMs(): Long =
        if (inferenceStartedAt == 0L) 0L else SystemClock.elapsedRealtime() - inferenceStartedAt

    /**
     * Frees both models under memory pressure. Runs on the worker thread so it can never race a running
     * inference; the models load again lazily on the next frame, after a short pause.
     */
    fun releaseModels(reason: String) {
        synchronized(this) { if (closed) return; modelsReloadNotBefore = SystemClock.elapsedRealtime() + MODEL_RELOAD_PAUSE_MS }
        try {
            executor.execute {
                Log.w("RestrainifyVisualAi", "Releasing models: $reason")
                closeModels()
            }
        } catch (_: RejectedExecutionException) { }
    }

    private fun closeModels() {
        try { viddexaModel?.close() } catch (error: Throwable) { Log.w("RestrainifyVisualAi", "Viddexa close failed", error) }
        viddexaModel = null
        try { nsfwJsModel?.close() } catch (error: Throwable) { Log.w("RestrainifyVisualAi", "NSFWJS close failed", error) }
        nsfwJsModel = null
    }

    /** Loads missing models, backing off after a failure so an out-of-memory phone does not retry (and leak) every frame. */
    private fun ensureModelsLoaded() {
        if (viddexaModel != null && nsfwJsModel != null) return
        val now = SystemClock.elapsedRealtime()
        val notBefore = synchronized(this) { maxOf(modelsReloadNotBefore, if (modelLoadFailedAt == 0L) 0L else modelLoadFailedAt + MODEL_RETRY_BACKOFF_MS) }
        if (now < notBefore) throw IllegalStateException("Visual models are reloading; retrying shortly.")
        try {
            if (viddexaModel == null) viddexaModel = viddexaClassifier()
            if (nsfwJsModel == null) nsfwJsModel = nsfwJsClassifier()
            synchronized(this) { modelLoadFailedAt = 0L }
        } catch (error: Throwable) {
            synchronized(this) { modelLoadFailedAt = SystemClock.elapsedRealtime() }
            Log.e("RestrainifyVisualAi", "Model load failed", error)
            throw error
        }
    }

    /** Clears category-only temporal evidence after an accessibility navigation signal. */
    @Synchronized fun resetTemporalDecisions() {
        decisionGeneration++
        pornSexyOverlapFrameGate.reset()
        exactSexualConsensusFrameGate.reset()
        continuousLatestSampling = false
    }

    @Synchronized fun requiresContinuousLatestSampling(): Boolean = continuousLatestSampling

    @Synchronized fun submit(frame: ScreenFrame, prioritize: Boolean = false) {
        var accepted = false
        try {
            if (closed) return
            val now = frame.capturedAtMs
            val latestOnly = prioritize || continuousLatestSampling
            if (!latestOnly && now - lastSubmittedAt < sampleIntervalMs) { update(diagnostics.copy(skippedFrames = diagnostics.skippedFrames + 1)); return }
            val fingerprint = FrameFingerprint.from(frame.bitmap)
            if (!latestOnly && lastFingerprint?.let { FrameFingerprint.distance(it, fingerprint) <= 2 } == true && now - lastInferenceAt < staticResampleMs) { update(diagnostics.copy(duplicateFrames = diagnostics.duplicateFrames + 1)); return }
            lastFingerprint = fingerprint
            lastSubmittedAt = now
            pending?.recycle()
            // Take ownership of the captured pixels instead of copying a full-screen bitmap per frame.
            pending = frame.release()
            accepted = true
            pendingFingerprint = fingerprint
            pendingDecisionGeneration = decisionGeneration
            if (running) { update(diagnostics.copy(skippedFrames = diagnostics.skippedFrames + 1)); return }
            running = true
            executor.execute { inferPending() }
        } catch (error: Throwable) {
            if (accepted && error is RejectedExecutionException) { pending?.recycle(); pending = null; pendingFingerprint = null; running = false }
            if (!closed) update(diagnostics.copy(failure = error.message ?: "Frame preparation failed"))
        }
        finally { frame.close() }
    }

    private fun inferPending() {
        val work = synchronized(this) { pending?.let { Triple(it, pendingFingerprint!!, pendingDecisionGeneration) }.also { pending = null; pendingFingerprint = null } }
        if (work == null) { synchronized(this) { running = false }; return }
        val (bitmap, fingerprint, generation) = work
        var modelInput = bitmap
        synchronized(this) { inferenceStartedAt = SystemClock.elapsedRealtime() }
        try {
            if (synchronized(this) { closed }) return
            // Classify the media area, not the squashed full window (see FrameCropper).
            modelInput = FrameCropper.crop(bitmap)
            // One bounded worker intentionally runs both models sequentially on the
            // same frame. It avoids duplicate capture and concurrent native-runtime churn.
            ensureModelsLoaded()
            val viddexa = viddexaModel!!.classify(modelInput)
            val nsfwJs = nsfwJsModel!!.classify(modelInput)
            val baseDecision = decisionEngine.decide(viddexa, nsfwJs)
            val decision = synchronized(this) {
                if (generation != decisionGeneration) baseDecision
                else {
                    val overlapFrames = pornSexyOverlapFrameGate.observe(viddexa.effectiveCategory, nsfwJs.effectiveCategory)
                    val exactConsensusFrames = exactSexualConsensusFrameGate.observe(viddexa.effectiveCategory, nsfwJs.effectiveCategory)
                    if (viddexa.castsSexualVote || nsfwJs.castsSexualVote) continuousLatestSampling = true
                    val overlapGateBlocks = pornSexyOverlapFrameGate.blocks()
                    val exactConsensusGateBlocks = exactSexualConsensusFrameGate.blocks()
                    baseDecision.copy(
                        pornSexyOverlapFrameCount = overlapFrames,
                        pornSexyOverlapWindowBlock = overlapGateBlocks,
                        exactSexualConsensusFrameCount = exactConsensusFrames,
                        exactSexualConsensusWindowBlock = exactConsensusGateBlocks,
                        finalDecision = if (overlapGateBlocks || exactConsensusGateBlocks) ProtectionDecision.BLOCK else ProtectionDecision.ALLOW,
                    )
                }
            }
            lastInferenceAt = android.os.SystemClock.elapsedRealtime()
            if (com.restrainify.BuildConfig.DEBUG) Log.d("RestrainifyVisualAi", "Viddexa=${viddexa.topCategory}/${viddexa.inferenceMs}ms NSFWJS=${nsfwJs.topCategory}/${nsfwJs.inferenceMs}ms decision=${decision.finalDecision}")
            update(diagnostics.copy(modelReady = true, inferenceCount = diagnostics.inferenceCount + 1, lastLatencyMs = viddexa.inferenceMs + nsfwJs.inferenceMs, lastViddexa = viddexa, lastNsfwJs = nsfwJs, lastDecision = decision, failure = null))
            onFrameClassified(fingerprint, viddexa, nsfwJs, decision)
        } catch (error: Throwable) {
            // Throwable, not Exception: an OutOfMemoryError on this worker would otherwise crash the
            // whole accessibility service process, which looks like protection silently stopping.
            Log.e("RestrainifyVisualAi", "Inference failed", error)
            update(diagnostics.copy(failure = error.message ?: "Viddexa inference failed"))
        }
        finally {
            if (modelInput !== bitmap) modelInput.recycle()
            bitmap.recycle()
            val hasNext = synchronized(this) { inferenceStartedAt = 0L; pending != null && !closed }
            if (hasNext) {
                try { executor.execute { inferPending() } } catch (_: RejectedExecutionException) { synchronized(this) { running = false } }
            } else synchronized(this) { running = false }
        }
    }

    @Synchronized private fun update(next: VisualAiDiagnostics) { diagnostics = next; onDiagnostics(next) }
    /**
     * Never frees a model while the worker may be inside it: closing an ONNX/TFLite session during
     * `run()` is a native use-after-free that kills the whole process. Instead the release is queued
     * behind any in-flight inference on the same single worker thread, which then shuts down.
     */
    override fun close() {
        synchronized(this) {
            if (closed) return
            closed = true
            pending?.recycle(); pending = null; pendingFingerprint = null
        }
        try {
            executor.execute { closeModels() }
        } catch (_: RejectedExecutionException) { }
        executor.shutdown()
    }

    private companion object {
        const val MODEL_RETRY_BACKOFF_MS = 5_000L
        const val MODEL_RELOAD_PAUSE_MS = 1_500L
    }
}
