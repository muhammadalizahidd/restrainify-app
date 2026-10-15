package com.restrainify.protection.visual

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class VisualThresholdsTest {
    private fun result(normal: Float = 0f, sexy: Float = 0f, porn: Float = 0f, hentai: Float = 0f, drawing: Float = 0f) =
        ClassifierResult(normal, sexy, porn, hentai, drawing, 1)

    @Test fun porn_below_neutral_still_votes_when_explicit_mass_is_high() {
        val r = result(normal = 0.55f, porn = 0.45f)
        assertEquals(ContentCategory.NORMAL, r.topCategory)
        assertTrue(r.castsSexualVote)
        assertEquals(ContentCategory.PORN, r.effectiveCategory)
    }

    @Test fun marginal_sexy_does_not_vote() {
        val r = result(normal = 0.33f, sexy = 0.34f, drawing = 0.33f)
        assertEquals(ContentCategory.SEXY, r.topCategory)
        assertFalse(r.castsSexualVote)
        assertEquals(ContentCategory.NORMAL, r.effectiveCategory)
    }

    @Test fun split_sexual_mass_votes_with_the_strongest_sexual_class() {
        val r = result(normal = 0.35f, sexy = 0.30f, porn = 0.20f, hentai = 0.15f)
        assertTrue(r.castsSexualVote)
        assertEquals(ContentCategory.SEXY, r.effectiveCategory)
    }

    @Test fun confident_sexy_votes() {
        assertTrue(result(normal = 0.3f, sexy = 0.7f).castsSexualVote)
        assertFalse(result(normal = 0.5f, sexy = 0.5f).castsSexualVote)
    }
}
