import org.jetbrains.intellij.platform.gradle.tasks.PrepareSandboxTask

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
        plugin("com.redhat.devtools.lsp4ij:0.19.0")
        pluginVerifier()
        zipSigner()
        instrumentationTools()
    }
}

intellijPlatform {
    pluginConfiguration {
        name = "BBj Language Support"
        version = project.version.toString()

        vendor {
            name = "BASIS International Ltd."
            email = "support@basis.cloud"
            url = "https://basis.cloud"
        }

        description = file("src/main/resources/META-INF/description.html").readText()

        ideaVersion {
            sinceBuild = "242"
            untilBuild = provider { "" }
        }
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

val copyLanguageServer by tasks.registering(Copy::class) {
    from("${projectDir}/../bbj-vscode/out/language/") {
        include("main.cjs")
    }
    into(layout.buildDirectory.dir("resources/main/language-server"))
}

val copyWebRunner by tasks.registering(Copy::class) {
    from("${projectDir}/../bbj-vscode/tools/") {
        include("web.bbj")
    }
    into(layout.buildDirectory.dir("resources/main/tools"))
}

tasks.named("processResources") {
    dependsOn(copyTextMateBundle)
    dependsOn(copyLanguageServer)
    dependsOn(copyWebRunner)
}

tasks.named<PrepareSandboxTask>("prepareSandbox") {
    from("${projectDir}/../bbj-vscode/out/language/") {
        include("main.cjs")
        into("${pluginName.get()}/lib/language-server")
    }
    from(layout.buildDirectory.dir("resources/main/textmate")) {
        into("${pluginName.get()}/lib/textmate")
    }
    from("${projectDir}/../bbj-vscode/tools/") {
        include("web.bbj")
        into("${pluginName.get()}/lib/tools")
    }
}

tasks {
    runIde {
        args = listOf(System.getProperty("user.home") + "/tinybbj")
    }
}
