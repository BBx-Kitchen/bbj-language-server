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
| 77 | P63-D2-015 | public issue | intellij: bracket characters inside BBj string literals are tokenized identically to real structural brackets | intellij, PRIO 2, 8 |
| 78 | P63-D5-001 | public issue | intellij: bbj-intellij has no test source set at all, so its Node.js download/cache and EDT-responsiveness code ships completely unverified | intellij, PRIO 2, 8 |
| 79 | P63-D6-002 | public issue | dependencies: bbj-intellij's Gradle build cannot run on any JDK newer than 17, because build.gradle.kts declares no toolchain | dependencies, PRIO 2, 8 |
| 80 | P63-D7-001 | public issue | intellij: "Compile BBj File" only logs a message and never invokes bbjcpl, unlike VS Code's real compile action | intellij, PRIO 2, 8 |
| 81 | P64-D2-005 | public issue | BBj integration and infrastructure: both release workflows push a version commit and tag before marketplace publication succeeds, with no rollback on failure | BBj integration and infrastructure, PRIO 2, 8 |
| 82 | P64-D4-003 | public issue | BBj integration and infrastructure: the checkout/Node-setup preamble is duplicated across six workflows and has already drifted on six measurable axes | BBj integration and infrastructure, PRIO 2, 8 |
| 83 | P64-D4-005 | public issue | vscode: ESLint registers the TypeScript plugin but enables zero rules, so npm run lint passes on any file that parses | vscode, PRIO 2, 8 |
| 84 | P64-D5-001 | public issue | BBj integration and infrastructure: the interop test harness is type-checked, linted and tested by nothing, despite triggering CI on every change | BBj integration and infrastructure, PRIO 2, 8 |
| 85 | P64-D6-010 | public issue | dependencies: the pinned Gradle wrapper is roughly 18 months stale and its transitive dependency tree is unenumerable, because the build fails on any JDK newer than 17 | dependencies, PRIO 2, 8 |
| 86 | P66-D2-002 | public issue | vscode: fully-qualified Java static member access is offered every instance method and field too, because MemberCall receivers never satisfy isClassRef | vscode, PRIO 2, 8 |
| 87 | P66-D5-002 | public issue | javascript: the DEF FN parameter completion test remains skipped; class-method-body completions are still produced by nothing | javascript, PRIO 2, 8 |

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

### 77. P63-D2-015 — intellij: bracket characters inside BBj string literals are tokenized identically to real structural brackets
**Route:** public issue
**Labels:** intellij, PRIO 2, 8

<!-- BODY-BEGIN P63-D2-015 -->
## Problem

`BbjWordLexer.advance()`'s punctuation branch tokenizes `(`/`)`/`[`/`]`/`{`/`}` unconditionally by character alone, with no string-literal context anywhere in the lexer, so bracket characters inside a string literal are tokenized identically to genuine structural brackets.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWordLexer.java:81-93,BbjParserDefinition.java:60-63,BbjPairedBraceMatcher.java:16-20`

Surface: `BbjWordLexer.advance()`'s punctuation branch (`:81-93`) tokenizes bracket characters unconditionally, with a `"` character falling through to the `SYMBOL` default (`:91`) with no state change; `BbjParserDefinition.getStringLiteralElements()` (`:60-63`) returns `TokenSet.EMPTY`, confirming no PSI layer distinguishes string content; `BbjPairedBraceMatcher.isPairedBracesAllowedBeforeType` (`:27-32`) unconditionally returns `true`. Problem class: a lexer with no string-literal context for bracket-matching purposes. Impact: any BBj source with a bracket character inside a string literal (common in user-facing message text) has IntelliJ's bracket-matching highlight, Ctrl+Shift+M navigation, and auto-close-bracket behavior treat it as a genuine matched pair.

## Failure scenario

A BBj line such as PRINT "value (not a bracket)" — a plain string literal containing parenthesis characters — has its two parens tokenized identically to real structural brackets by BbjWordLexer, so IntelliJ's bracket-matching highlight, Ctrl+Shift+M navigation, and auto-close-bracket behavior all treat them as a genuine matched pair inside the string, rather than inert string content. Any BBj source containing a bracket character inside a string literal (common in user-facing message text) triggers this.

## Proposed approach

Add a quote-delimited scan branch to BbjWordLexer. advance(), emit a new STRING IElementType, wire it into getStringLiteralElements(), and guard isPairedBracesAllowedBeforeType against it.

