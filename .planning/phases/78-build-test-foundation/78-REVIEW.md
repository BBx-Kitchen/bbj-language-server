---
phase: 78-build-test-foundation
reviewed: 2026-09-04T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - .github/dependabot.yml
  - CLAUDE.md
  - bbj-intellij/build.gradle.kts
  - bbj-intellij/gradle/gradle-daemon-jvm.properties
  - bbj-intellij/gradle/wrapper/gradle-wrapper.jar
  - bbj-intellij/gradle/wrapper/gradle-wrapper.properties
  - bbj-intellij/gradlew
  - bbj-intellij/gradlew.bat
  - bbj-intellij/settings.gradle.kts
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerBundleSourceGuardTest.java
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 78: Code Review Report

**Reviewed:** 2026-09-04
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Reviewed the Gradle daemon-JVM/toolchain pinning, the Gradle 8.14.5 wrapper regeneration, the Dependabot `gradle` stanza, the `verifyLanguageServerBundle` fail-fast task and its JUnit source-guard test, and the CLAUDE.md doc edit for Phase 78 (BUILD-01..03).

The daemon-JVM and wrapper work (D-01–D-08) checks out: the committed `gradle-daemon-jvm.properties` pins `toolchainVersion=17` with vendor-neutral `toolchainUrl.*` entries, the `java.toolchain` block mirrors `java-interop/build.gradle`, `settings.gradle.kts` applies the foojay resolver at the version specified in the locked decisions, and `gradle-wrapper.jar`'s SHA-256 (`7d3a4ac4…296172`, verified locally with `sha256sum`) matches the published Gradle 8.14.5 wrapper checksum recorded in `78-02-SUMMARY.md`. The Dependabot `gradle` stanza and its deliberate absence of an `ignore:` block match D-08's documented rationale.

