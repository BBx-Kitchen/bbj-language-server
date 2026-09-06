# Phase 83: Regression Test Hardening - Context

**Gathered:** 2026-09-06
**Status:** Ready for planning

<domain>
## Phase Boundary

The IntelliJ plugin's plain-JUnit 5 suite (`bbj-intellij/src/test/`, run by `./gradlew test`, which `buildPlugin` depends on) gains durable regression coverage for three surfaces, and issues #569 (residual), #544 and #554 close on the evidence:

1. **BUILD-04 / #569 residual** — the Node.js download → verify → extract → install → cache-hit pipeline in `BbjNodeDownloader`, and the EDT-responsiveness paths Phase 79 changed (EDT-01..06), each with the behaviours that are still untested today.
2. **BUILD-05 / #544 (closes #554 as a subset)** — every LSP4IJ coupling point in `src/main` (now **11 files**, not the 7 the issues list), plus the custom request surface (`bbj/compile` and the seven `bbj/composer/*` requests on `BbjComposerServer`), each with a canary or source guard that fails on a breaking LSP4IJ change.

The phase is test-first but **not strictly test-only**: two seam extractions are agreed (the Node pipeline seam, D-01; a failure path for the Settings lookup, D-13), and a bug that a new test turns red on `main`'s logic is fixed in-phase when it is small and seam-local (D-15). Everything else found becomes a todo.

Not in this phase: any `BasePlatformTestCase` / live-IDE harness (REQUIREMENTS.md Out of Scope), a general async abstraction, retrofitting the 40-odd existing source guards (D-17), a runtime LSP4IJ version check in the plugin (D-11), switching extraction to the platform `Decompressor` (D-03), the Settings placeholder wording (D-13), and the three reviewed todos under Deferred Ideas.

</domain>

<decisions>
## Implementation Decisions

### Verified state of `main` (2026-09-06)