## Acceptance criteria

`BbjWordLexer.advance()` gains a quote-delimited scan branch that emits a new `STRING` `IElementType` for string-literal content, `BbjParserDefinition.getStringLiteralElements()` registers it, and `BbjPairedBraceMatcher.isPairedBracesAllowedBeforeType` is guarded against it so bracket characters inside a string literal are no longer treated as structural brackets. Because no `src/test/` source set exists for `bbj-intellij` today, regression coverage depends on that gap being closed first (`P63-D5-001`), or on a recorded manual verification step confirming `PRINT "value (not a bracket)"` no longer triggers a bracket-match highlight on the parenthesis characters.

## Traceability

Finding `P63-D2-015` · dimension D2 · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P63-D2-015 -->

### 78. P63-D5-001 — intellij: bbj-intellij has no test source set at all, so its Node.js download/cache and EDT-responsiveness code ships completely unverified
**Route:** public issue
**Labels:** intellij, PRIO 2, 8

<!-- BODY-BEGIN P63-D5-001 -->
## Problem

`bbj-intellij` has no `src/test/` source set and no test dependency declared in `build.gradle.kts` — a systemic gap for the whole module, not specific to any one file — so nothing in the module would fail if any of its behaviour broke.

## Evidence

`bbj-intellij/build.gradle.kts`

Surface: `ls bbj-intellij/src/` returns `main` only; a grep for `test` in `build.gradle.kts` returns no matches — no test dependency declared, no test task configured. Problem class: a module with no test infrastructure at all. Impact: the Node.js download/extract/cache pipeline, the cache-availability/port-auto-detection/concurrent-download correctness gaps, and the EDT-blocking UI behaviour all ship and regress silently, because there is no harness in this module that would fail if any of it broke.

## Failure scenario

Every behaviour recorded above for this Node.js download/cache-and-EDT-responsiveness unit — the download/extract/cache pipeline (P63-D1-001/002, P63-D6-001/002), the cache-availability/port-auto-detect/ concurrent-download correctness gaps (P63-D2-001/002/003), and the EDT- blocking UI behaviour (P63-D3-001) — ships and regresses silently: there is no harness in this module that would fail if any of it broke.

## Proposed approach

Add a `sourceSets.test`/JUnit dependency block to build.gradle.kts and author a first test class.

## Acceptance criteria

`bbj-intellij/build.gradle.kts` declares a `sourceSets.test`/JUnit dependency block and a first test class exists under a new `src/test/` source set. A subsequent `./gradlew test` run (once the JDK-toolchain gap `P63-D6-002` is resolved) executes that first test, establishing the baseline the module's other findings depend on for regression coverage.

## Traceability

Finding `P63-D5-001` · dimension D5 · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P63-D5-001 -->

### 79. P63-D6-002 — dependencies: bbj-intellij's Gradle build cannot run on any JDK newer than 17, because build.gradle.kts declares no toolchain
**Route:** public issue
**Labels:** dependencies, PRIO 2, 8

<!-- BODY-BEGIN P63-D6-002 -->
## Problem

`build.gradle.kts` declares `sourceCompatibility`/`targetCompatibility` as Java 17 but no `toolchain` block, so Gradle runs on whatever JVM launched it; on a JDK newer than 17 (confirmed with Temurin 25.0.3), the build fails before task listing with only the JDK version string as the error.

## Evidence

`bbj-intellij/build.gradle.kts:12-13`

Surface: `build.gradle.kts:12-13` sets `sourceCompatibility = JavaVersion.VERSION_17`/`targetCompatibility = JavaVersion.VERSION_17` with no `toolchain` block; `./gradlew --offline -q tasks` against a Temurin 25.0.3 JVM fails in ~5 seconds with the literal output `FAILURE: Build failed with an exception. * What went wrong: 25.0.3`, before any task is scheduled. Problem class: a missing JDK-toolchain pin, meaning the build's actual required JVM depends entirely on whichever JDK happens to be first on the invoker's PATH. Impact: a contributor or CI runner whose available JDK is not itself version 17 cannot build, test, or statically analyze `bbj-intellij` at all.

## Failure scenario

A contributor or CI runner whose local/available JDK does not include a JavaVersion.VERSION_17-compatible toolchain (as is the case in this execution environment, which only offers Temurin 25.0.3) cannot build, test, or statically analyze bbj-intellij at all — the build fails before task listing, which is why this entire phase records D1-D3/D6 evidence via trace rather than reproduction (D-07).

