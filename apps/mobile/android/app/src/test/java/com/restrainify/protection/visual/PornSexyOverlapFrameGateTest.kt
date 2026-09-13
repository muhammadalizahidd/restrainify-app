package com.restrainify.protection.visual

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PornSexyOverlapFrameGateTest {
    @Test fun blocks_on_second_porn_or_sexy_overlap_in_the_rolling_window() {
        val gate = PornSexyOverlapFrameGate()
        gate.observe(ContentCategory.PORN, ContentCategory.SEXY)
        gate.observe(ContentCategory.NORMAL, ContentCategory.PORN)
        gate.observe(ContentCategory.SEXY, ContentCategory.PORN)
        assertTrue(gate.blocks())
    }

    @Test fun requires_both_models_and_resets_for_the_next_reel() {
        val gate = PornSexyOverlapFrameGate()
        repeat(3) { gate.observe(ContentCategory.SEXY, ContentCategory.NORMAL) }
        assertFalse(gate.blocks())
        gate.reset()
        assertFalse(gate.blocks())
    }
}
