## Index rows 65-87

| # | finding_id | route | title | labels |
|---|---|---|---|---|
| 65 | P61-D2-012 | public issue | vscode: type inference reads an overloaded declaration's return type without re-selecting the correct overload for the call's argument shape | vscode, PRIO 2, 8 |
| 66 | P61-D2-018 | public issue | vscode: editing config.bbx's PREFIX/USE entries while the server is running has no effect until a full restart | vscode, PRIO 2, 8 |
| 67 | P61-D4-001 | public issue | vscode: JavaInteropService bundles five unrelated responsibilities in one 955-line class with no internal boundary | vscode, PRIO 2, 8 |
| 68 | P61-D5-001 | public issue | javascript: 11 interop-dependent linking tests fail deterministically because nothing on port 5008 answers with a real classpath | javascript, PRIO 2, 8 |
| 69 | P61-D5-002 | public issue | javascript: the fake JavaInteropTestService double never exercises java-interop.ts's real connection, timeout or lock code | javascript, PRIO 2, 8 |
| 70 | P61-D5-010 | public issue | javascript: the completion engine offers zero candidate positions inside a class method body, independent of DEF FN or the scope chain | javascript, PRIO 2, 8 |
| 71 | P61-D5-013 | public issue | vscode: initializeWorkspace()'s sequential filesystem-and-network chain can exceed vitest's 10s hook timeout under load, failing unrelated test suites | vscode, PRIO 2, 8 |
| 72 | P61-D5-014 | public issue | vscode: main.ts's LSP handler logic has zero test coverage because it depends on module-load-time createConnection() | vscode, PRIO 2, 8 |
| 73 | P62-D4-002 | public issue | vscode: activate() registers nine unrelated concerns in one ~250-line function, duplicating the exec-wrapping pattern three separate ways | vscode, PRIO 2, 8 |
| 74 | P62-D5-002 | public issue | javascript: extension.ts and Commands.cjs carry zero test coverage, so six known security and correctness findings could regress silently | javascript, PRIO 2, 8 |
| 75 | P62-D7-001 | public issue | vscode: run/compile/EM commands build shell command strings for exec(), unlike IntelliJ's argument-array spawning with pre-flight validation | vscode, PRIO 2, 8 |
| 76 | P63-D2-010 | public issue | intellij: composer edit-application methods apply captured line/offset coordinates without re-validating them after the modal dialog closes | intellij, PRIO 2, 8 |

## Bodies rows 65-87

### 65. P61-D2-012 — vscode: type inference reads an overloaded declaration's return type without re-selecting the correct overload for the call's argument shape
**Route:** public issue
**Labels:** vscode, PRIO 2, 8

<!-- BODY-BEGIN P61-D2-012 -->
## Problem

`findBestOverload()` exists in `bbj-overload-selector.ts` but is called from exactly one site, `bbj-inlay-hint-provider.ts:65`. Neither `bbj-type-inferer.ts`'s two return-type lookups nor `bbj-linker.ts`'s `getCandidate` call it — both simply read the return type of whatever declaration the linker's first-match scope resolution already picked, with no re-selection by the call's actual argument count or types.

## Evidence

`bbj-vscode/src/language/bbj-type-inferer.ts:47-48,77-78`

Surface: two branches (`:47-48`, `:77-78`) that read the return type of an already-linked declaration, plus `bbj-linker.ts:105-110`'s `getCandidate`, a first-match scope resolution with no re-selection; `findBestOverload` is called from exactly one site, `bbj-inlay-hint-provider.ts:65` (confirmed by grep). Problem class: an overload-sensitive call site (type inference) does not re-select among sibling overloads by argument shape, unlike the one call site that already fixed this for parameter hints. Impact: a BBj class or Java class with two same-named method overloads whose scope order yields the argument-shape-wrong overload first has its call typed by the wrong overload's return type, with nothing to correct it.

## Failure scenario

A BBj class or Java class with two same-named method overloads whose scope order (declaration order, or classpath-response order) yields the argument-shape-WRONG overload first: the linker links to that first-yielded declaration regardless of the call's real argument count/types (#478's original symptom, already fixed for bbj-inlay-hint-provider.ts's parameter hints), and bbj-type-inferer.ts propagates that same wrong declaration's return type unconditionally — an overload-sensitive call site can therefore be typed by the wrong overload's return type with nothing to correct it.

## Proposed approach

Call findBestOverload from getCandidate/getType and re-derive identity/return-type from the winning candidate.

## Acceptance criteria

