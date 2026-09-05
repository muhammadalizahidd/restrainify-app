plugins {
    id("com.android.application") version "9.0.1" apply false
    id("org.jetbrains.kotlin.android") version "2.2.0" apply false
    id("com.facebook.react") version "0.87.1" apply false
}

extra["compileSdkVersion"] = 37
extra["targetSdkVersion"] = 37
extra["minSdkVersion"] = 26
extra["kotlinVersion"] = "2.2.0"
extra["ndkVersion"] = "28.2.13676358"
