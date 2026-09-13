package com.restrainify.protection.visual

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.Button
import android.widget.TextView

private fun overlayParams(width: Int, height: Int, gravity: Int) = WindowManager.LayoutParams(
    width,
    height,
    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
    WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
    PixelFormat.TRANSLUCENT,
).apply { this.gravity = gravity }

/** Full-screen cover. Its non-touchable window never consumes underlying reel gestures. */
class AccessibilityBlockOverlayController(context: Context) : BlockOverlayController {
    private val appContext = context
    private val windowManager = context.getSystemService(WindowManager::class.java)
    private val density = context.resources.displayMetrics.density
    private var cover: View? = null

    override fun showSensitiveContentHidden() {
        if (cover != null) return
        val view = LinearLayout(appContext).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding((32 * density).toInt(), 0, (32 * density).toInt(), 0)
            setBackgroundColor(Color.rgb(12, 20, 34))
            addView(TextView(appContext).apply { text = "Sensitive content\nhidden"; textSize = 28f; setTextColor(Color.WHITE); gravity = Gravity.CENTER })
            addView(TextView(appContext).apply { text = "Swipe to continue"; textSize = 16f; setTextColor(Color.rgb(183, 195, 214)); gravity = Gravity.CENTER; setPadding(0, (20 * density).toInt(), 0, 0) })
        }
        windowManager.addView(view, overlayParams(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT, Gravity.CENTER))
        cover = view
    }

    override fun hide() { cover?.let(windowManager::removeView); cover = null }
    override fun close() = hide()
}

/** Small passive score readout for live testing while another app remains fully usable. */
class AccessibilityVisualScoreOverlay(context: Context) : AutoCloseable {
    private val appContext = context
    private val windowManager = context.getSystemService(WindowManager::class.java)
    private val density = context.resources.displayMetrics.density
    private var text: TextView? = null

    fun show(diagnostics: VisualAiDiagnostics) {
        val content = diagnostics.lastViddexa?.let { viddexa ->
            val nsfwJs = diagnostics.lastNsfwJs ?: return@let "NSFWJS: waiting for inference"
            val fusion = diagnostics.lastDecision ?: return@let "Fusion: waiting for decision"
            "Viddexa ${viddexa.topCategory} • ${viddexa.inferenceMs} ms\nN ${viddexa.normal.format()} S ${viddexa.sexy.format()} P ${viddexa.porn.format()} H ${viddexa.hentai.format()} D ${viddexa.drawing.format()}\n" +
                "NSFWJS ${nsfwJs.topCategory} • ${nsfwJs.inferenceMs} ms\nN ${nsfwJs.normal.format()} S ${nsfwJs.sexy.format()} P ${nsfwJs.porn.format()} H ${nsfwJs.hentai.format()} D ${nsfwJs.drawing.format()}\n" +
                "Votes V:${if (fusion.viddexaSexualVote) "YES" else "NO"} J:${if (fusion.nsfwJsSexualVote) "YES" else "NO"} • match ${fusion.matchingSexualCategory ?: "none"} • ${fusion.finalDecision}\n" +
                "Samples ${diagnostics.inferenceCount} • skipped ${diagnostics.skippedFrames + diagnostics.duplicateFrames}"
        } ?: diagnostics.failure?.let { "Viddexa: $it" } ?: "Viddexa: waiting for a frame"
        val label = text ?: TextView(appContext).also { label ->
            label.apply {
            setTextColor(Color.WHITE)
            textSize = 12f
            setPadding((12 * density).toInt(), (8 * density).toInt(), (12 * density).toInt(), (8 * density).toInt())
            setBackgroundColor(Color.rgb(24, 34, 52))
            windowManager.addView(this, overlayParams(WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT, Gravity.TOP or Gravity.CENTER_HORIZONTAL).apply { y = (28 * density).toInt() })
            }
            text = label
        }
        label.text = content
    }

    fun hide() { text?.let(windowManager::removeView); text = null }
    override fun close() = hide()
}

/** A small touchable control separate from the full-screen pass-through cover. */
class AccessibilityRevealControlController(context: Context) : RevealControlController {
    private val appContext = context
    private val windowManager = context.getSystemService(WindowManager::class.java)
    private val density = context.resources.displayMetrics.density
    private var button: Button? = null

    override fun show(onReveal: () -> Unit) {
        button?.let { it.setOnClickListener { onReveal() }; return }
        val view = Button(appContext).apply { text = "Show Reel"; setOnClickListener { onReveal() } }
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT,
        ).apply { gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL; y = (40 * density).toInt() }
        windowManager.addView(view, params)
        button = view
    }

    override fun hide() { button?.let(windowManager::removeView); button = null }
    override fun close() = hide()
}

private fun Float.format(): String = "%.3f".format(java.util.Locale.US, this)
