package com.restrainify.protection.visual

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NsfwJsPornFrameGateTest {
    @Test fun blocks_on_third_porn_frame_within_the_rolling_window() {
        val gate = NsfwJsPornFrameGate()
        listOf(ContentCategory.PORN, ContentCategory.NORMAL, ContentCategory.PORN).forEach(gate::observe)
        assertTrue(gate.blocks())
    }

    @Test fun does_not_block_below_threshold_or_after_old_votes_expire() {
        val gate = NsfwJsPornFrameGate()
        listOf(ContentCategory.PORN, ContentCategory.NORMAL, ContentCategory.PORN).forEach(gate::observe)
        assertEquals(2, gate.observe(ContentCategory.DRAWING))
        assertFalse(gate.blocks())
        listOf(ContentCategory.NORMAL, ContentCategory.NORMAL, ContentCategory.NORMAL).forEach(gate::observe)
        assertFalse(gate.blocks())
    }

    @Test fun reset_discards_the_previous_reels_votes() {
        val gate = NsfwJsPornFrameGate()
        repeat(3) { gate.observe(ContentCategory.PORN) }
        gate.reset()
        assertFalse(gate.blocks())
    }
}
