## Index rows 1-17

| # | finding_id | route | title | labels |
|---|---|---|---|---|
| 1 | P62-D1-003 | private draft advisory | vscode: workspace-settable configuration strings reach child_process.exec() unescaped across six call sites | vscode, PRIO 1, 8 (recorded for traceability; GitHub advisory carries no labels — D-17) |
| 2 | P64-D1-004 | private draft advisory | BBj integration and infrastructure: JetBrains Marketplace publishing token is expanded directly into a shell command line instead of bound via env: | BBj integration and infrastructure, PRIO 1, 2 (recorded for traceability; GitHub advisory carries no labels — D-17) |
| 3 | P64-D6-007 | public issue | dependencies: @vscode/vsce is declared as a runtime dependency, pulling 15 flagged packages into the production set | dependencies, PRIO 1, 2 |
| 4 | P64-D6-008 | public issue | dependencies: brace-expansion 5.0.7 pinned in package-lock.json ships two known DoS advisories inlined into the extension bundle | dependencies, PRIO 1, 2 |
| 5 | P61-D1-003 | private draft advisory | vscode: workspace-settable bbj.home path is spawned as the BBjCPL compiler binary with no validation | vscode, PRIO 1, 4 (recorded for traceability; GitHub advisory carries no labels — D-17) |
| 6 | P63-D1-007 | private draft advisory | intellij: language-server launch falls back to an unqualified "node" executable with the project directory as working directory | intellij, PRIO 1, 4 (recorded for traceability; GitHub advisory carries no labels — D-17) |
| 7 | P64-D1-006 | private draft advisory | intellij: Gradle wrapper has no distributionSha256Sum pin and no wrapper-validation step in CI | intellij, PRIO 1, 4 (recorded for traceability; GitHub advisory carries no labels — D-17) |
| 8 | P64-D6-006 | public issue | dependencies: committed Gradle wrapper JAR's checksum matches an older Gradle release than the properties file declares | dependencies, PRIO 1, 4 |
| 9 | P61-D3-002 | public issue | vscode: unresolved Java class lookups serialize behind a single lock, each paying the full 10s connect timeout | vscode, PRIO 1, 8 |
| 10 | P61-D3-003 | public issue | vscode: cross-project class scope resolution and full-AST symbol collection rescan the whole workspace with no per-file cache or pruning | vscode, PRIO 1, 8 |
| 11 | P63-D1-001 | private draft advisory | intellij: downloaded Node.js archive is extracted and launched with no checksum or signature verification | intellij, PRIO 1, 8 (recorded for traceability; GitHub advisory carries no labels — D-17) |
| 12 | P63-D1-003 | private draft advisory | intellij: EM password and JWT tokens are passed as process command-line arguments, visible to any co-resident process | intellij, PRIO 1, 8 (recorded for traceability; GitHub advisory carries no labels — D-17) |
| 13 | P63-D2-004 | public issue | intellij: Run/EM-login actions perform network token validation and login synchronously on the EDT before dispatching to a pooled thread | intellij, PRIO 1, 8 |
| 14 | P64-D1-002 | private draft advisory | BBj integration and infrastructure: EM credentials and JWTs are passed to launcher scripts via ARGV, readable from the process table | BBj integration and infrastructure, PRIO 1, 8 (recorded for traceability; GitHub advisory carries no labels — D-17) |
| 15 | P64-D1-003 | private draft advisory | BBj integration and infrastructure: formatter JAR is spawned from a resolved path with no existence, hash or signature check | BBj integration and infrastructure, PRIO 1, 8 (recorded for traceability; GitHub advisory carries no labels — D-17) |
| 16 | P64-D6-002 | public issue | dependencies: vendored formatter JAR carries no version, vendor or provenance metadata, so no advisory database can be checked against it | dependencies, PRIO 1, 8 |
| 17 | P66-D3-001 | public issue | vscode: cross-project class scope resolution and full-AST symbol collection still rescan the whole workspace on every request | vscode, PRIO 1, 8 |

## Bodies rows 1-17

### 1. P62-D1-003 — vscode: workspace-settable configuration strings reach child_process.exec() unescaped across six call sites
**Route:** private draft advisory
**Labels:** vscode, PRIO 1, 8 (recorded for traceability; GitHub advisory carries no labels — D-17)

<!-- BODY-BEGIN P62-D1-003 -->
## Problem

Six `child_process.exec()` call sites build shell command strings by interpolating
workspace-settable configuration values with no shell-escaping step. `Commands.cjs:263`
interpolates `bbj.classpath` unquoted; `Commands.cjs:325-328` joins seven string-typed
`bbj.compiler.*` options with no wrapping quotes at all; none of the affected settings carries a
`capabilities.untrustedWorkspaces` restriction, so each is settable from a workspace's own
committed settings file.

## Evidence

`bbj-vscode/src/Commands/Commands.cjs:263,325-328`

Surface: six `child_process.exec()` call sites — all using the shell-spawning `exec` API rather
than an argument-array API (`execFile`/`spawn`) — fed by workspace-settable strings
(`bbj.classpath`, `bbj.configPath`, `bbj.web.apps.<file>.name`, and seven `bbj.compiler.*`
options), plus a `params.fsPath` path reachable from any other extension's command invocation, plus
the EM validate/login `exec()` calls sharing the same unescaped construction. Problem class: OS
command injection (CWE-78) — untrusted, workspace-controllable input reaches a shell-interpreting
sink with no escaping or quoting. Impact: arbitrary command execution with the developer's own OS
privileges, triggerable by an ordinary, everyday action (Run, Run BUI, Run DWC, or Compile) on a
workspace whose settings — or a params object supplied by another extension — the developer does
not fully control.

## Failure scenario

A value containing shell metacharacters, reaching child_process.exec() through any of the channels traced above, executes as part of the shell command rather than as inert data -- the general OS command-injection impact (CWE-78): arbitrary command execution with the developer's own OS privileges, triggered by an ordinary, everyday action (Run, Run BUI, Run DWC, or Compile) on a workspace whose settings, or a params object supplied by another extension, the developer does not fully control. No trigger sequence or payload is recorded here per D-09, since the surface is unfixed in a public repository.

## Proposed approach

