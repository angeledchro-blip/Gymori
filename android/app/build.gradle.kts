plugins {
    id("com.android.application")
}

// La URL del Worker sale de la variable de entorno GYM_WEB_URL o de gradle.properties.
val webUrl: String = System.getenv("GYM_WEB_URL")?.takeIf { it.isNotBlank() }
    ?: providers.gradleProperty("gym.webUrl").orNull
    ?: ""

android {
    namespace = "com.sky.gym"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.sky.gym"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "1.1"
        buildConfigField("String", "WEB_URL", "\"$webUrl\"")
    }

    // Llave fija en el repo: así cada APK de Bitrise se instala encima del anterior sin desinstalar.
    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
            storeType = "pkcs12"
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        getByName("debug") {
            signingConfig = signingConfigs.getByName("debug")
        }
        getByName("release") {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    // La app web (../web/public) va adentro del APK para que funcione sin internet en el gym.
    sourceSets {
        getByName("main") {
            assets.srcDir(rootProject.file("../web/public"))
        }
    }
}
