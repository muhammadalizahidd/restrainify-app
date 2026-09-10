package com.restrainify.protection.bridge

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.net.VpnService
import android.provider.Settings
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.restrainify.protection.OfflineRuntime
import com.restrainify.protection.webfilter.DnsVpnService
import org.json.JSONObject

class ProtectionBridgeModule(private val react: ReactApplicationContext) : ReactContextBaseJavaModule(react) {
    private val runtime = OfflineRuntime.get(react)
    private var vpnPromise: Promise? = null
    private val listener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode != 6174) return
            val promise = vpnPromise ?: return
            vpnPromise = null
            if (resultCode == Activity.RESULT_OK) startVpn(promise) else promise.reject("VPN_DENIED", "VPN permission was declined. Website protection is off.")
        }
    }
    init {
        react.addActivityEventListener(listener)
        runtime.changed = { if (react.hasActiveReactInstance()) react.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit("ProtectionChanged", null) }
    }
    override fun getName() = "RestrainifyProtectionBridge"
    @ReactMethod fun getState(promise: Promise) = work(promise) { runtime.snapshot().toString() }
    @ReactMethod fun execute(action: String, payload: String, promise: Promise) = work(promise) {
        require(payload.length <= 20_000) { "Request is too large" }
        runtime.command(action, JSONObject(payload)).toString()
    }
    @ReactMethod fun getInstalledApps(promise: Promise) = work(promise) { runtime.installedApps().toString() }
    @ReactMethod fun openSettings(kind: String, promise: Promise) {
        try {
            val intent = when (kind) {
                "usage" -> Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).setData(Uri.parse("package:${react.packageName}"))
                "accessibility" -> { require(runtime.configuration.optBoolean("accessibilityConsent")) { "Accept the app restriction disclosure first" }; Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS) }
                "dns" -> Intent(Settings.ACTION_WIRELESS_SETTINGS)
                "battery" -> Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                "vpn" -> Intent(Settings.ACTION_VPN_SETTINGS)
                else -> throw IllegalArgumentException("Unknown settings page")
            }
            react.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); promise.resolve(null)
        } catch (error: Exception) { promise.reject("SETTINGS", error.message ?: "Cannot open Android Settings") }
    }
    @ReactMethod fun startWebsiteProtection(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                check(runtime.configuration.optBoolean("websiteEnabled") && runtime.configuration.optString("dnsMode") == "vpn") { "Select and enable local DNS VPN first" }
                check(vpnPromise == null) { "VPN permission request is already open" }
                val intent = VpnService.prepare(react)
                if (intent == null) startVpn(promise) else {
                    val activity = react.currentActivity ?: throw IllegalStateException("Open the app before starting VPN")
                    vpnPromise = promise; activity.startActivityForResult(intent, 6174)
                }
            } catch (error: Exception) { vpnPromise = null; promise.reject("VPN_START", error.message) }
        }
    }
    private fun startVpn(promise: Promise) {
        try { react.startForegroundService(Intent(react, DnsVpnService::class.java)); promise.resolve(null) }
        catch (error: Exception) { promise.reject("VPN_START", error.message) }
    }
    @ReactMethod fun stopWebsiteProtection(promise: Promise) = work(promise) {
        runtime.assertCanWeaken(); react.stopService(Intent(react, DnsVpnService::class.java)); null
    }
    @ReactMethod fun addListener(name: String) { /* Required for NativeEventEmitter. */ }
    @ReactMethod fun removeListeners(count: Int) { /* React owns subscriptions. */ }
    private fun work(promise: Promise, block: () -> String?) {
        runtime.executor.execute { try { promise.resolve(block()) } catch (error: Exception) { promise.reject("PROTECTION", error.message ?: "Operation failed") } }
    }
    override fun invalidate() {
        react.removeActivityEventListener(listener); runtime.changed = null
        vpnPromise?.reject("CANCELLED", "App closed during the permission request"); vpnPromise = null
        super.invalidate()
    }
}
class ProtectionPackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(ProtectionBridgeModule(context))
    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = listOf(ProgressRingManager())
}