## Proposed approach

n/a at this recording stage — resolution requires the dependency-and-build-configuration review's own broader toolchain and IntelliJ-Platform-version work (D-10's location exception is why this evidence lives here rather than in the dependency-and-build-configuration review's own records): the dependency-and-build-configuration review owns `bbj-intellij/build.gradle.kts`'s JDK/Gradle toolchain triage for every dimension other than this routed D6 cell, and the `JavaVersion.VERSION_17`-vs.-Temurin-25.0.3 mismatch this record evidences is resolved as part of that unit's broader work, not as an independent single-file edit from this record's evidence alone.

## Acceptance criteria

`build.gradle.kts` declares a `toolchain { languageVersion = JavaLanguageVersion.of(17) }` block, or the version pin is otherwise resolved as part of the broader dependency-and-build-configuration toolchain work this record hands off to, so `./gradlew` runs successfully regardless of which JDK launched it. A regression check — a `./gradlew --offline -q tasks` run under a JDK newer than 17 — confirms the build no longer fails with a bare JDK-version-string error before task listing.

## Traceability

Finding `P63-D6-002` · dimension D6 · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P63-D6-002 -->

### 80. P63-D7-001 — intellij: "Compile BBj File" only logs a message and never invokes bbjcpl, unlike VS Code's real compile action
**Route:** public issue
**Labels:** intellij, PRIO 2, 8

<!-- BODY-BEGIN P63-D7-001 -->
## Problem

`BbjCompileAction.actionPerformed()` only logs "[Compile] Triggered for file: " + filename and never invokes bbjcpl, while its `update()` method presents the action as fully enabled and available on any BBj source file with the server started.

## Evidence

`bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java:24-39`

Surface: `actionPerformed()` (`:24-39`) only logs the triggered filename and never invokes bbjcpl, confirmed against VS Code's real 18-option-aware compile (`Commands.cjs:294-343` via `CompilerOptions.ts`). Problem class: a silently non-functional command presented as fully working. Impact: a user who clicks "Compile BBj File" sees no error and no visible failure, only a console log line in the LS log Tool Window, and may reasonably believe the file was compiled.

## Failure scenario

A user who clicks "Compile BBj File" on IntelliJ sees no error and no visible failure — only a console log line in the LS log Tool Window — and may reasonably believe the file was compiled, unlike VS Code's bbj.compile. The action's own update() gates it as available and enabled on any BBj source file with the server started, presenting a fully-functional-looking command that silently does nothing.

## Proposed approach

The missing side is IntelliJ: `BbjCompileAction.java:24-39` only logs and never invokes bbjcpl. The work travels through a new shared language-server surface — a `bbj/compile` LSP4IJ request/notification mirroring VS Code's real compile flow in `Commands.cjs:294-343` (via `CompilerOptions.ts`) — and what would have to exist on the IntelliJ side is a handler in `BbjCompileAction.java` that sends that request and surfaces its result (success/diagnostics) to the user, replacing the current silent log line.

## Acceptance criteria

Clicking "Compile BBj File" sends a new `bbj/compile` LSP4IJ request/notification mirroring VS Code's compile flow (`Commands.cjs:294-343` via `CompilerOptions.ts`), and `BbjCompileAction.java` surfaces the result — success or diagnostics — to the user instead of only logging a message. Because no `src/test/` source set exists for `bbj-intellij` today, regression coverage for this fix depends on that gap being closed first (`P63-D5-001`), or on a recorded manual verification step at merge time confirming a compile error is now visibly surfaced.

## Traceability

Finding `P63-D7-001` · dimension D7 (secondary D2, D8) · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P63-D7-001 -->

### 81. P64-D2-005 — BBj integration and infrastructure: both release workflows push a version commit and tag before marketplace publication succeeds, with no rollback on failure
**Route:** public issue
**Labels:** BBj integration and infrastructure, PRIO 2, 8

<!-- BODY-BEGIN P64-D2-005 -->
## Problem

`manual-release.yml` and `preview.yml` both push a version-bump commit and a tag to `main` before the marketplace publication steps that would justify them run, spreading publication across multiple independently-failing jobs with no rollback or compensating action if a later stage fails.

## Evidence

`.github/workflows/manual-release.yml:69-82`

