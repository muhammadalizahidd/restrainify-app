package com.restrainify

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate

class MainActivity : ReactActivity() {
    override fun getMainComponentName(): String = "Restrainify"

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return object : ReactActivityDelegate(this, mainComponentName) {
            override fun isFabricEnabled(): Boolean = false
        }
    }
}
