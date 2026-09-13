package com.restrainify.protection.visual

/** Records exact same-category sexual agreement for one transient reel. */
class ExactSexualConsensusFrameGate(
    private val windowSize: Int = 5,
    private val requiredSexyOrPornFrames: Int = 2,
    private val requiredHentaiFrames: Int = 3,
) {
    private val frames = ArrayDeque<ContentCategory?>(windowSize)

    init {
        require(windowSize > 0)
        require(requiredSexyOrPornFrames in 1..windowSize)
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
        frames.count { it == ContentCategory.SEXY } >= requiredSexyOrPornFrames ||
            frames.count { it == ContentCategory.PORN } >= requiredSexyOrPornFrames ||
            frames.count { it == ContentCategory.HENTAI } >= requiredHentaiFrames

    fun reset() = frames.clear()
}
