package com.restrainify.protection.visual

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView

private fun overlayParams(width: Int, height: Int, gravity: Int) = WindowManager.LayoutParams(
    width,
    height,
    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
    WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
    PixelFormat.TRANSLUCENT,
).apply { this.gravity = gravity }

private fun roundedBackground(color: Int, radius: Float) = GradientDrawable().apply {
    setColor(color)
    cornerRadius = radius
}

/** Full-screen cover. Its non-touchable window never consumes underlying reel gestures. */
class AccessibilityBlockOverlayController(context: Context) : BlockOverlayController {
    private val appContext = context
    private val windowManager = context.getSystemService(WindowManager::class.java)
    private val density = context.resources.displayMetrics.density
    private var cover: View? = null
    val isShowing: Boolean get() = cover != null

    override fun showSensitiveContentHidden() {
        if (cover != null) return
        val view = LinearLayout(appContext).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL or Gravity.CENTER_VERTICAL
            setPadding((32 * density).toInt(), 0, (32 * density).toInt(), 0)
            setBackgroundColor(Color.rgb(10, 18, 32))
            addView(ImageView(appContext).apply {
                setImageResource(appContext.applicationInfo.icon)
                background = roundedBackground(Color.rgb(25, 39, 61), 18 * density)
                setPadding((12 * density).toInt(), (12 * density).toInt(), (12 * density).toInt(), (12 * density).toInt())
            }, LinearLayout.LayoutParams((64 * density).toInt(), (64 * density).toInt()).apply { bottomMargin = (14 * density).toInt() })
            addView(TextView(appContext).apply {
                text = "Restrainify"
                textSize = 20f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.WHITE)
                gravity = Gravity.CENTER
            })
            addView(TextView(appContext).apply {
                text = "PROTECTION ACTIVE"
                textSize = 11f
                typeface = Typeface.DEFAULT_BOLD
                letterSpacing = 0.12f
                setTextColor(Color.rgb(104, 220, 170))
                gravity = Gravity.CENTER
                setPadding((12 * density).toInt(), (6 * density).toInt(), (12 * density).toInt(), (6 * density).toInt())
                background = roundedBackground(Color.rgb(20, 61, 53), 999f)
            }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = (18 * density).toInt() })
            addView(TextView(appContext).apply {
                text = "Content blocked"
                textSize = 30f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.rgb(244, 247, 252))
                gravity = Gravity.CENTER
            }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = (18 * density).toInt() })
            addView(TextView(appContext).apply {
                text = "This reel was hidden to support the boundaries you set."
                textSize = 16f
                setTextColor(Color.rgb(181, 195, 216))
                gravity = Gravity.CENTER
                setLineSpacing(4 * density, 1f)
            }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = (12 * density).toInt() })
            addView(TextView(appContext).apply {
                text = "Swipe up to skip"
                textSize = 15f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.rgb(130, 214, 175))
                gravity = Gravity.CENTER
            }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = (34 * density).toInt() })
        }
        windowManager.addView(view, overlayParams(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT, Gravity.CENTER))
        cover = view
    }

    override fun hide() { cover?.let(windowManager::removeView); cover = null }
    override fun close() = hide()
}

/** Touchable reveal control, visually paired with the pass-through protection cover. */
class AccessibilityRevealControlController(context: Context) : RevealControlController {
    private val appContext = context
    private val windowManager = context.getSystemService(WindowManager::class.java)
    private val density = context.resources.displayMetrics.density
    private var button: Button? = null

    override fun show(onReveal: () -> Unit) {
        button?.let { it.setOnClickListener { onReveal() }; return }
        val view = Button(appContext).apply {
            text = "Show reel"
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            isAllCaps = false
            setTextColor(Color.rgb(236, 250, 244))
            setPadding((24 * density).toInt(), 0, (24 * density).toInt(), 0)
            background = roundedBackground(Color.rgb(30, 115, 87), 16 * density)
            setOnClickListener { onReveal() }
        }
        val params = WindowManager.LayoutParams(
            (172 * density).toInt(),
            (52 * density).toInt(),
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT,
        ).apply { gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL; y = (48 * density).toInt() }
        windowManager.addView(view, params)
        button = view
    }

