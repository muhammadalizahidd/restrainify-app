package com.restrainify.protection.visual

import android.graphics.Bitmap

/**
 * Picks the square of the screen that actually holds the media. Both classifiers take a
 * square 224x224 input, so feeding them a full 9:20 window squashes bodies horizontally and
 * spends much of the input on status bar, captions and buttons.
 */
object FrameCropper {
    data class Region(val left: Int, val top: Int, val size: Int)

    /** Frames at or below this long/short ratio are close enough to square to use whole. */
    private const val MAX_WHOLE_FRAME_RATIO = 1.35f
    private const val TOP_INSET = 0.08f
    private const val BOTTOM_INSET = 0.10f

    /** Null means "use the whole frame". Pure integer math so it can be unit tested. */
    fun contentSquare(width: Int, height: Int): Region? {
        if (width <= 0 || height <= 0) return null
        val longSide = maxOf(width, height).toFloat()
        val shortSide = minOf(width, height).toFloat()
        if (longSide / shortSide <= MAX_WHOLE_FRAME_RATIO) return null
        if (width > height) return Region((width - height) / 2, 0, height)
        val usableTop = (height * TOP_INSET).toInt()
        val usableHeight = height - usableTop - (height * BOTTOM_INSET).toInt()
        val size = minOf(width, usableHeight)
        return Region((width - size) / 2, usableTop + (usableHeight - size) / 2, size)
    }

    /** Returns [source] itself when no crop applies; the caller recycles the result only if it differs. */
    fun crop(source: Bitmap): Bitmap {
        val region = contentSquare(source.width, source.height) ?: return source
        return Bitmap.createBitmap(source, region.left, region.top, region.size, region.size)
    }
}