`getCandidate()`/`getType()` calls `findBestOverload()` and re-derives the resolved declaration's identity and return type from the overload it selects, rather than from whichever declaration the linker's first-match scope resolution yielded. A vitest regression test defines two same-named overloads whose scope order places the argument-shape-wrong one first and asserts that a call site typed via `bbj-type-inferer.ts` resolves to the return type of the argument-shape-correct overload.

## Traceability

Finding `P61-D2-012` · dimension D2 (secondary D4, D8) · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P61-D2-012 -->

### 66. P61-D2-018 — vscode: editing config.bbx's PREFIX/USE entries while the server is running has no effect until a full restart
**Route:** public issue
**Labels:** vscode, PRIO 2, 8

<!-- BODY-BEGIN P61-D2-018 -->
## Problem

`this.settings` in `BBjWorkspaceManager` is computed once, inside `initializeWorkspace()`, and never recomputed afterward. `main.ts`'s `onDidChangeConfiguration` handler only stores a new config path on the `configPath` field for a future `initializeWorkspace()` call — no code path re-reads `config.bbx`/`project.properties` or recomputes `this.settings.prefixes` at runtime.

## Evidence

`bbj-vscode/src/language/main.ts:140-155`

Surface: `this.settings` (`bbj-ws-manager.ts:29`) assigned exactly once, inside `initializeWorkspace()` (`bbj-ws-manager.ts:141`); `main.ts`'s `onDidChangeConfiguration` handler (`:143,155`) calls `wsManager.setConfigPath(...)`, which only stores the path (`bbj-ws-manager.ts:243-245`) for a future `initializeWorkspace()` call. Problem class: stale cached configuration state with no re-read path triggered by a runtime change. Impact: a `config.bbx` PREFIX/USE change made while the language server is running has no effect until the window or server is fully restarted.

## Failure scenario

A user edits config.bbx to add or change a PREFIX entry while the language server is running, then changes an unrelated bbj.* setting to trigger onDidChangeConfiguration (or explicitly changes bbj.configPath). The handler reloads the Java classpath and clears the interop cache, but `this.settings.prefixes` stays exactly as computed at startup — the new PREFIX has no effect until the window/server is fully restarted, matching #486's request to "watch config.bbx and re-apply PREFIX/USE changes without a manual restart".

## Proposed approach

Add a `reloadSettings()` method re-running the config.bbx/ project.properties read, call it from main.ts on relevant setting changes.

## Acceptance criteria

`BBjWorkspaceManager` exposes a `reloadSettings()` method that re-runs the `config.bbx`/`project.properties` read and recomputes `this.settings.prefixes`, and `main.ts`'s `onDidChangeConfiguration` handler calls it on the relevant setting changes rather than only storing a path for a future restart. A vitest regression test edits the effective `config.bbx` PREFIX/USE content, triggers the configuration-change handler, and asserts the workspace manager's in-memory settings reflect the new entries without a server restart.

## Traceability

Finding `P61-D2-018` · dimension D2 · severity medium · effort 8.

This finding partially overlaps open issue #486 ("watch config.bbx and re-apply PREFIX/USE changes without a manual restart"): #486 requests the watch-and-reload behavior; this finding traces the exact missing call — `this.settings.prefixes` is computed once in `initializeWorkspace()` and never recomputed by `onDidChangeConfiguration` — that implementing #486 would need to add.
<!-- BODY-END P61-D2-018 -->

### 67. P61-D4-001 — vscode: JavaInteropService bundles five unrelated responsibilities in one 955-line class with no internal boundary
**Route:** public issue
**Labels:** vscode, PRIO 2, 8

<!-- BODY-BEGIN P61-D4-001 -->
## Problem

The single class `JavaInteropService` (955 lines) bundles at least five distinct responsibilities — connection lifecycle, class resolution/caching, the global resolution lock, classpath/implicit-import loading, and the complete-class-index builder — with no internal module boundary separating them.

## Evidence

`bbj-vscode/src/language/java-interop.ts:37-831`

Surface: connection lifecycle (`connect`/`createSocket`, `:91-142`), class resolution/caching (`resolveClassByName`/`resolveClass`/`storeJavaClass`, `:430-755`), the global resolution lock (`acquireLock`/`drainLockQueue`, `:792-830`), classpath/implicit-import loading (`loadClasspath`/`loadImplicitImports`, `:189-277`), and the complete-class-index builder (`ensureCompleteClassIndex`/`buildCompleteClassIndex`, `:283-348`) all live in one class. Problem class: a single-responsibility violation with no internal module boundary. Impact: a change to any one responsibility risks touching unrelated state in the same class, and a new contributor cannot reason about one responsibility without reading the whole file.