    override fun hide() { button?.let(windowManager::removeView); button = null }
    override fun close() = hide()
}

/**
 * Passive, non-touchable readout of what each model sees. It is a separate window from the cover so
 * the reel's swipe gestures still pass through. `raise()` re-adds it so it always draws above the cover.
 */
class AccessibilityVisualScoreOverlay(context: Context) : AutoCloseable {
    private val appContext = context
    private val windowManager = context.getSystemService(WindowManager::class.java)
    private val density = context.resources.displayMetrics.density
    private var label: TextView? = null
    private val params = overlayParams(
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        Gravity.TOP or Gravity.CENTER_HORIZONTAL,
    ).apply { y = (28 * density).toInt() }

    /** Live readout for the latest analysed frame. */
    fun show(diagnostics: VisualAiDiagnostics) {
        val viddexa = diagnostics.lastViddexa
        val nsfwJs = diagnostics.lastNsfwJs
        val decision = diagnostics.lastDecision
        val content = when {
            viddexa != null && nsfwJs != null && decision != null ->
                "${scoreBlock(viddexa, nsfwJs, decision)}\nSamples ${diagnostics.inferenceCount} • skipped ${diagnostics.skippedFrames + diagnostics.duplicateFrames}"
            diagnostics.failure != null -> "Visual AI: ${diagnostics.failure}"
            else -> "Visual AI: waiting for a frame"
        }
        render(content, Color.rgb(24, 34, 52))
    }

    /** Frozen readout of the exact frame whose result caused the block. */
    fun showBlockedFrame(viddexa: ClassifierResult, nsfwJs: ClassifierResult, decision: DualModelDecision) {
        val gate = when {
            decision.exactSexualConsensusWindowBlock -> "exact match ${decision.exactSexualConsensusFrameCount}/5"
            decision.pornSexyOverlapWindowBlock -> "Porn/Sexy overlap ${decision.pornSexyOverlapFrameCount}/5"
            else -> "gate"
        }
        render("BLOCKED on this frame • $gate\n${scoreBlock(viddexa, nsfwJs, decision)}", Color.rgb(120, 24, 32))
    }

    /** Re-adds the window so it stacks above any overlay shown after it (e.g. the block cover). */
    fun raise() {
        val view = label ?: return
        windowManager.removeView(view)
        windowManager.addView(view, params)
    }

    fun hide() { label?.let(windowManager::removeView); label = null }
    override fun close() = hide()

    private fun render(content: String, background: Int) {
        val view = label ?: TextView(appContext).also {
            it.setTextColor(Color.WHITE)
            it.textSize = 12f
            it.setPadding((12 * density).toInt(), (8 * density).toInt(), (12 * density).toInt(), (8 * density).toInt())
            windowManager.addView(it, params)
            label = it
        }
        view.setBackgroundColor(background)
        view.text = content
    }

    private fun scoreBlock(viddexa: ClassifierResult, nsfwJs: ClassifierResult, decision: DualModelDecision): String =
        "Viddexa ${viddexa.topCategory} • ${viddexa.inferenceMs} ms\n${viddexa.line()}\n" +
            "NSFWJS ${nsfwJs.topCategory} • ${nsfwJs.inferenceMs} ms\n${nsfwJs.line()}\n" +
            "Votes V:${if (decision.viddexaSexualVote) "YES" else "NO"} J:${if (decision.nsfwJsSexualVote) "YES" else "NO"} • match ${decision.matchingSexualCategory ?: "none"} • ${decision.finalDecision}\n" +
            "P/S overlap ${decision.pornSexyOverlapFrameCount}/5 • exact ${decision.exactSexualConsensusFrameCount}/5"

    private fun ClassifierResult.line() = "N ${normal.format()} S ${sexy.format()} P ${porn.format()} H ${hentai.format()} D ${drawing.format()}"
}

private fun Float.format(): String = "%.3f".format(java.util.Locale.US, this)
