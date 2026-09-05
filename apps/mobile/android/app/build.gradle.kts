plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.facebook.react")
}

react {
    reactNativeDir.set(file("../../../../node_modules/react-native"))
    codegenDir.set(file("../../../../node_modules/@react-native/codegen"))
    autolinkLibrariesWithApp()
}

android {
    namespace = "com.restrainify"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.restrainify"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "0.1.0"
    }
}

dependencies {
    implementation("com.facebook.react:react-android")
    implementation("com.facebook.react:hermes-android")
}
