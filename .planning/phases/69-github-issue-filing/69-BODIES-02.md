## Index rows 18-40

| # | finding_id | route | title | labels |
|---|---|---|---|---|
| 18 | P61-D1-001 | public issue | vscode: java-interop host/port config reaches socket.connect() with only a falsy-value guard, no type or range check | vscode, PRIO 2, 2 |
| 19 | P61-D1-006 | public issue | vscode: bbj-ws-manager and main.ts pass interop host/port to setConnectionConfig with only a falsy-value guard | vscode, PRIO 2, 2 |
| 20 | P61-D1-007 | public issue | vscode: workspace-settable bbj.configPath is read with no containment check, letting a settings value escape the workspace root | vscode, PRIO 2, 2 |
| 21 | P62-D2-002 | public issue | vscode: Run/Compile/Decompile keybindings and Command Palette entries throw when invoked with no active editor focused | vscode, PRIO 2, 2 |
| 22 | P63-D2-012 | public issue | intellij: first-crash auto-restart blocks the EDT for one second via Thread.sleep(1000) inside invokeLater | intellij, PRIO 2, 2 |
| 23 | P64-D2-001 | public issue | BBj integration and infrastructure: interop test harness hardcodes status: 'pass' for two test cases, masking assertion failures | BBj integration and infrastructure, PRIO 2, 2 |
| 24 | P64-D2-007 | public issue | vscode: vscode:prepublish hook rebuilds an unreferenced out/main.js instead of the extension.cjs and language-server bundle actually shipped | vscode, PRIO 2, 2 |
| 25 | P64-D2-008 | public issue | vscode: tsconfig.test.json's project reference cannot compile, leaving the entire test/ tree with no type-checking | vscode, PRIO 2, 2 |
| 26 | P64-D2-009 | public issue | intellij: language-server copy tasks silently produce a plugin missing its language server when bbj-vscode isn't built first | intellij, PRIO 2, 2 |
| 27 | P64-D3-001 | public issue | BBj integration and infrastructure: five of six CI workflows omit dependency caching, repeating a full install and rebuild on every run | BBj integration and infrastructure, PRIO 2, 2 |
| 28 | P64-D5-002 | public issue | vscode: vitest.config.ts declares no include or exclude, leaving the test-discovery boundary undefined | vscode, PRIO 2, 2 |
| 29 | P64-D6-001 | public issue | dependencies: interop test harness's documented npx tsx invocation installs an unpinned, undeclared dependency at run time | dependencies, PRIO 2, 2 |

## Bodies rows 18-40

### 18. P61-D1-001 — vscode: java-interop host/port config reaches socket.connect() with only a falsy-value guard, no type or range check
**Route:** public issue
**Labels:** vscode, PRIO 2, 2

<!-- BODY-BEGIN P61-D1-001 -->
## Problem

`setConnectionConfig(host, port)` validates `host`/`port` with only a falsy check —
`this.interopHost = host || '127.0.0.1'` and `this.interopPort = port || 5008` — with no type check
and no range check. A non-integer, negative, out-of-range, or string-typed `port` is stored as-is.

## Evidence

`bbj-vscode/src/language/java-interop.ts:116-120`

Surface: `setConnectionConfig()` and its single downstream sink, `socket.connect(this.interopPort,
this.interopHost)` (`java-interop.ts:140`); the two call sites that feed it,
`bbj-ws-manager.ts:53-55` and `main.ts:151-152`, add no validation of their own. Problem class:
missing type/range validation on a workspace-configurable network destination. Impact: a
workspace-scoped interop host/port setting can redirect the language server's Java-class-lookup
socket connection off loopback with no confirmation step.

## Failure scenario

A workspace-scoped .vscode/settings.json committed inside a cloned repository sets bbj.interop.host/bbj.interop.port to an attacker-controlled host/port. Opening that workspace silently redirects every future Java-class lookup off loopback to the attacker's listener, with no confirmation step visible in this unit or its two call sites.

## Proposed approach

Add type/range validation in setConnectionConfig.

## Acceptance criteria