Surface: in `manual-release.yml`, `build-vscode` pushes the version commit and `v$VERSION` tag (`:81-82`) then publishes to the VS Code Marketplace (`:84-90`); `build-intellij` publishes to JetBrains in a second job (`:135-137`); `create-release` creates the GitHub release in a third (`:167-186`). `preview.yml` follows the same shape one step smaller. Problem class: durable, externally visible state (a pushed commit and tag) written before the state that would justify it exists, with each downstream stage able to fail independently and nothing undoing a preceding one. Impact: a marketplace-publish failure (e.g. an expired PAT — the ordinary failure mode) leaves `main` and a tag recording a version that was never actually released anywhere, and re-running the workflow with the same version then fails at the version-comparison step, requiring a manual tag deletion and revert before any release can proceed.

## Failure scenario

A maintainer dispatches `manual-release.yml` with a valid version. `build-vscode` validates it, sets `package.json`, commits, pushes `main` and pushes the tag `v25.12.0` (`:81-82`). The next step, `npx vsce publish -p $VSCE_PAT` (`:90`), fails — the PAT has expired, which is the ordinary failure mode for a marketplace token. The job fails, so `build-intellij` and `create-release` never run. What is left behind is `main` claiming version 25.12.0 in `package.json`, a `v25.12.0` tag pointing at that commit, no VS Code Marketplace release, no JetBrains release and no GitHub release. Re-running the workflow with the same version now fails at `:54`, because the version is no longer greater than `package.json`'s current value, so recovery requires deleting the tag and hand-reverting `main` before any release can proceed. The `preview.yml` variant is the same shape one step smaller: a failed `vsce publish` at `:68` leaves `main` recording a preview version that was never published, and the next run bumps from that phantom version.

## Proposed approach

The manifest files are `.github/workflows/manual-release.yml:69-90,135-137,167-186` and `.github/workflows/preview.yml:53-68,96-102`, which share the same twelve-line version-bump-commit-push procedure (`P64-D4-003`). The observable that has to change is that a failed `vsce publish` (an expired PAT, the ordinary failure mode) no longer leaves a pushed commit and tag on `main` with no corresponding marketplace release — closing this is a design decision between three shapes: publish before writing anything durable (tag/push only after every marketplace publish succeeds), an explicit compensating rollback step that deletes the tag and reverts the commit on a later-job failure, or collapsing the three jobs into one so a mid-pipeline failure cannot leave partial state. Whichever shape is chosen has to be applied to both workflows, since they are the same procedure duplicated, not two independent ones.

## Acceptance criteria

A named CI-release-ordering decision is made and applied to both `manual-release.yml` and `preview.yml` consistently — publish before writing anything durable, add an explicit compensating rollback step, or collapse the release into a single job — so that a failed marketplace publish (e.g. an expired PAT) no longer leaves a pushed commit and tag on `main` with no corresponding release. A subsequent dry run or an actual release confirms a marketplace-publish failure no longer leaves `main` in a state requiring manual tag deletion and revert before retry.

## Traceability

Finding `P64-D2-005` · dimension D2 · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P64-D2-005 -->

### 82. P64-D4-003 — BBj integration and infrastructure: the checkout/Node-setup preamble is duplicated across six workflows and has already drifted on six measurable axes
**Route:** public issue
**Labels:** BBj integration and infrastructure, PRIO 2, 8

<!-- BODY-BEGIN P64-D4-003 -->
## Problem

Five to six workflows under `.github/workflows/` carry the same checkout → Node setup → `npm ci` → build preamble with no shared composite action or reusable workflow to hold it, and the duplication has already measurably drifted on step indentation, `working-directory:` usage, `shell:` declarations, action majors, caching, and step naming for the identical step.

## Evidence

`.github/workflows/build.yml:16-34`

Surface: the preamble is duplicated in `build.yml:17-28`, `pr-validation.yml:20-31`, `pr-vsix.yml:36-51`, `preview.yml:17-32`, `manual-release.yml:18-34`, plus a second common Java/Gradle sequence in three files and a third fully duplicated twelve-line version-bump sequence between `preview.yml` and `manual-release.yml`; `ls .github/` confirms no `.github/actions/` directory exists to hold a shared version. Problem class: unfactored duplication that has already drifted on six independently measured axes. Impact: a routine change (e.g. a Node major bump) must be made correctly in up to six places, and missing one leaves a workflow silently building the project under a different toolchain than the others — already the case for the `actions/*` version majors this same duplication caused.

