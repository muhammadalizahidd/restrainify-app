package com.restrainify.protection.visual

/**
 * Records exact same-category sexual agreement for one transient reel. Only Porn and Hentai
 * consensus block here; Sexy-only agreement is left to [PornSexyOverlapFrameGate].
 */
class ExactSexualConsensusFrameGate(
    private val windowSize: Int = 5,
    private val requiredPornFrames: Int = 3,
    private val requiredHentaiFrames: Int = 4,
) {
    private val frames = ArrayDeque<ContentCategory?>(windowSize)

    init {
        require(windowSize > 0)
        require(requiredPornFrames in 1..windowSize)
        require(requiredHentaiFrames in 1..windowSize)
    }

    fun observe(viddexa: ContentCategory, nsfwJs: ContentCategory): Int {
        if (frames.size == windowSize) frames.removeFirst()
        val exactSexualConsensus = viddexa == nsfwJs && (viddexa == ContentCategory.SEXY || viddexa == ContentCategory.PORN || viddexa == ContentCategory.HENTAI)
        val category = viddexa.takeIf { exactSexualConsensus }
        frames.addLast(category)
        return category?.let { consensus -> frames.count { it == consensus } } ?: 0
    }

    fun blocks(): Boolean =
        frames.count { it == ContentCategory.PORN } >= requiredPornFrames ||
            frames.count { it == ContentCategory.HENTAI } >= requiredHentaiFrames

    fun reset() = frames.clear()
}