## Failure scenario

n/a (D4 trace-tier finding — the code shape itself is the defect, not a runtime failure): a change to any one responsibility (e.g. the lock, or the class-index cache) risks touching unrelated state in the same class, and a new contributor cannot reason about one responsibility (e.g. connection lifecycle) without reading the whole 955-line file.

## Proposed approach

Extract the lock and the complete-class-index builder into their own modules.

## Acceptance criteria

The resolution lock (`acquireLock`/`drainLockQueue`) and the complete-class-index builder (`ensureCompleteClassIndex`/`buildCompleteClassIndex`) are extracted out of `JavaInteropService` into their own modules, each independently importable and testable. The existing vitest suite covering `java-interop.ts` continues to pass unchanged against the extracted modules, confirming the split preserves current behavior.

## Traceability

Finding `P61-D4-001` · dimension D4 · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P61-D4-001 -->

### 68. P61-D5-001 — javascript: 11 interop-dependent linking tests fail deterministically because nothing on port 5008 answers with a real classpath
**Route:** public issue
**Labels:** javascript, PRIO 2, 8

<!-- BODY-BEGIN P61-D5-001 -->
## Problem

All 11 tests inside `linking.test.ts`'s "Interop related tests" `describe.runIf` block fail deterministically, each with an unresolved-reference error traced to "No bbjdir set. No classpath and prefixes loaded." A bare listener answering on port 5008 is confirmed insufficient on its own — the gate lets the suite run rather than skip, yet the tests still fail.

## Evidence

`bbj-vscode/test/linking.test.ts:295-450`

Surface: 11 named tests inside `describe.runIf(isInteropRunning)("Interop related tests", ...)` fail deterministically across repeated `npm test` runs, each with an unresolved-reference error traced to `stderr: "No bbjdir set. No classpath and prefixes loaded."`; the gate (`shouldRunBBjTests()`, `test/test-helper.ts:38-43`) defaults to `isPortOpen(5008)`, independently confirmed true in this sandbox — so the suite runs rather than skips, yet still fails. Problem class: an environment/test-infrastructure gap — a listener on port 5008 with no loaded classpath/bbjdir is not equivalent to a real BBj backend. Impact: any environment without a real `bbjdir`-configured BBj backend behind port 5008 fails all 11 tests rather than passing or being cleanly skipped.

## Failure scenario

Any of the 11 named tests, run against this sandbox's current environment (or any environment without a real `bbjdir`-configured BBj backend behind :5008), fails on an unresolved Java class/package reference rather than passing or being skipped.

## Proposed approach

The approach is the environment work, not a code edit: what has to be reachable is a java-interop peer answering on port 5008 with a loaded classpath and bbjdir, matching what these 11 tests expect; opening a bare listener on that port has already been tried and does not fix them (Phase 64 D-06), because the peer must speak the real protocol and answer with real class data. If a classpath-loaded peer cannot be provisioned in CI/sandbox, the alternative is to make the 11 `test/linking.test.ts > Linking Tests > Interop related tests` cases skip explicitly when the peer is unreachable, rather than run and fail, so the suite reports an honest green instead of a false failure.

## Acceptance criteria

The 11 `linking.test.ts > Linking Tests > Interop related tests` cases either run against a java-interop peer that answers on port 5008 with a real, loaded classpath and `bbjdir` — no longer failing when a bare listener with no classpath happens to occupy that port — or are changed to skip explicitly, with a clear message, when no such classpath-loaded peer is reachable, so the suite reports an honest result instead of a false failure. Whichever direction is chosen, a rerun of `npm test` in an environment with no classpath-loaded peer no longer reports these 11 cases as failed.

## Traceability

Finding `P61-D5-001` · dimension D5 (secondary D2) · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P61-D5-001 -->

### 69. P61-D5-002 — javascript: the fake JavaInteropTestService double never exercises java-interop.ts's real connection, timeout or lock code
**Route:** public issue
**Labels:** javascript, PRIO 2, 8

<!-- BODY-BEGIN P61-D5-002 -->
## Problem

`JavaInteropTestService`, the double nearly every unit test in the repo runs against, overrides `connect()`, `loadClasspath()`, `loadImplicitImports()` and `resolveClassByName()` to always reject, return false, or resolve from a stub — never calling the base implementation — so none of `java-interop.ts`'s real connection-lifecycle, timeout, undefined-guard, cache-reset or lock-serialization code is reachable through it.

## Evidence

`bbj-vscode/test/bbj-test-module.ts:108-123`