## Failure scenario

A maintainer bumps the project to a new Node major. The change has to be made in six places (`build.yml:22`, `deploy-docs.yml:32`, `pr-validation.yml:25`, `pr-vsix.yml:44`, `preview.yml:22`, `manual-release.yml:23`), two of which carry an explanatory comment that also has to be updated and four of which do not. Missing one leaves a workflow silently building the project on a different Node than the others — which is precisely the state `build.yml` is already in with respect to the `actions/*` majors (`P64-D6-004`), where the divergence has persisted long enough for five files to move without it. The same shape governs the caching fix (`P64-D3-001`, five files) and the permissions fix (`P64-D1-005`, four files): each is individually trivial and each fails classification test (1) purely because the preamble was never factored out.

## Proposed approach

The manifest files are the six workflows under `.github/workflows/` that duplicate the checkout/Node-setup/`npm ci` preamble (`build.yml`, `pr-validation.yml`, `pr-vsix.yml`, `preview.yml`, `manual-release.yml`, `deploy-docs.yml`), with no `.github/actions/` directory to hold a shared version. The observable that changes once this is done is that the six measured drift axes this record counts — step indentation, `working-directory:` usage, `shell:` declarations, action majors, caching, and step naming for the identical step — converge to one value each instead of diverging further. Closing this is a structural decision between a composite action, a reusable workflow, and leaving the preambles inline but normalised to one convention; whichever is chosen carries `P64-D3-001` (caching), `P64-D1-005` (permissions) and `P64-D6-004` (action-major staleness) with it, since each of those is a multi-file edit only because this preamble was never factored out.

## Acceptance criteria

The checkout/Node-setup/`npm ci` preamble is factored into a single shared form — a composite action, a reusable workflow, or a normalised inline preamble applied identically everywhere — adopted by all five or six workflows that currently duplicate it, and the six previously drifted axes (step indentation, `working-directory:` usage, `shell:` declarations, action majors, caching, step naming) converge to one value each. Each migrated workflow's next run completes successfully under the shared form, confirming the migration preserves current behavior.

## Traceability

Finding `P64-D4-003` · dimension D4 · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P64-D4-003 -->

### 83. P64-D4-005 — vscode: ESLint registers the TypeScript plugin but enables zero rules, so npm run lint passes on any file that parses
**Route:** public issue
**Labels:** vscode, PRIO 2, 8

<!-- BODY-BEGIN P64-D4-005 -->
## Problem

`eslint.config.js` registers the `@typescript-eslint` plugin and applies the TypeScript parser, but declares `rules: {}` with no `extends`/preset anywhere in the file, so `npx eslint --print-config` resolves 0 enabled rules and `npm run lint` exits 0 across 117 linted files with only two stray "unnecessary eslint-disable" warnings as evidence a rule set was once expected to be active.

## Evidence

`bbj-vscode/eslint.config.js:16`

Surface: `eslint.config.js` is 18 lines total; `:16` declares `rules: {}` with no `extends`, no `tseslint.configs.recommended`, no `eslint.configs.recommended` and no shared preset in the file; `npx eslint --print-config src/extension.ts` resolves 0 rule entries; `npx eslint src test` exits 0 with 2 warnings, both `Unused eslint-disable directive` at `bbj-document-symbol-provider.ts:75,149`. `lint` also runs on the release path via `vscode:prepublish`. Problem class: a decorative lint step — the config file, dependency, script and CI time exist, but no rule catches anything. Impact: unused variables, floating promises, unsafe `any` usage, unsafe member access, missing `await` and every other `typescript-eslint` recommended-set rule pass unexamined across all 120 files, and a green `npm run lint` misleadingly reads to a reviewer as evidence the code was checked.

## Failure scenario

A contributor opens a pull request. `npm run lint` — invoked locally, and on the release path through `vscode:prepublish` — reports success on any TypeScript that parses: unused variables, floating promises, `any` everywhere, unsafe member access, missing `await`, unreachable code and every other rule in the `typescript-eslint` recommended set pass unexamined across all 120 files, because none of them is enabled. The project therefore carries the cost of a lint step (config file, dependency, script, CI time, the two suppression comments someone wrote in good faith) and receives none of its benefit, and — worse than having no linter — a green `npm run lint` reads to a reviewer as evidence the code was checked.

