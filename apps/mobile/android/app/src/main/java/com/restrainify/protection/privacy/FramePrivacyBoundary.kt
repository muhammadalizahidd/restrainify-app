package com.restrainify.protection.privacy

interface FramePrivacyBoundary {
    fun processFrame(frameHandle: Long): VisualDecision
}

data class VisualDecision(
    val riskScore: Float,
    val category: String,
    val confidenceBucket: String
)

