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
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
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

    testImplementation(platform("org.junit:junit-bom:5.10.2"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}

tasks.named("buildPlugin") {
    dependsOn(tasks.named("test"))
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

    publishing {
        token = providers.gradleProperty("intellijPlatformPublishingToken")
        // Channel to publish to on JetBrains Marketplace. Defaults to "default" (the
        // stable channel) so releases are unaffected; preview builds pass
        // -PintellijChannel=preview to publish snapshots to a separate opt-in channel.
        channels = listOf(providers.gradleProperty("intellijChannel").getOrElse("default"))
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

// #517 (BUILD-03): copyLanguageServer (below) and the prepareSandbox customisation
// are both Copy-style consumers of the shared language-server bundle built by
// bbj-vscode. A Copy task (or PrepareSandboxTask from(...) block) with a missing
// source silently no-sources instead of failing, which would otherwise let
// buildPlugin ship a plugin archive with no language server inside it. This task
// is the single execution-time guard both consumers depend on (D-09); it never
// runs at configuration time (D-10), so a clean clone can still run `tasks`,
// `dependencies`, `test`, `wrapper`, and `updateDaemonJvm` without the bundle
// present. It does not, and must never, produce the bundle itself (D-11) — that
// remains the developer's or CI's job.
val verifyLanguageServerBundle by tasks.registering {
    val bundleFile = layout.projectDirectory.file("../bbj-vscode/out/language/main.cjs").asFile
    // Never up to date: this is a cheap presence/size check, not a build product,
    // and it must re-run every time a dependent task runs.
    outputs.upToDateWhen { false }
    doLast {
        // Enforce only when a task that actually ships the bundle is part of this
        // build's task graph (D-10: buildPlugin/prepareSandbox/runIde may fail).
        // `assemble`/`build` are included too (#517 CR-01): `jar` is on the
        // standard assemble/build lifecycle and packages main.cjs unconditionally
        // (see the `jar` task below), so `./gradlew build` — the exact command
        // CLAUDE.md's IntelliJ section documents — would otherwise silently ship
        // a plugin jar with no language server. `:jar` itself is deliberately NOT
        // added here: `copyLanguageServer` (and therefore this task) is ALSO
        // reached from `test`'s IntelliJ Platform Gradle Plugin sandbox
        // composition (prepareTestSandbox -> composedJar -> instrumentedJar ->
        // jar -> copyLanguageServer) even though the JUnit tests never touch the
        // bundle themselves — that pre-existing coupling (confirmed present
        // before this check was added) must not make `test` fail on a clean
        // clone, and `test` never puts `assemble`/`build` in its own task graph.
        val packagingRequested = gradle.taskGraph.hasTask(":buildPlugin") ||
            gradle.taskGraph.hasTask(":prepareSandbox") ||
            gradle.taskGraph.hasTask(":runIde") ||
            gradle.taskGraph.hasTask(":assemble") ||
            gradle.taskGraph.hasTask(":build")
        if (packagingRequested && (!bundleFile.exists() || bundleFile.length() == 0L)) {
            throw GradleException(
                """
                Missing or empty shared language-server bundle.

                Expected file: ${bundleFile.absolutePath}

                Fix: build bbj-vscode first:
                    cd bbj-vscode && npm ci && npm run build

                In CI, this file is supplied by the download-artifact step rather than
                built by Gradle — do not add an npm/Node invocation here.
                """.trimIndent()
            )
        }
    }
}

// Deliberately NOT under build/resources/main: that directory is
// sourceSets.main.output.resourcesDir, which the standard Java plugin makes
// classes/compileTestJava/test transitively depend on. Landing main.cjs there
// (as this task used to) makes verifyLanguageServerBundle's failure propagate
// into `test` via classes -> processResources's overlapping-output detection,
// breaking D-10's "test keeps working without the bundle" requirement. Packaging
// (the `jar` task below) pulls this directory in explicitly instead.
val copyLanguageServer by tasks.registering(Copy::class) {
    dependsOn(verifyLanguageServerBundle)
    from("${projectDir}/../bbj-vscode/out/language/") {
        include("main.cjs")
    }
    into(layout.buildDirectory.dir("language-server-bundle"))
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
    dependsOn(copyWebRunner)
}

// main.cjs (as a classpath-resource fallback bundled inside the plugin jar) is
// packaged directly from copyLanguageServer's own output directory rather than
// through sourceSets.main.output/processResources — see the comment on
// copyLanguageServer above for why. This keeps the dependency on
// verifyLanguageServerBundle scoped to packaging tasks (jar and, via it,
// buildPlugin) and out of classes/compileTestJava/test's task graph.
tasks.named<Jar>("jar") {
    dependsOn(copyLanguageServer)
    from(layout.buildDirectory.dir("language-server-bundle")) {
        into("language-server")
    }
}

tasks.named<PrepareSandboxTask>("prepareSandbox") {
    dependsOn(verifyLanguageServerBundle)
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