The fail-fast bundle check (BUILD-03, D-09/D-10) has a real, empirically-confirmed gap: its `gradle.taskGraph.hasTask(...)` scoping only fires for `:buildPlugin`, `:prepareSandbox`, and `:runIde`, but `./gradlew build`/`./gradlew assemble`/`./gradlew jar` — which also package `main.cjs` into the plugin jar via the same `copyLanguageServer` → `jar` chain — are not in that list. With the bundle absent, `./gradlew build` (the exact command CLAUDE.md's IntelliJ section shows as the way to build the plugin) reports `BUILD SUCCESSFUL` and produces a jar with no `language-server/` entry at all. This is exactly the silent-failure mode BUILD-03/#517 was written to close, just reached through a different, more commonly-run entry point than the one that was tested. See CR-01 for the reproduction and a validated fix.

Two warnings and two info items round out the review (test-assertion brittleness, doc/command mismatch amplifying CR-01, and a triplicated bundle-path string).

## Critical Issues

### CR-01: Fail-fast guard does not cover `./gradlew build`/`assemble`/`jar` — the documented build command silently ships a plugin jar without the language server

**File:** `bbj-intellij/build.gradle.kts:132-135` (also `CLAUDE.md:41-45`)
**Issue:**

The `verifyLanguageServerBundle` task only throws when `:buildPlugin`, `:prepareSandbox`, or `:runIde` is in the current task graph:

```kotlin
val packagingRequested = gradle.taskGraph.hasTask(":buildPlugin") ||
    gradle.taskGraph.hasTask(":prepareSandbox") ||
    gradle.taskGraph.hasTask(":runIde")
```

But `main.cjs` is also packaged into the plugin `jar` unconditionally (`tasks.named<Jar>("jar") { dependsOn(copyLanguageServer); from(...) { into("language-server") } }`, build.gradle.kts:188-193), and `jar` is on the standard `assemble`/`build` lifecycle, which never routes through `prepareSandbox`/`buildPlugin`/`runIde`. I reproduced this directly (gitignored artifact `bbj-vscode/out/language/main.cjs` moved aside and restored afterward, no repository files touched):

```
$ mv bbj-vscode/out/language/main.cjs /tmp/main.cjs.bak
$ ./gradlew -p bbj-intellij build
...
> Task :verifyLanguageServerBundle
> Task :copyLanguageServer
> Task :jar
> Task :assemble
...
> Task :build
BUILD SUCCESSFUL in 3s

$ unzip -l bbj-intellij/build/libs/bbj-intellij-0.1.0.jar | grep -i language-server
NO language-server ENTRY FOUND IN JAR
```

`./gradlew build` is not a hypothetical entry point — it is the *only* command CLAUDE.md's "IntelliJ plugin (from `bbj-intellij/`)" section shows:

```
IntelliJ plugin (from `bbj-intellij/`):
./gradlew build
Build `bbj-vscode` first — `./gradlew buildPlugin` fails fast if `bbj-vscode/out/language/main.cjs` is missing; ...
```

So a developer following CLAUDE.md's own literal instructions gets a green `BUILD SUCCESSFUL` and a plugin jar silently missing its language server — the exact failure mode #517/BUILD-03 exists to prevent, just reached via `build`/`assemble`/`jar` instead of `buildPlugin`. `78-03-SUMMARY.md`'s D4 clean-clone proof table and CLAUDE.md's own note both only ever exercise/name `buildPlugin`, so this gap was never exercised.

**Fix:**

Add `:assemble` and `:build` to the trigger condition. I verified with `--dry-run` that this does not regress D-10's "`test` must keep working without the bundle" requirement — `./gradlew test` run standalone never puts `:assemble` or `:build` in its task graph (only `:jar` via the sandbox-composition coupling already documented in the code comments), so it stays unaffected:

```kotlin
val packagingRequested = gradle.taskGraph.hasTask(":buildPlugin") ||
    gradle.taskGraph.hasTask(":prepareSandbox") ||
    gradle.taskGraph.hasTask(":runIde") ||
    gradle.taskGraph.hasTask(":assemble") ||
    gradle.taskGraph.hasTask(":build")
```

Note `:jar` itself still can't safely be added (`./gradlew test` alone already includes `:jar` in its graph via `prepareTestSandbox → composedJar → instrumentedJar → jar`, so adding it would break `test` on a clean clone) — a bare `./gradlew jar` invocation remains an unguarded residual edge case, but that command isn't part of any documented workflow the way `build`/`assemble` are.

Also extend the D-16 verification matrix (and ideally `BbjLanguageServerBundleSourceGuardTest`, or a follow-up integration proof) to include `./gradlew build`/`assemble` with the bundle absent, and reconcile CLAUDE.md so the note doesn't imply the documented `./gradlew build` command itself fails fast when in fact only `buildPlugin` currently does.

## Warnings

### WR-01: CLAUDE.md's fail-fast note names `buildPlugin`, but the example command right above it is `build`

**File:** `CLAUDE.md:41-45`
**Issue:** The IntelliJ build section shows `./gradlew build` as the command, then states "`./gradlew buildPlugin` fails fast if ... main.cjs is missing." Even independent of CR-01's code gap, this is confusing: the reader is told to run `build`, then warned about a different task's behavior. Once CR-01 is fixed, this note should also mention `build`/`assemble` explicitly, or the example command should be changed to `buildPlugin`.
**Fix:** Align the illustrated command and the fail-fast claim, e.g.: "`./gradlew build` (or `buildPlugin`) fails fast if `bbj-vscode/out/language/main.cjs` is missing; ..." — only accurate once CR-01's task-graph scoping is widened.

### WR-02: `checkRunsAtExecutionTimeNotConfigurationTime` binds "doLast" to the wrong task if another `doLast` is added earlier in the file

**File:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerBundleSourceGuardTest.java:78-89`
**Issue:** The test asserts `checkTaskIndex < doLastIndex` using `text.indexOf("verifyLanguageServerBundle by tasks.registering")` and `text.indexOf("doLast")` — the *first* occurrence of the literal string `"doLast"` anywhere in the whole file, not the `doLast` that belongs to `verifyLanguageServerBundle`'s own block. Today there is exactly one `doLast` in `build.gradle.kts`, so the assertion is correct by coincidence. If a future task (registered before `verifyLanguageServerBundle`, e.g. inside `copyTextMateBundle`) also gains a `doLast`, this test would start failing even though the guard itself is still correctly execution-time-only — a false positive that would need debugging to realize it's the test's own binding that's wrong, not the guard.
**Fix:** Scope the search to the guard's own block, e.g. slice `text` from `checkTaskIndex` to the next top-level `val ... by tasks.registering` (or to a matching closing brace) before searching for `doLast` within that substring, so the assertion is bound to the actual task rather than "wherever the first `doLast` in the file happens to be."

## Info

### IN-01: `../bbj-vscode/out/language/main.cjs` path is duplicated as a raw string in three places

**File:** `bbj-intellij/build.gradle.kts:119, 162-163, 197-199`
**Issue:** The bundle path is independently written in `verifyLanguageServerBundle`'s `bundleFile` (`layout.projectDirectory.file("../bbj-vscode/out/language/main.cjs")`), `copyLanguageServer`'s `from("${projectDir}/../bbj-vscode/out/language/")`, and `prepareSandbox`'s `from("${projectDir}/../bbj-vscode/out/language/")`. If the shared bundle's location ever moves, all three must be updated in lockstep, and nothing enforces that.
**Fix:** Extract a single `val bbjVscodeLanguageOutDir = "${projectDir}/../bbj-vscode/out/language"` (or a `Provider<Directory>`) and reference it from all three sites.

### IN-02: CLAUDE.md's "any host JDK works" claim doesn't caveat the offline/no-local-JDK-17 case

**File:** `CLAUDE.md:45`
**Issue:** "any host JDK works, since JDK 17 is provisioned automatically" is true when either a local JDK 17 is auto-detected or network egress to `api.foojay.io` is available (per `78-01-SUMMARY.md`'s D-17 proof). On a host with neither (no local JDK 17 and blocked egress), the daemon/toolchain provisioning would fail, and the one-line note doesn't flag that possibility.
**Fix:** Optional — a short parenthetical ("requires network access if no local JDK 17 is installed") would set correct expectations for air-gapped CI/dev environments, consistent with D-17's own hedge in the phase context.

---

_Reviewed: 2026-09-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
