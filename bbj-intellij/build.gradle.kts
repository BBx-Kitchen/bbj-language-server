import org.jetbrains.intellij.platform.gradle.tasks.PrepareSandboxTask

plugins {
    id("java")
    id("org.jetbrains.intellij.platform")
}

group = "com.basis.bbj"
version = providers.gradleProperty("version").getOrElse("0.1.0")

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

        changeNotes = """
            <h3>0.1.0 - Initial Release</h3>
            <ul>
              <li>Syntax highlighting with TextMate grammars for BBj and BBx config files</li>
              <li>Real-time error diagnostics and validation</li>
              <li>Intelligent code completion for BBj keywords and Java classes</li>
              <li>Go-to-definition navigation</li>
              <li>Hover documentation for symbols and methods</li>
              <li>Signature help for method calls</li>
              <li>Java interop intelligence for BASIS.BBjAPI classes</li>
              <li>Run commands for GUI, BUI, and DWC programs</li>
              <li>Document outline and structure view</li>
            </ul>
        """.trimIndent()

        ideaVersion {
            sinceBuild = "242"
            untilBuild = provider { null }
        }
    }

    pluginVerification {
        ides {
            recommended()
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
        include("em-login.bbj")
        include("em-validate-token.bbj")
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
        include("em-login.bbj")
        include("em-validate-token.bbj")
        into("${pluginName.get()}/lib/tools")
    }
}

tasks {
    runIde {
        args = listOf(System.getProperty("user.home") + "/tinybbj")
    }
}
