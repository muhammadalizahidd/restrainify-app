package com.restrainify.protection

class ProtectionOrchestrator(private val runtime: OfflineRuntime? = null) {
    fun currentState(): ProtectionRuntimeState {
        val rt = runtime ?: return ProtectionRuntimeState.DEGRADED
        val rules = rt.configuration.optJSONArray("rules")
        var hasLimitRules = false
        if (rules != null) {
            for (i in 0 until rules.length()) {
                val r = rules.getJSONObject(i)
                if (r.optBoolean("enabled") && r.optInt("limitMinutes") > 0) {
                    hasLimitRules = true
                    break
                }
            }
        }
        return evaluateState(
            ready = rt.ready,
            hasLimitRules = hasLimitRules,
            hasUsageAccess = rt.hasUsageAccess(),
            accessibilityActive = rt.hasAccessibilityAccess(),
            vpnActive = rt.vpnActive,
            failure = rt.failure
        )
    }

    companion object {
        fun evaluateState(
            ready: Boolean,
            hasLimitRules: Boolean,
            hasUsageAccess: Boolean,
            accessibilityActive: Boolean,
            vpnActive: Boolean,
            failure: String? = null
        ): ProtectionRuntimeState {
            if (!ready) return ProtectionRuntimeState.STANDBY
            if (hasLimitRules && !hasUsageAccess) return ProtectionRuntimeState.DEGRADED
            if (failure != null) return ProtectionRuntimeState.DEGRADED
            if (!accessibilityActive && !vpnActive) return ProtectionRuntimeState.STANDBY
            if (accessibilityActive && vpnActive) return ProtectionRuntimeState.ACTIVE
            return ProtectionRuntimeState.PARTIAL
        }
    }
}