(switch to execFile/spawn with an argument array, mirroring IntelliJ's GeneralCommandLine.addParameter approach -- see P62-D7-001).

## Acceptance criteria

All six identified `child_process.exec()` call sites (`Commands.cjs:263,325-328`,
`extension.ts:415`, `extension.ts:635`, and the `bbj.runBUI`/`bbj.runDWC` `params.fsPath` path) are
replaced with `execFile`/`spawn` invocations that pass arguments as an array rather than an
interpolated shell string. A regression test asserts that a configuration value containing shell
metacharacters (for example a semicolon or a backtick) is passed through as inert argument data and
never reaches a shell for interpretation, for at least one representative call site per affected
settings group.

## Traceability

Finding `P62-D1-003` · dimension D1 (secondary D2, D7) · severity critical · effort 8.

This finding partially overlaps open issue #231 ("Support Custom Classpath and Command Line
Settings for starting BBj Programs"): #231 requests that these settings exist and be configurable;
the settings already exist, and this finding is about their existing unescaped interpolation into
`child_process.exec()`, a security defect #231 does not address.
<!-- BODY-END P62-D1-003 -->

### 2. P64-D1-004 — BBj integration and infrastructure: JetBrains Marketplace publishing token is expanded directly into a shell command line instead of bound via env:
**Route:** private draft advisory
**Labels:** BBj integration and infrastructure, PRIO 1, 2 (recorded for traceability; GitHub advisory carries no labels — D-17)

<!-- BODY-BEGIN P64-D1-004 -->
## Problem

The JetBrains Marketplace publishing token is expanded directly into a shell command line by two
`./gradlew publishPlugin` steps, rather than bound to the step through an `env:` mapping and
referenced as a shell variable. `preview.yml:96-102` is one of the two; `manual-release.yml:135-137`
is the other. Two steps earlier in the same files, the equivalent VS Code marketplace token is
already handled the correct way.

## Evidence

`.github/workflows/preview.yml:96-102`

Surface: the two `./gradlew publishPlugin` steps, `preview.yml:96-102` and `manual-release.yml:135-137`.
Problem class: `secrets.JETBRAINS_MARKETPLACE_TOKEN` is expanded by the Actions expression evaluator
directly into the `run:` command line, rather than bound to the step through an `env:` mapping and
referenced as a shell variable. Impact: for the duration of the publish the value is present as
process-visible data inside a job that resolves and executes the full IntelliJ Platform Gradle
plugin dependency tree, which is third-party code running concurrently in the same container. Log
masking does not address this class — it redacts the transcript, not the runner. Both files already
use the correct pattern two steps away: `env: VSCE_PAT: ${{ secrets.VSCE_PAT }}` at `preview.yml:64-65`
and `manual-release.yml:86-87`.

## Failure scenario

A release or preview run reaches the JetBrains publish step. During that step the marketplace publishing credential exists as process-visible data on the runner rather than only as step environment state, so any code already executing inside that job with process visibility — the Gradle daemon, a build plugin, a transitive plugin dependency, or any of the five mutable-tag actions in the same job under `P64-D6-003` — is positioned to observe it, whereas the `env:`-bound `VSCE_PAT` two steps earlier is not. The consequence of an observed token is publication rights to the plugin listing under this project's own identity, which is indistinguishable from a legitimate release to every downstream IntelliJ user, and which nothing in this repository can revoke.

## Proposed approach

Add an `env:` mapping for the token to both steps and reference the shell variable from the `run:` body, exactly as `VSCE_PAT` is already handled.

## Acceptance criteria

Both `./gradlew publishPlugin` steps (`preview.yml:96-102` and `manual-release.yml:135-137`) bind
`JETBRAINS_MARKETPLACE_TOKEN` through an `env:` mapping and reference it as a shell variable in the
`run:` body, matching the existing `VSCE_PAT` pattern, so the secret is no longer expanded directly
into the command line. A workflow-lint pass or a dry-run confirms neither step's `run:` body contains
a `${{ secrets.* }}` expression after the change.

## Traceability

Finding `P64-D1-004` · dimension D1 · severity high · effort 2. `dedup: none`.
<!-- BODY-END P64-D1-004 -->

### 3. P64-D6-007 — dependencies: @vscode/vsce is declared as a runtime dependency, pulling 15 flagged packages into the production set
**Route:** public issue
**Labels:** dependencies, PRIO 1, 2

<!-- BODY-BEGIN P64-D6-007 -->
## Problem

`bbj-vscode/package.json:670` declares `@vscode/vsce` — the VS Code Marketplace publishing CLI, a
build/release-time tool with zero imports from shipped source — under `dependencies` rather than
`devDependencies`. This pulls its entire transitive closure, including 15 packages flagged by `npm
audit`, into the package's declared production dependency set.

## Evidence

`bbj-vscode/package.json:670`

Surface: `package.json`'s `dependencies` block declares `"@vscode/vsce": "^3.7.1"`; `npm ls <pkg>
--all` confirms 15 of the 19 `npm audit`-flagged packages (including `undici`, `@azure/identity`,
`@azure/msal-node`, `form-data`, `qs`, `tmp`, `uuid`) reach the tree only through `@vscode/vsce` and
through nothing else. Problem class: dependency-metadata misclassification — a build-time-only tool
declared as a production dependency. Impact: any SBOM generator, dependency-policy scanner or `npm
ls --omit=dev` review reads an inflated, misleading production dependency set (296 packages,
including the 15 flagged ones) that materially overstates the extension's actual runtime surface;
the 15 packages are also installed and present in CI jobs (`preview.yml`, `manual-release.yml`)
that hold `VSCE_PAT` and `JETBRAINS_MARKETPLACE_TOKEN` publishing credentials.

## Failure scenario

Two distinct consequences follow from the one declaration. First, every consumer of this package's metadata — an SBOM generator, a downstream dependency-policy scanner, `npm ls --omit=dev`, a corporate allow-list review — reads a production dependency set of 296 packages containing 15 flagged ones, when the extension's actual runtime surface is two esbuild bundles that import none of them; the declared contract materially overstates what runs in production, and any policy decision made from it is made on wrong data. Second, and concretely rather than hypothetically, all 15 are installed by `npm ci` and are on disk in `preview.yml` and `manual-release.yml` jobs that hold `secrets.VSCE_PAT` and `secrets.JETBRAINS_MARKETPLACE_TOKEN` — so a compromise of any one of them at install or invocation time executes beside two marketplace publishing credentials, each of which reaches every user of the published extension or plugin. That is why these rows are triaged `file-issue` rather than accepted: "does not ship" is true and is not the same as "cannot run".

## Proposed approach

Move `"@vscode/vsce": "^3.7.1"` from `dependencies` (`:670`) to `devDependencies` (`:679-693`) and regenerate the lockfile.

## Acceptance criteria

`"@vscode/vsce"` is declared under `devDependencies` in `bbj-vscode/package.json` and no longer
appears under `dependencies`; the lockfile is regenerated to match. `npm ls @vscode/vsce
--omit=dev` (and the 15 packages that reach the tree only through it) return nothing. A packaging
smoke check (`npm run build` plus a `vsce package` dry run in CI) confirms the extension still
packages and publishes correctly after the move.

## Traceability

Finding `P64-D6-007` · dimension D6 (secondary D4) · severity high · effort 2. `dedup: none`.
<!-- BODY-END P64-D6-007 -->

### 4. P64-D6-008 — dependencies: brace-expansion 5.0.7 pinned in package-lock.json ships two known DoS advisories inlined into the extension bundle
**Route:** public issue
**Labels:** dependencies, PRIO 1, 2

<!-- BODY-BEGIN P64-D6-008 -->
## Problem

`out/extension.cjs`, the file the extension's `main` entry names, ships an inlined copy of
`brace-expansion@5.0.7`, pinned at `package-lock.json:7581-7584` and reached transitively through
`vscode-languageclient`. Two published advisories affect that version range, both denial-of-service.

## Evidence

`bbj-vscode/package-lock.json:7581-7584`

Surface: `package-lock.json:7581-7584` pins `brace-expansion` at `5.0.7`, reached through
`vscode-languageclient@10.1.0`'s dependency on `minimatch`; `grep -c` over the built bundles confirms
2 occurrences of `brace-expansion` in `out/extension.cjs` and 0 in `out/language/main.cjs`. Problem
class: known denial-of-service vulnerabilities (https://github.com/advisories/GHSA-mh99-v99m-4gvg and
https://github.com/advisories/GHSA-rgw5-rvv9-x895, both `high`) in a package version confirmed
present in the shipped artefact. Impact: if reached, the vulnerable code can exhaust process memory
in the extension host, crashing BBj language support for the session; `npm audit --json` reports
`fixAvailable: true` via a lockfile-only bump.

## Failure scenario

A VS Code user installs the published extension. `out/extension.cjs` — the file `package.json:651` names as `main` — contains an inlined copy of `brace-expansion@5.0.7`, reached through the language client's glob matching. If a brace pattern with sufficient nesting or expansion breadth is passed to that matcher, GHSA-mh99-v99m-4gvg's unbounded expansion exhausts memory and GHSA-rgw5-rvv9-x895's unbounded intermediate arrays do so even where the earlier mitigation applies; the extension host process the language client runs in dies, taking BBj language support down for the session. **What this record deliberately does not claim** is that a workspace-controlled value reaches that matcher: establishing which patterns the client registers requires reading `bbj-vscode/src/extension.ts`, which is `RU-62-01`'s surface and belongs to a closed phase, so this unit records the reachable presence of vulnerable code in the shipped bundle and stops there rather than asserting an input path it cannot trace. [RU-62-01 is the VS Code extension-activation and language-client glob-registration code in bbj-vscode/src/extension.ts.] That incompleteness is why the triage is `file-issue` and not `accepted-with-reason` — the argument that would justify acceptance is precisely the one this unit cannot finish.

## Proposed approach

The remediation is a lockfile-only bump of the nested `brace-expansion` to 5.0.9 or later, which `npm audit --json` reports as `fixAvailable: true`.

## Acceptance criteria

The nested `brace-expansion` entry in `package-lock.json` is bumped to 5.0.9 or later (or whatever
version `npm audit --json`'s `fixAvailable` target resolves to at fix time), with no change to
`package.json`. `npm audit` no longer flags `brace-expansion` in the dependency tree, and a rebuild's
`grep -c brace-expansion out/extension.cjs` reflects the patched version. The existing vitest suite
passes unchanged, confirming the lockfile-only bump does not alter extension behavior.

## Traceability

Finding `P64-D6-008` · dimension D6 (secondary D1) · severity high · effort 2. `dedup: none`.
<!-- BODY-END P64-D6-008 -->

### 5. P61-D1-003 — vscode: workspace-settable bbj.home path is spawned as the BBjCPL compiler binary with no validation
**Route:** private draft advisory
**Labels:** vscode, PRIO 1, 4 (recorded for traceability; GitHub advisory carries no labels — D-17)

<!-- BODY-BEGIN P61-D1-003 -->
## Problem

`compile()` in `bbj-cpl-service.ts` derives the spawned BBjCPL compiler binary's path entirely from
the workspace-scoped `bbj.home` setting via `getBbjcplPath()`, guarded only by a truthiness check,
with no verification that the resolved path exists, is confined to an expected location, or is a
genuine BBj installation before it is spawned.

## Evidence

`bbj-vscode/src/language/bbj-cpl-service.ts:82-155,228-235`

Surface: `compile()` (`:82-155`) spawns the path returned by `getBbjcplPath()` (`:228-235`), which
computes `path.join(wsManager.getBBjDir(), 'bin', binaryName)` guarded only by
`if (!bbjHome) return undefined;`. `bbjHome` originates from the `bbj.home` setting, declared
`"scope": "window"` (`package.json:340-347`) and therefore settable from a workspace's own committed
`.vscode/settings.json`. Problem class: unconditional, unvalidated execution of a workspace-configured
filesystem path. Impact: a workspace whose settings the developer does not fully control can redirect
BBjCPL compilation to an attacker-supplied binary, achieving code execution in the language-server
process on an ordinary compile trigger.

## Failure scenario

A workspace-scoped .vscode/settings.json committed inside a cloned repository sets bbj.home to a directory an attacker controls. Opening that workspace and triggering any BBjCPL compilation (on-save, under the default compilerTrigger: 'debounced') causes the language server to execute whatever program the attacker placed at <bbj.home>/bin/bbjcpl (or .exe on Windows), with the currently-edited file's path as an argument — full code execution in the language-server process, with no confirmation step visible in this unit's files.

## Proposed approach

Validate that the resolved bbjcpl path exists and is confined to an expected layout before spawning, or warn/gate on an unusual bbjHome.

## Acceptance criteria

`getBbjcplPath()` or its caller validates that the resolved `bbjcpl` path exists and is confined to
an expected installation layout before `compile()` spawns it, warning or gating on an unusual
`bbjHome` rather than spawning unconditionally. A regression test in `test/cpl-service.test.ts`,
extending the existing `createMockServices` pattern, asserts that a `bbjHome` pointing outside the
expected layout is rejected or flagged rather than silently spawned.

## Traceability

Finding `P61-D1-003` · dimension D1 · severity high · effort 4. `dedup: none`.
<!-- BODY-END P61-D1-003 -->

### 6. P63-D1-007 — intellij: language-server launch falls back to an unqualified "node" executable with the project directory as working directory
**Route:** private draft advisory
**Labels:** intellij, PRIO 1, 4 (recorded for traceability; GitHub advisory carries no labels — D-17)

<!-- BODY-BEGIN P63-D1-007 -->
## Problem

`BbjLanguageServer.java`'s `resolveNodePath()` falls back to the bare, unqualified literal `"node"`
when no Node.js path is configured, auto-detected, or cached, and launches it with the current
project's own directory set as the process's working directory — the combination CWE-426 (Untrusted
Search Path) identifies as hazardous on platforms that consult the working directory when resolving
an unqualified executable name.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServer.java:32,38-43,45-66`

Surface: `resolveNodePath()` (`:45-66`) falls through settings, auto-detection, and the download
cache to the unqualified literal `"node"` (`:65`) when all three are empty; the resulting
`GeneralCommandLine` (`:38`) is constructed with that bare name, and its working directory is
explicitly set to the project's own base path (`:40`). Problem class: untrusted search path
(CWE-426) — an unqualified executable name resolved with a working directory an attacker can
influence. Impact: on a machine with no configured Node.js, workspace-supplied content can be
preferred over the intended system binary and run as the language-server host process for every BBj
file opened in the project.

## Failure scenario

On a machine where Node.js is not configured in BBj Settings, not auto-detectable via PATH, and has never been downloaded through the RU-63-03 cache, this fallback resolves the executable to the literal string "node" and launches it with the current project directory as the working directory — the same combination through which workspace-supplied content can be preferred over the genuinely intended system binary on platforms that search the working directory for an unqualified executable name, resulting in that content running as the language-server host process for every BBj file opened in the project. [RU-63-03 is the Node.js download-and-cache logic in BbjNodeDownloader.java.] Per D-13, no trigger sequence or payload is stated beyond this problem-class/impact description.

## Proposed approach

Require an absolute, existing, executable path before constructing GeneralCommandLine — fail loudly with an actionable Settings-configuration prompt instead of falling back to the bare literal "node".

## Acceptance criteria

`resolveNodePath()` requires an absolute, existing, executable path before `BbjLanguageServer.java:38`
constructs the `GeneralCommandLine`, failing loudly with an actionable Settings-configuration prompt
rather than falling back to the bare literal `"node"`. Because no `src/test/` source set exists for
`bbj-intellij` today, regression coverage for this fix depends on that gap being closed first, or on
a recorded manual verification step at merge time.

## Traceability

Finding `P63-D1-007` · dimension D1 · severity high · effort 4. `dedup: none`.
<!-- BODY-END P63-D1-007 -->

### 7. P64-D1-006 — intellij: Gradle wrapper has no distributionSha256Sum pin and no wrapper-validation step in CI
**Route:** private draft advisory
**Labels:** intellij, PRIO 1, 4 (recorded for traceability; GitHub advisory carries no labels — D-17)

<!-- BODY-BEGIN P64-D1-006 -->
## Problem

`gradle-wrapper.properties` declares Gradle 8.13 with no `distributionSha256Sum` pin, and none of
the six workflows under `.github/workflows/` runs a wrapper-validation action — so nothing in this
repository verifies that the downloaded Gradle distribution or the committed wrapper JAR are what
they claim to be. The committed wrapper JAR's own hash matches Gradle's 8.10-8.12.1 line, not the
8.13 the properties file declares — direct evidence the two halves of the wrapper already disagree
with each other, undetected.

## Evidence

`bbj-intellij/gradle/wrapper/gradle-wrapper.properties:3-5`

Surface: `gradle-wrapper.properties` declares no `distributionSha256Sum` property; `validateDistributionUrl=true` checks only that the URL is well-formed, not that its content matches an expected
hash; no workflow runs `gradle/actions/wrapper-validation` or any equivalent check. Problem class:
missing integrity pin combined with missing supply-chain validation on a build-bootstrap artefact.
Impact: `./gradlew publishPlugin` (`manual-release.yml:137`, `preview.yml:99`) executes the downloaded
distribution with the full authority of the job, including `secrets.JETBRAINS_MARKETPLACE_TOKEN` —
and the committed wrapper JAR's own checksum already mismatches the declared distribution version,
showing nothing in this repository would notice a substitution.

## Failure scenario

A CI runner or a contributor machine executes `./gradlew publishPlugin` (`manual-release.yml:137`, `preview.yml:99`) or `./gradlew buildPlugin` (`pr-validation.yml:61`, `manual-release.yml:127`). `gradlew:117` puts the committed 43,583-byte JAR on the classpath and runs it; the JAR downloads `gradle-8.13-bin.zip` over TLS and unpacks it into `~/.gradle/wrapper/dists`. Neither artifact is compared against any expected digest at any point: not the JAR (no wrapper-validation step exists in any workflow) and not the distribution (no `distributionSha256Sum`). A distribution served from a compromised mirror or a repository-side substitution of the JAR therefore executes with the full authority of the job — which, for `manual-release.yml:135-137` and `preview.yml:96-102`, includes `secrets.JETBRAINS_MARKETPLACE_TOKEN`, a credential that publishes to every IntelliJ user of this plugin. The version mismatch above is the direct evidence that nothing in this repository or its CI would notice the wrapper JAR being other than expected: it already is.

## Proposed approach

Add `distributionSha256Sum=<published sum for the chosen release>` to the properties file, regenerate the JAR for that same release, and add `gradle/actions/wrapper-validation` to the workflows that run `./gradlew`.

## Acceptance criteria

`gradle-wrapper.properties` carries a `distributionSha256Sum` entry matching the published checksum
for the declared Gradle release, the committed wrapper JAR is regenerated for that same release, and
`gradle/actions/wrapper-validation` (or an equivalent pinned-hash check) runs in every workflow that
invokes `./gradlew`, including the two that hold `secrets.JETBRAINS_MARKETPLACE_TOKEN`. The new
validation step fails closed if a downloaded distribution's hash does not match the pinned value.

## Traceability

Finding `P64-D1-006` · dimension D1 (secondary D6) · severity high · effort 4. `dedup: none`.
<!-- BODY-END P64-D1-006 -->

### 8. P64-D6-006 — dependencies: committed Gradle wrapper JAR's checksum matches an older Gradle release than the properties file declares
**Route:** public issue
**Labels:** dependencies, PRIO 1, 4

<!-- BODY-BEGIN P64-D6-006 -->
## Problem

The committed Gradle wrapper JAR (`gradle-wrapper.jar`) has no identifying manifest metadata, and
its SHA-256 hash matches Gradle's published `wrapperChecksum` for releases 8.10 through 8.12.1 — not
the 8.13 distribution `gradle-wrapper.properties:3` declares. No dependency automation and no CI
validation step covers this file, so the mismatch has persisted undetected since the wrapper was
first committed.

## Evidence

`bbj-intellij/gradle/wrapper/gradle-wrapper.jar`

Surface: the JAR's manifest carries only `Manifest-Version: 1.0` and `Implementation-Title: Gradle
Wrapper`, no version or vendor field; its SHA-256 hash matches 19 of Gradle's published per-release
checksums, spanning 8.10-8.12.1, while the properties file beside it declares 8.13, whose own
published checksum differs. `.github/dependabot.yml` declares no `gradle` ecosystem and no workflow
runs a wrapper-validation action. Problem class: unverifiable, unpinned build-bootstrap artefact.
Impact: `./gradlew publishPlugin` executes this JAR's code with the full authority of the job,
including `secrets.JETBRAINS_MARKETPLACE_TOKEN`, in `manual-release.yml:137` and `preview.yml:99` —
and the version mismatch demonstrates that a substitution of this artefact would go unnoticed today.

## Failure scenario

A maintainer, auditor or downstream consumer asks the ordinary supply-chain question — "which Gradle release produced the wrapper this repository executes, and is it the one the build declares?" — and the repository cannot answer it from its own contents: the manifest names no version, no checksum is pinned, no CI step validates the JAR, and no dependency automation watches the ecosystem. When the question is answered from outside, using Gradle's published checksums, the answer is that the JAR is from the 8.10-8.12.1 line while the properties file asks for 8.13. Concretely, this is the state a wrapper-JAR substitution would produce, and it has persisted undetected since the initial commit — which is the direct demonstration that a real substitution would also persist undetected, including through `manual-release.yml:137` and `preview.yml:99`, where `./gradlew publishPlugin` runs with `secrets.JETBRAINS_MARKETPLACE_TOKEN` bound.

## Proposed approach

Run `./gradlew wrapper --gradle-version <chosen release> --gradle-distribution-sha256-sum <that release's published checksum>` on a working toolchain, commit both regenerated files, and add `gradle/actions/wrapper-validation` to `pr-validation.yml`, `manual-release.yml` and `preview.yml`.

## Acceptance criteria

The wrapper JAR and `gradle-wrapper.properties` are regenerated together, on a working toolchain, for
one deliberately chosen Gradle release, and `gradle/actions/wrapper-validation` (or an equivalent
hash-verification step) is added to `pr-validation.yml`, `manual-release.yml` and `preview.yml`.
After the change, the committed JAR's SHA-256 matches the release the properties file declares, and
the new validation step fails the build if a future substitution changes either artefact without a
matching update to the other.

## Traceability

Finding `P64-D6-006` · dimension D6 (secondary D1) · severity high · effort 4. `dedup: none`.
<!-- BODY-END P64-D6-006 -->

### 9. P61-D3-002 — vscode: unresolved Java class lookups serialize behind a single lock, each paying the full 10s connect timeout
**Route:** public issue
**Labels:** vscode, PRIO 1, 8

<!-- BODY-BEGIN P61-D3-002 -->
## Problem

`resolveClassByName()` serializes all Java class-name resolutions behind a single lock, minting a
fresh lock token per top-level call rather than sharing state across distinct class names — so
against an unreachable interop peer, each of N unresolved class references pays its own full
10-second connect timeout in sequence rather than failing once and short-circuiting the rest.

## Evidence

`bbj-vscode/src/language/java-interop.ts:42-46, 798-820`

Surface: `resolveClassByName()` acquires `acquireLock` (`:483`, defined `:798-820`) before any
network call; every `depth === 0` call mints a new lock token (`:482`) rather than sharing one across
distinct class names, so resolutions queue strictly behind each other on the single
`lockQueue`/`lockHeld` mutex (`:42-46`); `loadImplicitImports()` (`:213-277`) fires its per-class
calls via `Promise.all`, but all of them still serialize through this same lock. Problem class:
unbounded serialized retry against an unreachable peer, with no circuit breaker. Impact: with the
interop peer unreachable, validating a document with N distinct unresolved Java class references
takes roughly `10 × N` seconds rather than failing fast, and the same serialization slows the startup
preload across all 8 implicit packages.

## Failure scenario

With the peer unreachable, a document containing N distinct unresolved Java class references triggers N serialized ~10s connect-timeout attempts (~10xN seconds) before validation completes, rather than failing once and short-circuiting the rest; the same serialization governs the startup loadImplicitImports() preload across the 8 implicit packages' full member-type graph.

## Proposed approach

A peer-reachability circuit breaker that short-circuits further connect attempts after the first failure, reset on clearCache().

## Acceptance criteria

A peer-reachability circuit breaker short-circuits further connect attempts after the first failure
against an unreachable interop peer, resetting on `clearCache()`. A vitest regression test simulates
an unreachable peer and asserts that resolving multiple distinct unresolved class names completes in
roughly one connect-timeout interval rather than one per class name.

## Traceability

Finding `P61-D3-002` · dimension D3 · severity high · effort 8. `dedup: none`.
<!-- BODY-END P61-D3-002 -->

### 10. P61-D3-003 — vscode: cross-project class scope resolution and full-AST symbol collection rescan the whole workspace with no per-file cache or pruning
**Route:** public issue
**Labels:** vscode, PRIO 1, 8

<!-- BODY-BEGIN P61-D3-003 -->
## Problem

`getBBjClassesFromFile()` does a full linear scan of every `BbjClass` in the entire workspace index
on every `::file::Class`-qualified reference, and `collectLocalSymbols()` walks the full, unpruned
AST of every document with no `isExternalDocument`-aware pruning equivalent to the linker's own — so
CPU cost in a multi-project workspace scales with total workspace size rather than the active file's
own size.

## Evidence

`bbj-vscode/src/language/bbj-scope.ts:308-331`

Surface: `getBBjClassesFromFile()` (`bbj-scope.ts:308-331`) calls
`indexManager.allElements(BbjClass.$type).filter(...)` — a full scan of the workspace index — with
no per-file or per-request cache; `collectLocalSymbols()` (`bbj-scope-local.ts:106-114`) walks
`AstUtils.streamAllContents(rootNode)` for every document with no equivalent to `bbj-linker.ts`'s
`treeIter.prune()` for external-document subtrees. `bbj-index-manager.ts`'s `isAffected()` override
reduces rebuild frequency but does not address either request-time cost. Problem class: unbounded
per-request work scaling with total workspace size. Impact: in a multi-project workspace with many
external/referenced documents, both scope resolution and document rebuilds become progressively more
expensive as the workspace grows, independent of the file actually being edited — consistent with
issue #232's reported high-CPU symptom.

## Failure scenario

A multi-project workspace with many external/referenced BbjClass documents loaded: every `::file::Class` scope resolution rescans the entire cross-project index, and every document load/rebuild walks its full AST including any external project's documents with no pruning — CPU cost scales with total multi-project workspace size rather than the active file's own size, consistent with #232's reported symptom.

## Proposed approach

Cache getBBjClassesFromFile's per-file lookup keyed by bbjFilePath+doc URI; add isExternalDocument-based pruning to collectLocalSymbols mirroring bbj-linker.ts's treeIter.prune().

## Acceptance criteria

`getBBjClassesFromFile()`'s per-file lookup is cached, keyed by `bbjFilePath` plus document URI, and
`collectLocalSymbols()` gains `isExternalDocument`-based pruning mirroring `bbj-linker.ts`'s
`treeIter.prune()`. A vitest regression test using a synthetic multi-document workspace fixture with
timing assertions demonstrates that both operations' cost no longer scales linearly with total
workspace size once the active file's own dependencies are already resolved.

## Traceability

Finding `P61-D3-003` · dimension D3 · severity high · effort 8. `dedup: none`.
<!-- BODY-END P61-D3-003 -->

### 11. P63-D1-001 — intellij: downloaded Node.js archive is extracted and launched with no checksum or signature verification
**Route:** private draft advisory
**Labels:** intellij, PRIO 1, 8 (recorded for traceability; GitHub advisory carries no labels — D-17)

<!-- BODY-BEGIN P63-D1-001 -->
## Problem

`BbjNodeDownloader.java` fetches the Node.js distribution archive over HTTPS and extracts it with
zero integrity check — no checksum, no signature, no expected-size assertion anywhere in the file —
and later trusts any executable file found at the resolved cache path on every subsequent launch.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:34-35,110-117,47-59`

Surface: the archive is fetched from a fixed host (`DOWNLOAD_BASE_URL`, `:35`) to a temp file (`:110`)
via `HttpRequests.request(...).connect(...)` (`:112-117`) and handed directly to extraction;
`getCachedNodePath()` (`:47-59`) trusts any executable at the cache path via an existence/executable-bit
check only (`:52`). Problem class: download and execution of code with no integrity verification.
Impact: a party able to substitute the content served for this exact version/platform/architecture
combination, or to corrupt the plugin data directory before a first-ever download, has that content
extracted, marked executable, and launched as the language-server host process for every BBj file
opened in the IDE, with nothing to detect the substitution.

## Failure scenario

A party able to substitute the content served from nodejs.org's distribution path for this exact version/platform/architecture combination — whether via compromise of the origin, a compromised intermediary trusted by the local certificate store, or corruption of the plugin data directory before a first-ever download — has that content extracted, copied, marked executable, and subsequently launched as the language server host process for every BBj file opened in the IDE, with no checksum or signature check at any point to detect the substitution. Per D-13, no trigger sequence or payload is stated beyond this problem-class/impact description.

## Proposed approach

Compute and compare a published SHASUMS256.txt entry from nodejs.org before extraction.

## Acceptance criteria

`BbjNodeDownloader.java` computes a SHA-256 (or equivalent) digest of the downloaded archive and
compares it against the corresponding entry in Node.js's published `SHASUMS256.txt` for that version
before extraction, refusing to extract or cache the archive on a mismatch. Because no `src/test/`
source set exists for `bbj-intellij` today, regression coverage for this fix depends on that gap
being closed first, or on a recorded manual verification step at merge time.

## Traceability

Finding `P63-D1-001` · dimension D1 (secondary D6) · severity high · effort 8. `dedup: none`.
<!-- BODY-END P63-D1-001 -->

### 12. P63-D1-003 — intellij: EM password and JWT tokens are passed as process command-line arguments, visible to any co-resident process
**Route:** private draft advisory
**Labels:** intellij, PRIO 1, 8 (recorded for traceability; GitHub advisory carries no labels — D-17)

<!-- BODY-BEGIN P63-D1-003 -->
## Problem

Four call sites in the IntelliJ plugin — `BbjEMLoginAction.java:103` (the EM password) and three
JWT-token call sites in `BbjRunActionBase.java`/`BbjRunBuiAction.java`/`BbjRunDwcAction.java` — pass
secrets to a spawned `bbj` process via `GeneralCommandLine.addParameter(...)`, placing them in the
child process's own `argv`, visible to any other process on the host capable of listing process
arguments.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java:103,BbjRunActionBase.java:302,BbjRunBuiAction.java:127,BbjRunDwcAction.java:127`

Surface: `BbjEMLoginAction.java:103` (`cmd.addParameter(password)`), `BbjRunActionBase.java:302`
(`cmd.addParameter(token)`), and `BbjRunBuiAction.java:127`/`BbjRunDwcAction.java:127`
(`cmd.addParameter(token)`) — four call sites, none passing the secret via stdin or an environment
variable instead. Problem class: process-argument-list exposure (CWE-214). Impact: any other local
process running under the same account and capable of process-listing introspection can read the EM
password during login and the JWT token during every run/validate invocation, for as long as the
spawned process stays alive.

## Failure scenario

A local process capable of enumerating other processes' argument lists on the same host (e.g. via ps/Task Manager-class introspection, available to any other user-level process on a shared or compromised machine) can read the EM password during login and the JWT token during every run/validate invocation for as long as each spawned process remains alive — general process-argument-list exposure (CWE-214), not a scenario specific to any single call site. Per D-13, no trigger sequence or payload is stated beyond this problem-class/impact description.

## Proposed approach

Switch the four call sites from addParameter(secret) to a stdin write or a process-scoped environment variable the downstream .bbj scripts are redesigned to read instead.

## Acceptance criteria

All four call sites (`BbjEMLoginAction.java:103`, `BbjRunActionBase.java:302`,
`BbjRunBuiAction.java:127`, `BbjRunDwcAction.java:127`) pass their respective secret via stdin or a
process-scoped environment variable instead of `addParameter(...)`, and the downstream `.bbj` scripts
they invoke are updated to read from that channel instead of `ARGV`. Because no `src/test/` source
set exists for `bbj-intellij` today, regression coverage for this fix depends on that gap being
closed first, or on a recorded manual verification step at merge time confirming neither secret
appears in the spawned process's argument list.

## Traceability

Finding `P63-D1-003` · dimension D1 (secondary D2) · severity high · effort 8. `dedup: none`.
<!-- BODY-END P63-D1-003 -->

### 13. P63-D2-004 — intellij: Run/EM-login actions perform network token validation and login synchronously on the EDT before dispatching to a pooled thread
**Route:** public issue
**Labels:** intellij, PRIO 1, 8

<!-- BODY-BEGIN P63-D2-004 -->
## Problem

`BbjRunActionBase.actionPerformed()` calls `buildCommandLine(file, project)` synchronously on the
EDT, before dispatching to a pooled thread — and for the BUI/DWC run actions, `buildCommandLine()`
itself performs a token-validation network round trip (up to 10s) and, on failure, a full EM login
(up to a further 15s), both still on the EDT, freezing the entire IDE for up to ~25 seconds.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java:60,67,BbjEMLoginAction.java:34-36,115`

Surface: `actionPerformed()` (`:43-108`) calls `buildCommandLine()` synchronously at `:60`, before the
`executeOnPooledThread(...)` dispatch at `:67`; for `BbjRunBuiAction`/`BbjRunDwcAction`,
`buildCommandLine()` calls `validateTokenServerSide()` (`:282-322`, up to `runProcess(10000)` at
`:308`) and, on an invalid/expired token, `BbjEMLoginAction.performLogin()` (up to `runProcess(15000)`
at `:115`), both before the pooled-thread dispatch is reached. Problem class: blocking I/O on the UI
thread (Event Dispatch Thread). Impact: clicking "Run As BUI"/"Run As DWC" with an absent, expired or
server-rejected token freezes the entire IDE for up to ~25 seconds; clicking "Login to Enterprise
Manager" directly freezes it for its own login round trip every time.

## Failure scenario

Clicking "Run As BUI"/"Run As DWC" when the stored EM token is absent, expired (client-side check), or rejected by the server-side round trip synchronously blocks the EDT for up to ~25 seconds in the worst case (10s validate + 15s re-login) before the pooled-thread dispatch at BbjRunActionBase.java:67 is ever reached — freezing the entire IDE, not just the current editor. Clicking "Login to Enterprise Manager" directly freezes the IDE for its own runProcess(15000) call every time, since BbjEMLoginAction has no pooled-thread dispatch of its own at all (see P63-D2-005).

## Proposed approach

Restructure actionPerformed() so buildCommandLine()'s token-validation/login round trip runs inside the existing executeOnPooledThread(...) block rather than before it.

## Acceptance criteria

`actionPerformed()` is restructured so that `buildCommandLine()`'s token-validation and login round
trip run inside the existing `executeOnPooledThread(...)` block rather than before it, in both
`BbjRunActionBase.java` and `BbjEMLoginAction.java`. Because no `src/test/` source set exists for
`bbj-intellij` today, regression coverage for this fix depends on that gap being closed first, or on
a recorded manual verification step at merge time confirming the EDT is no longer blocked during
token validation or login.

## Traceability

Finding `P63-D2-004` · dimension D2 (secondary D3) · severity high · effort 8. `dedup: none`.
<!-- BODY-END P63-D2-004 -->

### 14. P64-D1-002 — BBj integration and infrastructure: EM credentials and JWTs are passed to launcher scripts via ARGV, readable from the process table
**Route:** private draft advisory
**Labels:** BBj integration and infrastructure, PRIO 1, 8 (recorded for traceability; GitHub advisory carries no labels — D-17)

<!-- BODY-BEGIN P64-D1-002 -->
## Problem

`em-login.bbj`, `em-validate-token.bbj` and `web.bbj` read the Enterprise Manager password and JWT
tokens off `ARGV` — the only intake channel each script has — making them visible to any process on
the host capable of reading the process table; `em-login.bbj` also writes the returned token to disk
with no permission control at write time.

## Evidence

`bbj-vscode/tools/em-login.bbj:10-13,41-43`

Surface: `em-login.bbj:10-11` reads username/password as `ARGV(1)`/`ARGV(2)`; `web.bbj:19-20` reads
them as `ARGV(5)`/`ARGV(6)`; `web.bbj:22` reads the JWT as `ARGV(8)`; `em-login.bbj:40-43` writes the
returned token to the caller-supplied path with `open(ch,mode="O_CREATE,O_TRUNC")` and no mode,
permission or umask control. Problem class: process-argument-list exposure (CWE-214) plus an at-rest
credential file with unconstrained permissions. Impact: any local process running under the
developer's account can read the EM password or a live JWT during the window these scripts run, and
the written token file remains readable from disk with default permissions after the process exits.

## Failure scenario

Any local process running under the developer's own account — a malicious or compromised npm postinstall script, a shared build agent, an unrelated tool with a process-listing feature — samples the process table during the window in which `em-login.bbj` runs and reads the Enterprise Manager password in cleartext from ARGV(2), or reads a live JWT from `web.bbj`'s ARGV(8). Separately, the token file written at `em-login.bbj:41-43` persists at the caller-chosen path with default permissions until something deletes it, so the same value is readable from disk after the process has exited.

## Proposed approach

The concrete files are `bbj-vscode/tools/em-login.bbj:10-13,41-43`, `em-validate-token.bbj:8-9,29-34` and `web.bbj:19-20,22` — all three read a credential or a JWT off `ARGV`, the only intake channel each script has, and `em-login.bbj` writes the returned token back to disk with no permission control. Closing this needs a design decision, not a nameable edit: replacing the argument-vector channel with one not readable via `/proc/<pid>/cmdline` (an environment variable scoped to the child process, a named pipe, or a short-lived file the caller creates with restrictive permissions before invocation), and constraining the token file's permissions at write time. This record supplies RU-64-03's leg of SEC-04 with full evidence; Phase 65 owns synthesizing the fix across this leg, BbjEMTokenStore, and SEC-05's process-spawning half, so this approach does not attempt that synthesis. [RU-64-03 is this record's own em-login.bbj / em-validate-token.bbj / web.bbj credential-handling review unit; SEC-04 is the Enterprise Manager token-lifecycle synthesis and SEC-05 is the process-spawning synthesis, both owned by a separate, later phase.]

## Acceptance criteria

`em-login.bbj`, `em-validate-token.bbj` and `web.bbj` read their credential/JWT through a channel
other than `ARGV` — a process-scoped environment variable, a named pipe, or a short-lived file the
caller creates with restrictive permissions before invocation — and `em-login.bbj` constrains the
written token file's permissions at write time rather than relying on the process default. Because
this spans both IDE extensions' launch code and all three scripts, acceptance is met only once all
three scripts and both IDEs' invocations are updated together, and a manual or scripted check
confirms neither secret appears in a process listing during a login/validate run.

## Traceability

Finding `P64-D1-002` · dimension D1 · severity high · effort 8. `dedup: none`.
<!-- BODY-END P64-D1-002 -->

### 15. P64-D1-003 — BBj integration and infrastructure: formatter JAR is spawned from a resolved path with no existence, hash or signature check
**Route:** private draft advisory
**Labels:** BBj integration and infrastructure, PRIO 1, 8 (recorded for traceability; GitHub advisory carries no labels — D-17)

<!-- BODY-BEGIN P64-D1-003 -->
## Problem

`document-formatter.ts` resolves `BBjCFCli.jar`'s path as a compile-time constant and spawns
`java -jar` against it with no existence check, no hash check and no signature check; the JAR's
manifest declares two further JARs on its classpath, so any format-on-save transitively loads all
three vendored artefacts unverified.

## Evidence

`bbj-vscode/tools/formatter/BBjCFCli.jar`

Surface: `document-formatter.ts:10,14-15,59` resolves `${__dirname}/../tools/formatter/BBjCFCli.jar`
and spawns `java -jar` against it; `.vscodeignore` does not exclude `tools/`, so all three JARs
(`BBjCFCli.jar`, `lib/jcommander-1.71.jar`, `lib/BBjCodeFomatter.jar`) ship in the published `.vsix`;
no `build.xml`, `pom.xml`, npm script, checksum or signature covers any of the three anywhere in the
repository. Problem class: unverified execution of vendored binaries. Impact: any write to the
extension's installed `tools/formatter/` directory — by another local process, a tampered `.vsix`, or
a compromised release artefact — changes which bytecode the next format-on-save executes, under the
user's own account, with no detection at any point.

## Failure scenario

Any write to the extension's installed `tools/formatter/` directory — by another process running as the user, by a tampered or re-packed `.vsix`, or by a compromised release artifact — changes which bytecode the next format-on-save executes. The user formats a BBj document; `document-formatter.ts:59` spawns `java -jar` against the resolved constant path; the replaced code runs under the user's own account and is handed the document's full text on stdin. Nothing in the sequence compares the file against an expected hash or signature, nothing in the repository records what the expected bytes are, and the substitution leaves no signal in any log, so neither the user nor a later reviewer has a way to detect it before or after the fact. Per D-16 the surface, problem class and impact are recorded and no trigger sequence, payload or fork-and-run procedure is.

## Proposed approach

The concrete files are `bbj-vscode/src/document-formatter.ts:10,14-15,59` (the unverified spawn site) and the three vendored artifacts it loads — `tools/formatter/BBjCFCli.jar`, `lib/jcommander-1.71.jar`, `lib/BBjCodeFomatter.jar`. What would close this record is a verification step at the call site that compares each resolved JAR path's SHA-256 against a committed expected hash before `document-formatter.ts:59` spawns `java -jar`, for the two artifacts whose provenance is at least nameable (`BBjCFCli.jar`, `jcommander-1.71.jar`) — `BBjCodeFomatter.jar`'s own hash-pin has to wait on `P64-D6-002` answering what that artifact actually is, since pinning a hash for an unidentified binary records only that it has not changed, not that it is safe. No decompilation or execution of any of the three artifacts is part of this approach or is needed to add the hash check.

## Acceptance criteria

`document-formatter.ts:59` compares the resolved SHA-256 of `BBjCFCli.jar` and `lib/jcommander-1.71.jar`
against a committed expected hash before spawning `java -jar`, refusing to spawn on a mismatch, for
the two artefacts whose provenance is nameable today. Because the third artefact's own provenance is
unresolved and is the subject of a separate open finding, its hash pin is deferred until that
provenance question is answered, and this criterion is met for the two verifiable artefacts without
waiting on the third.

## Traceability

Finding `P64-D1-003` · dimension D1 (secondary D6) · severity high · effort 8. `dedup: none`.
<!-- BODY-END P64-D1-003 -->

### 16. P64-D6-002 — dependencies: vendored formatter JAR carries no version, vendor or provenance metadata, so no advisory database can be checked against it
**Route:** public issue
**Labels:** dependencies, PRIO 1, 8

<!-- BODY-BEGIN P64-D6-002 -->
## Problem

`lib/BBjCodeFomatter.jar` carries no version, vendor, SCM or licence metadata in its manifest — only
`Manifest-Version: 1.0` — so no advisory database, dependency scanner or manual review can determine
what library the artefact contains, meaning a published vulnerability against it could ship
indefinitely with no signal that action is required.

## Evidence

`bbj-vscode/tools/formatter/lib/BBjCodeFomatter.jar`

Surface: the manifest has only two lines, `Manifest-Version: 1.0` and a blank terminator;
`sha256sum` gives the artefact's only stable identifier; the sibling `jcommander-1.71.jar` carries
eleven identifying manifest headers by contrast; `.github/dependabot.yml` declares only the npm
ecosystem, so this `.jar` is outside its scan entirely; no lockfile entry, `.pom`, checksum file,
signature, build script or CI step names it. Problem class: unidentifiable vendored dependency with
no provenance record. Impact: the project cannot determine whether it ships code affected by any
published vulnerability, because the artefact matches nothing any scanner, advisory feed or manual
grep can key on — a strictly worse posture than a known-vulnerable dependency, which at least has a
name and a fixed version to track.

## Failure scenario

A vulnerability is published against whatever library this JAR actually contains. The maintainer does everything right: runs `npm audit` over `bbj-vscode`, reads every Dependabot PR, reviews `package-lock.json`, and greps the repository for the affected package name. None of those can see the file — it is not in the npm tree, not in the lockfile, not in Dependabot's configured ecosystem, and its name matches nothing. A reviewer who goes further and opens the JAR's manifest by hand learns only that it is version 1.0 of the manifest format. There is no step at which the project can determine that it ships affected code, so the extension keeps shipping it indefinitely with no signal that action is required. This is a strictly worse posture than a known-vulnerable dependency, which at least has a name, a fixed version and a scanner that keeps raising it.

## Proposed approach

Nobody in this repository can name the edit because nobody in this repository can say what `bbj-vscode/tools/formatter/lib/BBjCodeFomatter.jar` actually is: its manifest carries no version, vendor, SCM reference or licence — only `Manifest-Version: 1.0` — and the filename's own typo (`Fomatter`) corroborates a hand-copied artifact rather than a build-produced one. The provenance question that has to be answered first is what library this JAR contains and which upstream project or internal build produced it and at what version; that question is not answerable from this repository alone — it needs whoever originally vendored the file (a BASIS-internal build process, or an external project this checkout does not reference) to say what was copied in and from where. Once that provenance is established, the artifact becomes triageable the way its sibling `jcommander-1.71.jar` already is — checkable against an advisory database and pinnable by a recorded hash — but establishing it is a provenance investigation this record's evidence cannot substitute a plausible-sounding version-pin edit for.

## Acceptance criteria

The artefact's provenance is established and recorded — what library it contains, which upstream
project or internal build produced it, and at what version — after which its SHA-256 hash is pinned
and the artefact becomes checkable against an advisory database the way `jcommander-1.71.jar` already
is. Establishing provenance is itself the acceptance condition; a plausible-sounding version guess
with no source to verify it against does not satisfy this criterion.

## Traceability

Finding `P64-D6-002` · dimension D6 · severity high · effort 8. `dedup: none`.
<!-- BODY-END P64-D6-002 -->

### 17. P66-D3-001 — vscode: cross-project class scope resolution and full-AST symbol collection still rescan the whole workspace on every request
**Route:** public issue
**Labels:** vscode, PRIO 1, 8

<!-- BODY-BEGIN P66-D3-001 -->
## Problem

`getBBjClassesFromFile()` still does a full linear scan of the entire workspace class index on every
`::file::Class`-qualified reference, and `collectLocalSymbols()` still walks the full, unpruned AST
of every document with no external-document-aware pruning — a re-triage confirming both mechanisms
and the partial `isAffected()` mitigation are unchanged in current code.

## Evidence

`bbj-vscode/src/language/bbj-scope.ts:308-330 (getBBjClassesFromFile); bbj-vscode/src/language/bbj-scope-local.ts:106-118 (collectLocalSymbols)`

Surface: the same two mechanisms and the same partial `isAffected()` mitigation, re-confirmed
unchanged against current code by a fresh read of both files. Problem class: unbounded per-request
work scaling with total workspace size. Impact: in a multi-project workspace with many
external/referenced documents, both scope resolution and document rebuilds remain expensive in
proportion to total workspace size rather than the active file's own size — consistent with the
historical high-CPU symptom this mechanism produces.

## Failure scenario

A multi-project workspace with many external/referenced BbjClass documents loaded: every ::file::Class scope resolution rescans the entire cross-project index (getBBjClassesFromFile), and every document load/rebuild walks its full AST including every external project's documents with no pruning (collectLocalSymbols) — CPU cost scales with total multi-project workspace size rather than the active file's own size, consistent with #232's reported symptom (Code Helper process at 100% CPU on macOS).

## Proposed approach

Run these three tests under a **repo-local Java classpath** available under a non-`EmptyFileSystem` fixture — i.e., `createBBjTestServices` (`bbj-vscode/test/bbj-test-module.ts`) extended with real classpath data (or a richer `JavaInteropTestService` fixture covering `String`, `BBjAPI`'s namespace/semaphore methods, and Java array types) rather than the current fake-class stub. This is the **unblocking condition**: nothing outside this repository needs to change.

## Acceptance criteria

`getBBjClassesFromFile()` gains a per-file cache and `collectLocalSymbols()` gains
external-document-aware pruning, so that CPU cost for both no longer scales with total multi-project
workspace size once the active file's own dependencies are resolved. Regression coverage runs a
multi-document workspace timing fixture under a repo-local Java classpath — extending
`createBBjTestServices` with real classpath data rather than the current fake-class stub — so the fix
and its regression test are evaluated against representative `BBjAPI` namespace/semaphore/array-type
surface rather than a synthetic minimum.

## Traceability

Finding `P66-D3-001` · dimension D3 · severity high · effort 8. `dedup: none`.
<!-- BODY-END P66-D3-001 -->