`setConnectionConfig()` validates that `host` is a string and `port` is an integer within the valid
TCP port range before storing them, rejecting or warning on an out-of-range or non-numeric value
rather than silently accepting it. A regression test asserts that a non-integer, negative, or
out-of-range port value passed to `setConnectionConfig()` is rejected or normalized rather than
reaching `socket.connect()` unmodified.

## Traceability

Finding `P61-D1-001` · dimension D1 · severity medium · effort 2. `dedup: none`.
<!-- BODY-END P61-D1-001 -->

### 19. P61-D1-006 — vscode: bbj-ws-manager and main.ts pass interop host/port to setConnectionConfig with only a falsy-value guard
**Route:** public issue
**Labels:** vscode, PRIO 2, 2

<!-- BODY-BEGIN P61-D1-006 -->
## Problem

`bbj-ws-manager.ts:53-55` reads `params.initializationOptions.interopHost || 'localhost'` and
`...interopPort || 5008` — a falsy check only, identical in shape to `main.ts:151-152` — before
calling `javaInterop.setConnectionConfig()`. Neither call site adds type/range validation beyond
what `setConnectionConfig()` itself is already missing.

## Evidence

`bbj-vscode/src/language/bbj-ws-manager.ts:53-55`

Surface: the initialization-options handshake at `bbj-ws-manager.ts:53-55` and the equivalent
settings-change path at `main.ts:151-152`, both feeding `javaInterop.setConnectionConfig()` with
only a falsy-value guard. Problem class: missing type/range validation duplicated across both of
this unit's own call sites into the java-interop connection config. Impact: a non-integer, negative,
out-of-range, or string-typed `interopPort` value passes through either call site unmodified.

## Failure scenario

A workspace-scoped .vscode/settings.json committed inside a cloned repository sets bbj.interop.host/bbj.interop.port to an attacker-controlled host/port, reachable via either the initial handshake (bbj-ws-manager.ts) or a later settings change (main.ts) — same failure shape as P61-D1-001, now confirmed at both of this unit's own call sites.

## Proposed approach

Add type/range validation in setConnectionConfig, or duplicate it at both call sites.

## Acceptance criteria

Both call sites (`bbj-ws-manager.ts:53-55` and `main.ts:151-152`) reach a `setConnectionConfig()`
that validates `host` as a string and `port` as an integer within the valid TCP port range, either
by centralizing the check inside `setConnectionConfig()` or duplicating it at both call sites, so no
unvalidated value reaches `socket.connect()`. A regression test asserts the same invalid-port cases
are rejected when submitted through either call site.

## Traceability

Finding `P61-D1-006` · dimension D1 · severity medium · effort 2. `dedup: none`.
<!-- BODY-END P61-D1-006 -->

### 20. P61-D1-007 — vscode: workspace-settable bbj.configPath is read with no containment check, letting a settings value escape the workspace root
**Route:** public issue
**Labels:** vscode, PRIO 2, 2

<!-- BODY-BEGIN P61-D1-007 -->
## Problem

When `this.configPath` is set (from `initializationOptions.configPath` or the
`didChangeConfiguration` path), `bbj-ws-manager.ts:120-121` resolves it via `safeUri()` and reads
its contents with no check that the resolved path stays inside the workspace root; `safeUri()`
(`bbj-ws-manager.ts:266-268`) accepts any `file://` URI or bare path unmodified.

## Evidence

`bbj-vscode/src/language/bbj-ws-manager.ts:118-126`

Surface: the `configPath` read path at `bbj-ws-manager.ts:118-126`, guarded only by `safeUri()`
(`:266-268`), which performs no containment check. Problem class: missing path-containment
validation on a workspace-configurable filesystem path. Impact: a workspace-scoped `configPath`
setting can direct the language server to read an arbitrary file's full contents into memory on
every `initializeWorkspace()` call, with no confirmation step.

## Failure scenario

