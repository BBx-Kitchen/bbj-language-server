# Phase 78: Build & Test Foundation - Pattern Map

**Mapped:** 2026-09-04
**Files analyzed:** 8
**Analogs found:** 7 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `bbj-intellij/build.gradle.kts` (java toolchain block) | config | transform (build config) | `java-interop/build.gradle` (lines 1-14) | exact |
| `bbj-intellij/build.gradle.kts` (verifyLanguageServerBundle task) | config/utility | file-I/O | `bbj-intellij/build.gradle.kts` `copyLanguageServer`/`copyTextMateBundle` (lines 95-119) | exact (same file, sibling task pattern) |
| `bbj-intellij/settings.gradle.kts` (foojay resolver plugin) | config | config | `bbj-intellij/settings.gradle.kts` (lines 1-5, existing plugin block) | exact |
| `bbj-intellij/gradle/gradle-daemon-jvm.properties` | config | config | none (new Gradle-generated file type; no existing analog in repo) | no analog |
| `bbj-intellij/gradle/wrapper/gradle-wrapper.properties` + `.jar`, `gradlew`, `gradlew.bat` | config | config | current committed wrapper files (regenerate in place via `./gradlew wrapper`, do not hand-edit) | exact |
| `.github/dependabot.yml` (new `gradle` ecosystem entry) | config | batch | `.github/dependabot.yml` existing `npm` stanza (lines 1-19) | exact |
| `bbj-intellij/src/test/java/.../*SourceGuardTest.java` (new guard test, discretionary) | test | request-response (static assertion over file text) | `BbjLanguageServerSourceGuardTest.java` (full file, 76 lines) | exact |
| `CLAUDE.md` (one-line IntelliJ build note) | config/docs | n/a | existing IntelliJ plugin build section in `CLAUDE.md` | exact |

## Pattern Assignments

### `bbj-intellij/build.gradle.kts` — java toolchain block (config)

**Analog:** `java-interop/build.gradle` lines 1-14

```groovy
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

tasks.withType(JavaCompile).configureEach {
    options.release.set(17)
}
```

Port to Kotlin DSL and merge with the existing block at `bbj-intellij/build.gradle.kts` lines 11-14 (keep `sourceCompatibility`/`targetCompatibility = VERSION_17` per D-01):

```kotlin
java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}
```

---

### `bbj-intellij/build.gradle.kts` — `verifyLanguageServerBundle` task (config/utility, file-I/O)

**Analog:** same file, `copyLanguageServer` / `copyTextMateBundle` task-registration pattern (lines 95-119) and the `tasks.named("processResources") { dependsOn(...) }` wiring (lines 121-125).

```kotlin
val copyLanguageServer by tasks.registering(Copy::class) {
    from("${projectDir}/../bbj-vscode/out/language/") {
        include("main.cjs")
    }
    into(layout.buildDirectory.dir("resources/main/language-server"))
}
...
tasks.named("processResources") {
    dependsOn(copyTextMateBundle)
    dependsOn(copyLanguageServer)
    dependsOn(copyWebRunner)
}
```

Copy this `tasks.registering` + `dependsOn` shape for the new execution-time check. Wire it as `copyLanguageServer.dependsOn(verifyLanguageServerBundle)` and into the `prepareSandbox` customisation (lines 127-141), which is the second `main.cjs` consumer named in `78-CONTEXT.md`. Use `doLast { ... GradleException(...) }` (execution-time, per D-10) rather than `doFirst` at configuration time — do not duplicate the check in each site; both `dependsOn` the single task per D-09.

**Error handling pattern to use:** throw `GradleException` with the absolute expected path, the one-line fix (`cd bbj-vscode && npm ci && npm run build`), and the CI-supplies-it note (D-11) — matches the project convention (seen in `check-gradle-wrapper.mjs`) of a single directed "What went wrong" message rather than a stack trace.

---

### `bbj-intellij/settings.gradle.kts` — foojay resolver plugin (config)

**Analog:** same file, existing plugin block (full 5 lines):

```kotlin
plugins {
    id("org.jetbrains.intellij.platform.settings") version "2.11.0"
}

rootProject.name = "bbj-intellij"
```

Add the foojay id alongside the existing one, same block:

```kotlin
plugins {
    id("org.jetbrains.intellij.platform.settings") version "2.11.0"
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}
```

---

### `bbj-intellij/gradle/gradle-daemon-jvm.properties` (new, config)

**No analog** — this is a new Gradle-native file type (Daemon JVM criteria, incubating in 8.14) with no precedent elsewhere in the repo. Generate it with `./gradlew updateDaemonJvm --jvm-version=17` per D-02/D-03 rather than hand-authoring; do not invent a hand-written shape. Sits next to `bbj-intellij/gradle/wrapper/` (same `gradle/` directory, not `.gitignore`d — confirmed against `bbj-intellij/gradle/wrapper/gradle-wrapper.properties` at that path).

---

### `bbj-intellij/gradle/wrapper/*` — wrapper regeneration (config)

**Analog:** current committed wrapper files themselves (`gradle-wrapper.properties`, current content):

```
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.13-bin.zip
distributionSha256Sum=20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
```

Regenerate via `./gradlew wrapper --gradle-version 8.14.5 --gradle-distribution-sha256-sum <sha>` (D-04) — never hand-edit this file; the task rewrites `distributionUrl`/`distributionSha256Sum` and regenerates `gradle-wrapper.jar`, `gradlew`, `gradlew.bat` together, keeping the `networkTimeout`/`validateDistributionUrl` lines already present.

---

### `.github/dependabot.yml` — new `gradle` ecosystem entry (config, batch)

