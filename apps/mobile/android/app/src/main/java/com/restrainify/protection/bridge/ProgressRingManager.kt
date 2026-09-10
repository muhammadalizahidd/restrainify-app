package com.restrainify.protection.bridge

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.view.View
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class ProgressRing(context: Context) : View(context) {
    var progress = 0f
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.BUTT }
    override fun onDraw(canvas: Canvas) {
        val diameter = minOf(width, height).toFloat()
        val stroke = diameter * .105f
        paint.strokeWidth = stroke
        val bounds = RectF(stroke / 2, stroke / 2, diameter - stroke / 2, diameter - stroke / 2)
        paint.color = Color.argb(65,255,255,255); canvas.drawOval(bounds, paint)
        paint.color = Color.WHITE; canvas.drawArc(bounds, -90f, progress.coerceIn(0f,1f) * 360, false, paint)
    }
}
class ProgressRingManager : SimpleViewManager<ProgressRing>() {
    override fun getName() = "RestrainifyProgressRing"
    override fun createViewInstance(context: ThemedReactContext) = ProgressRing(context)
    @ReactProp(name = "progress") fun setProgress(view: ProgressRing, progress: Float) { view.progress = progress; view.invalidate() }
}
