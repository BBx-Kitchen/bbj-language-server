plugins {
    id("java")
    id("org.jetbrains.intellij.platform")
}

group = "com.basis.bbj"
version = "0.1.0-alpha"

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        intellijIdeaCommunity("2024.2")
        pluginVerifier()
        zipSigner()
        instrumentationTools()
    }
}

tasks {
    patchPluginXml {
        sinceBuild.set("242")
        untilBuild.set("243.*")
    }
}