## Proposed approach

Spread `...tseslint.configs.recommended` into the exported config.

## Acceptance criteria

`eslint.config.js` spreads `...tseslint.configs.recommended` (already declared as a dependency) into the exported config, so `npx eslint --print-config src/extension.ts` resolves a non-empty, non-zero rule set. Because enabling the preset is expected to surface findings across previously unlinted files, a follow-up remediation pass brings the tree to a clean `npm run lint` exit under the newly enabled rules before the change is considered complete, rather than merging with a newly-red lint step.

## Traceability

Finding `P64-D4-005` · dimension D4 (secondary D5) · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P64-D4-005 -->

### 84. P64-D5-001 — BBj integration and infrastructure: the interop test harness is type-checked, linted and tested by nothing, despite triggering CI on every change
**Route:** public issue
**Labels:** BBj integration and infrastructure, PRIO 2, 8

<!-- BODY-BEGIN P64-D5-001 -->
## Problem

`run-tests.ts`, the interop test harness, sits outside both `tsconfig.json`'s and `tsconfig.test.json`'s includes and outside `npm run lint`'s scope, so nothing type-checks, lints, or tests it, even though a workflow's `paths:` filter treats changes under its directory as a CI trigger.

## Evidence

`bbj-vscode/tools/interop-test-harness/run-tests.ts:1-1058`

Surface: `find bbj-vscode/tools -name '*.test.ts' -o -name '*.spec.ts'` returns nothing; no `package.json` script invokes `run-tests.ts`; its documented invocation (`npx tsx tools/interop-test-harness/run-tests.ts`) appears in no script, workflow or project document and is not reachable offline because `tsx` is undeclared; `pr-validation.yml:11` lists `bbj-vscode/tools/**` among its `paths:` filters, so this tree is a CI trigger while being the subject of nothing CI runs. Problem class: a source tree that is a CI trigger but has no type-checking, linting or test coverage whatsoever. Impact: a syntax-valid but semantically broken change to this harness merges green, and the breakage surfaces only the next time someone runs the harness by hand, which nothing in the project schedules or reminds anyone to do.

## Failure scenario

Someone edits `run-tests.ts` — to add a case, to change an assertion, or to fix `P64-D2-001` — and opens a pull request. `pr-validation.yml` fires because the path filter matches, builds both projects, and passes. No type-checker has read the change, no linter has read it, no test has run it, and the only thing that would have exercised it is a manual `npx tsx` invocation that requires a live npm registry and a running java-interop peer on port 5008. A syntax-valid but semantically broken harness therefore merges green, and the breakage surfaces only the next time a human runs the harness by hand — which, as this record establishes, nothing in the project schedules or reminds anyone to do.

## Proposed approach

The concrete file is `bbj-vscode/tools/interop-test-harness/run-tests.ts:1-1058`, which sits outside both `tsconfig.json`'s `src/**/*.ts` include and `tsconfig.test.json`'s `test/**/*` include, and outside `npm run lint`'s `eslint src test` scope, so nothing type-checks or lints it despite `pr-validation.yml:11` triggering on changes under `bbj-vscode/tools/**`. The observable that changes once this is closed is that `npm run build` and `npm run lint` begin covering this file, and running it at all requires declaring `tsx` as a dependency it currently uses undeclared. What is not nameable as a single edit is the scope decision itself — whether the harness gets its own `tsconfig`, is folded into the existing `test/` tree, or gets a dedicated `package.json` script as its test entry point — which is why classification records this as a decision, not an edit.

## Acceptance criteria

`run-tests.ts` is brought under `npm run build`'s type-checking and `npm run lint`'s scope, `tsx` is declared as a dependency rather than used undeclared, and a `package.json` script or an equivalent documented entry point exists for running the harness. A subsequent CI run demonstrates the harness's TypeScript is type-checked and linted on a pull request that touches it, rather than merging unexamined.

## Traceability

Finding `P64-D5-001` · dimension D5 · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P64-D5-001 -->

### 85. P64-D6-010 — dependencies: the pinned Gradle wrapper is roughly 18 months stale and its transitive dependency tree is unenumerable, because the build fails on any JDK newer than 17
**Route:** public issue
**Labels:** dependencies, PRIO 2, 8

<!-- BODY-BEGIN P64-D6-010 -->
## Problem

