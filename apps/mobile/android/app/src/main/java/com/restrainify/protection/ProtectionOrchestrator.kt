package com.restrainify.protection

class ProtectionOrchestrator {
    fun currentState(): ProtectionRuntimeState {
        return ProtectionRuntimeState.DEGRADED
    }
}