**Analog:** existing `npm` stanza, same file (lines 1-19):

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/bbj-vscode"
    schedule:
      interval: "weekly"
    ignore:
      - dependency-name: "chevrotain"
      - dependency-name: "typescript"
        update-types: ["version-update:semver-major"]
```

Append a sibling stanza under the same top-level `updates:` list:

```yaml
  - package-ecosystem: "gradle"
    directory: "/bbj-intellij"
    schedule:
      interval: "weekly"
```

Match the existing indentation/quoting style exactly (double-quoted scalars, 2-space nesting). Add an `ignore:` block only if the planner decides to suppress wrapper-version bumps (Claude's Discretion, D-08) — the `ignore:` shape to copy is the `chevrotain`/`typescript` entries above.

---

### `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/*SourceGuardTest.java` (new, discretionary — D-16)

**Analog:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerSourceGuardTest.java` (full file, 76 lines)

**Imports pattern** (lines 1-11):
```java
package com.basis.bbj.intellij.lsp;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
```

**Guarded-source read pattern** (lines 14-36):
```java
private static final Path GUARDED_SOURCE = Paths.get(
        "src", "main", "java", "com", "basis", "bbj", "intellij", "lsp", "BbjLanguageServer.java")
        .toAbsolutePath();

private static String readGuardedSource() {
    Path resolved = GUARDED_SOURCE;
    if (!Files.exists(resolved)) {
        fail("Guarded source file not found at " + resolved);
    }
    try {
        return Files.readString(resolved);
    } catch (IOException e) {
        throw new UncheckedIOExceptionForTest(resolved, e);
    }
}
```

**Assertion-over-text pattern** (lines 38-53):
```java
@Test
void resolverNamePrecedesTheCommandLineConstruction() {
    String text = readGuardedSource();
    int resolverIndex = text.indexOf("NodeExecutableResolver");
    int commandLineIndex = text.indexOf("new GeneralCommandLine(");
    assertTrue(resolverIndex >= 0, "NodeExecutableResolver is not referenced in the launch file");
    assertTrue(commandLineIndex >= 0, "new GeneralCommandLine( is not present in the launch file");
    assertTrue(resolverIndex < commandLineIndex,
            "NodeExecutableResolver must be named before the command-line construction");
}
```

For D-16's new test, point `GUARDED_SOURCE` at `Paths.get("build.gradle.kts").toAbsolutePath()` (the project-root build script, not a `src/main` file — adjust the relative segments accordingly since `build.gradle.kts` lives at `bbj-intellij/build.gradle.kts`, one level above `src/`), then assert the guard-task name/`GradleException` message substring is present in the text, mirroring the `indexOf`/`assertTrue` shape above rather than the `BbjLanguageServer.java`-specific assertions.

---

### `CLAUDE.md` — one-line IntelliJ build note (docs)

**Analog:** existing "IntelliJ plugin (from `bbj-intellij/`)" section in `CLAUDE.md`'s Build & Test Commands:

```
IntelliJ plugin (from `bbj-intellij/`):
```bash
./gradlew build
```
```

Add one sentence directly below or as a note in that section per D-14 (e.g., "Build `bbj-vscode` first — `./gradlew buildPlugin` fails fast if `bbj-vscode/out/language/main.cjs` is missing; any host JDK works, JDK 17 is provisioned automatically"). `CLAUDE.md` has uncommitted local edits (per gitStatus and D-14) — the executor must diff first and stage only its own hunk, or defer the note if the diff is entangled.

## Shared Patterns

### Gradle task-registration + dependsOn wiring
**Source:** `bbj-intellij/build.gradle.kts` lines 95-125 (`copyTextMateBundle`, `copyLanguageServer`, `copyWebRunner`, `processResources` wiring)
**Apply to:** the new `verifyLanguageServerBundle` task and its `dependsOn` edges into `copyLanguageServer` and `prepareSandbox`.

### Toolchain / release-version pinning
**Source:** `java-interop/build.gradle` lines 6-14
**Apply to:** `bbj-intellij/build.gradle.kts` `java {}` block — the sibling Gradle module in this monorepo already solves the same "pin JDK 17 regardless of host" problem; mirror it exactly per D-01.

### Directed failure messages (GradleException / single "What went wrong" line)
**Source:** `bbj-vscode/tools/check-gradle-wrapper.mjs` (message construction around `GRADLE_CHECKSUMS` lookups, lines ~189-209) — precedent for a single, actionable message string rather than a raw exception dump.
**Apply to:** `verifyLanguageServerBundle`'s `GradleException` message (D-11).

### Source-guard JUnit tests (assert on raw file text, not compiled behavior)
**Source:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerSourceGuardTest.java` (also `BbjNodeDownloaderSourceGuardTest.java`, `BbjSecretArgvSourceGuardTest.java` — same shape)
**Apply to:** the discretionary new guard test for the fail-fast bundle check (D-16).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `bbj-intellij/gradle/gradle-daemon-jvm.properties` | config | config | New Gradle-native generated file (Daemon JVM criteria, incubating in 8.14); no prior file of this kind exists in the repo. Generate via `./gradlew updateDaemonJvm --jvm-version=17` per D-02/D-03 rather than modeling on an analog. |

## Metadata

**Analog search scope:** `bbj-intellij/build.gradle.kts`, `bbj-intellij/settings.gradle.kts`, `bbj-intellij/gradle/`, `bbj-intellij/gradle.properties`, `java-interop/build.gradle`, `.github/dependabot.yml`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/*SourceGuardTest.java`, `bbj-vscode/tools/check-gradle-wrapper.mjs`, `CLAUDE.md`
**Files scanned:** 12
**Pattern extraction date:** 2026-09-04
