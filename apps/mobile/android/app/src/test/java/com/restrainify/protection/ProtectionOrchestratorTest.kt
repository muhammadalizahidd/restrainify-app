package com.restrainify.protection

import org.junit.Assert.*
import org.junit.Test

class ProtectionOrchestratorTest {
    @Test
    fun defaultConstructorReturnsDegradedWhenNoRuntime() {
        val orchestrator = ProtectionOrchestrator()
        assertEquals(ProtectionRuntimeState.DEGRADED, orchestrator.currentState())
    }

    @Test
    fun notReadyReturnsStandby() {
        val state = ProtectionOrchestrator.evaluateState(
            ready = false,
            hasLimitRules = true,
            hasUsageAccess = false,
            accessibilityActive = true,
            vpnActive = true
        )
        assertEquals(ProtectionRuntimeState.STANDBY, state)
    }

    @Test
    fun limitRulesWithMissingUsageAccessReturnsDegraded() {
        val state = ProtectionOrchestrator.evaluateState(
            ready = true,
            hasLimitRules = true,
            hasUsageAccess = false, // Revoked permission
            accessibilityActive = true,
            vpnActive = true
        )
        assertEquals(ProtectionRuntimeState.DEGRADED, state)
    }

    @Test
    fun failureMessageReturnsDegraded() {
        val state = ProtectionOrchestrator.evaluateState(
            ready = true,
            hasLimitRules = false,
            hasUsageAccess = true,
            accessibilityActive = true,
            vpnActive = true,
            failure = "Usage Access permission is required to enforce daily limits"
        )
        assertEquals(ProtectionRuntimeState.DEGRADED, state)
    }

    @Test
    fun allCapabilitiesActiveReturnsActive() {
        val state = ProtectionOrchestrator.evaluateState(
            ready = true,
            hasLimitRules = true,
            hasUsageAccess = true,
            accessibilityActive = true,
            vpnActive = true
        )
        assertEquals(ProtectionRuntimeState.ACTIVE, state)
    }

    @Test
    fun partialCapabilitiesReturnsPartial() {
        val state = ProtectionOrchestrator.evaluateState(
            ready = true,
            hasLimitRules = false,
            hasUsageAccess = true,
            accessibilityActive = true,
            vpnActive = false // Only accessibility active
        )
        assertEquals(ProtectionRuntimeState.PARTIAL, state)
    }

    @Test
    fun noCapabilitiesActiveReturnsStandby() {
        val state = ProtectionOrchestrator.evaluateState(
            ready = true,
            hasLimitRules = false,
            hasUsageAccess = true,
            accessibilityActive = false,
            vpnActive = false
        )
        assertEquals(ProtectionRuntimeState.STANDBY, state)
    }
}