- **Suite size:** 43 JUnit 5 test classes under `bbj-intellij/src/test/java/com/basis/bbj/intellij/` (`actions/`, `commenter/`, `compile/`, `composer/`, `concurrency/`, `lexer/`, `lsp/`, and the root package). The "7 classes" in BUILD-04/#569 was true at requirements time (2026-09-04) and is stale. `src/test/resources/` does not exist yet. Test dependencies: `junit-bom:5.10.2`, `useJUnitPlatform()`; no platform test framework (`build.gradle.kts:40-46`). LSP4IJ Gradle pin is **0.21.0** (`build.gradle.kts:34`); lsp4j and the LSP4IJ classes are on the test classpath (Phase 81's `CompileResultJsonBoundaryTest` drives `MessageJsonHandler`).
- **Node pipeline (`bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java`):** `getCachedNodePath()` (:50, exists + executable + `NodeInstallIntegrity.SESSION.matchesRecordedDigest`), `downloadNodeAsync()` (:78, `DownloadGuard.SESSION.tryAcquire` then `Task.Backgroundable`, completions drained via `invokeLater` in `finally`), `Platform` enum (:110, `SystemInfo.isWindows`), `downloadAndExtractNode()` (:123-165: temp file → `download` → `NodeArchiveVerifier.verify` → temp dir → `extract` → `install` → `cleanup`, `deleteIfExists` in `finally`), `buildDownloadUrl()` (:167), `download()` (:174, `HttpRequests.request(url).productNameAsUserAgent().connect(r -> r.saveToFile(...))`), `extract()` (:184), `install()` (:195-222: locate `node.exe` or `bin/node`, `Files.copy` REPLACE_EXISTING, `setExecutable(true)` off Windows, `NodeInstallIntegrity.SESSION.record`), `cleanup()`/`deleteDirectory()` (:224, :348 — recursive `File.isDirectory()` walk that follows symlinks, 79-REVIEW IN-03), `extractZip()` (:229, copies only the entry ending in `node.exe`), `extractTarGz()` (:252, spawns `tar xzf <file> -C <dir> --strip-components=1`), `getPlatformName()`/`getArchitecture()` (:291-312, `SystemInfo`/`CpuArch`), `getNodeDataDirectory()` (:314, `PathManager.getPluginsPath()/bbj-intellij-data/nodejs`). All private statics.
- **Node coverage that already exists:** `lsp/NodeArchiveVerifierTest` (digest pins), `lsp/NodeInstallIntegrityTest` (sidecar), `lsp/NodeExecutableResolverTest` (configured/detected/cached order), `DownloadGuardTest`, `BbjNodeVersionCacheTest`, and `lsp/BbjNodeDownloaderSourceGuardTest` (13 ordering/wiring guards). **Not executed by any test:** fetch, both extractors, install, cache-hit composition, URL/file-name assembly, cleanup.
- **Phase 79 EDT coverage that already exists:** `concurrency/RestartGateTest`, `concurrency/KeystrokeDebouncerTest` (+ `ManualScheduler`), `BbjNodeVersionCacheTest`, `DownloadGuardTest`, `lsp/OffEdtDispatchSourceGuardTest`, `lsp/BbjServerServiceRestartSourceGuardTest`, `lsp/BbjSettingsComponentSourceGuardTest`, `lsp/BbjMissingNodeNotificationSourceGuardTest`. Known thin spot (79-UI-REVIEW.md priority fix 1): `BbjSettingsLookups.lookupNode/lookupHome` (:37, :50) and `KeystrokeDebouncer` contain no `catch`; an exception leaves `nodeVersionLabel` at "Checking Node.js version…" (`BbjSettingsComponent.java:221`) and the classpath combo disabled until the next keystroke; results are applied through `applyNodeLookup`/`applyHomeLookup` (:190/:199 wiring, :266, :291).
- **LSP4IJ coupling inventory (11 files):** `lsp/BbjCompletionFeature` (extends `LSPCompletionFeature`, overrides `getIcon(CompletionItem)`); `lsp/BbjLanguageServerFactory` (implements `LanguageServerFactory`: `createConnectionProvider` → `StreamConnectionProvider`, `createLanguageClient` → `LanguageClientImpl`, `getServerInterface` → `BbjComposerServer.class`, `createClientFeatures` → anonymous `LSPClientFeatures` overriding `initializeParams`, `.setDocumentLinkFeature(new LSPDocumentLinkFeature(){ isSupported })`, `.setCompletionFeature`); `lsp/BbjLanguageClient` (extends `LanguageClientImpl`: `createSettings()`, `handleServerStatusChanged(ServerStatus)`); `lsp/BbjLanguageServer` (extends `OSProcessStreamConnectionProvider`, `setCommandLine`); `ui/BbjServerService` (`LanguageServerManager.getInstance(project)` start/stop by id at :215, `ServerStatus` values `stopped/starting/started/stopping`); `ui/BbjJavaInteropService`, `ui/BbjStatusBarWidget` (`ServerStatus`); `actions/BbjRefreshJavaClassesAction`, `actions/BbjRunActionBase` (:131), `actions/BbjCompileAction` (:174) (`ServerStatus.started` gating, the last two by FQN, not import); `composer/BbjComposerService` (`LanguageServerManager.start/getLanguageServer`). #554 measured `@ApiStatus.Experimental` on `LSPCompletionFeature`, `LSPClientFeatures`, `LSPDocumentLinkFeature` in the 0.19.0 jar; the pin has since moved to 0.21.0 (Phase 81-07), so the markers must be re-measured against that jar.
- **Custom request surface:** `composer/BbjComposerServer` declares eight `@JsonRequest` methods (`bbj/composer/catalogs`, `msgbox/preview`, `addwindow/preview`, `msgbox/decodeCall`, `addwindow/decodeCall`, `addchildwindow/preview`, `addchildwindow/decodeCall` at :32-56, and `bbj/compile` at :65). Server side, the composer names are keys of the handler map in `bbj-vscode/src/language/composer-commands.ts` (:53 onward) and `bbj/compile` is `COMPILE_REQUEST_METHOD` in `bbj-vscode/src/language/compile-command.ts:34`. Gson DTOs: `composer/ComposerModels.java`, `compile/CompileModels.java`.
- **CI:** every workflow runs on `ubuntu-latest` only; `pr-validation.yml` is path-filtered to IntelliJ changes. There is no Windows or macOS runner.

### Carried forward (locked by Phases 79–82 — do not re-open)