The Gradle distribution pinned in `gradle-wrapper.properties` (8.13) is roughly a full major line and eighteen months behind Gradle's current release, and because the build cannot run on any locally available JDK newer than 17, `./gradlew dependencies` cannot produce a transitive dependency tree either — so nobody currently knows what `bbj-intellij` depends on transitively, and Dependabot has no `gradle` ecosystem entry to watch it either way.

## Evidence

`bbj-intellij/gradle/wrapper/gradle-wrapper.properties:3`

Surface: `gradle-wrapper.properties:3` pins Gradle 8.13 (built 2025-02-25) against a current release of 9.7.0 (built 2026-08-06); `./gradlew --offline -q dependencies` exits 1 in 723ms with only the JDK version string as its error, because `build.gradle.kts:11-14` sets `sourceCompatibility`/`targetCompatibility` to 17 with no `toolchain` block. Problem class: a stale, unpinned-toolchain build whose transitive dependency tree cannot be enumerated by any process, automated or manual. Impact: a vulnerable transitive Gradle dependency would be invisible to every process this repository operates, for a plugin published to the JetBrains Marketplace.

## Failure scenario

Two failures, one immediate and one systemic. Immediately: any contributor or tool whose available JVM is newer than Gradle 8.13 supports cannot build, test or statically analyse `bbj-intellij` at all — the build dies before task selection with a message whose entire text is the JDK version string, which is close to the least actionable diagnostic possible. Systemically: because the build cannot run, `./gradlew dependencies` cannot produce the transitive dependency tree, so **nobody — no person and no tool — currently knows what `bbj-intellij` depends on transitively.** Compose that with the CI-workflow review's `P64-D6-005`, which records that `.github/dependabot.yml` declares no `gradle` ecosystem, and the result is the strongest single statement in this phase's SEC-08 answer: **this dependency tree is both unscanned by tooling and unenumerable by hand**, so a vulnerable transitive Gradle dependency would be invisible to every process this repository operates. The IntelliJ plugin built from that tree is published to the JetBrains Marketplace at `manual-release.yml:137` and `preview.yml:99`.

## Proposed approach

Add `java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }` to `build.gradle.kts` mirroring `java-interop/build.gradle:6-10`, and regenerate the wrapper onto a current Gradle release with its published checksum pinned.

## Acceptance criteria

`build.gradle.kts` declares a `toolchain { languageVersion = JavaLanguageVersion.of(17) } }` block mirroring `java-interop/build.gradle:6-10`, and the Gradle wrapper is regenerated onto a current Gradle release with its published checksum pinned in `gradle-wrapper.properties`. A subsequent `./gradlew dependencies` run, on a JDK newer than 17, succeeds and produces a transitive dependency tree for the first time, closing the enumerability gap this finding records.

## Traceability

Finding `P64-D6-010` · dimension D6 (secondary D2) · severity medium · effort 8.

This finding cross-references (not duplicates) finding `P63-D6-002`, which recorded the same JDK-toolchain condition from a narrower routed cell; that finding is filed as its own separate issue and remains citable independently. No open issue in the frozen open-issue snapshot mentions Gradle, the JDK toolchain, the IntelliJ Platform version or LSP4IJ.
<!-- BODY-END P64-D6-010 -->

### 86. P66-D2-002 — vscode: fully-qualified Java static member access is offered every instance method and field too, because MemberCall receivers never satisfy isClassRef
**Route:** public issue
**Labels:** vscode, PRIO 2, 8

<!-- BODY-BEGIN P66-D2-002 -->
## Problem

`getScope()`'s member-completion branch treats a `MemberCall`-shaped receiver (e.g. a fully-qualified reference typed without a preceding `USE` alias) as never satisfying `isClassRef`, so completion falls through to the instance-access branch and offers every field and method of the class instead of statics only.

## Evidence

`bbj-vscode/src/language/bbj-scope.ts:191-234 (getScope's member-completion branch; isClassRef detection at :199-208); bbj-vscode/src/language/bbj-completion-provider.ts (consumes the scope with no independent isClassRef-aware filtering of its own); bbj-vscode/src/language/java-interop.ts:572-588 (the isStatic ?? false default that is the stated blocker)`

