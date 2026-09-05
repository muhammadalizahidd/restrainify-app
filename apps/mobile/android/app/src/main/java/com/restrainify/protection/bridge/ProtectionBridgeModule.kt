package com.restrainify.protection.bridge

import com.restrainify.protection.ProtectionOrchestrator
import com.restrainify.protection.ProtectionRuntimeState

class ProtectionBridgeModule(
    private val orchestrator: ProtectionOrchestrator = ProtectionOrchestrator()
) {
    fun getProtectionHealth(): ProtectionRuntimeState {
        return orchestrator.currentState()
    }
}

