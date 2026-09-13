package com.restrainify.protection.visual

import android.graphics.Bitmap
import kotlin.math.abs

/** Non-reversible, in-memory 8x8 luminance fingerprint used only to skip static frames. */
object FrameFingerprint {
    fun from(bitmap: Bitmap): Long {
        val pixels = IntArray(64)
        val scaled = Bitmap.createScaledBitmap(bitmap, 8, 8, true)
        try {
            scaled.getPixels(pixels, 0, 8, 0, 0, 8, 8)
            val luminance = IntArray(64) { index ->
                val pixel = pixels[index]
                ((pixel shr 16 and 0xff) * 299 + (pixel shr 8 and 0xff) * 587 + (pixel and 0xff) * 114) / 1000
            }
            val average = luminance.average()
            return luminance.foldIndexed(0L) { index, hash, value -> if (value >= average) hash or (1L shl index) else hash }
        } finally {
            scaled.recycle()
        }
    }

    fun distance(first: Long, second: Long): Int = java.lang.Long.bitCount(first xor second)
}
