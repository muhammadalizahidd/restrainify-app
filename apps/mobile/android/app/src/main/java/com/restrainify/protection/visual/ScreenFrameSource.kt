package com.restrainify.protection.visual

import android.graphics.Bitmap
import java.io.Closeable

/** A transient screen frame. Implementations must never persist its pixels. */
class ScreenFrame(val bitmap: Bitmap, val capturedAtMs: Long) : Closeable {
    override fun close() {
        if (!bitmap.isRecycled) bitmap.recycle()
    }
}

interface ScreenFrameSource : Closeable {
    fun capture(windowId: Int, callback: (Result<ScreenFrame>) -> Unit)
}
