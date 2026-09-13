package com.restrainify.protection.visual

enum class ContentCategory { NORMAL, SEXY, PORN, HENTAI, DRAWING }

/** Canonical, full probability distribution from one on-device classifier. */
data class ClassifierResult(
    val normal: Float,
    val sexy: Float,
    val porn: Float,
    val hentai: Float,
    val drawing: Float,
    val inferenceMs: Long,
){
    val topCategory: ContentCategory = listOf(
        ContentCategory.NORMAL to normal,
        ContentCategory.SEXY to sexy,
        ContentCategory.PORN to porn,
        ContentCategory.HENTAI to hentai,
        ContentCategory.DRAWING to drawing,
    ).maxBy { it.second }.first
    val castsSexualVote: Boolean get() = topCategory in setOf(ContentCategory.SEXY, ContentCategory.PORN, ContentCategory.HENTAI)
}

enum class ProtectionDecision { ALLOW, BLOCK }

data class DualModelDecision(
    val viddexaSexualVote: Boolean,
    val nsfwJsSexualVote: Boolean,
    val matchingSexualCategory: ContentCategory?,
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
        val matchingSexualCategory = viddexa.topCategory.takeIf { viddexaVote && it == nsfwJs.topCategory }
        DualModelDecision(
            viddexaSexualVote = viddexaVote,
            nsfwJsSexualVote = nsfwJsVote,
            matchingSexualCategory = matchingSexualCategory,
            finalDecision = if (matchingSexualCategory != null) ProtectionDecision.BLOCK else ProtectionDecision.ALLOW,
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
