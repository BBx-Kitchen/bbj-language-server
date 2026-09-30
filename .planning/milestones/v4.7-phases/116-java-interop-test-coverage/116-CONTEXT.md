# Phase 116: Java-Interop Test Coverage - Context

**Gathered:** 2026-09-28
**Status:** Ready for planning

<domain>
## Phase Boundary

The suite exercises the real java-interop connection code and the language server's LSP handlers
instead of test doubles and text scans, before Phases 119-121 refactor that code. Concretely:

- the three disabled `parser.test.ts` validation assertions run and pass (TEST-04, #528)
- the 11 failing `linking.test.ts` interop tests pass, and the whole suite reports zero failed
  tests with BBjServices up on :5008 and with it down (TEST-05, #559)
- `java-interop.ts`'s real connect, timeout and request-lock code runs against a local fake socket
  server (TEST-06, #560)
- the `main.ts` Java class refresh and configuration change handlers run in tests without a
  module-load `createConnection()` (TEST-08, #563)

No new LS features. A `src/` change is allowed only where these decisions say so.

</domain>

<decisions>
## Implementation Decisions

### Linking tests (TEST-05)
- **D-01:** **Complete the fixture.** Add the missing fake classes to `JavaInteropTestService`
  in `test/bbj-test-module.ts`: `java.util.Date`, `java.util.List`, `java.util.LinkedList`,
  `java.util.Map` with a nested `Map.Entry`, `java.sql.Date` and `java.lang.Boolean`. Also add an
  `Object`-equivalent base so `toString()` resolves on any user-defined class. The block then
  runs hermetically, in CI too, and its result doesn't depend on :5008. The block is not moved
  onto live interop.
- **D-02:** Build the fake classes the same way as the existing `createHashMapClass` /
  `createSysGuiClass` helpers, and give them **only the members the tests reference** (for
  example `Map.Entry.getValue`, `Boolean.TRUE`, `java.sql.Date.valueOf` and `toString`). Don't
  build fuller JDK-like member lists.
- **D-03:** **Drop the `describe.runIf(isInteropRunning)` gate** and **rename the block** so it no
  longer claims to exercise interop (for example "Java class linking (test double)"). It runs
  unconditionally.
- **D-04:** **Zero failed tests, whole suite, both states.** Criterion 2 covers the whole suite,
  so the drifted live-interop tests are in scope too, including the `issue447` capability
  tests that fail against the current bbj-ls (`getAllClassNames`, since 2026-09-03). Update them to
  the current backend so a whole-suite run reports `numFailedTests: 0` both with :5008 up
  (`npm run test:bbj`) and with it down (`npm test`).
- **D-05:** **Harden `shouldRunBBjTests()` now** (DEBT item 5). Replace the bare TCP probe of
  :5008 with a real JSON-RPC round trip against the peer, so the BBj-gated suites turn on only
  when a working peer answers. The probe must be short, must not hang, and every existing caller
  keeps its current call shape.

### Disabled parser assertions (TEST-04)
- **D-06:** **Test double first.** Re-enable each of the three assertions (the substring parse
  `new String()(1)`, the `BBjAPI().getGlobalNamespace().getValue()` chain with `release()`, and
  the `String[]`/`byte[]` field and method signature). Extend `JavaInteropTestService` only where
  an assertion actually needs it. The `DISABLED` comments may be stale: `java.lang.String` is
  already preloaded and primitives/arrays now resolve locally (#660), so check each one before
  adding fixture code. `src/` stays untouched **unless** an assertion exposes a real LS bug; that
  bug is then fixed in `src/`, and the fix is recorded in the SUMMARY.
- **D-07:** The `BBjAPI()` chain asserts `expectNoValidationErrors`, **matching the real LS on real
  BBj**. The fake `getValue()` returns what the real signature returns (`Object`). The fake is not
  typed to a semaphore, and `release()` on the untyped `!` variable is not flagged, as today.
- **D-08:** Remove the stale `DISABLED:` comment blocks together with the commented-out
  assertions.

### Fake socket server (TEST-06)
- **D-09:** **Promote a shared loopback fake peer.** Generalise Phase 115's
  `test/interop-harness-fake-peer.ts` into one shared real `net` + vscode-jsonrpc server
  (loopback, ephemeral port, per-test handler overrides, drop and never-answer controls). The
  harness tests and the new `java-interop.ts` suite both use it, and the Phase 115 harness tests
  stay green without assertion changes.
- **D-10:** The new suite drives `JavaInteropService`'s **real** `connect()`, `createSocket()` and
  `wrapSocket()`, pointed at the fake server's port. It covers at least a **refused connection**
  (nothing listening), a **response that times out** (the server accepts but never answers), and
  **concurrent requests serialized by the resolution lock** (the server sees one request at a
  time, in order).
- **D-11:** **Leave the existing client-side fakes alone.** `test/fake-interop-peer.ts` and the
  breaker and parse-lane suites that use it keep their `createSocket`/`wrapSocket` overrides. The
  new suite covers only what they skip.
- **D-12:** **Timeouts use fake timers over the real socket.** `vi.useFakeTimers` advances past
  the real 10 s / 30 s constants, as `test/java-interop-timeouts.test.ts` already does. No
  injectable-timeout `src/` change. If fake timers and socket I/O interfere, fake only
  `setTimeout`/`clearTimeout` (`toFake`); don't change `src/`.

### main.ts handler extraction (TEST-08)
- **D-13:** Use the **existing `register*(connection, deps)` pattern** (like
  `registerCompileRequest` and `registerConfigAwareHoverHandler`). The `bbj/refreshJavaClasses`
  request body, the `onDidChangeConfiguration` body and their inline helpers
  (`reloadJavaClassesAndRevalidate`, `refreshInlayHints`, the settings parsing) move into new
  modules that take the services, the workspace manager and the setters as deps. `main.ts` only
  wires them. `createConnection()` stays in `main.ts`, and the `bbj-notifications.ts` isolation
  is kept: no shared-services module imports `main.ts`.
- **D-14:** The extraction is **behaviour-neutral**: the same order of calls and the same messages,
  with the configuration handler still registered after `startLanguageServer`. Existing suites
  pass without assertion changes.
- **D-15:** **Behaviour tests plus a coverage reading.** Tests drive the registered handlers
  through a fake connection and assert their effects: reload called, setters applied, and the
  error message shown on failure. VERIFICATION records a one-off `vitest --coverage` reading for
  the new modules. No new CI coverage gate and no per-file threshold.
- **D-16:** **Every branch of the configuration handler** gets a test: push vs pull settings, a
  classpath-affecting change that reloads vs one that doesn't, the interop host/port change, and
  the reload-failure path. The refresh request gets its success and failure cases. This is the
  code Phases 119-121 refactor next.

### Claude's Discretion
- Plan ordering and grouping. Suggested: fixture and baseline (D-01..D-08) first, then the shared
  fake peer and the java-interop suite, then the main.ts extraction.
- The exact JSON-RPC call the hardened probe uses (D-05), and its timeout.
- The new block's name (D-03), the new module and file names (D-13), and how the shared fake peer
  is parameterised over the two clients' request types (D-09).

### Folded Todos
- `.planning/todos/pending/2026-09-20-linking-interop-failures-survive-class-warmup.md`: the
  root cause for TEST-05. The block never reaches :5008, because `JavaInteropTestService` rejects
  `connect()` and lacks the classes the failing tests use. D-01..D-03 apply the todo's
  "fixture-completeness" option, and D-05 takes the DEBT item 5 probe it names. Close the todo
  with the phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` § "Phase 116: Java-Interop Test Coverage": goal, success criteria and
  the planning notes (#559's own diagnosis is wrong; keep the `bbj-notifications.ts` isolation)
- `.planning/REQUIREMENTS.md`: TEST-04, TEST-05, TEST-06, TEST-08
- GitHub issues #528, #559, #560, #563 (`gh issue view N`)
- `.planning/todos/pending/2026-09-20-linking-interop-failures-survive-class-warmup.md`: the
  verified root cause, the refuted hypotheses and the verbatim failure list for the 11 tests

### Prior-phase decisions this phase builds on
- `.planning/phases/115-honest-interop-test-harness/115-CONTEXT.md`: D-17..D-19 (the in-process
  fake JSON-RPC server, hand-written minimal typed fixtures, and no :5008 or `RUN_BBJ_TESTS`
  needed in CI)
- `.planning/phases/114-lint-type-check-test-suite-gates/114-CONTEXT.md`: D-03 (inline lint
  disables only with a reason), D-05 (real type fixes in `test/`, no `@ts-nocheck`) and D-08..D-10
  (the `initializeWorkspace()` hook-timeout work)

### Code under change
- `bbj-vscode/test/bbj-test-module.ts` (`JavaInteropTestService` and the `create*Class` helpers)
- `bbj-vscode/test/parser.test.ts` (disabled assertions near lines 526-535, 806-816 and 850-866)
- `bbj-vscode/test/linking.test.ts` (the `Interop related tests` block, from line 294)
- `bbj-vscode/test/test-helper.ts` (`shouldRunBBjTests()`)
- `bbj-vscode/test/functional/issue447-real-interop.test.ts` (the live-interop drift under D-04)
- `bbj-vscode/test/interop-harness-fake-peer.ts` (promoted under D-09)
- `bbj-vscode/src/language/java-interop.ts` (`connect`, `establishConnection`, `createSocket`,
  `wrapSocket`, the lock queue, and the timeouts at `RESOLUTION_TIMEOUT_MS` and the 10 s races)
- `bbj-vscode/src/language/main.ts` (the `bbj/refreshJavaClasses` handler, the
  `onDidChangeConfiguration` handler and their helpers)
- `bbj-vscode/src/language/bbj-notifications.ts` (the isolation pattern to keep)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `test/interop-harness-fake-peer.ts`: already a real loopback `net` + vscode-jsonrpc server with
  per-socket handler overrides and `context.drop()`. It is currently typed to the harness
  scaffold's four request types.
- `test/fake-interop-peer.ts`: the client-side fake (overrides `createSocket`/`wrapSocket`). It
  stays as it is (D-11), and it shows how to build `BBjServices` around a `JavaInteropService`
  subclass.
- `test/java-interop-timeouts.test.ts`: the fake-timer pattern for the 10 s timeouts.
- `test/fake-text-document-connection.ts`: a starting point for the fake connection in the
  handler tests.
- `java-interop.ts` `JAVA_PRIMITIVE_TYPE_NAMES` and local primitive/array resolution (#660): this
  is likely why some `DISABLED` comments in `parser.test.ts` are stale.

### Established Patterns
- `main.ts` already delegates to `registerCompileRequest`, `registerResolvedConfigPathRequest`,
  `registerBoundedCodeActionHandler`, `registerComposerCodeLensHandler` and
  `registerConfigAwareHoverHandler`, all `register*(connection, deps)`. D-13 follows them.
- The connect path is guarded by a three-state breaker, `connectingPromise` sharing and a
  generation counter. The new suite must not disturb breaker state between tests (a fresh
  service per test).
- vitest runs with cwd = `bbj-vscode`. Whole-suite "failed suites" with `numFailedTests: 0` are
  hook-timeout contention; judge on `numFailedTests`.

### Integration Points
- `createBBjTestServices` is used across most test files. Adding fake classes to
  `JavaInteropTestService` can change results in other suites (for example a class that used to
  be unresolved in a negative test). Run the whole suite and compare the failing-test names
  against the phase base.
- `shouldRunBBjTests()` gates every BBj-dependent suite. The hardened probe (D-05) can switch
  suites off where the bare TCP probe switched them on.

</code_context>

<specifics>
## Specific Ideas

- Proof for criterion 2: two whole-suite runs at phase end, `npm test` with :5008 down and
  `npm run test:bbj` with BBjServices up, each reporting `numFailedTests: 0`.
- Proof for criterion 4: a one-off `vitest --coverage` reading for the extracted handler modules,
  recorded in VERIFICATION.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- `2026-09-26-intellij-interop-initoptions-key-mismatch.md`: an IntelliJ behaviour fix
  (`javaInteropHost`/`Port` vs `interopHost`/`Port`), not test coverage. It stays pending for a
  fix phase or the backlog.
- `2026-09-26-signature-help-and-snippet-peer-name-escaping.md`: a `src/` security fix for
  signature help and completion snippets. It is out of scope for a test-coverage phase.
- `2026-09-27-windows-intellij-node-download-progress-check.md`: a manual check on real Windows,
  with no code in this phase.

</deferred>

---

*Phase: 116-java-interop-test-coverage*
*Context gathered: 2026-09-28*
