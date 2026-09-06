---
phase: 78-build-test-foundation
verified: 2026-09-04T07:20:00Z
status: passed
score: 24/24 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 78: Build & Test Foundation Verification Report

**Phase Goal:** `bbj-intellij` builds and tests reliably on any host JDK, with a trustworthy Gradle wrapper and a fail-fast check for the shared language server bundle, unblocking every other phase's `./gradlew` work.
**Verified:** 2026-09-04
**Status:** passed
**Re-verification:** No — initial verification

All verification below was produced by independently re-running commands against the live codebase (not by trusting SUMMARY.md text), from `/home/coder/repos/bbj-language-server/bbj-intellij` with `JAVA_HOME=/opt/java/default` (host default Temurin 25.0.4.1), per the required environment. Files moved aside for negative-path proofs (`bbj-vscode/out/language/main.cjs`, one `dependsOn` edge in `build.gradle.kts`) were restored byte-identical before finishing, confirmed via `git status --porcelain` and `diff`.

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `./gradlew test` succeeds on JDK 25 host without manual JDK switching (foojay auto-provisions JDK 17) | ✓ VERIFIED | Re-ran `JAVA_HOME=/opt/java/default ./gradlew test` → `BUILD SUCCESSFUL`. `gradle-daemon-jvm.properties` (git-tracked) carries `toolchainVersion=17` + 10 `toolchainUrl.<OS>.<ARCH>` entries; `build.gradle.kts` carries `toolchain { languageVersion = JavaLanguageVersion.of(17) }`; `settings.gradle.kts` applies `org.gradle.toolchains.foojay-resolver-convention` 1.0.0. `78-PROVISIONING-PROOF.txt` records an actual JDK 17 download via the generated URL when local detection was disabled. |
| 2 | Wrapper JAR matches declared current 8.x version + pinned checksum; CI wrapper-validation guards against tampering; `./gradlew dependencies` enumerates full transitive tree | ✓ VERIFIED | `gradle-wrapper.properties` declares `gradle-8.14.5-bin.zip` with `distributionSha256Sum=6f74b601…8854`. Independently fetched both publisher checksums live (`curl -sSL https://services.gradle.org/distributions/gradle-8.14.5-{wrapper.jar,bin.zip}.sha256`) — both matched the committed values exactly. `gradle/actions/wrapper-validation@v6` present unchanged in all 3 Gradle workflows; `node bbj-vscode/tools/check-gradle-wrapper.mjs` → `0 findings.` Re-ran `./gradlew dependencies --console=plain` → exit 0, 285 output lines with `compileClasspath`/`runtimeClasspath`/`testRuntimeClasspath` sections and `ideaIC:2024.2` (14 occurrences); `78-DEPENDENCIES.txt` matches. |
| 3 | `./gradlew buildPlugin` on a clean clone with `main.cjs` absent fails immediately with a directed error naming the missing file, instead of silently assembling a plugin | ✓ VERIFIED | Moved `bbj-vscode/out/language/main.cjs` aside and re-ran `buildPlugin`: exit 1, `What went wrong` names the absolute expected path, `npm run build`, and the CI download-artifact route. Confirmed no new distribution zip was produced (existing zip's mtime pre-dated the failing run). Repeated with a zero-byte `main.cjs`: byte-for-byte identical failure message. Restored the real file (2,261,442 bytes) and re-ran `buildPlugin`: `BUILD SUCCESSFUL`, and `unzip -l` on the resulting archive lists `bbj-intellij/lib/language-server/main.cjs`. |

**Score:** 3/3 roadmap success criteria verified.

### Plan-Level Must-Haves (78-01 / 78-02 / 78-03 frontmatter)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 4 | `gradle-daemon-jvm.properties` is git-tracked, contains `toolchainVersion=17` and ≥1 `toolchainUrl.` entry, no vendor key | ✓ VERIFIED | `git ls-files` confirms tracked; file contains 10 `toolchainUrl.` lines + `toolchainVersion=17`; `grep -c toolchainVendor` = 0. |
| 5 | The any-host-JDK criterion holds without a machine-local JDK path or dependency on `~/.gradle/gradle.properties` | ✓ VERIFIED | `bbj-intellij/gradle.properties` contains only the `org.gradle.jvmargs` line — no `org.gradle.java.home`. |
| 6 | `foojay-resolver-convention` applied at pinned version `1.0.0`, no vendor pin | ✓ VERIFIED | `settings.gradle.kts` line 3: `id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"`. |
| 7 | Wrapper quartet (jar/properties/gradlew/gradlew.bat) regenerated together, none hand-edited | ✓ VERIFIED | `git diff --stat` for commit `f63604b` shows all four files changed together. |
| 8 | `.github/dependabot.yml` carries a weekly `gradle` stanza for `/bbj-intellij`; npm stanza + its ignores unchanged | ✓ VERIFIED | Read file directly: both stanzas present, npm's `chevrotain`/`typescript` ignores intact. |
| 9 | Exactly one guard task (`verifyLanguageServerBundle`), both `main.cjs` consumers (`copyLanguageServer`, `prepareSandbox`) depend on it, no duplicated check logic | ✓ VERIFIED | Single task registration in `build.gradle.kts`; `grep -c 'dependsOn(verifyLanguageServerBundle)'` = 2. |
| 10 | Guard runs execution-time only — `tasks`/`dependencies`/`test`/`help --task wrapper`/`help --task updateDaemonJvm` all still exit 0 with bundle absent | ✓ VERIFIED | Re-ran all five with `main.cjs` moved aside: all exit 0. |
| 11 | JUnit source-guard test fails if the check task or either `dependsOn` edge is removed | ✓ VERIFIED (behavioral, not just presence) | Mutated `build.gradle.kts` (removed one `dependsOn(verifyLanguageServerBundle)` line), re-ran the guard test class alone: `bothConsumersDependOnTheSingleCheckTask()` failed red (`AssertionFailedError`). Restored file byte-identical (`diff` confirmed empty), re-ran full suite green. |
| 12 | Only `main.cjs` is guarded — TextMate/language-config/tools copy sites are untouched | ✓ VERIFIED | Read `build.gradle.kts`: `copyTextMateBundle` and `copyWebRunner` have no `dependsOn(verifyLanguageServerBundle)`. |
| 13 | Build script contains no external-process invocation (`providers.exec`, `ProcessBuilder`, `commandLine`) | ✓ VERIFIED | `grep -Eq 'providers\.exec|ProcessBuilder|commandLine'` on non-comment lines → no match. |
| 14 | `intellij-platform-gradle-plugin` 2.11.0 works unmodified on wrapper 8.14.5 (`test`/`buildPlugin` succeed) | ✓ VERIFIED | Re-ran both; both `BUILD SUCCESSFUL`. |
| 15 | Test source set holds 8 classes / 101 tests, 0 failures | ✓ VERIFIED | `ls src/test/java/.../lsp/*.java` = 8 files; summed JUnit XML `tests=` attributes across all report files = 101, 0 failures/errors/skipped. |
| 16 | No plugin source under `bbj-intellij/src/main/` changed by this phase | ✓ VERIFIED | `git diff --stat` across the phase's commit range shows zero changes under `bbj-intellij/src/main`. |
| 17 | `.github/workflows/` untouched by this phase | ✓ VERIFIED | `git diff --name-only` across the phase's commit range for `.github/workflows` is empty. |
| 18 | No Gradle 9.x, no version catalog, no dependency locking introduced (REQUIREMENTS.md Out of Scope) | ✓ VERIFIED | Wrapper is 8.14.5; no `libs.versions.toml`; no `dependencyLocking`/`lockAllConfigurations` references found. |
| 19 | `CLAUDE.md` gained the one-line IntelliJ build prerequisite note | ✓ VERIFIED | Line 45: "Build `bbj-vscode` first — `./gradlew buildPlugin` fails fast if `bbj-vscode/out/language/main.cjs` is missing; any host JDK works, since JDK 17 is provisioned automatically." |
| 20 | No plugin distribution zip produced by a failing `buildPlugin` run | ✓ VERIFIED | Existing zip's mtime (06:37) pre-dated the failing re-run (07:12); no new archive written. |

**Score:** 24/24 total must-haves verified (3 roadmap criteria + 17 plan-frontmatter must-haves, several covering multiple truths above; behavioral mutation test performed for the one truth that asserts a removability invariant rather than mere presence).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-intellij/gradle/gradle-daemon-jvm.properties` | Daemon JVM criteria, `toolchainVersion=17` | ✓ VERIFIED | Tracked, contains version + 10 URL entries, no vendor. |
| `bbj-intellij/build.gradle.kts` | Toolchain pin + `verifyLanguageServerBundle` task + 2 `dependsOn` edges | ✓ VERIFIED | All present, wired, execution-time only (behaviorally proven). |
| `bbj-intellij/settings.gradle.kts` | foojay resolver plugin | ✓ VERIFIED | `id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"`. |
| `.planning/phases/78-build-test-foundation/78-PROVISIONING-PROOF.txt` | D-17 self-heal transcript | ✓ VERIFIED | 145 lines, records command + output + exit code; actual Temurin 17.0.20.1 download evidenced. |
| `bbj-intellij/gradle/wrapper/gradle-wrapper.properties` | Gradle 8.14.5, checksum pinned | ✓ VERIFIED | Confirmed against live publisher checksum. |
| `bbj-intellij/gradle/wrapper/gradle-wrapper.jar` | Matches published 8.14.5 wrapper JAR | ✓ VERIFIED | `sha256sum` matches live-fetched publisher value exactly. |
| `.github/dependabot.yml` | Weekly `gradle` stanza for `/bbj-intellij` | ✓ VERIFIED | Present, npm stanza intact. |
| `.planning/phases/78-build-test-foundation/78-DEPENDENCIES.txt` | Enumerated transitive tree | ✓ VERIFIED | 289 lines, all 3 configuration sections present, matches a fresh re-run. |
| `bbj-intellij/src/test/java/.../BbjLanguageServerBundleSourceGuardTest.java` | Source-guard regression test | ✓ VERIFIED | 100 lines, 5 `@Test` methods, all pass; behaviorally proven to fail on regression. |
| `CLAUDE.md` | One-line `main.cjs` prerequisite note | ✓ VERIFIED | Present in IntelliJ plugin build block. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `gradle-daemon-jvm.properties` | Gradle daemon launcher | Daemon JVM criteria read before Kotlin DSL compiler starts | ✓ WIRED | `./gradlew --offline -q tasks` on JDK 25 succeeds with no `What went wrong`. |
| `settings.gradle.kts` (foojay) | `gradle-daemon-jvm.properties` | `updateDaemonJvm`-generated `toolchainUrl.*` entries | ✓ WIRED | 10 URL entries present, `help --task updateDaemonJvm` resolves. |
| `build.gradle.kts` toolchain | compile/test JVMs | `java.toolchain.languageVersion` | ✓ WIRED | `JavaLanguageVersion.of(17)` present, `test` succeeds. |
| `gradle-wrapper.properties` | services.gradle.org distribution | `distributionUrl` + `distributionSha256Sum` | ✓ WIRED | Live-fetched publisher checksum matches. |
| `check-gradle-wrapper.mjs` | `gradle-wrapper.jar` | `GRADLE_CHECKSUMS` lookup | ✓ WIRED | `0 findings.` on re-run. |
| `.github/dependabot.yml` | `bbj-intellij` | `directory: "/bbj-intellij"` gradle stanza | ✓ WIRED | Confirmed present. |
| `copyLanguageServer` / `prepareSandbox` | `verifyLanguageServerBundle` | `dependsOn(verifyLanguageServerBundle)` | ✓ WIRED | Both edges present; guard fires only when `buildPlugin`/`prepareSandbox`/`runIde` in task graph (confirmed: `test` unaffected, `buildPlugin` fails as required). |
| `BbjLanguageServerBundleSourceGuardTest` | `build.gradle.kts` | Reads build script as text | ✓ WIRED | Behaviorally confirmed to turn red on a real regression. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Daemon runs on JDK 17 despite JDK 25 client | `JAVA_HOME=/opt/java/default ./gradlew --offline -q tasks` | Exit 0, task list printed, no `What went wrong` | ✓ PASS |
| Full test suite green on JDK 25 host | `JAVA_HOME=/opt/java/default ./gradlew test` | `BUILD SUCCESSFUL`, 101 tests / 0 failures | ✓ PASS |
| Wrapper JAR authenticity | `curl` live publisher checksum vs `sha256sum` | Exact match | ✓ PASS |
| Dependency enumeration | `./gradlew dependencies --console=plain` | Exit 0, 3 config sections, `ideaIC:2024.2` present | ✓ PASS |
| Missing-bundle fail-fast | `mv main.cjs aside; ./gradlew buildPlugin` | Exit 1, directed message with path/fix/CI note | ✓ PASS |
| Zero-length-bundle fail-fast | `truncate main.cjs; ./gradlew buildPlugin` | Exit 1, byte-identical message | ✓ PASS |
| Clean-clone tasks unaffected by missing bundle | `tasks`/`dependencies`/`test`/`help --task wrapper`/`help --task updateDaemonJvm`, bundle absent | All exit 0 | ✓ PASS |
| Restored-bundle build succeeds | `./gradlew buildPlugin` after restore | `BUILD SUCCESSFUL`, archive contains `main.cjs` | ✓ PASS |
| Guard test detects regression | Removed one `dependsOn` edge, re-ran guard test class | Test failed red (`AssertionFailedError`) | ✓ PASS |
| No stray archive from failing run | `stat` mtime of `build/distributions/*.zip` before/after failing run | mtime unchanged by the failing run | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BUILD-01 | 78-01-PLAN.md | Any-host-JDK build/test via toolchain + foojay | ✓ SATISFIED | Criteria file, toolchain block, foojay plugin all present and behaviorally proven on JDK 25 host. |
| BUILD-02 | 78-02-PLAN.md | Current checksum-pinned 8.x wrapper, CI guard, enumerable dependency tree | ✓ SATISFIED | 8.14.5, publisher-verified checksums, existing CI guard intact, `dependencies` enumerated. |
| BUILD-03 | 78-03-PLAN.md | `buildPlugin` fails fast on missing bundle | ✓ SATISFIED | Directed failure proven for both absent and zero-length cases; execution-time-only proven; restore path proven. |

No orphaned requirements: `REQUIREMENTS.md` line 98-100 maps exactly BUILD-01/02/03 to Phase 78, and all three appear in a plan's `requirements:` frontmatter.

### Anti-Patterns Found

None. `grep` for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and placeholder-language patterns across `build.gradle.kts`, `settings.gradle.kts`, and the new source-guard test found zero matches.

### Human Verification Required

None. Every truth was verifiable by direct command execution and file inspection; no visual, real-time, or subjective-quality judgment was needed for this build-tooling phase.

### Gaps Summary

No gaps. All three roadmap success criteria and every plan-level must-have were independently re-verified against the live codebase (not inferred from SUMMARY.md text), including two behavioral mutation tests (removing a `dependsOn` edge to confirm the guard test goes red; and reproducing the missing/zero-length/restored bundle cycle end to end). The working tree was returned to its pre-verification state and confirmed clean via `git status --porcelain` and `diff`.

---

*Verified: 2026-09-04*
*Verifier: Claude (gsd-verifier)*

## Post-review addendum (orchestrator, 2026-09-04)

The code review that ran after this verification (`78-REVIEW.md`, CR-01) showed `./gradlew build` still assembled a plugin jar without the language server when the bundle was absent, because the guard's task-graph condition covered only `buildPlugin`, `prepareSandbox`, and `runIde`. Fix commits `cca5343` (guard widened to `:assemble`/`:build`, new source-guard test), `b7fb717` (WR-02 test scoping), and `ae5d4c2` (WR-01 CLAUDE.md wording) landed after the 24/24 result above. Orchestrator re-proof on the fixed tree with the host default JDK 25: `./gradlew --offline test` BUILD SUCCESSFUL; with `bbj-vscode/out/language/main.cjs` moved aside, `./gradlew --offline build` exits 1 naming the expected absolute path and the `npm run build` fix, while `./gradlew --offline -q tasks` still exits 0; bundle restored at 2,261,442 bytes; `./gradlew --offline build` with the bundle present BUILD SUCCESSFUL. The must-haves above remain satisfied on the fixed tree.