A workspace-scoped .vscode/settings.json committed inside a cloned repository sets bbj.configPath to an absolute path outside the workspace (e.g. a file under the user's home directory). Opening that workspace causes the language server to read that file's full contents into memory on every initializeWorkspace() call, with no confirmation step and no containment check visible in this unit's files.

## Proposed approach

Resolve configPath relative to the workspace root and reject paths that escape it.

## Acceptance criteria

`configPath` resolution rejects or re-roots any resolved path that falls outside the workspace root
before the language server reads it, rather than reading whatever `safeUri()` returns
unconditionally. A regression test asserts that a `configPath` value pointing outside the workspace
root (via an absolute path or `..` traversal) is rejected rather than read.

## Traceability

Finding `P61-D1-007` · dimension D1 · severity medium · effort 2.

This finding partially overlaps open issue #485 ("Support custom-named/located config files: honor
the configured file everywhere and treat it as a config file in the editor"): #485 requests honoring
a custom-named/located config file "everywhere," a capability already implemented here via
`configPath`; this finding is about that existing implementation's missing path-containment check, a
security defect #485 does not address.
<!-- BODY-END P61-D1-007 -->

### 21. P62-D2-002 — vscode: Run/Compile/Decompile keybindings and Command Palette entries throw when invoked with no active editor focused
**Route:** public issue
**Labels:** vscode, PRIO 2, 2

<!-- BODY-BEGIN P62-D2-002 -->
## Problem

`run()`, `runWeb()`, `decompile()`, and `compile()` in `Commands.cjs` each compute
`const fileName = active ? active.document.fileName : params.fsPath;` with no check that `params`
itself is defined. All five commands (`bbj.run`/`runBUI`/`runDWC`/`compile`/`denumber`) are
registered as global keybindings and none is excluded from the Command Palette, so both invocation
paths can deliver `params === undefined`.

## Evidence

`bbj-vscode/src/Commands/Commands.cjs:250,94,147,299`

Surface: four handler functions — `run()` (`:250`), `runWeb()` (`:94`), `decompile()` (`:147`),
`compile()` (`:299`) — all missing the params-defined guard that a fifth function in the same file,
`resolveTargetFileName()` (`:135-141`), already applies correctly. Problem class: missing
null/undefined check on a globally-invokable command's argument. Impact: invoking any of the five
affected commands via keybinding or Command Palette while no editor has focus throws a `TypeError`
instead of showing a graceful message.

## Failure scenario

Pressing Alt+G/Alt+B/Alt+D/Alt+C/Alt+N (or invoking the corresponding Command Palette entry) while no text editor has focus throws inside the command handler instead of showing a graceful 'no active BBj file' message.

## Proposed approach

(apply resolveTargetFileName's existing guard to the other four).

## Acceptance criteria

`run()`, `runWeb()`, `decompile()`, and `compile()` each apply the same
`if (params && params.fsPath)`-style guard `resolveTargetFileName()` already uses, falling back to
the active editor or showing a graceful "no active BBj file" message instead of throwing when
`params` is undefined and no editor has focus. A regression test invokes each of the four functions
with `params: undefined` and no active-editor stub and asserts no exception is thrown.

## Traceability

Finding `P62-D2-002` · dimension D2 (secondary D4) · severity medium · effort 2. `dedup: none`.
<!-- BODY-END P62-D2-002 -->

### 22. P63-D2-012 — intellij: first-crash auto-restart blocks the EDT for one second via Thread.sleep(1000) inside invokeLater
**Route:** public issue
**Labels:** intellij, PRIO 2, 2

<!-- BODY-BEGIN P63-D2-012 -->
## Problem

On the first detected language-server crash, `updateStatus()` in `BbjServerService.java` calls
`ApplicationManager.getApplication().invokeLater()` with a runnable that calls `Thread.sleep(1000)`
before `restart()`; `invokeLater` runnables execute on the Swing Event Dispatch Thread, so this
sleep blocks the entire IntelliJ UI for a full second.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjServerService.java:115-128`

Surface: the `crashCount == 1` branch of `updateStatus()` (`:115`), whose `invokeLater` runnable
(`:118-128`) calls `Thread.sleep(1000)` (`:123`) before calling `restart()`. Problem class: blocking
the Swing EDT with a synchronous sleep, contrary to this project's own established off-EDT
scheduling pattern. Impact: the entire IntelliJ UI — every queued repaint, keystroke, and menu
action — freezes for approximately one second on every first-crash auto-restart.

## Failure scenario

The moment the language server crashes for the first time within a session, the entire IntelliJ UI freezes for approximately one second while this handler sleeps on the EDT before calling restart() — the opposite of the project's own established "process launch off EDT to pooled thread" pattern (PROJECT.md Key Decisions), applied here to a purely cosmetic pre-restart delay rather than the actual restart work.

## Proposed approach

Move the delay onto restartAlarm.addRequest(this::restart, 1000) off the EDT, reusing the existing Alarm-based scheduling machinery instead of a raw Thread.sleep inside invokeLater.

## Acceptance criteria

The first-crash auto-restart delay is scheduled via `restartAlarm.addRequest(this::restart, 1000)`
rather than `Thread.sleep()` inside `invokeLater()`, so the Swing EDT is never blocked during crash
recovery. Because no `src/test/` source set exists for `bbj-intellij` today, regression coverage for
this fix depends on that gap being closed first, or on a recorded manual verification step at merge
time.

## Traceability

Finding `P63-D2-012` · dimension D2 (secondary D3) · severity medium · effort 2. `dedup: none`.
<!-- BODY-END P63-D2-012 -->

### 23. P64-D2-001 — BBj integration and infrastructure: interop test harness hardcodes status: 'pass' for two test cases, masking assertion failures
**Route:** public issue
**Labels:** BBj integration and infrastructure, PRIO 2, 2

<!-- BODY-BEGIN P64-D2-001 -->
## Problem

Test case 14 and test case 17 in `run-tests.ts` return a hardcoded `status: 'pass'` literal without
ever computing `assertions.some(a => !a.passed)`, unlike every neighbouring case; all four
console/report display surfaces read that hardcoded literal, while only the separate exit-code check
independently walks the real assertion results.

## Evidence

`bbj-vscode/tools/interop-test-harness/run-tests.ts:510,579,584`

Surface: test case 14's return at `:510` and test case 17's two returns at `:579` and `:584`, all
hardcoded `status: 'pass'` rather than computed from their own assertions, unlike the pattern at
`:446`, `:480`, `:535`, `:557`. Problem class: a hardcoded success status masking a real
assertion-failure computation. Impact: a failing assertion in either test case still displays as
passing in the console, the report's status badge, and the summary counts, while only the harness's
exit code (which independently recomputes pass/fail) would disagree.

## Failure scenario

The interop service returns something other than an array for `getClassInfos('com.basis.startup.type')` — for example an error object, which is a response shape the harness explicitly anticipates elsewhere at `:398` and `:408`. The `Returns array` assertion at `:499` records `passed: false`. Test 14 still returns `status: 'pass'` at `:510`. The console prints `✓ 14. getClassInfos — com.basis.startup.type`, the summary line at `:1034` prints `17 passed, 0 failed, 0 errors`, and `report.html` shows a green PASS badge with a `<details>` element that is not even auto-expanded, because `:737` only opens non-pass rows. The process then exits 1. A developer reading the console and the report concludes the interop service is healthy; only the shell's exit status disagrees, and in an interactive run nobody looks at it.

## Proposed approach

Compute `failed` the way `:446` does and return it in all three places.

## Acceptance criteria

Test cases 14 and 17 in `run-tests.ts` compute their `status` field from
`assertions.some(a => !a.passed)`, the same way test cases at `:446`, `:480`, `:535`, `:557` already
do, so a failing assertion is reflected in `status` rather than masked by a hardcoded literal. A
regression run of the harness against a stubbed non-array `getClassInfos` response confirms test 14
and test 17 both report `status: 'fail'`, matching the exit code.

## Traceability

Finding `P64-D2-001` · dimension D2 · severity medium · effort 2. `dedup: none`.
<!-- BODY-END P64-D2-001 -->

### 24. P64-D2-007 — vscode: vscode:prepublish hook rebuilds an unreferenced out/main.js instead of the extension.cjs and language-server bundle actually shipped
**Route:** public issue
**Labels:** vscode, PRIO 2, 2

<!-- BODY-BEGIN P64-D2-007 -->
## Problem

`vscode:prepublish` — the hook `vsce package`/`vsce publish` run — invokes `esbuild-base`, which
builds `out/main.js`, a file nothing in the repository loads. The file `package.json` actually names
as `main`, `out/extension.cjs`, along with `out/language/main.cjs`, is produced only by
`esbuild.mjs`, invoked only by the separate `build`/`watch` scripts, not by `vscode:prepublish`.

## Evidence

`bbj-vscode/package.json:654,661`

Surface: `vscode:prepublish` (`:654`) runs `esbuild-base` (`:661`), which bundles only
`src/extension.ts` into `out/main.js` — a single entry point, a different output filename, and no
language-server bundle; `grep -rn 'out/main.js'` over the tree confirms nothing loads it. Problem
class: the packaging hook builds an artifact the shipped extension does not use, while the artifact
`main` actually names is produced by a different, unrelated script. Impact: the published extension
is packaged from whatever an earlier `npm ci`-triggered `prepare` left in `out/`, not from anything
`vscode:prepublish` itself produced.

## Failure scenario

A maintainer runs `vsce package` (or the release path at `preview.yml:62-68` / `manual-release.yml:84-90`, which invoke vsce and therefore the same hook). `vscode:prepublish` writes a freshly minified `out/main.js` that nothing references, runs the linter, and exits successfully. vsce then packages the directory: the file named by `main`, `out/extension.cjs`, is whatever an earlier `npm ci`-triggered `prepare` left there — unminified, with its sourcemap — and `out/language/main.cjs`, the language server the IntelliJ plugin also consumes, is likewise the `prepare` output rather than anything `vscode:prepublish` produced. The published extension is therefore never the minified artifact the prepublish hook exists to build, ships a 622 KB unreferenced bundle plus sourcemaps as dead weight, and would ship a stale `out/extension.cjs` outright on any machine where `prepare` did not run immediately before packaging.

## Proposed approach

Point `vscode:prepublish` at `node ./esbuild.mjs --minify` and delete the dead `esbuild-base`, `esbuild`, `esbuild-watch` and `test-compile` scripts.

## Acceptance criteria

`vscode:prepublish` invokes `node ./esbuild.mjs --minify`, producing the minified `out/extension.cjs`
and `out/language/main.cjs` that `vsce package` actually ships, and the dead `esbuild-base`,
`esbuild`, `esbuild-watch` and `test-compile` scripts are removed. A packaging smoke check (`npm run
build` plus a `vsce package` dry run) confirms the packaged VSIX no longer contains `out/main.js` and
contains a minified `out/extension.cjs`.

## Traceability

Finding `P64-D2-007` · dimension D2 (secondary D3) · severity medium · effort 2. `dedup: none`.
<!-- BODY-END P64-D2-007 -->

### 25. P64-D2-008 — vscode: tsconfig.test.json's project reference cannot compile, leaving the entire test/ tree with no type-checking
**Route:** public issue
**Labels:** vscode, PRIO 2, 2

<!-- BODY-BEGIN P64-D2-008 -->
## Problem

`tsconfig.test.json:7-9` declares a project reference to `tsconfig.json`, but `tsconfig.json`
declares neither `composite: true` nor emit (`noEmit: true`). A project reference is valid only
against a composite, emitting project, so this configuration cannot be compiled in any mode that
honours the reference, and nothing in the repository invokes it anyway.

## Evidence

`bbj-vscode/tsconfig.test.json:7-9`

Surface: `npx tsc -p tsconfig.test.json --noEmit` fails immediately with `TS6306`/`TS6310` on the
invalid reference; `grep -rn 'tsconfig.test'` across the tree returns zero hits outside the file
itself — no `package.json` script, workflow step, or editor configuration runs it. Problem class: a
structurally invalid, unreferenced build configuration. Impact: the 50 files under `test/` are
type-checked by nothing — `npm run build` covers only `src/**/*.ts`, and `npm run lint` covers `test/`
without enforcing type rules.

## Failure scenario

A contributor follows the file's evident intent and runs `npx tsc -b tsconfig.test.json` (or wires it into `npm run build`, or an editor picks it up as the test project). The build fails immediately with TS6306/TS6310 before type-checking a single test file. Meanwhile, in the state that actually ships, every type error in `test/` — 50 test files — passes unnoticed through both `npm run build` and CI, because the only configuration that claims to cover them is the one that cannot run. A type error introduced in a test helper surfaces as a vitest runtime failure with a confusing message rather than as a compile error, or does not surface at all in a code path the suite does not take.

## Proposed approach

Delete `tsconfig.test.json:7-9` and add a `typecheck` script that runs `tsc -p tsconfig.test.json --noEmit`.

## Acceptance criteria

`tsconfig.test.json` no longer declares an invalid `references` block, and a new `typecheck` script
runs `tsc -p tsconfig.test.json --noEmit` successfully against the `test/` tree. Running the new
script against the current `test/` sources exits 0 (or surfaces any real, previously-hidden type
errors for a follow-up fix), confirming the 50 test files are now type-checked by something.

## Traceability

Finding `P64-D2-008` · dimension D2 (secondary D4, D5) · severity medium · effort 2. `dedup: none`.
<!-- BODY-END P64-D2-008 -->

### 26. P64-D2-009 — intellij: language-server copy tasks silently produce a plugin missing its language server when bbj-vscode isn't built first
**Route:** public issue
**Labels:** intellij, PRIO 2, 2

<!-- BODY-BEGIN P64-D2-009 -->
## Problem

`copyLanguageServer` and the `prepareSandbox` customisation copy `main.cjs` from
`bbj-vscode`'s build output directory, which is produced only by `bbj-vscode`'s own `npm run build`
and is gitignored so never present in a fresh clone. Neither task declares that dependency, checks
the source exists, or fails when it is absent.

## Evidence

`bbj-intellij/build.gradle.kts:93-98,115-119`

Surface: `copyLanguageServer` (`:93-98`) and the `prepareSandbox` customisation (`:115-119`), both
copying `../bbj-vscode/out/language/main.cjs`, with no `dependsOn` on any `bbj-vscode` step, no
`Exec` task, no `onlyIf`, no `doFirst` existence assertion, and no error path. Problem class: a
build-output copy with no declared source dependency or missing-source check. Impact: running
`./gradlew buildPlugin` without first building `bbj-vscode` silently assembles a plugin missing its
language server, with no signal from the build about why.

## Failure scenario

A contributor clones the repository and runs `./gradlew buildPlugin` in `bbj-intellij/` without first running `npm ci && npm run build` in `bbj-vscode/` — the order CLAUDE.md documents as two separate sections and no build file enforces. `../bbj-vscode/out/language/main.cjs` does not exist, because `/out/` is gitignored. Nothing in `build.gradle.kts` declares that dependency, tests for the file, or fails; the copy specifications at `:93-98` and `:115-119` simply have no matching source. The plugin the build assembles is missing the language server it exists to wrap, and the contributor has no signal from the build about why. The same silent-input condition applies in CI at `pr-validation.yml:61`, which is guarded only by an `actions/download-artifact` step earlier in the same job rather than by anything in the Gradle build itself.

## Proposed approach

Declare the copy inputs explicitly and add a `doFirst` that fails with a directed message when `../bbj-vscode/out/language/main.cjs` is absent.

## Acceptance criteria

`copyLanguageServer` and the `prepareSandbox` customisation either declare their `bbj-vscode` build
dependency explicitly or add a `doFirst` that fails with a directed message when
`../bbj-vscode/out/language/main.cjs` is absent, rather than silently copying nothing. Running
`./gradlew buildPlugin` against a clean clone with no prior `bbj-vscode` build now fails with an
actionable message instead of assembling a plugin missing its language server.

## Traceability

Finding `P64-D2-009` · dimension D2 · severity medium · effort 2. `dedup: none`.
<!-- BODY-END P64-D2-009 -->

### 27. P64-D3-001 — BBj integration and infrastructure: five of six CI workflows omit dependency caching, repeating a full install and rebuild on every run
**Route:** public issue
**Labels:** BBj integration and infrastructure, PRIO 2, 2

<!-- BODY-BEGIN P64-D3-001 -->
## Problem

Five of the six `actions/setup-node`/`actions/setup-java` steps that precede an `npm ci` or Gradle
resolution against `bbj-vscode`/`bbj-intellij` set no `cache:` input, unlike `deploy-docs.yml`'s
correctly-cached step. Every uncached run repeats a full dependency install plus the Langium
grammar regeneration and esbuild bundle that `npm ci`'s `prepare` script triggers.

## Evidence

`.github/workflows/build.yml:19-22`

Surface: five `actions/setup-node@v4`/`@v3` steps with no `cache:` input —
`build.yml:19-22`, `pr-validation.yml:22-25`, `pr-vsix.yml:41-44`, `preview.yml:19-22`, and
`manual-release.yml:20-23` — plus three `actions/setup-java@v4` steps with no `cache: gradle`.
Problem class: missing dependency caching on repeated CI jobs. Impact: a fixed, repeated cost on
every run of five of six workflows, regenerating artefacts that are byte-identical to the previous
run's whenever the lockfile has not changed.

## Failure scenario

Any pull request to `main` that touches `bbj-vscode/**` starts at least two jobs — `build.yml`'s and `pr-vsix.yml`'s (see `P64-D3-002`) — and each performs a complete cold `npm ci` plus the `prepare` regeneration and bundle before it does any work specific to its own purpose. A PR touching `bbj-intellij/**` additionally resolves the IntelliJ Platform dependency set from scratch in `pr-validation.yml`. The wrong behaviour is not an incorrect result but a fixed, repeated cost paid on every run of five of six workflows, on a repository whose CI already runs two to three overlapping builds per pull request; the same runner minutes are spent regenerating artefacts that are byte-identical to the previous run's whenever the lockfile has not changed.

## Proposed approach

Add `cache: npm` and `cache-dependency-path: bbj-vscode/package-lock.json` to the five `setup-node` steps and `cache: gradle` to the three `setup-java` steps.

## Acceptance criteria

All five `actions/setup-node` steps carry `cache: npm` with `cache-dependency-path:
bbj-vscode/package-lock.json`, and all three `actions/setup-java` steps carry `cache: gradle`. A
second run of the same workflow with an unchanged lockfile shows a cache hit in the setup step's
log, rather than a full re-download and rebuild.

## Traceability

Finding `P64-D3-001` · dimension D3 · severity medium · effort 2. `dedup: none`.
<!-- BODY-END P64-D3-001 -->

### 28. P64-D5-002 — vscode: vitest.config.ts declares no include or exclude, leaving the test-discovery boundary undefined
**Route:** public issue
**Labels:** vscode, PRIO 2, 2

<!-- BODY-BEGIN P64-D5-002 -->
## Problem

`vitest.config.ts`'s `test` block contains only `coverage` configuration — it declares no `include`
and no `exclude` for test discovery, so which files constitute the suite falls entirely to vitest's
own built-in defaults, which are documented in vitest and nowhere in this repository.

## Evidence

`bbj-vscode/vitest.config.ts:4-29`

Surface: `vitest.config.ts:4-29`'s `test` block, which sets `coverage` (`:7-28`) but no
`include`/`exclude`; `tsconfig.test.json`'s `include: ["test/**/*"]` is the only written boundary in
the repository, but that file cannot itself be compiled (`P64-D2-008`). Problem class: an undefined
test-discovery boundary resting on an external tool's unstated defaults. Impact: a stray test file
outside `test/` would silently join the suite with no repository source confirming it should, and a
vitest major-version upgrade could change default discovery with no diff in this repository.

## Failure scenario

Two consequences, both reachable today. First, the test surface is undefined in writing: a contributor adding `tools/foo.test.ts` or a stray `*.test.ts` anywhere outside `test/` silently extends the suite, and a reviewer checking "is this file in the suite?" cannot answer from any file in the repository — the true boundary lives in vitest's defaults, which no source here states and which change between vitest majors. The project is on `vitest@^4.1.10`, a caret range, so a minor upgrade that alters default discovery would change the suite with no diff in this repository. Second, and concretely: because `tsconfig.json:18-20` includes only `src/**/*.ts` and the one configuration that names `test/**/*` is the broken one, **the 50 test files are type-checked by nothing** — `npm run build` never sees them, and `npm run lint` sees them but enforces zero rules (`P64-D4-005`). A type error in a test helper therefore surfaces as a confusing vitest runtime failure, or not at all on a path the suite does not take.

## Proposed approach

Add `include: ['test/**/*.test.ts']` and an explicit `exclude` naming `out/**` and `node_modules/**` to `vitest.config.ts`'s `test` block.

## Acceptance criteria

`vitest.config.ts`'s `test` block declares an explicit `include: ['test/**/*.test.ts']` and an
`exclude` naming `out/**` and `node_modules/**`, so the suite's boundary is written down rather than
inherited from vitest's own defaults. `npx vitest list --filesOnly` resolves the same 50 files after
the change as before it, confirming no test was silently added or dropped by the explicit globs.

## Traceability

Finding `P64-D5-002` · dimension D5 (secondary D4) · severity medium · effort 2. `dedup: none`.
<!-- BODY-END P64-D5-002 -->

### 29. P64-D6-001 — dependencies: interop test harness's documented npx tsx invocation installs an unpinned, undeclared dependency at run time
**Route:** public issue
**Labels:** dependencies, PRIO 2, 2

<!-- BODY-BEGIN P64-D6-001 -->
## Problem

`run-tests.ts`'s shebang and its own usage block document the only supported way to run it as
`npx tsx tools/interop-test-harness/run-tests.ts`. `tsx` is declared in neither `dependencies` nor
`devDependencies`, and the lockfile pins no version of it, so `npx` resolves it from the public
registry at whatever version is current on the day the command runs.

## Evidence

`bbj-vscode/tools/interop-test-harness/run-tests.ts:1,11-13`

Surface: `run-tests.ts:1`'s `#!/usr/bin/env npx tsx` shebang and its `:11-13` usage block, both
invoking `tsx` via `npx`; `package.json` declares `tsx` nowhere, and `package-lock.json` contains no
top-level install of it. Problem class: an undeclared, unpinned runtime dependency resolved fresh at
every invocation. Impact: `npm audit` cannot report on a package that is not in the tree, and
Dependabot cannot open an update PR for a dependency that is not declared, so an advisory against
`tsx` produces no signal here in either direction.

## Failure scenario

A maintainer follows the file's own documented usage and runs `npx tsx tools/interop-test-harness/run-tests.ts`. `npx` downloads and executes whatever `tsx` the registry currently resolves to, with no version pin and no lockfile entry constraining it, and that package's install and run-time code executes with the developer's privileges. Nothing in this repository records which version was used, `npm audit` cannot report on a package that is not in the tree, and `.github/dependabot.yml` cannot open an update PR for a dependency that is not declared — so an advisory published against `tsx` would produce no signal here at all, in either direction.

## Proposed approach

Add a pinned `tsx` to `devDependencies` and drop `npx` from the shebang and the usage block.

## Acceptance criteria

`tsx` is declared at a pinned version in `devDependencies` and recorded in the lockfile; the
shebang and usage block in `run-tests.ts` no longer route through `npx`. `npm audit` and Dependabot
now cover `tsx` the same way they cover every other declared dependency, confirmed by `tsx`
appearing in `npm ls tsx`'s output after the change.

## Traceability

Finding `P64-D6-001` · dimension D6 · severity medium · effort 2. `dedup: none`.
<!-- BODY-END P64-D6-001 -->