Surface: `JavaInteropTestService` (`:47-138`) overrides `connect()` (`:108-110`), `loadClasspath()` (`:112-114`), `loadImplicitImports()` (`:116-118`) and `resolveClassByName()` (`:120-123`), none calling into the base `resolveClass()`. Problem class: a coverage gap — the only tests capable of exercising the real code are the same 11 interop-dependent `linking.test.ts` tests and two functional real-interop test files, all gated on a live interop service and currently failing/environment-blocked. Impact: a regression in connection lifecycle, timeout handling, malformed-response handling, or lock serialization in `java-interop.ts` would pass the full `npm test` suite undetected.

## Failure scenario

n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): any regression in connection lifecycle, timeout handling, malformed-response handling, or lock serialization in java-interop.ts would pass the full `npm test` suite undetected, because no currently-passing test exercises those code paths.

## Proposed approach

This record's own gap is downstream of P61-D5-001: the only tests capable of exercising java-interop.ts's real connection-lifecycle, timeout and lock-serialization code are the same 11 `test/linking.test.ts > Linking Tests > Interop related tests` cases, and they are blocked on the same unreachable-classpath peer on port 5008 — a bare listener on that port, already tried under Phase 64 D-06, does not unblock them either. Independently of whether that peer is ever provisioned, this record's own classification names a second, narrower approach: build a controllable fake socket peer as new test infrastructure so `bbj-vscode/src/language/java-interop.ts`'s connection/timeout/lock code paths can be unit-tested against a scriptable double rather than a live BBj backend.

## Acceptance criteria

A controllable fake socket peer exists as test infrastructure, and at least one vitest suite exercises `java-interop.ts`'s real connection-lifecycle, timeout, and lock-serialization code paths against it rather than against the current stub-only `JavaInteropTestService`. The new suite fails if a regression is introduced into any of those code paths, closing the gap this finding records.

## Traceability

Finding `P61-D5-002` · dimension D5 · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P61-D5-002 -->

### 70. P61-D5-010 — javascript: the completion engine offers zero candidate positions inside a class method body, independent of DEF FN or the scope chain
**Route:** public issue
**Labels:** javascript, PRIO 2, 8

<!-- BODY-BEGIN P61-D5-010 -->
## Problem

A skipped test records that the completion provider returns 0 items inside class method bodies, even without DEF FN; its own comment already rules out the scope chain (DEF FN params are confirmed registered under `DefFunction` in `localSymbols` with the correct container chain) as the cause — the underlying gap is that Langium's completion engine's grammar follower does not produce any candidate positions inside `MethodDecl.body` statements at all.

## Evidence

`bbj-vscode/test/completion-test.test.ts:185`

Surface: `test.skip('DEF FN parameters with $ suffix inside class method', ...)` at `:185`, with the skipped assertion (`:203-213`) expecting DEF FN parameters `_f$`/`_t$` to appear untruncated in completion results inside a class method body. Problem class: a grammar-traversal gap in the completion engine — no candidate positions are produced inside `MethodDecl.body` statements at all. Impact: any attempt to re-enable the skipped test fails today, independent of DEF FN or the scope chain.

## Failure scenario

Any attempt to re-enable the skipped test, as currently written, against the current completion-grammar traversal fails: the completion engine's grammar follower does not produce candidate positions inside class-method statement bodies at all in this scenario, so the expected `_f$`/`_t$` parameter items are never offered — independent of DEF FN or the scope chain, both already ruled out by the recorded root-cause investigation.

## Proposed approach

"Already failing" here means the underlying defect cannot be observed as a green-to-red regression today, because the completion-provider suite in `bbj-vscode/test/completion-test.test.ts` already fails to produce any candidate positions inside `MethodDecl.body` statements — the skipped assertion (lines 203-213) has never passed. The first step for an implementer is not re-enabling this one test but establishing a passing baseline for that suite's `MethodDecl.body` completion-position handling in Langium's grammar traversal itself; only once class-method-body statement positions produce candidates at all does this record's own DEF FN `_f$`/`_t$` parameter-truncation defect become separable from that broader grammar-traversal gap, whether by a grammar restructuring on the BBj side or an upstream Langium completion-provider change.

## Acceptance criteria

The completion provider produces at least one candidate position for a statement inside a class method body (`MethodDecl.body`), establishing a passing baseline for that traversal gap. Once that baseline exists, the skipped DEF FN `_f$`/`_t$` parameter-truncation assertion at `test/completion-test.test.ts:203-213` is re-enabled and passes, or is replaced with a regression test asserting the same untruncated-parameter behavior.

## Traceability

