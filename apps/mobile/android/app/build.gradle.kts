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

val osName = System.getProperty("os.name").lowercase()
val osBin = when {
    osName.contains("win") -> "win64-bin/hermesc.exe"
    osName.contains("mac") -> "osx-bin/hermesc"
    else -> "linux64-bin/hermesc"
}
val hermescBinary = file("../../../../node_modules/hermes-compiler/hermesc/$osBin")

react {
    reactNativeDir.set(file("../../../../node_modules/react-native"))
    codegenDir.set(file("../../../../node_modules/@react-native/codegen"))
    autolinkLibrariesWithApp()
    entryFile.set(file(expoEntryFile))
    cliFile.set(file(expoCliFile))
    bundleCommand.set("export:embed")
    if (hermescBinary.exists()) {
        hermesCommand.set(hermescBinary.absolutePath)
    }
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

    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
        create("release") {
            if (project.hasProperty("MYAPP_UPLOAD_STORE_FILE")) {
                storeFile = file(project.property("MYAPP_UPLOAD_STORE_FILE") as String)
                storePassword = project.property("MYAPP_UPLOAD_STORE_PASSWORD") as String
                keyAlias = project.property("MYAPP_UPLOAD_KEY_ALIAS") as String
                keyPassword = project.property("MYAPP_UPLOAD_KEY_PASSWORD") as String
            } else if (file("release.keystore").exists()) {
                storeFile = file("release.keystore")
                storePassword = System.getenv("KEYSTORE_PASSWORD") ?: "android"
                keyAlias = System.getenv("KEY_ALIAS") ?: "release"
                keyPassword = System.getenv("KEY_PASSWORD") ?: "android"
            } else {
                storeFile = file("debug.keystore")
                storePassword = "android"
                keyAlias = "androiddebugkey"
                keyPassword = "android"
            }
        }
    }

    buildTypes {
        getByName("debug") {
            signingConfig = signingConfigs.getByName("debug")
        }
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
            isShrinkResources = false
        }
    }

    buildFeatures {
        buildConfig = true
    }

    // Interpreter mmap requires the bundled model to remain uncompressed.
    androidResources {
        noCompress += "tflite"
    }
}

dependencies {
    implementation("com.facebook.react:react-android")
    implementation("com.facebook.react:hermes-android")
    implementation("androidx.room:room-runtime:2.7.2")
    kapt("androidx.room:room-compiler:2.7.2")
    implementation("net.zetetic:sqlcipher-android:4.17.0@aar")
    implementation("androidx.sqlite:sqlite:2.5.2")
    implementation("com.microsoft.onnxruntime:onnxruntime-android:1.29.0")
    implementation("org.tensorflow:tensorflow-lite:2.16.1")
    testImplementation("junit:junit:4.13.2")
}

kapt { arguments { arg("room.schemaLocation", "$projectDir/schemas") } }

// Room verifies SQL using SQLite JDBC. Some Windows JDKs resolve temp to C:\Windows.
tasks.withType<org.jetbrains.kotlin.gradle.internal.KaptWithoutKotlincTask>().configureEach {
    val sqliteTemp = layout.buildDirectory.dir("room-temp").get().asFile
    doFirst { sqliteTemp.mkdirs() }
    kaptProcessJvmArgs.add("-Dorg.sqlite.tmpdir=${sqliteTemp.absolutePath}")
}
