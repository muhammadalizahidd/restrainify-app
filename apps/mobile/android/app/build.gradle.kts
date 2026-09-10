plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.kapt")
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
    buildToolsVersion = rootProject.extra["buildToolsVersion"] as String
    ndkVersion = rootProject.extra["ndkVersion"] as String

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
    implementation("androidx.room:room-runtime:2.7.2")
    kapt("androidx.room:room-compiler:2.7.2")
    implementation("net.zetetic:sqlcipher-android:4.17.0@aar")
    implementation("androidx.sqlite:sqlite:2.5.2")
    testImplementation("junit:junit:4.13.2")
}

kapt { arguments { arg("room.schemaLocation", "$projectDir/schemas") } }

// Room verifies SQL using SQLite JDBC. Some Windows JDKs resolve temp to C:\Windows.
tasks.withType<org.jetbrains.kotlin.gradle.internal.KaptWithoutKotlincTask>().configureEach {
    val sqliteTemp = layout.buildDirectory.dir("room-temp").get().asFile
    doFirst { sqliteTemp.mkdirs() }
    kaptProcessJvmArgs.add("-Dorg.sqlite.tmpdir=${sqliteTemp.absolutePath}")
}
