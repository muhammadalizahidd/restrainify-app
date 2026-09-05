plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.facebook.react")
}

val expoEntryFile = providers.exec {
    workingDir(rootDir)
    commandLine(
        "node",
        "-e",
        "require('expo/scripts/resolveAppEntry')",
        rootDir.parentFile.absolutePath,
        "android",
        "absolute",
    )
}.standardOutput.asText.get().trim()

val expoCliFile = providers.exec {
    workingDir(rootDir)
    commandLine(
        "node",
        "--print",
        "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })",
    )
}.standardOutput.asText.get().trim()

react {
    reactNativeDir.set(file("../../../../node_modules/react-native"))
    codegenDir.set(file("../../../../node_modules/@react-native/codegen"))
    autolinkLibrariesWithApp()
    entryFile.set(file(expoEntryFile))
    cliFile.set(file(expoCliFile))
    bundleCommand.set("export:embed")
}

android {
    namespace = "com.restrainify"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.restrainify"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("com.facebook.react:react-android")
    implementation("com.facebook.react:hermes-android")
}
