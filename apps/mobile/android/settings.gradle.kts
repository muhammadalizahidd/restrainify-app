import expo.modules.plugin.ExpoAutolinkingSettingsExtension

pluginManagement {
    includeBuild("../../../node_modules/@react-native/gradle-plugin")

    val expoGradlePluginsPath = File(
        providers.exec {
            workingDir(rootDir)
            commandLine(
                "node",
                "--print",
                "require.resolve('expo-modules-autolinking/package.json', { paths: [require.resolve('expo/package.json')] })",
            )
        }.standardOutput.asText.get().trim(),
        "../android/expo-gradle-plugin",
    ).absolutePath
    includeBuild(expoGradlePluginsPath)

    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

plugins {
    id("com.facebook.react.settings")
    id("expo-autolinking-settings")
}

val expoAutolinking = the<ExpoAutolinkingSettingsExtension>()

extensions.configure<com.facebook.react.ReactSettingsExtension> {
    autolinkLibrariesFromCommand(expoAutolinking.rnConfigCommand)
}

expoAutolinking.useExpoModules()
expoAutolinking.useExpoVersionCatalog()

rootProject.name = "Restrainify"
include(":app")
includeBuild(expoAutolinking.reactNativeGradlePlugin.absolutePath)
