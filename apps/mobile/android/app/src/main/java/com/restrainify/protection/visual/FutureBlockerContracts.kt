package com.restrainify.protection.visual

import java.io.Closeable

/**
 * Tracks the current non-reversible frame fingerprint and a one-content reveal
 * exception. Nothing is persisted. A navigation signal plus a materially new
 * fingerprint clears it; animation inside a reel never does.
 */
class ContentInstanceTracker {
    private var current: Long? = null
    private var revealed: Long? = null
    private var blocked = false

    /**
     * Accessibility scroll/window events own reel transitions. Video frames can
     * change dramatically within one reel, so their fingerprint never clears a
     * block latch on its own.
     */
    fun observe(fingerprint: Long): Boolean {
        val changed = current == null
        if (changed) { revealed = null; blocked = false }
        current = fingerprint
        return changed
    }

    /** A scroll is only a candidate navigation; confirm it against real pixels. */
    fun confirmsNewContent(fingerprint: Long): Boolean = current?.let {
        FrameFingerprint.distance(it, fingerprint) >= 16
    } ?: true

    /** Accessibility scroll/window transitions are authoritative new-content signals. */
    fun advance() { current = null; revealed = null; blocked = false }
    fun markBlocked(): Boolean = !blocked.also { blocked = true }
    fun isBlocked(): Boolean = blocked
    fun revealCurrent() { revealed = current }
    fun isCurrentRevealed(): Boolean = current != null && current == revealed
    fun clear() = advance()
}

/**
 * Future visual cover owner. The full-screen window must be an accessibility
 * overlay using FLAG_NOT_TOUCHABLE and FLAG_NOT_FOCUSABLE so app gestures pass
 * through. A reveal button, if enabled, belongs in a separate small window.
 */
interface BlockOverlayController : Closeable {
    fun showSensitiveContentHidden()
    fun hide()
}

/** The optional, small touchable “Show Reel” window; never the full-screen cover. */
interface RevealControlController : Closeable {
    fun show(onReveal: () -> Unit)
    fun hide()
}
