package com.restrainify.protection.visual

import android.graphics.Bitmap
import android.util.Log
import java.io.Closeable
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

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
    private val nsfwJsPornFrameGate = NsfwJsPornFrameGate()
    private val pornSexyOverlapFrameGate = PornSexyOverlapFrameGate()
    private val exactSexualConsensusFrameGate = ExactSexualConsensusFrameGate()
    private var decisionGeneration = 0L
    private var continuousLatestSampling = false

    /** Clears category-only temporal evidence after an accessibility navigation signal. */
    @Synchronized fun resetTemporalDecisions() {
        decisionGeneration++
        nsfwJsPornFrameGate.reset()
        pornSexyOverlapFrameGate.reset()
        exactSexualConsensusFrameGate.reset()
        continuousLatestSampling = false
    }

    @Synchronized fun requiresContinuousLatestSampling(): Boolean = continuousLatestSampling

    @Synchronized fun submit(frame: ScreenFrame, prioritize: Boolean = false) {
        try {
            val now = frame.capturedAtMs
            val latestOnly = prioritize || continuousLatestSampling
            if (!latestOnly && now - lastSubmittedAt < sampleIntervalMs) { update(diagnostics.copy(skippedFrames = diagnostics.skippedFrames + 1)); return }
            val fingerprint = FrameFingerprint.from(frame.bitmap)
            if (!latestOnly && lastFingerprint?.let { FrameFingerprint.distance(it, fingerprint) <= 2 } == true && now - lastInferenceAt < staticResampleMs) { update(diagnostics.copy(duplicateFrames = diagnostics.duplicateFrames + 1)); return }
            lastFingerprint = fingerprint
            lastSubmittedAt = now
            pending?.recycle()
            pending = frame.bitmap.copy(Bitmap.Config.ARGB_8888, false)
            pendingFingerprint = fingerprint
            pendingDecisionGeneration = decisionGeneration
            if (running) { update(diagnostics.copy(skippedFrames = diagnostics.skippedFrames + 1)); return }
            running = true
            executor.execute { inferPending() }
        } catch (error: Exception) { update(diagnostics.copy(failure = error.message ?: "Frame preparation failed")) }
        finally { frame.close() }
    }

    private fun inferPending() {
        val work = synchronized(this) { pending?.let { Triple(it, pendingFingerprint!!, pendingDecisionGeneration) }.also { pending = null; pendingFingerprint = null } }
        if (work == null) { synchronized(this) { running = false }; return }
        val (bitmap, fingerprint, generation) = work
        try {
            // One bounded worker intentionally runs both models sequentially on the
            // same frame. It avoids duplicate capture and concurrent native-runtime churn.
            val viddexa = (viddexaModel ?: viddexaClassifier().also { viddexaModel = it }).classify(bitmap)
            val nsfwJs = (nsfwJsModel ?: nsfwJsClassifier().also { nsfwJsModel = it }).classify(bitmap)
            val baseDecision = decisionEngine.decide(viddexa, nsfwJs)
            val decision = synchronized(this) {
                if (generation != decisionGeneration) baseDecision
                else {
                    val pornFrames = nsfwJsPornFrameGate.observe(nsfwJs.topCategory)
                    val overlapFrames = pornSexyOverlapFrameGate.observe(viddexa.topCategory, nsfwJs.topCategory)
                    val exactConsensusFrames = exactSexualConsensusFrameGate.observe(viddexa.topCategory, nsfwJs.topCategory)
                    if (viddexa.castsSexualVote || nsfwJs.castsSexualVote) continuousLatestSampling = true
                    val pornGateBlocks = nsfwJsPornFrameGate.blocks()
                    val overlapGateBlocks = pornSexyOverlapFrameGate.blocks()
                    val exactConsensusGateBlocks = exactSexualConsensusFrameGate.blocks()
                    baseDecision.copy(
                        nsfwJsPornFrameCount = pornFrames,
                        nsfwJsPornWindowBlock = pornGateBlocks,
                        pornSexyOverlapFrameCount = overlapFrames,
                        pornSexyOverlapWindowBlock = overlapGateBlocks,
                        exactSexualConsensusFrameCount = exactConsensusFrames,
                        exactSexualConsensusWindowBlock = exactConsensusGateBlocks,
                        finalDecision = if (pornGateBlocks || overlapGateBlocks || exactConsensusGateBlocks) ProtectionDecision.BLOCK else ProtectionDecision.ALLOW,
                    )
                }
            }
            lastInferenceAt = android.os.SystemClock.elapsedRealtime()
            Log.d("RestrainifyVisualAi", "Viddexa=${viddexa.topCategory}/${viddexa.inferenceMs}ms NSFWJS=${nsfwJs.topCategory}/${nsfwJs.inferenceMs}ms decision=${decision.finalDecision}")
            update(diagnostics.copy(modelReady = true, inferenceCount = diagnostics.inferenceCount + 1, lastLatencyMs = viddexa.inferenceMs + nsfwJs.inferenceMs, lastViddexa = viddexa, lastNsfwJs = nsfwJs, lastDecision = decision, failure = null))
            onFrameClassified(fingerprint, viddexa, nsfwJs, decision)
        } catch (error: Exception) { update(diagnostics.copy(failure = error.message ?: "Viddexa inference failed")) }
        finally {
            bitmap.recycle()
            val hasNext = synchronized(this) { pending != null }
            if (hasNext) executor.execute { inferPending() } else synchronized(this) { running = false }
        }
    }

    @Synchronized private fun update(next: VisualAiDiagnostics) { diagnostics = next; onDiagnostics(next) }
    override fun close() {
        synchronized(this) { pending?.recycle(); pending = null; pendingFingerprint = null }
        executor.shutdownNow()
        viddexaModel?.close(); viddexaModel = null
        nsfwJsModel?.close(); nsfwJsModel = null
    }
}
