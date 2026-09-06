# Phase 78: Build & Test Foundation - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning
**Mode:** `--auto` — every decision below is the recommended default, selected without user prompts. Each `[auto]` line in `78-DISCUSSION-LOG.md` records the alternatives.

<domain>
## Phase Boundary

`bbj-intellij` builds and tests on any host JDK (this environment's default is Temurin 25.0.4.1), on a current, checksum-pinned, CI-validated Gradle 8.x wrapper whose transitive dependency tree can be enumerated, and `./gradlew buildPlugin` on a clean clone fails fast with a directed message when the shared language-server bundle `../bbj-vscode/out/language/main.cjs` is absent. Requirements BUILD-01, BUILD-02, BUILD-03 (#570, #503, #576, #517).

Build configuration only: `bbj-intellij/build.gradle.kts`, `settings.gradle.kts`, `gradle/`, `.github/dependabot.yml`, and at most a one-line doc note. No plugin source under `src/main/` changes. No Gradle 9.x, no version catalogs, no dependency locking, no new test harness (REQUIREMENTS.md Out of Scope).

</domain>

<decisions>
## Implementation Decisions

### Verified state of `main` (corrects the research)

The research in `.planning/research/SUMMARY.md` and `STACK.md` was written against an older tree. Facts checked on 2026-09-04 against the working tree and Gradle's published checksums:

- The committed `gradle-wrapper.jar` SHA-256 (`81a82aae…ae45f`) **matches the published 8.13 wrapper JAR**, and `gradle-wrapper.properties` already pins `distributionSha256Sum` for 8.13. Commit `f7908c0` (2026-08-21) did this. The research's "JAR from the 8.10–8.12.1 line" claim no longer holds.
- `gradle/actions/wrapper-validation@v6` already runs before every `./gradlew` step in `pr-validation.yml`, `preview.yml`, and `manual-release.yml`, and `workflow-hygiene.yml` runs `bbj-vscode/tools/check-gradle-wrapper.mjs`, which asserts the pin, the JAR/version match, and the validation-step ordering. Its `GRADLE_CHECKSUMS` table already tabulates 8.14.5.
- `./gradlew --offline -q tasks` on this host fails exactly as #570 describes (`* What went wrong: 25.0.4.1`). The stack trace is `org.jetbrains.kotlin…JavaVersion.parse` inside `KotlinCompiler.compileKotlinScriptModuleTo` — Gradle 8.13's embedded Kotlin DSL compiler running in the **daemon JVM** (JDK 25), before `build.gradle.kts` is evaluated. A `java { toolchain {} }` block in that script therefore cannot fix #570 on its own.
- Gradle's compatibility matrix for 8.14.5 lists Java 24 as the newest version supported for running Gradle and Java 25 as N/A. Staying on 8.x (locked) means the daemon must run on a JDK ≤ 24, so the fix has to steer the daemon JVM, not just the compile/test JVM.
- Scratch verification (copy of `bbj-intellij/` in the session scratchpad, wrapper still 8.13, JDK 25 client): adding `gradle/gradle-daemon-jvm.properties` containing `toolchainVersion=17` made `./gradlew --offline -q tasks`, `./gradlew --offline -q dependencies --configuration compileClasspath`, and `./gradlew --offline test` all succeed (`BUILD SUCCESSFUL`). JDK 17 was located through this host's `~/.gradle/gradle.properties` (`org.gradle.java.installations.paths=/opt/java/17,/opt/java/21`); `/opt/java/17` and `/opt/java/21` exist here.
- The `org.gradle.toolchains.foojay-resolver-convention` plugin is **not** in the local Gradle cache; resolving it needs plugin-portal egress (services.gradle.org was reachable from this session).
- `bbj-vscode/out/language/main.cjs` is present locally (built 2026-09-03). `CLAUDE.md` has uncommitted local edits — do not clobber them.

### Daemon JVM mechanism (BUILD-01, #570)

- **D-01:** Fix #570 with **both** layers: (a) `java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }` in `build.gradle.kts`, mirroring `java-interop/build.gradle`, so compile and test always run on 17 regardless of the daemon; and (b) a committed `bbj-intellij/gradle/gradle-daemon-jvm.properties` (Gradle Daemon JVM criteria, `toolchainVersion=17`) so the daemon itself runs on JDK 17 whatever JVM launched `gradlew`. (b) is the part that actually makes criterion 1 true; (a) is what the issues' acceptance criteria literally ask for and keeps the compile target honest. Keep the existing `sourceCompatibility`/`targetCompatibility = VERSION_17` lines (harmless alongside the toolchain). — **Reversibility:** reversible — two committed files, no downstream contract.
- **D-02:** Apply `org.gradle.toolchains.foojay-resolver-convention` version `1.0.0` in `settings.gradle.kts` (alongside the unchanged `org.jetbrains.intellij.platform.settings` 2.11.0) and generate the criteria file with `./gradlew updateDaemonJvm --jvm-version=17` so the file carries `toolchainUrl.<OS>.<ARCH>` download entries for every platform. That is what lets a machine with *no* JDK 17 self-heal (Gradle 8.13+ daemon JVM auto-provisioning) instead of relocating the #570 failure. Do not pin a vendor in the criteria (no `--jvm-vendor`), so any locally installed JDK 17 is accepted before a download is attempted; the executor records which vendor URLs the task generated. — **Reversibility:** reversible.
- **D-03:** Bootstrap order matters: `updateDaemonJvm` needs a running daemon, which on this host fails on JDK 25. Bootstrap once with `JAVA_HOME=/opt/java/17 ./gradlew updateDaemonJvm --jvm-version=17` (or hand-write `toolchainVersion=17` first, then run the task to add the URLs). Every subsequent invocation in the phase must run with the host default JDK 25 (`JAVA_HOME=/opt/java/default`, no `org.gradle.java.home`) to prove the criterion. Never commit `org.gradle.java.home` or rely on `~/.gradle/gradle.properties` — that file is machine-local and is exactly the "manual JDK switching" criterion 1 forbids.

### Gradle wrapper target and regeneration (BUILD-02, #503, #576)

- **D-04:** Regenerate the wrapper to **Gradle 8.14.5** (latest 8.x; Gradle 9.x is out of scope by REQUIREMENTS.md) using the wrapper task, never by hand-editing: `./gradlew wrapper --gradle-version 8.14.5 --gradle-distribution-sha256-sum 6f74b601422d6d6fc4e1f9a1ab6522f642c2fdcbc15ae33ebd30ba3d7198e854`, run from `bbj-intellij/` **after** D-01–D-03 land (the task needs a working daemon). Commit `gradle-wrapper.jar`, `gradle-wrapper.properties`, `gradlew`, `gradlew.bat` together. — **Reversibility:** reversible.
- **D-05:** Independently verify both artefacts before committing: the resulting `gradle-wrapper.jar` SHA-256 must equal the value published at `https://services.gradle.org/distributions/gradle-8.14.5-wrapper.jar.sha256` (which is the `7d3a4ac4…6172` entry already tabulated for 8.14.5 in `check-gradle-wrapper.mjs`), and the `distributionSha256Sum` must equal `…-bin.zip.sha256`. Fetch the published values at execution time (`curl -L`, the URLs 301-redirect) rather than trusting the research's copy. Then run `node bbj-vscode/tools/check-gradle-wrapper.mjs` locally; it must report no findings. Existing CI steps stay as they are — `wrapper-validation@v6` and `workflow-hygiene.yml` already satisfy the "CI wrapper-validation step guards it" clause; do not add a second validation step.
- **D-06:** Re-run the full IntelliJ JUnit suite (`./gradlew test`, currently 96 tests / 7 classes) and `./gradlew buildPlugin` on the new wrapper, because `intellij-platform-gradle-plugin` 2.11.0 declares 8.13 as its minimum and 8.14.5 has not been exercised in this repo. If 2.11.0 breaks on 8.14.5, stop and surface it — bumping the platform plugin is not in this phase.
- **D-07:** Record the enumerated transitive tree: run `./gradlew dependencies` (all configurations) on the JDK 25 host and keep the output in the plan's SUMMARY (or a `78-DEPENDENCIES.txt` next to it). That output is the closing evidence for #576's "enumerable for the first time" clause. Note the `compileClasspath` tree is short (`ideaIC:2024.2`, bundled TextMate plugin, LSP4IJ 0.19.0); the runtime/test trees are what carry the JUnit BOM fan-out.
- **D-08:** Add a `gradle` ecosystem entry for `/bbj-intellij` (weekly) to `.github/dependabot.yml`. REQUIREMENTS.md's Out-of-Scope table states "Wrapper pin plus Dependabot entry satisfies #503/#576", and #576 names the missing entry explicitly, so this is inside the requirement, not creep. Known interaction: a future Dependabot wrapper bump will fail `workflow-hygiene.yml` until its checksums are added to `GRADLE_CHECKSUMS` — that is the intended control, note it in the PR description. — **Reversibility:** reversible.

### Fail-fast bundle check (BUILD-03, #517)

- **D-09:** Implement the check as **one dedicated Gradle task** (e.g. `verifyLanguageServerBundle`) that both `copyLanguageServer` and the `prepareSandbox` customisation `dependsOn`, rather than duplicating a `doFirst` in each. One check, one message, one place a test can target. The task declares `../bbj-vscode/out/language/main.cjs` as an input path and fails in its action when the file is missing or zero-length. — **Reversibility:** reversible.
- **D-10:** The check runs at **execution time**, never at configuration time. `./gradlew tasks`, `wrapper`, `updateDaemonJvm`, `dependencies`, and `test` must keep working on a clean clone without `main.cjs`; only tasks that actually bundle the language server (`processResources`/`buildPlugin`/`prepareSandbox`/`runIde`) may fail. A configuration-time check would break the very wrapper regeneration this phase performs on a clean clone.
- **D-11:** Failure message content: the absolute path that was expected, the one-line fix (`cd bbj-vscode && npm ci && npm run build`), and a note that CI supplies the file through the `download-artifact` step. Use Gradle's `GradleException` so the message is the "What went wrong" line, not buried in a stack trace. Do not auto-invoke `npm run build` from Gradle (rejected: couples the Gradle build to a Node toolchain, duplicates the CI artifact flow, and the requirement asks for a directed failure, not a hidden dependency).
- **D-12:** Only `main.cjs` is guarded. The TextMate grammars, language-configuration files, and `tools/*.bbj` runners copied from `bbj-vscode/` are tracked in git and always present on a clone; guarding them is outside #517.

### CI and docs touch

- **D-13:** Leave the three Gradle workflows' `actions/setup-java` (Temurin 17) steps unchanged. With D-01/D-02 the criteria are satisfied by the installed 17 without any download, so CI behaviour is identical. Do not add JDK 21/25 matrix jobs — criterion 1 is proven locally on this host, and widening CI is not in the requirement.
- **D-14:** One-line doc note at most: in `CLAUDE.md`'s IntelliJ build section, state that `bbj-vscode` must be built first and that any host JDK works (JDK 17 is provisioned automatically). `CLAUDE.md` currently has uncommitted local edits — the executor edits in place and stages only its own hunk, or leaves the doc for the maintainer if the diff is entangled. The Docusaurus developer guide was removed from the public site in v3.5, so there is nothing else to update.

### Verification evidence (what "done" looks like)

- **D-15:** All proofs run with `JAVA_HOME=/opt/java/default` (JDK 25) from `bbj-intellij/` and are recorded with exit codes in the SUMMARY: `./gradlew --offline -q tasks` (the #570 regression check), `./gradlew dependencies`, `./gradlew test`, `./gradlew buildPlugin`, plus `node bbj-vscode/tools/check-gradle-wrapper.mjs`.
- **D-16:** Prove BUILD-03 by an actual run: temporarily move `bbj-vscode/out/language/main.cjs` aside, run `./gradlew buildPlugin`, capture the failure text, then restore the file and confirm `buildPlugin` succeeds again. Add a source-guard JUnit test in the existing `*SourceGuardTest` style (see `src/test/java/com/basis/bbj/intellij/lsp/BbjLanguageServerSourceGuardTest.java`) asserting the check is present in `build.gradle.kts`, at the planner's discretion — cheap, and consistent with REQUIREMENTS.md's "plain-JUnit and source-guard pattern suffices". No Gradle TestKit dependency.
- **D-17:** Attempt one provisioning proof of D-02's self-heal path: run with auto-detection disabled and no installation hints (`-Porg.gradle.java.installations.auto-detect=false -Porg.gradle.java.installations.paths=`) so Gradle must download JDK 17 through the generated `toolchainUrl`. If egress to `api.foojay.io` is blocked in the execution sandbox, record that outcome and rely on the generated URLs plus the local-detection proof; do not fail the phase on it.

### Claude's Discretion
- Exact task name and Kotlin DSL shape for the fail-fast check (D-09), as long as the dependency wiring and execution-time behaviour hold.
- Whether the Dependabot `gradle` entry should ignore wrapper-version updates or let them flow through the hygiene gate (D-08).
- Whether to also surface the JDK 24+ client-side `--enable-native-access` warnings; they are cosmetic and `gradlew` is regenerated by the wrapper task, so the default is to leave them alone.
- Plan splitting: the natural order is (1) D-01–D-03 daemon/toolchain, (2) D-04–D-08 wrapper + Dependabot, (3) D-09–D-12 fail-fast + D-14 doc, with D-15–D-17 verification threaded through each; the planner decides whether that is one, two, or three plans.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` — §Build and Test Foundation (BUILD-01, BUILD-02, BUILD-03) and §Out of Scope (Gradle 9.x, version catalogs, dependency locking, new test harness are excluded; "Wrapper pin plus Dependabot entry" is the stated satisfying set for #503/#576)
- `.planning/ROADMAP.md` — Phase 78 entry: goal and the three success criteria
- `.planning/STATE.md` — §Accumulated Context: v4.2 sequencing note (78 gates every `./gradlew` invocation), standing decisions carried from v4.1
- `.planning/PROJECT.md` — §Constraints and §Key Decisions (verifyPlugin only in release builds; path-filtered PR validation; GITHUB_TOKEN for plugin verifier)

### Research (read with the corrections in D-section "Verified state of main")
- `.planning/research/SUMMARY.md` — §Phase 1: Build & Test Foundation, §Stack, §Sequencing (#570 gates #503/#576)
- `.planning/research/STACK.md` — §Core Technologies (build/toolchain) and the installation recipe (toolchain block, foojay 1.0.0, `./gradlew wrapper --gradle-version 8.14.5 …`); its wrapper-JAR-mismatch claim is stale, and its recipe omits the daemon-JVM criteria that D-01 adds

### Build files this phase edits
- `bbj-intellij/build.gradle.kts` — `java {}` block (lines 11-14), `copyLanguageServer` and the `prepareSandbox` customisation (the two `main.cjs` copy sites #517 names), `buildPlugin dependsOn test`
- `bbj-intellij/settings.gradle.kts` — settings-plugin block where foojay goes
- `bbj-intellij/gradle/wrapper/gradle-wrapper.properties`, `bbj-intellij/gradle/wrapper/gradle-wrapper.jar`, `bbj-intellij/gradlew`, `bbj-intellij/gradlew.bat` — regenerated together by D-04
- `bbj-intellij/gradle.properties` — JVM args only; must not gain `org.gradle.java.home`
- `java-interop/build.gradle` — the toolchain block to mirror (lines 6-10)
- `.github/dependabot.yml` — D-08 entry

### CI guards that already exist (do not duplicate)
- `.github/workflows/pr-validation.yml`, `.github/workflows/preview.yml`, `.github/workflows/manual-release.yml` — `setup-java` Temurin 17, `gradle/actions/wrapper-validation@v6` before each `./gradlew`, `download-artifact` supplying `main.cjs`
- `.github/workflows/workflow-hygiene.yml` — runs `bbj-vscode/tools/check-gradle-wrapper.mjs`
- `bbj-vscode/tools/check-gradle-wrapper.mjs` — `GRADLE_CHECKSUMS` table (8.14.5 already present), JAR-vs-declared-version check, validation-step ordering rule

### Issues (acceptance criteria are authoritative for closure)
- GitHub #570 — toolchain pin; regression check is `./gradlew --offline -q tasks` under a JDK newer than 17
- GitHub #503 — wrapper JAR and properties regenerated together; CI validation (already present)
- GitHub #576 — current 8.x wrapper with pinned checksum; `./gradlew dependencies` succeeds on a JDK newer than 17
- GitHub #517 — copy sites fail with a directed message when `main.cjs` is absent

### External docs (verified 2026-09-04)
- `https://docs.gradle.org/8.13/release-notes.html` — "Daemon JVM auto-provisioning": `updateDaemonJvm` writes `toolchainUrl.<OS>.<ARCH>` entries when the foojay plugin is applied
- `https://docs.gradle.org/8.14.5/userguide/gradle_daemon.html` — Daemon JVM criteria (`gradle/gradle-daemon-jvm.properties`, incubating)
- `https://docs.gradle.org/8.14.5/userguide/compatibility.html` — Java 24 is the newest version supported for running Gradle 8.14; Java 25 is N/A
- `https://services.gradle.org/distributions/gradle-8.14.5-wrapper.jar.sha256` and `…-bin.zip.sha256` — published checksums to verify D-05 against (follow redirects)

### Not useful here
- `.planning/codebase/*.md` — dated 2026-02-01, predate `bbj-intellij/`; contain nothing about the Gradle plugin build

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `java-interop/build.gradle` — already carries the exact `java.toolchain` block to mirror (and `options.release = 17`).
- `bbj-vscode/tools/check-gradle-wrapper.mjs` — local pre-flight for the wrapper bump; `GRADLE_CHECKSUMS['8.14.5']` is already tabulated so no table edit is needed for D-04.
- `src/test/java/com/basis/bbj/intellij/lsp/*SourceGuardTest.java` — the source-guard JUnit pattern D-16 can reuse for the fail-fast check.
- This host: `/opt/java/17`, `/opt/java/21`, `/opt/java/25` (default), `~/.gradle/gradle.properties` with installation hints — enough to bootstrap D-03 and to prove local detection; foojay download is the only network-dependent step.

### Established Patterns
- Wrapper hygiene is enforced twice (GitHub action + repo script); any Gradle version bump must keep both green.
- CI builds `bbj-vscode` first and hands `main.cjs` to the Gradle job via artifacts; the Gradle build never builds Node code itself (D-11 keeps it that way).
- `buildPlugin` depends on `test`; the JUnit 5 suite (7 classes) runs via `useJUnitPlatform()`.
- Register-check the diff before pushing: keep issue numbers in comments if useful, no advisory ids.

### Integration Points
- `copyLanguageServer` (feeds `processResources`) and the `prepareSandbox` `from(...)` block are the two consumers of `main.cjs`; the new verification task sits in front of both.
- `settings.gradle.kts` plugin block is where the foojay resolver joins the existing IntelliJ settings plugin; `gradle/gradle-daemon-jvm.properties` is a new committed file next to `gradle/wrapper/`.
- `.gitignore` ignores `bbj-intellij/.gradle/`, `build/`, `.intellijPlatform/` — the criteria file under `bbj-intellij/gradle/` is not ignored and will be committed.

</code_context>

<specifics>
## Specific Ideas

- The #570 regression check is literally `./gradlew --offline -q tasks` on JDK 25 (the issue's own acceptance criterion); make it the first proof in the SUMMARY.
- Success criterion 3 wording is the target for the failure message: "fails immediately with a directed error message naming the missing file".
- Scratch evidence from this session (wrapper 8.13, criteria file only): `tasks` EXIT=0, `dependencies --configuration compileClasspath` EXIT=0, `test` BUILD SUCCESSFUL in 9s — the planner can treat D-01(b) as proven, not hypothetical.

</specifics>

<deferred>
## Deferred Ideas

- Gradle 9.x plus `intellij-platform-gradle-plugin` bump and sandbox-path migration — REQUIREMENTS.md Out of Scope; revisit in a later milestone (would also lift the daemon's Java 25 limit).
- Version catalogs / dependency locking / broader SCA review — REQUIREMENTS.md Out of Scope.
- Regression coverage for Node download/cache and EDT paths — Phase 83 (BUILD-04), not this phase.
- Wider CI JDK matrix (21/25) to continuously prove "any host JDK" — not requested; consider only if #570 recurs.

### Reviewed Todos (not folded)
Two pending todos matched Phase 78 at score 0.6 on keyword overlap only (`cjs`, `bbj`, `intellij`, `vscode`, `test`). The `--auto` rule would fold both; the scope guardrail wins because neither touches the Gradle build:
- `2026-08-22-strip-em-config-sentinel-in-getconfigpatharg-and-commands-cj.md` — a run-action code fix in `BbjRunActionBase.getConfigPathArg` and `Commands.cjs`; plugin source is out of this phase's boundary. Stays pending for a run-action phase or a quick task.
- `2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md` — vitest live-interop drift in `bbj-vscode`; unrelated to `bbj-intellij` builds. Stays pending.

</deferred>

---

*Phase: 78-build-test-foundation*
*Context gathered: 2026-09-04*