Finding `P61-D5-010` · dimension D5 (secondary D2) · severity medium · effort 8.

This finding is the same completion-engine grammar-traversal gap Phase 66's internal re-triage of the disabled-test backlog already tracks for follow-up on this skipped case; no issue in the frozen open-issue snapshot addresses this Langium completion-grammar-follower limitation.
<!-- BODY-END P61-D5-010 -->

### 71. P61-D5-013 — vscode: initializeWorkspace()'s sequential filesystem-and-network chain can exceed vitest's 10s hook timeout under load, failing unrelated test suites
**Route:** public issue
**Labels:** vscode, PRIO 2, 8

<!-- BODY-BEGIN P61-D5-013 -->
## Problem

`initializeWorkspace()` performs several independent, `await`ed filesystem and network steps sequentially rather than in parallel, including two interop round trips each capable of costing up to a 10-second connect timeout; under load, the accumulated cost has already been observed to push different tests' `beforeAll` hooks past vitest's 10-second default timeout, failing a different suite on different runs.

## Evidence

`bbj-vscode/src/language/bbj-ws-manager.ts:106-184`

Surface: `initializeWorkspace()` (`:106-184`) sequentially awaits a directory read plus a `project.properties` read (`:111-114`), a `config.bbx` lookup (`:120-121`/`:129-132`), Javadoc-folder initialization (`:153`), `javaInterop.loadClasspath()` (`:172`) and `javaInterop.loadImplicitImports()` (`:177`) — none run in parallel despite several having no data dependency on each other. Problem class: unbounded sequential I/O in a shared `beforeAll` hook, with no timeout accommodation. Impact: under load, a different test suite's `beforeAll` intermittently exceeds vitest's 10-second default `hookTimeout` and is reported failed with its tests skipped, reproducing observed run-to-run variance.

## Failure scenario

Under system-load contention in a sandbox where java-interop is reachable but slow to answer (or genuinely unreachable), the accumulated sequential cost of initializeWorkspace()'s filesystem-plus-network chain pushes whichever test file's `beforeAll` happens to be running past vitest's 10s default hookTimeout, marking that entire suite failed with its tests reported skipped — reproducing exactly the run-to-run variance INVENTORY's baseline recorded (21/21, 1/6, and 29/29 skipped across three separate measurements, each hitting a different suite).

## Proposed approach

Two options exist and this record does not choose between them: (1) reduce the work — parallelize `initializeWorkspace()`'s independent I/O steps in `bbj-vscode/src/language/bbj-ws-manager.ts:106-184` via `Promise.all` where steps have no data dependency, and short-circuit classpath/implicit-import loading once java-interop is known unreachable, tying into P61-D3-002's circuit-breaker recommendation — trading implementation effort for a lower, more consistent worst-case duration; or (2) accept the work and instead raise vitest's `hookTimeout` for this specific `beforeAll` or globally in `vitest.config.ts`, trading a longer per-run wait for no code change. Choosing between them is the first decision an implementer makes; this record states both rather than picking one, because its own classification records the choice as unresolved.

## Acceptance criteria

Either `initializeWorkspace()`'s independent I/O steps in `bbj-ws-manager.ts:106-184` are parallelized via `Promise.all` where no data dependency exists, with classpath/implicit-import loading short-circuited once java-interop is known unreachable, or the affected `beforeAll` hook's `hookTimeout` is explicitly raised in `vitest.config.ts` to accommodate the chain's worst-case duration. Whichever direction is chosen, a repeated `npm test` run under simulated load no longer intermittently fails an unrelated suite's `beforeAll` hook due to this chain's duration.

## Traceability

Finding `P61-D5-013` · dimension D5 (secondary D3) · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P61-D5-013 -->

### 72. P61-D5-014 — vscode: main.ts's LSP handler logic has zero test coverage because it depends on module-load-time createConnection()
**Route:** public issue
**Labels:** vscode, PRIO 2, 8

<!-- BODY-BEGIN P61-D5-014 -->
## Problem

No test file imports or exercises `main.ts`, because importing it directly calls `createConnection()` at module load time, breaking the test environment — so a regression in the `bbj/refreshJavaClasses` handler, the `onDidChangeConfiguration` handler, or the startup wiring would pass the full test suite undetected.

## Evidence

`bbj-vscode/src/language/main.ts:1-190`

Surface: a repo-wide grep for imports of `main.ts` under `test/` returns no matches; `bbj-notifications.ts`'s own module header confirms the reason — `main.ts` "calls createConnection() at module load time and would break test environments" if imported directly. Problem class: a coverage gap caused by structural untestability, not merely an absent test. Impact: a regression in any of `main.ts`'s handler logic — including the settings-refresh gap this same phase records elsewhere — would pass `npm test` undetected.