- **C-01:** Every production change is a plain-Java seam with no IntelliJ imports, covered by behavioural JUnit 5 tests plus a source guard per production wiring site. No new test framework, no `testFramework(TestFrameworkType.Platform)`, no `BasePlatformTestCase`.
- **C-02:** Red-then-green, with each issue's acceptance wording as the literal target of at least one test name (#569: "Node download/extract/cache pipeline", "EDT-responsiveness paths"; #544/#554: "exercising `getIcon()`, the `LSPClientFeatures` builder chain, and `LSPDocumentLinkFeature.isSupported()`"). For this phase "red" is produced by D-16's mutation checks.
- **C-03:** Nothing blocking on the EDT; the seams consult `ThreadProbe`/`Scheduler` where they already exist.
- **C-04:** Landing follows Phase 80–82 practice: public PRs per plan, issue numbers in comments are fine, no advisory ids.
- **C-05:** Existing seams are reused, never duplicated: `NodeArchiveVerifier` (`ByteSource`, `DigestSource`), `NodeInstallIntegrity.SESSION`, `NodeExecutableResolver.PathProbe`, `DownloadGuard.SESSION`, `BbjNodeVersionCache.SESSION`, `concurrency/{Scheduler, ThreadProbe, RestartGate, KeystrokeDebouncer}`, test double `ManualScheduler`.

### Node pipeline testability (BUILD-04a, #569)

