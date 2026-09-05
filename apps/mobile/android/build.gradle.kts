plugins {
    id("com.android.application") version "8.12.0" apply false
    id("org.jetbrains.kotlin.android") version "2.1.20" apply false
    id("com.facebook.react") version "0.86.3" apply false
}

extra["compileSdkVersion"] = 36
extra["targetSdkVersion"] = 36
extra["minSdkVersion"] = 26
extra["kotlinVersion"] = "2.1.20"
extra["ndkVersion"] = "27.1.12297006"

apply(plugin = "expo-root-project")