Surface: `bbj-scope.ts:199-208`'s `isSymbolRef(receiver)` check returns `true` (and completion is correctly static-only) for a `SymbolRef`-shaped receiver such as `String.valueOf` after `USE java.lang.String`, but returns `false` for a `MemberCall`-shaped receiver such as `java.lang.String.valueOf(2)` typed with no `USE`, falling through to the instance-access branch at `:226-228`; `java-interop.ts:572-588`'s `isStatic ?? false` default is a stated blocker on the interop side. Problem class: an incomplete `isClassRef` detection that only recognizes one of two receiver shapes. Impact: a fully-qualified Java class member reference typed without a preceding `USE` alias offers every instance method and field alongside its statics in the completion list, instead of statics only.

## Failure scenario

A fully-qualified Java class MemberCall reference typed without a preceding USE alias (e.g. java.lang.String.valueOf(2), or any FQN-qualified static access) — the completion list offered for the trailing member includes every instance method and field of the class alongside its statics, instead of statics only, because isClassRef never becomes true for a MemberCall-shaped receiver.

## Proposed approach

The complete fix needs both a bbj-scope.ts-side extension AND a java-interop/ JAR-side change (outside this repo's FUT-01 boundary) plus a redeployment, not a single-file edit.

## Acceptance criteria

`getScope()`'s member-completion branch recognizes a `MemberCall`-shaped receiver as a class reference the same way it already recognizes a `SymbolRef`-shaped one, so a fully-qualified static access typed without a preceding `USE` alias offers only static members. Because a full fix additionally needs a `java-interop/` JAR-side change and redeployment outside this repository's own scope, the bbj-vscode-side extension and its regression test are the acceptance condition for this issue; a vitest test exercising a `MemberCall`-shaped fully-qualified static reference (e.g. `java.lang.String.valueOf`) asserts the completion list excludes instance-only members once the interop side is updated to match.

## Traceability

Finding `P66-D2-002` · dimension D2 · severity medium · effort 8 (cross-repo scope: a `java-interop/` JAR-side change and redeployment are needed in addition to the vscode-side extension). `dedup: none`.
<!-- BODY-END P66-D2-002 -->

### 87. P66-D5-002 — javascript: the DEF FN parameter completion test remains skipped; class-method-body completions are still produced by nothing
**Route:** public issue
**Labels:** javascript, PRIO 2, 8

<!-- BODY-BEGIN P66-D5-002 -->
## Problem

A re-triage confirms the skipped DEF FN parameter-truncation test and its root-cause comment are unchanged — the Langium completion engine's grammar follower still produces zero candidate positions anywhere inside `MethodDecl.body` statement positions, independent of DEF FN or the scope chain.

## Evidence

`bbj-vscode/test/completion-test.test.ts:185`

Surface: the same skipped test and root-cause trace `P61-D5-010` originally recorded, re-confirmed unchanged at the recorded line by a fresh read. Problem class: an unresolved grammar-traversal gap in the completion engine. Impact: any attempt to re-enable the skipped test, as currently written, still fails today.

## Failure scenario

Any attempt to re-enable the skipped test, as currently written, against the current completion-grammar traversal fails: the completion engine's grammar follower does not produce candidate positions inside class-method statement bodies at all, so the expected _f$/_t$ parameter items are never offered — independent of DEF FN or the scope chain, both already ruled out by the recorded root-cause investigation.

## Proposed approach

"Already failing" here means the same as P61-D5-010, which this record cites: the completion-provider suite in `bbj-vscode/test/completion-test.test.ts` cannot be observed green today, because the Langium grammar follower produces no candidate positions anywhere inside `MethodDecl.body` statements — the skipped DEF FN `_f$`/`_t$` assertion (lines 203-213) has never passed. The first step is establishing a passing baseline for that suite's class-method-body completion-position handling itself, at which point this record's own defect becomes separable from the broader grammar-traversal gap, via either a BBj-side grammar restructuring or an upstream Langium completion-provider change.

## Acceptance criteria

The completion provider produces at least one candidate position for a statement inside a class method body (`MethodDecl.body`), establishing a passing baseline for `test/completion-test.test.ts`'s class-method-body completion-position handling. Once that baseline exists, the skipped DEF FN `_f$`/`_t$` parameter-truncation assertion (lines 203-213) is re-enabled and passes, or is replaced with a regression test asserting the same untruncated-parameter behavior — the same acceptance condition `P61-D5-010` states for the original finding.

## Traceability

Finding `P66-D5-002` · dimension D5 (secondary D2) · severity medium · effort 8. `dedup: none`.
<!-- BODY-END P66-D5-002 -->