## Failure scenario

n/a (D5 trace-tier finding — a coverage gap, not a runtime failure): a regression in the `bbj/refreshJavaClasses` handler, the `onDidChangeConfiguration` handler, or the startup wiring in main.ts (e.g. a future change to P61-D2-018's settings-refresh gap, or P61-D4-012's duplicated reload sequence) would pass the full `npm test` suite undetected, because no currently-passing test exercises any of main.ts's code paths.

## Proposed approach

The classification clause names the edit directly: extract the `bbj/refreshJavaClasses` and `onDidChangeConfiguration` handler bodies out of `bbj-vscode/src/language/main.ts:1-190` into named, exported functions that take `{shared, BBj, connection}` as parameters, so they no longer depend on `main.ts`'s module-load-time `createConnection()` call. Once extracted, a new test file can import and unit-test those functions directly against a synthetic `{shared, BBj, connection}` fixture without triggering the LSP connection wiring that makes `main.ts` itself untestable today.

## Acceptance criteria

The `bbj/refreshJavaClasses` and `onDidChangeConfiguration` handler bodies are extracted out of `main.ts` into named, exported functions taking `{shared, BBj, connection}` as parameters, independent of `main.ts`'s module-load-time `createConnection()` call. A new vitest test file imports and unit-tests those functions directly against a synthetic `{shared, BBj, connection}` fixture, establishing the first test coverage for this handler logic.

## Traceability

Finding `P61-D5-014` · dimension D5 (secondary D4) · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P61-D5-014 -->

### 73. P62-D4-002 — vscode: activate() registers nine unrelated concerns in one ~250-line function, duplicating the exec-wrapping pattern three separate ways
**Route:** public issue
**Labels:** vscode, PRIO 2, 8

<!-- BODY-BEGIN P62-D4-002 -->
## Problem

`activate()` registers at least nine distinct concerns — four composer subsystems, the language client, 14 commands (several with substantial inline business logic), a formatting-provider registration, two file-open-detection features, and two status-bar indicators — in one function body with little delegation to named helpers; the EM-validate and EM-login exec blocks additionally duplicate roughly 23 of ~31-35 lines each, and neither reuses `Commands.cjs`'s own `execWithProgress` helper, so the same exec-wrapping pattern exists three separate times.

## Evidence

`bbj-vscode/src/extension.ts:582-830`

Surface: `activate()` (`:582-830`, ~250 lines) registers 4 composer subsystems (`:584-587`), the language client (`:589`), 14 commands (`:592-707`, including the ~75-line EM-login flow at `:597-672`), a formatting-provider registration (`:748-751`), 2 file-open-detection features (`:756-775`) and 2 status-bar indicators (`:777-828`); a structural diff between the EM-validate block (`:412-442`) and the EM-login block (`:630-664`) shows 23 of ~31-35 shared lines, and neither reuses `Commands.cjs:29-41`'s `execWithProgress`. Two dead-code branches were also confirmed by grep: `getEMCredentials()`'s `secretStorage?.get('bbj.em.credentials')` fallback (`:387-389`) and `runWeb()`'s legacy `bbj.web.username`/`bbj.web.password` branch (`Commands.cjs:85-90`), neither ever reachable. Problem class: a god-function plus triplicated exec-wrapping logic and dead code. Impact: a future fix to the shared exec pattern must be located and re-applied independently in up to three places, with drift risk between them, and the dead branches mislead a reader into believing an inactive credential-storage path is live.

## Failure scenario

n/a (D4 is a code-shape finding, not a runtime failure scenario) -- the god-function shape and the triplicated exec-wrapping pattern mean a future fix to any one of them (e.g. P62-D1-003's escaping fix, or P62-D2-004's rejection handling) has to be located and re-applied independently in up to 3 places, with drift risk between them; the two dead-code branches are maintenance debt that misleads a reader into thinking a credential-storage fallback path is live when it is not.

## Proposed approach

(extract the EM-login handler and the exec-wrapping pattern into shared, named helpers; delete the two dead-code branches).

## Acceptance criteria

`activate()`'s EM-login handler and the triplicated exec-wrapping pattern are extracted into shared, named helpers used by all affected call sites, and the two confirmed dead-code branches (`getEMCredentials()`'s `secretStorage?.get('bbj.em.credentials')` fallback and `runWeb()`'s legacy `bbj.web.username`/`bbj.web.password` branch) are deleted. Once `extension.ts`/`Commands.cjs` test coverage exists (tracked separately by `P62-D5-002`), a regression test exercises the shared exec helper directly rather than only through `activate()`'s registration.

