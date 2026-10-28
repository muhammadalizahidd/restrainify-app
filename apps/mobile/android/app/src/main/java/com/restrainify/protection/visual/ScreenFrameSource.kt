package com.restrainify.protection.visual

import android.graphics.Bitmap
import java.io.Closeable

/** A transient screen frame. Implementations must never persist its pixels. */
class ScreenFrame(val bitmap: Bitmap, val capturedAtMs: Long) : Closeable {
    private var released = false

    /** Hands the pixels to the caller, who must recycle them; [close] then leaves them alone. Avoids a full-frame copy. */
    @Synchronized fun release(): Bitmap {
        released = true
        return bitmap
    }

    @Synchronized override fun close() {
        if (!released && !bitmap.isRecycled) bitmap.recycle()
    }
}

interface ScreenFrameSource : Closeable {
    fun capture(windowId: Int, callback: (Result<ScreenFrame>) -> Unit)
}
