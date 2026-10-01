package com.restrainify.protection.visual

import android.content.Context
import android.graphics.Typeface
import android.view.View
import android.view.ViewGroup
import android.widget.TextView

/** The brand typeface (Space Grotesk) for views the service draws itself. Falls back to the system font. */
object AppFonts {
    @Volatile private var regular: Typeface? = null
    @Volatile private var bold: Typeface? = null

    private fun load(context: Context) {
        if (regular != null && bold != null) return
        try {
            regular = Typeface.createFromAsset(context.assets, "fonts/SpaceGrotesk_500Medium.ttf")
            bold = Typeface.createFromAsset(context.assets, "fonts/SpaceGrotesk_700Bold.ttf")
        } catch (_: Exception) {
            // Missing or unreadable asset: keep the system typeface.
        }
    }

    /** Applies regular or bold to every text view under [root], keeping bold where the view was already bold. */
    fun apply(root: View) {
        load(root.context)
        val regularFace = regular ?: return
        val boldFace = bold ?: return
        fun walk(view: View) {
            if (view is TextView) view.typeface = if (view.typeface?.isBold == true) boldFace else regularFace
            if (view is ViewGroup) for (i in 0 until view.childCount) walk(view.getChildAt(i))
        }
        walk(root)
    }
}
