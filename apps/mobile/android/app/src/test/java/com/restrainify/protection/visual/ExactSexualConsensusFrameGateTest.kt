package com.restrainify.protection.visual

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ExactSexualConsensusFrameGateTest {
    @Test fun porn_blocks_after_third_exact_consensus_frame() {
        val gate = ExactSexualConsensusFrameGate()
        repeat(2) { gate.observe(ContentCategory.PORN, ContentCategory.PORN) }
        assertFalse(gate.blocks())
        gate.observe(ContentCategory.PORN, ContentCategory.PORN)
        assertTrue(gate.blocks())
    }

    @Test fun sexy_consensus_alone_never_blocks_here() {
        val gate = ExactSexualConsensusFrameGate()
        repeat(5) { gate.observe(ContentCategory.SEXY, ContentCategory.SEXY) }
        assertFalse(gate.blocks())
    }

    @Test fun hentai_blocks_after_fourth_exact_consensus_frame() {
        val gate = ExactSexualConsensusFrameGate()
        repeat(3) { gate.observe(ContentCategory.HENTAI, ContentCategory.HENTAI) }
        assertFalse(gate.blocks())
        gate.observe(ContentCategory.HENTAI, ContentCategory.HENTAI)
        assertTrue(gate.blocks())
    }

    @Test fun ignores_mixed_or_safe_votes_and_resets() {
        val gate = ExactSexualConsensusFrameGate()
        repeat(3) { gate.observe(ContentCategory.SEXY, ContentCategory.PORN) }
        assertFalse(gate.blocks())
        gate.observe(ContentCategory.SEXY, ContentCategory.SEXY)
        gate.observe(ContentCategory.PORN, ContentCategory.PORN)
        assertFalse(gate.blocks())
        gate.reset()
        assertFalse(gate.blocks())
    }
}