- **D-01:** The download/extract/install/cache-hit steps are **extracted into a plain-Java pipeline seam** (name at planner's discretion, e.g. `NodeInstallPipeline`, package `lsp/` beside the other Node seams) with injectable collaborators: a `Fetcher` (url, target path, progress/cancel), the platform + architecture (an enum or record, never `SystemInfo`/`CpuArch` inside the seam), the data directory (a `Path`, never `PathManager`), a cancel probe (replacing `ProgressIndicator.checkCanceled`), and the existing `ByteSource`/`DigestSource`/`NodeInstallIntegrity` seams. The seam owns: URL and archive-file-name assembly, the fetch → verify → extract → install → record order, temp-file/temp-dir lifecycle, and cleanup. `BbjNodeDownloader` becomes a thin adapter (guard, `Task.Backgroundable`, notifications, the production collaborators). The existing 13 `BbjNodeDownloaderSourceGuardTest` guards are re-pointed at the seam where the guarded text moves, and a new guard pins that the adapter wires the production collaborators. — **Reversibility:** reversible — internal class, no published contract; the adapter keeps `getCachedNodePath()` and `downloadNodeAsync(Project, Runnable)` signatures unchanged for their callers (`BbjLanguageServer`, `BbjMissingNodeNotificationProvider:66`).
- **D-02:** Extraction tests use **tiny committed fixture archives** under `bbj-intellij/src/test/resources/` (new directory): one `.zip` with `node.exe` (a few bytes of marker content) at the archive root, and one `.tar.gz` with `<top-level>/bin/node` so `--strip-components=1` yields `bin/node`. Each fixture's provenance (the commands that made it) is recorded in a sibling `README` or the test's javadoc. No archive is generated at test time.
- **D-03:** `extractTarGz` **keeps spawning the external `tar`** (`xzf … -C … --strip-components=1`); no switch to the platform `Decompressor`. The behavioural test runs real `tar` and is skipped by JUnit assumption on Windows (`@DisabledOnOs(OS.WINDOWS)` or `assumeTrue(tar on PATH)`), which is fine because CI is `ubuntu-latest`. A source guard pins the argv shape. Zip extraction is tested for real through `java.util.zip`.
- **D-04:** The HTTP fetch is covered by an **injectable `Fetcher` with a fake** that copies the fixture into the target path; tests never open a socket. One source guard asserts the production adapter still calls `HttpRequests.request(...)…productNameAsUserAgent()…saveToFile(...)`. A JDK `HttpServer` round trip is not required (deferred idea).
- **D-05:** The seam's tests cover **both platform branches on any host**: Windows (`.zip`, `node.exe` at root, no chmod, URL `…-win-x64.zip`/`…-win-arm64.zip`) and Unix (`.tar.gz`, `bin/node`, executable bit set, `…-darwin-…`/`…-linux-…`), plus arm64/x64 naming, verify-failure short-circuit (no extract, temp file gone), missing-binary-in-archive failure, cancel between steps, cache-hit true/false composition (`getCachedNodePath` semantics: exists, executable, digest matches), and REPLACE_EXISTING on re-install.
- **D-06 (Windows regression, 80-UAT):** The Windows branch tests are the phase's attempt to **reproduce the auto-install failure** observed on the Windows test machine. If a Windows-branch test goes red on `main`'s logic (moved unchanged into the seam), the fix ships in the same plan with that test (D-15). If everything stays green, the SUMMARY records that the regression was not reproducible from the pipeline logic alone, and a todo asks for a live Windows check with `idea.log` and the `bbj-intellij-data/nodejs` directory contents.

### LSP4IJ canaries (BUILD-05, #544 closing #554)

- **D-07:** For every coupling point in the inventory above, a **reflective signature canary**: `getMethod`/`getDeclaredMethod` (or constructor/field lookup) with the exact parameter and return types our code overrides or calls, the superclass/interface chain our classes rely on (`LSPCompletionFeature`, `LanguageClientImpl`, `OSProcessStreamConnectionProvider`, `LanguageServerFactory`, `LSPClientFeatures`, `LSPDocumentLinkFeature`, `LanguageServerManager.getInstance/start/stop/getLanguageServer`, `ServerStatus` constants `stopped/starting/started/stopping`), and the **`@ApiStatus.Experimental` marker** on each class #554 measured (re-measured against the 0.21.0 jar; the canary asserts the marker's presence so that graduation forces a deliberate re-audit). Each canary sits next to a **source guard on our override site** (scoped per D-17). — **Reversibility:** reversible.
- **D-08:** **Behavioural where headless allows:** `BbjCompletionFeature.getIcon` is also driven with real `org.eclipse.lsp4j.CompletionItem`s (kinds × Java-interop detail heuristics) **if research confirms `AllIcons` resolves in the test JVM without an `Application`**; otherwise the test is dropped, not stubbed. `createClientFeatures()` cannot run headless (`BbjSettings.getInstance()`), so the builder chain (`initializeParams`, `setDocumentLinkFeature`, `setCompletionFeature`) stays reflective plus source-guarded.
- **D-09:** A **per-file-and-symbol allowlist fence**: one test scans `bbj-intellij/src/main/java` for `com.redhat.devtools.lsp4ij` imports and fully-qualified uses and asserts the resulting map `file → {simple symbols}` equals an in-test allowlist (the 11 files and their symbols above). Adding an LSP4IJ use anywhere means editing the allowlist beside its canary. The allowlist is the durable inventory the issues ask for.
- **D-10:** The custom request surface gets a **cross-language contract test** and **JSON boundary tests**: (a) every `@JsonRequest` string on `BbjComposerServer` must appear as a quoted literal in `../bbj-vscode/src/language/composer-commands.ts` or `compile-command.ts` (resolved relative to the Gradle project dir, the same way `build.gradle.kts` reaches `../bbj-vscode`); (b) a `MessageJsonHandler` round trip per composer DTO (`ComposerModels`), mirroring `CompileResultJsonBoundaryTest`, so a Gson field rename or an int overflow fails here. A source guard pins `getServerInterface()` returning `BbjComposerServer.class`.
- **D-11:** **Version pin test, runtime skew recorded as out of reach:** a test parses the LSP4IJ version from `build.gradle.kts` and asserts it matches the LSP4IJ plugin on the test classpath (its `plugin.xml`/manifest), so bumping the pin re-runs every canary against the new jar. Runtime divergence (plugin.xml `<depends>` is unpinnable, G-81-5) is documented in the SUMMARY as a known limit; the reflective `Diagnostic.getMessage` read from 81-07 (`DiagnosticMessageAccessSourceGuardTest`) remains the runtime defence. No runtime version check is added to the plugin.

### EDT residual and found bugs (BUILD-04b)

- **D-12:** "EDT residual" is **gap-driven**: the plan enumerates each Phase 79 fix site (EDT-01..06 → `BbjRunActionBase`/`BbjEMLoginAction`, `BbjSettingsComponent`+`BbjSettingsLookups`+`KeystrokeDebouncer`, `BbjMissingNodeNotificationProvider`+`BbjNodeVersionCache`, `BbjServerService`+`RestartGate`, `DownloadGuard`), maps it to its existing test, and adds only the untested behaviours — at minimum: the debounced lookup failure path (D-13), cache invalidation when the binary's stat changes, restart coalescing when a manual trigger lands inside the 1 s crash delay, drained download completions reaching the EDT executor, and both notification-provider branches (configured path, PATH-detected). The map is recorded in the SUMMARY as the #569 closure evidence (D-18).
- **D-13:** The **Settings lookup failure path is fixed in-phase**: a new test makes a lookup throw and asserts an error result is posted (and that the pending "Checking…"/disabled-combo state is cleared); the fix catches in `BbjSettingsLookups` (or the debouncer's task wrapper) and applies an error state through the existing `applyNodeLookup`/`applyHomeLookup` path. The placeholder wording ("(fix BBj home path above)") is **not** changed (deferred idea).
- **D-14:** **IN-03 is fixed inside the pipeline seam** while cleanup moves: the temp-dir walk uses `NOFOLLOW_LINKS` (delete the link, never its target); a `@TempDir` test plants a symlink pointing outside the extraction dir and asserts the target survives.
- **D-15:** **Rule for any other red on `main`'s logic:** fix in the same plan when the fix is small, seam-local and needs no UI or platform change, with the finding test as its regression test; otherwise file a todo and keep the failing test `@Disabled("<todo title>")` named after the bug.

### Proof, guards, closure, plans

- **D-16:** **Mutation check per new test class**, recorded in the plan SUMMARY: the executor temporarily breaks the guarded production line (or points a canary at a wrong signature/annotation, or removes an allowlist entry), captures the red run's output, and reverts. One mutation per class, not per test. This is how C-02's "red" is produced in a test-first phase.
- **D-17:** **New guards are scoped and structural:** Phase 83 source guards assert inside a method-body window (locate the method, then assert within it) rather than whole-file `indexOf`, and use reflection for structural facts (visibility, superclass, annotations, declared methods) where the production class loads without an `Application`. The existing guards from Phases 60–82 are **not** retrofitted (IN-01 stays an accepted limit for them).
- **D-18:** **Closure evidence** is a coverage-map table in each SUMMARY (acceptance criterion → test class and method: Node pipeline steps, EDT-01..06, each of the 11 coupling files' symbols, the 8 request names) and the same table posted as the closing comment on #569, #544 and #554. No separate `TESTING.md`.
- **D-19:** **Three plans, parallel-capable (one wave):** P01 Node pipeline seam + fixtures + Windows branch + IN-03 (D-01..D-06, D-14); P02 EDT residual gaps + Settings failure path (D-12, D-13); P03 LSP4IJ canaries, allowlist fence, request contract, JSON boundary, pin test (D-07..D-11). They touch disjoint files; the planner may still serialize if the shared `BbjNodeDownloaderSourceGuardTest` edits collide.

### Claude's Discretion

- Seam names and packages (`lsp/` beside the other Node seams is the natural home), the `Fetcher`/platform/cancel-probe interface shapes, and whether the pipeline seam is one class or a small package.
- Fixture file names and the exact marker bytes inside them; whether provenance lives in a `README` or javadoc.
- How the allowlist is expressed (map literal vs. a small text table in the test) and how FQN uses without an import (`BbjRunActionBase:131`, `BbjCompileAction:174`) are matched.
- Canary class placement (one `lsp/Lsp4ijCouplingCanaryTest` vs. per-file), how the `@ApiStatus.Experimental` lookup handles `RuntimeInvisibleAnnotations` (reflection cannot see class-retention annotations — research must pick between `javap`-style bytecode reading and a retention check; if the marker is invisible at runtime, assert it via the jar's bytecode or record the limit).
- Which extra EDT cases beyond the D-12 minimum are worth adding.
- Exact `@Disabled` naming and todo wording for deferred findings.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 83 goal, success criteria 1–2, dependencies on Phases 79 and 81.
- `.planning/REQUIREMENTS.md` — BUILD-04, BUILD-05 wording; Out of Scope table (no `BasePlatformTestCase`, no general async abstraction).
- `.planning/PROJECT.md` — v4.2 "Build and platform coupling" bullet; Key Decisions rows for Phases 78–82 (seam + source-guard convention, LSP4IJ pin 0.21.0 rationale, reflective `getMessage`).
- `.planning/STATE.md` §Blockers/Concerns — the Phase 79 UI-review follow-ups, Phase 80 UAT Windows Node observation, Phase 81 UAT LSP4IJ-skew note, all pointed at this phase.
- GitHub issues #569, #544, #554 (`gh issue view <n> --repo BBx-Kitchen/bbj-language-server`) — acceptance criteria are authoritative for closure; #544 supersedes #554.

### Research (v4.2)
- `.planning/research/SUMMARY.md` §Phase 8 "LSP4IJ Coupling Regression Tests" (lines ~112-124) and the #569 staleness correction (line 12).
- `.planning/research/ARCHITECTURE.md` — coupling table (~82), Wave 7 (~267-291), the "reflective canary + structural source-guard" pattern row (~123).
- `.planning/research/PITFALLS.md` — Pitfall 13 (tests must actually execute under `./gradlew test`), the LSP4IJ `@ApiStatus.Experimental` row (~255: treat any pin bump as a re-audit trigger).

### Prior-phase conventions and findings
- `.planning/phases/79-edt-responsiveness/79-CONTEXT.md` — D-01/D-02/D-03 seam, `Scheduler`, `ThreadProbe`; D-09..D-15 the EDT fix sites this phase maps.
- `.planning/phases/79-edt-responsiveness/79-REVIEW.md` §IN-01 (text guards refactor-defeatable), §IN-02 (duplicated bundle-path resolution, deferred), §IN-03 (`deleteDirectory` follows symlinks — fixed here, D-14).
- `.planning/phases/79-edt-responsiveness/79-UI-REVIEW.md` priority fix 1 — the lookup failure path (D-13).
- `.planning/phases/80-em-token-security/80-UAT.md` line ~99 — the Windows Node auto-install observation (D-06).
- `.planning/phases/81-feature-parity-and-correctness/81-CONTEXT.md` — C-01..C-04; `81-UAT.md` lines ~135/149 — unpinned `<depends>` and the dev-build version idea.
- `.planning/phases/82-composer-robustness/82-CONTEXT.md` — "keep the LSP4IJ-coupled code confined to `BbjComposerServer`/`BbjComposerService`" (Integration Points), the composer DTO shapes.

### Production code this phase changes or canaries
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java` — the pipeline to extract (line map in "Verified state").
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/{NodeArchiveVerifier, NodeInstallIntegrity, NodeExecutableResolver}.java`, `DownloadGuard.java`, `BbjNodeVersionCache.java` — seams the pipeline seam composes.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjSettingsLookups.java`, `BbjSettingsComponent.java` (:190-221, :266-300), `concurrency/KeystrokeDebouncer.java` — the failure path (D-13).
- The 11 LSP4IJ-coupled files listed under "Verified state"; `composer/BbjComposerServer.java`, `composer/ComposerModels.java`, `compile/CompileModels.java`.
- `bbj-vscode/src/language/composer-commands.ts` (handler map, :53+), `bbj-vscode/src/language/compile-command.ts` (`COMPILE_REQUEST_METHOD`, :34) — the server side of the contract test (read-only).
- `bbj-intellij/build.gradle.kts` — LSP4IJ pin (:34), test deps (:40-46); do not add platform test frameworks.
- `.github/workflows/pr-validation.yml`, `build.yml` — `ubuntu-latest` only; the tar-based test must run there and skip on Windows.

### Test patterns to follow
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultJsonBoundaryTest.java` — `MessageJsonHandler` round trip (D-10b).
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/NodeExecutableResolverTest.java`, `NodeArchiveVerifierTest.java` (`@TempDir`), `NodeInstallIntegrityTest.java` — injectable-seam behavioural style.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java`, `OffEdtDispatchSourceGuardTest.java` — the existing guard shape (`Paths.get("src","main",…)`, `countOccurrences`); D-17 tightens the scoping for new guards.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/ManualScheduler.java`, `KeystrokeDebouncerTest.java`, `RestartGateTest.java` — deterministic time doubles for the EDT residual cases.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/IntentionDescriptionResourcesTest.java` — descriptor-driven enumeration (the allowlist fence follows the same "derive the subject list, never hard-code" spirit, inverted: the allowlist is the assertion).

### Not useful here
- `.planning/codebase/*.md` — dated 2026-02-01, predate `bbj-intellij/`'s test suite and seams.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `NodeArchiveVerifier.ByteSource`/`DigestSource`, `NodeInstallIntegrity.SESSION`, `DownloadGuard.SESSION` — already injectable; the pipeline seam takes them as constructor collaborators instead of static singletons.
- `NodeExecutableResolver.PathProbe` — the precedent for a filesystem-probe interface; the seam's data-directory and cancel-probe collaborators follow it.
- `concurrency/ManualScheduler` + `KeystrokeDebouncer` — the D-13 failure-path test drives the debouncer with a throwing task on the manual scheduler.
- `CompileResultJsonBoundaryTest.parse(...)` — the `MessageJsonHandler` harness to generalise for composer DTOs.
- `IntentionDescriptionResourcesTest` — reads `plugin.xml` from `src/main/resources`; the same relative-path convention reaches `../bbj-vscode/src/language` for the contract test.

### Established Patterns
- Plain-Java seam + behavioural test + source guard per wiring site; the platform stays off the test classpath.
- Test names carry acceptance wording; SUMMARYs record red-then-green evidence.
- `assertIsNonDispatchThread()` as the first statement of every pooled task; `invokeLater` with `project.isDisposed()` checks for UI updates.
- LSP4IJ-coupled code is confined to a few files by convention; D-09 turns the convention into a fence.

### Integration Points
- `BbjNodeDownloader.downloadNodeAsync` (called from `BbjMissingNodeNotificationProvider:66`) and `getCachedNodePath` (called from `BbjLanguageServer.resolveNodePath`) keep their signatures; only their bodies delegate to the seam.
- `BbjSettingsComponent.applyNodeLookup`/`applyHomeLookup` are the sinks for the new error state.
- `BbjNodeDownloaderSourceGuardTest` is edited by P01 (guards move with the code); P03's guards are new classes, so the plans stay disjoint.

</code_context>

<specifics>
## Specific Ideas

- The Windows-branch pipeline tests double as the reproduction attempt for the 80-UAT auto-install failure; the SUMMARY must say explicitly whether they reproduced it.
- "Fails on a breaking LSP4IJ change" is read literally: a canary asserts the vendor member's exact shape and its experimental marker, so both a signature change and a graduation to stable trip a test and force a re-audit.
- The allowlist fence is the answer to "every coupling point": the inventory lives in a test that fails when it drifts, not in prose.
- The cross-language contract test is the first Java test to read the language server's TypeScript sources; keep it to literal string presence, never TypeScript parsing.
- Every new test class ships with one recorded mutation run; a guard that cannot be made red is a guard to delete.

</specifics>

<deferred>
## Deferred Ideas

- **Runtime LSP4IJ version check in the plugin** (log/balloon when the loaded LSP4IJ differs from the compiled-against pin) — declined for this phase (D-11); worth a todo if another G-81-5-style skew appears.
- **Switch extraction to the platform `Decompressor.Tar/Zip`** (built-in path-traversal protection, no external `tar`) — declined (D-03); revisit if the external-process dependency causes a support case.
- **JDK `HttpServer` round trip against the real `HttpRequests` adapter** — not required (D-04); optional if research proves `HttpRequests` runs headless.
- **Settings classpath placeholder distinguishing "no home" from "home set but invalid"** (79-UI-REVIEW priority fix 1, second half) — UI wording, quick task.
- **Retrofit Phases 60–82 source guards to the scoped/structural style** (IN-01) — declined (D-17).
- **IN-02: duplicated plugin-bundle path resolution** (79-REVIEW) — unrelated to coverage; quick task.
- **Trim `since-build` so an IntelliJ 2015 install no longer accepts the plugin** (80-UAT observation) — descriptor change, not this phase.
- **Version interim dev builds as 999.x so Marketplace auto-update cannot replace them mid-test** (81-UAT idea) — release-process change.
- **A maintained `bbj-intellij/TESTING.md`** describing seam/guard/canary conventions — declined (D-18) to avoid a second source of truth.

### Reviewed Todos (not folded)
Three pending todos matched Phase 83 on keywords only; as in Phases 79, 81 and 82, none is IntelliJ regression coverage:
- `.planning/todos/pending/2026-08-22-strip-em-config-sentinel-in-getconfigpatharg-and-commands-cj.md` — run-action argument bug in `BbjRunActionBase`/`Commands.cjs`; behaviour fix, stays pending.
- `.planning/todos/pending/2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md` — vitest live-interop drift in `bbj-vscode`; stays pending.
- `.planning/todos/pending/2026-09-05-gradle-wrapper-hygiene-fixture-declares-stale-gradle-version.md` — a `bbj-vscode` test fixture out of step with the committed wrapper; hygiene quick task, stays pending.

</deferred>

---

*Phase: 83-regression-test-hardening*
*Context gathered: 2026-09-06*
