package com.restrainify.protection.visual

enum class ContentCategory { NORMAL, SEXY, PORN, HENTAI, DRAWING }

/**
 * Probability thresholds for one classifier's sexual vote. A frame is sexual when
 * the explicit mass (porn + hentai) or the total sexual mass (sexy + porn + hentai)
 * crosses its threshold, instead of requiring a sexual class to win the argmax.
 */
data class VisualThresholds(
    val explicitMass: Float = 0.40f,
    val sexualMass: Float = 0.60f,
) {
    init {
        require(explicitMass in 0f..1f && sexualMass in 0f..1f)
    }

    fun isSexual(sexy: Float, porn: Float, hentai: Float): Boolean =
        porn + hentai >= explicitMass || sexy + porn + hentai >= sexualMass

    companion object { val DEFAULT = VisualThresholds() }
}

/** Canonical, full probability distribution from one on-device classifier. */
data class ClassifierResult(
    val normal: Float,
    val sexy: Float,
    val porn: Float,
    val hentai: Float,
    val drawing: Float,
    val inferenceMs: Long,
    val thresholds: VisualThresholds = VisualThresholds.DEFAULT,
){
    /** Raw argmax over all five classes. Diagnostics only; decisions use [effectiveCategory]. */
    val topCategory: ContentCategory = listOf(
        ContentCategory.NORMAL to normal,
        ContentCategory.SEXY to sexy,
        ContentCategory.PORN to porn,
        ContentCategory.HENTAI to hentai,
        ContentCategory.DRAWING to drawing,
    ).maxBy { it.second }.first
    val castsSexualVote: Boolean = thresholds.isSexual(sexy, porn, hentai)
    /** Strongest sexual class when the thresholds say sexual, otherwise the strongest safe class. */
    val effectiveCategory: ContentCategory = if (castsSexualVote) {
        listOf(ContentCategory.SEXY to sexy, ContentCategory.PORN to porn, ContentCategory.HENTAI to hentai).maxBy { it.second }.first
    } else {
        listOf(ContentCategory.NORMAL to normal, ContentCategory.DRAWING to drawing).maxBy { it.second }.first
    }
}

enum class ProtectionDecision { ALLOW, BLOCK }

data class DualModelDecision(
    val viddexaSexualVote: Boolean,
    val nsfwJsSexualVote: Boolean,
    val matchingSexualCategory: ContentCategory?,
    val pornSexyOverlapFrameCount: Int,
    val pornSexyOverlapWindowBlock: Boolean,
    val exactSexualConsensusFrameCount: Int,
    val exactSexualConsensusWindowBlock: Boolean,
    val finalDecision: ProtectionDecision,
)

fun interface ContentDecisionStrategy {
    fun decide(viddexa: ClassifierResult, nsfwJs: ClassifierResult): DualModelDecision
}

/** Product policy lives here, not inside either classifier. */
class DualModelDecisionEngine(
    private val strategy: ContentDecisionStrategy = ContentDecisionStrategy { viddexa, nsfwJs ->
        val viddexaVote = viddexa.castsSexualVote
        val nsfwJsVote = nsfwJs.castsSexualVote
        val matchingSexualCategory = viddexa.effectiveCategory.takeIf { viddexaVote && it == nsfwJs.effectiveCategory }
        DualModelDecision(
            viddexaSexualVote = viddexaVote,
            nsfwJsSexualVote = nsfwJsVote,
            matchingSexualCategory = matchingSexualCategory,
            pornSexyOverlapFrameCount = 0,
            pornSexyOverlapWindowBlock = false,
            exactSexualConsensusFrameCount = 0,
            exactSexualConsensusWindowBlock = false,
            finalDecision = ProtectionDecision.ALLOW,
        )
    },
) {
    fun decide(viddexa: ClassifierResult, nsfwJs: ClassifierResult) = strategy.decide(viddexa, nsfwJs)
}

data class VisualAiDiagnostics(
    val modelReady: Boolean = false,
    val inferenceCount: Long = 0,
    val skippedFrames: Long = 0,
    val duplicateFrames: Long = 0,
    val lastLatencyMs: Long? = null,
    val lastViddexa: ClassifierResult? = null,
    val lastNsfwJs: ClassifierResult? = null,
    val lastDecision: DualModelDecision? = null,
    val failure: String? = null,
)