## Traceability

Finding `P62-D4-002` · dimension D4 · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P62-D4-002 -->

### 74. P62-D5-002 — javascript: extension.ts and Commands.cjs carry zero test coverage, so six known security and correctness findings could regress silently
**Route:** public issue
**Labels:** javascript, PRIO 2, 8

<!-- BODY-BEGIN P62-D5-002 -->
## Problem

No test file imports or exercises `extension.ts` (activation, all 14 command registrations, EM login/validate) or `Commands.cjs` (every `exec()`-invoking command), so `npm test` is green today with zero assertions covering either file.

## Evidence

`bbj-vscode/test/ (absence) -- the 2 files this finding covers are bbj-vscode/src/extension.ts and bbj-vscode/src/Commands/Commands.cjs`

Surface: `ls bbj-vscode/test/ | grep -iE 'extension|command|compiler'` returns only `compiler-options.test.ts`; a grep for imports of `extension.ts` or `Commands.cjs`/`Commands/Commands` under `test/` returns nothing. Problem class: a coverage gap over the extension's activation and command-execution surface. Impact: a regression in any of the unescaped shell interpolation, the argv-exposed EM token, the unguarded `params.fsPath` crash, the leaked command-registration disposables, the unhandled `client.start()` rejection, or the process-spawning safety gap relative to IntelliJ would ship silently.

## Failure scenario

A regression in any of this section's findings -- the unescaped shell interpolation (P62-D1-003), the argv-exposed EM token (P62-D1-004), the unguarded params.fsPath crash (P62-D2-002), the leaked command-registration disposables (P62-D2-003), the unhandled client.start() rejection (P62-D2-004), or the process-spawning safety gap relative to IntelliJ (P62-D7-001) -- would ship silently: npm test is green today with zero assertions covering either file, so FIX-03's 'npm test clean' gate cannot detect a future regression in any of them.

## Proposed approach

