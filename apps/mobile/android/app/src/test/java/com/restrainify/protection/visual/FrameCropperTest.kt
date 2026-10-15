package com.restrainify.protection.visual

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class FrameCropperTest {
    @Test fun portrait_phone_window_crops_a_full_width_square_from_the_media_area() {
        val region = FrameCropper.contentSquare(1080, 2400)!!
        assertEquals(1080, region.size)
        assertEquals(0, region.left)
        // usable area is 192..2160, so the square is centred at y = 1176
        assertEquals(636, region.top)
    }

    @Test fun landscape_video_crops_a_centred_square() {
        assertEquals(FrameCropper.Region(420, 0, 1080), FrameCropper.contentSquare(1920, 1080))
    }

    @Test fun near_square_frames_are_used_whole() {
        assertNull(FrameCropper.contentSquare(1080, 1350))
        assertNull(FrameCropper.contentSquare(1000, 1000))
    }

    @Test fun degenerate_sizes_are_used_whole() {
        assertNull(FrameCropper.contentSquare(0, 100))
    }
}
