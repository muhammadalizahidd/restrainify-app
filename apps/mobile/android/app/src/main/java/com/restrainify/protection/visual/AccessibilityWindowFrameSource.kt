package com.restrainify.protection.visual

import android.accessibilityservice.AccessibilityService
import android.graphics.Bitmap
import android.os.Build
import android.os.SystemClock
import java.util.concurrent.Executor

/** Android 14+ source: captures the target app window without relying on an overlay being hidden. */
class AccessibilityWindowFrameSource(
    private val service: AccessibilityService,
    private val callbackExecutor: Executor,
) : ScreenFrameSource {
    override fun capture(windowId: Int, callback: (Result<ScreenFrame>) -> Unit) {
        if (Build.VERSION.SDK_INT < 34) {
            callback(Result.failure(UnsupportedOperationException("Window screenshots require Android 14 or later.")))
            return
        }
        service.takeScreenshotOfWindow(windowId, callbackExecutor, object : AccessibilityService.TakeScreenshotCallback {
            override fun onSuccess(result: AccessibilityService.ScreenshotResult) {
                try {
                    val hardware = Bitmap.wrapHardwareBuffer(result.hardwareBuffer, result.colorSpace)
                        ?: throw IllegalStateException("Android returned an unreadable screenshot.")
                    val copy = hardware.copy(Bitmap.Config.ARGB_8888, false)
                        ?: throw IllegalStateException("Could not copy screenshot pixels.")
                    hardware.recycle()
                    result.hardwareBuffer.close()
                    callback(Result.success(ScreenFrame(copy, SystemClock.elapsedRealtime())))
                } catch (error: Throwable) {
                    // Throwable: an OutOfMemoryError copying a full-screen bitmap must fail this frame, not the process.
                    try { result.hardwareBuffer.close() } catch (_: Throwable) { }
                    callback(Result.failure(error))
                }
            }

            override fun onFailure(errorCode: Int) {
                val error = if (errorCode == AccessibilityService.ERROR_TAKE_SCREENSHOT_INTERVAL_TIME_SHORT) {
                    ScreenshotTooSoonException()
                } else IllegalStateException("Window screenshot failed (Android code $errorCode).")
                callback(Result.failure(error))
            }
        })
    }

    override fun close() = Unit
}