(author extension.test.ts and commands.test.ts using a minimal vscode API mock, following whatever pattern the composer-webview module's own D5 test-coverage gap (`msgbox-composer-webview.ts`, `addwindow-composer-webview.ts`, `addchildwindow-composer-webview.ts`, `setopts-composer-webview.ts`) ultimately adopts).

## Acceptance criteria

`extension.test.ts` and `commands.test.ts` exist, using a minimal `vscode` API mock, and cover `extension.ts`'s activation/command-registration path and `Commands.cjs`'s exec-invoking commands respectively. At minimum, each of the six regressions named in the failure scenario above — the unescaped shell interpolation, the argv-exposed EM token, the unguarded `params.fsPath` crash, leaked command-registration disposables, the unhandled `client.start()` rejection, and the process-spawning safety gap — has at least one assertion that would fail if it recurred.

## Traceability

Finding `P62-D5-002` · dimension D5 · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P62-D5-002 -->

### 75. P62-D7-001 — vscode: run/compile/EM commands build shell command strings for exec(), unlike IntelliJ's argument-array spawning with pre-flight validation
**Route:** public issue
**Labels:** vscode, PRIO 2, 8

<!-- BODY-BEGIN P62-D7-001 -->
## Problem

VS Code's `bbj.run`/`bbj.runBUI`/`bbj.runDWC`/`bbj.compile` and its EM validate/login flows all build a shell command string via template-literal interpolation and hand it to `child_process.exec()`, spawned through a shell — unlike the equivalent IntelliJ actions, which build a `GeneralCommandLine` and add each argument via `.addParameter(...)`, spawned directly with no shell involved and with pre-flight checks that the configured BBj Home exists and is executable.

## Evidence

`bbj-vscode/src/Commands/Commands.cjs:117,271,336`

Surface: `Commands.cjs:117,271,336` and `extension.ts:426,645` all build shell strings for `child_process.exec()`; the equivalent IntelliJ actions (`BbjRunGuiAction.java`, `BbjRunBuiAction.java`, `BbjRunDwcAction.java`, `BbjRunActionBase.validateTokenServerSide`, `BbjEMLoginAction.performLogin`) uniformly use `GeneralCommandLine.addParameter(...)`, spawned with no shell involved; IntelliJ's `validateBeforeRun()` also confirms the BBj Home directory and executable exist before spawning, while VS Code's `getBBjHome()` and the EM login/validate paths only check that `bbj.home` is a non-empty string. Problem class: a cross-IDE parity gap in process-spawning methodology and pre-flight validation robustness. Impact: the identical run/compile/EM-authenticate feature carries fundamentally different injection exposure and pre-flight validation robustness depending on which IDE is used, and a misconfigured VS Code `bbj.home` is only discovered via `exec()`'s async error callback, after the shell has already attempted to interpret the still-unescaped command.

## Failure scenario

n/a (D7 is a cross-IDE comparative observation, not itself a new runtime failure scenario beyond what P62-D1-003 already states) -- the divergence means the identical class of user-facing feature (run/compile/EM-authenticate a BBj program) carries fundamentally different injection exposure and pre-flight validation robustness depending on which IDE the developer uses, even though both IDEs read the same bbj.home-equivalent configuration concept.

## Proposed approach

(adopt an argument-array-based spawn API -- Node's execFile/spawn -- mirroring IntelliJ's GeneralCommandLine approach, plus add pre-flight existence/executable checks).

## Acceptance criteria

VS Code's `bbj.run`/`bbj.runBUI`/`bbj.runDWC`/`bbj.compile` and its EM validate/login flows are spawned via an argument-array API (`execFile`/`spawn`) rather than `child_process.exec()`, and `getBBjHome()`/the EM login/validate paths add a pre-flight check that the resolved `bbj.home` path exists and is executable before spawning, mirroring IntelliJ's `validateBeforeRun()`. A vitest regression test asserts that a `bbj.home` value containing shell metacharacters is passed through as inert argument data and never reaches a shell for interpretation, and that a nonexistent `bbj.home` path is rejected before any process is spawned.

## Traceability

Finding `P62-D7-001` · dimension D7 (secondary D1) · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P62-D7-001 -->

### 76. P63-D2-010 — intellij: composer edit-application methods apply captured line/offset coordinates without re-validating them after the modal dialog closes
**Route:** public issue
**Labels:** intellij, PRIO 2, 8

<!-- BODY-BEGIN P63-D2-010 -->
## Problem

`ComposerLauncher.launch()` captures the target line/offsets and decodes the call via the language server before the modal composer dialog is shown, and its three edit-application methods (`openMsgbox`, `applyAddWindowEdit`, `applyHexEdit`) apply those same captured offsets after the entire modal dialog session returns, with no re-decode or offset-revalidation step anywhere in between.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:57-159`

Surface: `launch()` (`:57-159`) captures `line`/`lineText`/`col` (`:59-64`) and decodes the call before `dialog.showAndGet()`; `openMsgbox`/`applyAddWindowEdit`/`applyHexEdit` apply the captured `callStart`/`callEnd`/`flagsRange`/`eventMaskRange` offsets after the dialog session returns, with no re-decode or offset-revalidation step in any of the three. Problem class: a stale-captured-range application gap. Impact: if the document changes at or before the captured line/offsets while the dialog is open, `WriteCommandAction.replaceString` either throws or silently rewrites whatever text now occupies that byte range.

## Failure scenario

If the document changes at or before the captured line/offsets while the composer dialog is open, WriteCommandAction.replaceString either throws (offsets now exceed the line's current length) or — the more concerning case — silently rewrites whatever text now occupies that byte range, corrupting unrelated content the user never intended to touch.

## Proposed approach

The general shape is nameable even though no single-file edit is: add a shared re-decode-and-validate helper reachable from all three apply paths in `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:57-159` (`openMsgbox`, `applyAddWindowEdit`, `applyHexEdit`), each re-decoding the call at the captured line/offsets immediately before `WriteCommandAction.replaceString` and comparing the fresh decode against the offsets captured before `dialog.showAndGet()`. What has to be established before this is finished is a UX decision this record's own evidence does not settle — whether a mismatch prompts the user to re-open the dialog against the current document state or silently aborts the edit — and that choice is the first thing an implementer needs, not evidence this sweep can supply.

## Acceptance criteria

All three edit-application methods (`openMsgbox`, `applyAddWindowEdit`, `applyHexEdit`) re-decode the call at the captured line/offsets immediately before `WriteCommandAction.replaceString` and compare the fresh decode against the offsets captured before `dialog.showAndGet()`, aborting or prompting the user on a mismatch rather than applying a stale edit. Because no `src/test/` source set exists for `bbj-intellij` today, regression coverage for this fix depends on that gap being closed first (`P63-D5-001`), or on a recorded manual verification step at merge time confirming a document edited during the dialog session no longer produces a mismatched or corrupted edit.

## Traceability

Finding `P63-D2-010` · dimension D2 (secondary D1) · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P63-D2-010 -->
