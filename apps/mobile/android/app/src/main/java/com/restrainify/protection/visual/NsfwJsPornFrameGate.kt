package com.restrainify.protection.visual

/**
 * Per-content temporal guard for NSFWJS Porn predictions. It stores only five
 * category booleans in memory and reports a block after three Porn frames.
 */
class NsfwJsPornFrameGate(
    private val windowSize: Int = 5,
    private val requiredPornFrames: Int = 3,
) {
    private val frames = ArrayDeque<Boolean>(windowSize)

    init {
        require(windowSize > 0)
        require(requiredPornFrames in 1..windowSize)
    }

    fun observe(category: ContentCategory): Int {
        if (frames.size == windowSize) frames.removeFirst()
        frames.addLast(category == ContentCategory.PORN)
        return frames.count { it }
    }

    fun blocks(): Boolean = frames.count { it } >= requiredPornFrames
    fun reset() = frames.clear()
}
