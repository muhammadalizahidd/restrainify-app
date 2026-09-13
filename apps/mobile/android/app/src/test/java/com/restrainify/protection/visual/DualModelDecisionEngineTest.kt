package com.restrainify.protection.visual

import org.junit.Assert.assertEquals
import org.junit.Test

class DualModelDecisionEngineTest {
    private val engine = DualModelDecisionEngine()

    @Test fun matching_sexual_top_categories_block() {
        val sexual = listOf(ContentCategory.SEXY, ContentCategory.PORN, ContentCategory.HENTAI)
        sexual.forEach { category ->
            assertEquals("$category + $category", ProtectionDecision.BLOCK, engine.decide(result(category), result(category)).finalDecision)
        }
    }

    @Test fun mixed_or_safe_votes_allow() {
        listOf(
            ContentCategory.SEXY to ContentCategory.PORN,
            ContentCategory.SEXY to ContentCategory.HENTAI,
            ContentCategory.PORN to ContentCategory.HENTAI,
            ContentCategory.SEXY to ContentCategory.NORMAL,
            ContentCategory.PORN to ContentCategory.NORMAL,
            ContentCategory.NORMAL to ContentCategory.PORN,
            ContentCategory.NORMAL to ContentCategory.SEXY,
            ContentCategory.DRAWING to ContentCategory.SEXY,
            ContentCategory.HENTAI to ContentCategory.NORMAL,
        ).forEach { (viddexa, nsfwJs) ->
            assertEquals("$viddexa + $nsfwJs", ProtectionDecision.ALLOW, engine.decide(result(viddexa), result(nsfwJs)).finalDecision)
        }
    }

    private fun result(category: ContentCategory): ClassifierResult {
        val score = { candidate: ContentCategory -> if (candidate == category) 0.9f else 0.025f }
        return ClassifierResult(score(ContentCategory.NORMAL), score(ContentCategory.SEXY), score(ContentCategory.PORN), score(ContentCategory.HENTAI), score(ContentCategory.DRAWING), 1)
    }
}
