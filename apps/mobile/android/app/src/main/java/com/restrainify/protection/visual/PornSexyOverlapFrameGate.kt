package com.restrainify.protection.visual

/** Records same-frame Porn/Sexy agreement for one transient reel. */
class PornSexyOverlapFrameGate(
    private val windowSize: Int = 5,
    private val requiredOverlapFrames: Int = 2,
) {
    private val frames = ArrayDeque<Boolean>(windowSize)

    init {
        require(windowSize > 0)
        require(requiredOverlapFrames in 1..windowSize)
    }

    fun observe(viddexa: ContentCategory, nsfwJs: ContentCategory): Int {
        if (frames.size == windowSize) frames.removeFirst()
        val viddexaPornOrSexy = viddexa == ContentCategory.PORN || viddexa == ContentCategory.SEXY
        val nsfwJsPornOrSexy = nsfwJs == ContentCategory.PORN || nsfwJs == ContentCategory.SEXY
        frames.addLast(viddexaPornOrSexy && nsfwJsPornOrSexy)
        return frames.count { it }
    }

    fun blocks(): Boolean = frames.count { it } >= requiredOverlapFrames
    fun reset() = frames.clear()
}
