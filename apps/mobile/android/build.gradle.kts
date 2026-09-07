// AGP and Kotlin versions must match node_modules/react-native/gradle/libs.versions.toml
// (`agp` and `kotlin`) for the pinned react-native release. Update all three together.
plugins {
    id("com.android.application") version "8.12.0" apply false
    id("org.jetbrains.kotlin.android") version "2.1.20" apply false
    id("com.facebook.react") version "0.86.3" apply false
}

extra["compileSdkVersion"] = 36
extra["targetSdkVersion"] = 36
extra["kotlinVersion"] = "2.1.20"
extra["ndkVersion"] = "27.1.12297006"
extra["buildToolsVersion"] = "36.0.0"

// Expo's Gradle plugins propagate compileSdk/minSdk/targetSdk to every library module, but
// NOT buildToolsVersion or ndkVersion. Without this, those modules fall back to AGP 8.12's
// own defaults (build-tools 35.0.0) and the build fails unless that exact package happens
// to be installed. Keep every module on the versions pinned above.
subprojects {
    plugins.withId("com.android.library") {
        extensions.configure(com.android.build.api.dsl.LibraryExtension::class.java) {
            buildToolsVersion = rootProject.extra["buildToolsVersion"] as String
            ndkVersion = rootProject.extra["ndkVersion"] as String
        }
    }
}

apply(plugin = "expo-root-project")
