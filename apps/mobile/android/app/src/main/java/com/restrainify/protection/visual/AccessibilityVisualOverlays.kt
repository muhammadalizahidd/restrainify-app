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
                text = "Content blocked"
                textSize = 30f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.rgb(244, 247, 252))
                gravity = Gravity.CENTER
            }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = (18 * density).toInt() })
            addView(TextView(appContext).apply {
                text = "Swipe up to skip"
                textSize = 15f
                typeface = Typeface.DEFAULT_BOLD
                setTextColor(Color.rgb(191, 219, 254))
                gravity = Gravity.CENTER
            }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = (34 * density).toInt() })
        }
        AppFonts.apply(view); windowManager.addView(view, overlayParams(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT, Gravity.CENTER))
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
            background = gradientBackground(16 * density)
            setOnClickListener { onReveal() }
        }
        val params = WindowManager.LayoutParams(
            (172 * density).toInt(),
            (52 * density).toInt(),
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT,
        ).apply { gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL; y = (48 * density).toInt() }
        AppFonts.apply(view); windowManager.addView(view, params)
        button = view
    }

    override fun hide() { button?.let(windowManager::removeView); button = null }
    override fun close() = hide()
}

/** The same blue gradient as the hero cards. */
private fun gradientBackground(radius: Float) = GradientDrawable(
    GradientDrawable.Orientation.TL_BR,
    intArrayOf(Color.rgb(9, 29, 72), Color.rgb(21, 57, 120), Color.rgb(45, 100, 174)),
).apply { cornerRadius = radius }
