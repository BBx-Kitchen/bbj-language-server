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
        bundledPlugin("org.jetbrains.plugins.textmate")
        pluginVerifier()
        zipSigner()
        instrumentationTools()
    }
}

val copyTextMateBundle by tasks.registering(Copy::class) {
    from("${projectDir}/../bbj-vscode/") {
        include("syntaxes/bbj.tmLanguage.json")
        include("syntaxes/bbx.tmLanguage.json")
        include("bbj-language-configuration.json")
        include("bbx-language-configuration.json")
    }
    into(layout.buildDirectory.dir("resources/main/textmate/bbj-bundle"))
}

tasks.named("processResources") {
    dependsOn(copyTextMateBundle)
}

tasks {
    patchPluginXml {
        sinceBuild.set("242")
        untilBuild.set("243.*")
    }

    runIde {
        args = listOf(System.getProperty("user.home") + "/tinybbj")
    }
}
