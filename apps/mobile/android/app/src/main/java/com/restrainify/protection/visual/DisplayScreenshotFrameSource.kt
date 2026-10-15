package com.restrainify.protection.visual

import android.accessibilityservice.AccessibilityService
import android.graphics.Bitmap
import android.os.Build
import android.os.SystemClock
import android.view.Display
import java.util.concurrent.Executor

/**
 * Android 11-13 source: screenshots the whole default display, because per-window capture
 * only exists on Android 14+. Our own overlays are in these frames, so the caller must not
 * capture while the block cover is up and must hide the score readout around each shot.
 * Android refuses shots closer than ~333 ms apart, so callers must not sample faster than that.
 */
class DisplayScreenshotFrameSource(
    private val service: AccessibilityService,
    private val callbackExecutor: Executor,
) : ScreenFrameSource {
    /** [windowId] is ignored: this API can only capture the whole display. */
    override fun capture(windowId: Int, callback: (Result<ScreenFrame>) -> Unit) {
        if (Build.VERSION.SDK_INT < 30) {
            callback(Result.failure(UnsupportedOperationException("Screen capture requires Android 11 or later.")))
            return
        }
        service.takeScreenshot(Display.DEFAULT_DISPLAY, callbackExecutor, object : AccessibilityService.TakeScreenshotCallback {
            override fun onSuccess(result: AccessibilityService.ScreenshotResult) {
                try {
                    val hardware = Bitmap.wrapHardwareBuffer(result.hardwareBuffer, result.colorSpace)
                        ?: throw IllegalStateException("Android returned an unreadable screenshot.")
                    val copy = hardware.copy(Bitmap.Config.ARGB_8888, false)
                        ?: throw IllegalStateException("Could not copy screenshot pixels.")
                    hardware.recycle()
                    result.hardwareBuffer.close()
                    callback(Result.success(ScreenFrame(copy, SystemClock.elapsedRealtime())))
                } catch (error: Exception) {
                    try { result.hardwareBuffer.close() } catch (_: Exception) { }
                    callback(Result.failure(error))
                }
            }

            override fun onFailure(errorCode: Int) {
                val error = if (errorCode == AccessibilityService.ERROR_TAKE_SCREENSHOT_INTERVAL_TIME_SHORT) {
                    ScreenshotTooSoonException()
                } else IllegalStateException("Screen capture failed (Android code $errorCode).")
                callback(Result.failure(error))
            }
        })
    }

    override fun close() = Unit
}

/** Android rate-limited the shot; transient, the next sample simply retries. */
class ScreenshotTooSoonException : IllegalStateException("Screenshot requested too soon after the previous one.")
