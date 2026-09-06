---
phase: 81-feature-parity-and-correctness
plan: 07
subsystem: ide-intellij
tags: [lsp4ij, lsp4j, reflection, compile-diagnostics, gradle]

requires:
  - phase: 81-feature-parity-and-correctness
    provides: "81-05's CompileResultPresenter and BbjCompileAction wiring, 81-06's oversized-position fix that let a compile-errors response reach the presenter for the first time in a live IDE"
provides:
  - "A shape-tolerant, reflective read of a diagnostic's message that works whichever LSP4IJ client-library generation (String-returning or Either-returning getMessage()) the live IDE has installed"
  - "A wire-to-balloon end-to-end test proving a real JSON-RPC envelope renders correctly through the plugin's own deserializer"
  - "A source guard that fails the build if a typed message accessor or a version-specific client-library import reappears in the rendering seam"
  - "The compile/test LSP4IJ pin raised to the current Marketplace release (0.21.0), with the module and plugin archive proven green against it"
affects: [phase-83-lsp4ij-canary]

actuals:
  tokens: 21000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Duck-typed reflective accessor read with a bounded-depth normaliser, used when a plugin cannot pin the runtime version of a client library it depends on"

key-files:
  created:
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/DiagnosticMessageAccessSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileResultPresenter.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultJsonBoundaryTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultPresenterTest.java
    - bbj-intellij/build.gradle.kts

key-decisions:
  - "LSP4IJ Gradle pin raised from 0.19.0 to 0.21.0 (kept, not reverted): the coordinate resolved cleanly and the whole IntelliJ module stayed green at 326 tests, 0 failures, with buildPlugin producing an archive. This is the strongest available branch because CompileResultPresenterTest's real-diagnostic test now exercises the two-branch (Either) accessor against the genuine client library 1.0.0, not only a duck-typed stand-in."
  - "Reflection, not a shared interface or two source files, is the only mechanism that lets one plugin binary compile against and correctly read a diagnostic's message from either lsp4j generation on the classpath at run time."
  - "Range/Position accessors (getRange, getStart, getLine, getCharacter) stay typed -- unchanged across both generations per the LSP uinteger contract -- while only the message accessor, the one field that actually changed shape, is read reflectively."

requirements-completed: [PARITY-01]

coverage:
  - id: D1
    description: "CompileResultPresenter reads a diagnostic's message reflectively (messageTextOf/invokeNoArg/unwrapMessage), normalising a plain string, either branch of a two-branch value, or a markup value's own text, with every reflective failure degrading to the diagnostic's location instead of throwing"
    requirement: "PARITY-01"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultPresenterTest.java#aStringShapedMessageValueIsUsedAsIs, aTwoWayMessageValueIsReadFromItsLeftBranch, aTwoWayMessageValueIsReadFromItsMarkupRightBranch, anUnreadableMessageValueYieldsEmptyTextInsteadOfThrowing, aRealDiagnosticFromThisClasspathStillYieldsItsMessage, aDiagnosticWithNoMessageStillRendersItsLocation"
        status: pass
    human_judgment: false
  - id: D2
    description: "A real bbj/compile envelope, parsed through the plugin's own MessageJsonHandler, renders end to end into balloon body text (3:1 Syntax error: bad code) -- the wire-to-balloon path no test covered before"
    requirement: "PARITY-01"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultJsonBoundaryTest.java#aParsedCompileErrorsResponseRendersAsLineColumnMessage"
        status: pass
    human_judgment: false
  - id: D3
    description: "A source guard fails the build if a typed message accessor call, or an import naming either client-library generation's message type, reappears in the rendering seam"
    requirement: "PARITY-01"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/DiagnosticMessageAccessSourceGuardTest.java#theRenderingSeamCallsNoTypedMessageAccessor, theMessageIsReadThroughAReflectiveLookupWithAFallback, theRenderingSeamBindsToNoClientLibraryMessageType"
        status: pass
    human_judgment: false
  - id: D4
    description: "The compile/test LSP4IJ pin decision is recorded and proven: raised to 0.21.0 with the whole module green (326 tests) and buildPlugin producing an archive"
    requirement: "PARITY-01"
    verification:
      - kind: integration
        ref: "cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test (326 tests, 0 failures); ./gradlew buildPlugin (build/distributions/bbj-intellij-0.1.0.zip)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The fix survives a live IDE install: invoking Compile BBj File on a syntax-error file shows the error balloon with line:col messages, no NoSuchMethodError, and repeat compiles still show the balloon"
    human_judgment: true
    rationale: "Requires a live IntelliJ install with a Marketplace-resolved LSP4IJ dependency, which this sandboxed dev container does not have. Deferred to /gsd-verify-work UAT re-check per the plan's <verification> human-check section, matching the original G-81-5 reproduction path."

duration: 15min
completed: 2026-09-05
status: complete
---

# Phase 81 Plan 07: Reflective diagnostic-message read across LSP4IJ generations Summary

**A duck-typed, bounded-depth reflective read of a diagnostic's message replaces the typed `Diagnostic.getMessage()` call that crashed with `NoSuchMethodError` on any LSP4IJ build newer than the pinned 0.19.0, backed by an envelope-to-balloon end-to-end test, six shape/failure-mode tests, a regression-proof source guard, and a Gradle pin raised to LSP4IJ 0.21.0 with the whole module and plugin archive green.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-05T17:32:00Z (approx.)
- **Completed:** 2026-09-05T17:46:53Z
- **Tasks:** 3
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- `CompileResultPresenter.messageTextOf` resolves the no-argument `getMessage` accessor on a diagnostic's runtime class by reflection and normalises the result across three shapes (plain string, either branch of a two-branch value, or a markup value's own text), bounded to a max unwrap depth of 3, with every reflective failure caught and degraded to the diagnostic's location rather than propagating into the background task.
- `renderOne` now renders the location alone when the message text is empty, instead of the old location-plus-trailing-separator-plus-null behavior.
- A new end-to-end test (`CompileResultJsonBoundaryTest#aParsedCompileErrorsResponseRendersAsLineColumnMessage`) parses a real `bbj/compile` envelope through the plugin's own `MessageJsonHandler` and feeds the result straight into `present(...)` exactly as `BbjCompileAction` does, asserting the exact balloon body `3:1 Syntax error: bad code`.
- Six new tests in `CompileResultPresenterTest` drive `messageTextOf` with small duck-typed stand-ins (no shared interface with the real client library) covering: a plain-string message, a two-branch value's left branch, a two-branch value's markup right branch, an object with no such accessor, an accessor that throws, an accessor that returns null, a real diagnostic from this classpath, and a diagnostic with no message rendering its location alone.
- New `DiagnosticMessageAccessSourceGuardTest` fails the build if a typed `.getMessage()` call, or an import naming `MarkupContent` or `jsonrpc.messages.Either`, reappears in `CompileResultPresenter.java`, and asserts the reflective lookup (`getMethod`, the `"getMessage"` literal, `ReflectiveOperationException`) stays in place.
- `build.gradle.kts`'s LSP4IJ coordinate raised from `0.19.0` to `0.21.0` (the current Marketplace release) with a comment recording why the version is pinned deliberately; the whole IntelliJ module stayed green at 326 tests with `buildPlugin` producing an archive, so the real-diagnostic test now exercises the two-branch accessor against the genuine client library 1.0.0.

## Task Commits

Each task was committed atomically. Task 1 (tracer, TDD) produced a test commit followed by a feat commit; Task 2 (TDD) produced one test-only commit since no production change was needed beyond what Task 1 already implemented; Task 3 produced one fix commit.

1. **Task 1 (RED): add wire-to-balloon envelope render test** - `7537fce5` (test)
2. **Task 1 (GREEN): read a diagnostic's message reflectively, not by typed accessor** - `39cb8c3a` (feat)
3. **Task 2: pin both message shapes, the unreadable case, and add a source guard** - `816d57f9` (test)
4. **Task 3: raise the compile/test LSP4IJ pin to the current Marketplace release** - `4e6175d4` (fix)

**Plan metadata:** (this commit, immediately following)

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileResultPresenter.java` - Adds `messageTextOf`, `invokeNoArg`, `unwrapMessage`; rewrites `renderOne` to read through the tolerant seam
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultJsonBoundaryTest.java` - Adds the envelope-to-balloon end-to-end test
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultPresenterTest.java` - Adds six shape/failure-mode tests and four duck-typed stand-in classes
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/DiagnosticMessageAccessSourceGuardTest.java` - New source guard against a typed accessor or version-specific import regressing
- `bbj-intellij/build.gradle.kts` - LSP4IJ coordinate raised to `0.21.0` with a recorded rationale comment

## Decisions Made

- **LSP4IJ pin kept at 0.21.0 (raised, not reverted).** The dependency resolved cleanly against the JetBrains plugin repository, `./gradlew test` passed the whole IntelliJ module at exactly 326 tests with 0 failures (81-06's baseline of 316 plus this plan's 1 boundary + 6 presenter + 3 guard = 10 new tests), and `./gradlew buildPlugin` produced `build/distributions/bbj-intellij-0.1.0.zip`. No file outside `CompileResultPresenter.java` needed changing in `bbj-intellij/src/main` to reach this green state, so the hard rule (revert on any main-source adaptation beyond the presenter) never triggered. This is the strongest available branch: `CompileResultPresenterTest#aRealDiagnosticFromThisClasspathStillYieldsItsMessage` now exercises the genuine client-library 1.0.0's `Either`-returning `getMessage()`, not only the duck-typed stand-ins, giving direct proof (not just a stand-in proof) that the tolerant read works on the generation the live IDE actually loads.
- **Reflection is the only mechanism that compiles against both lsp4j generations in one binary**, confirmed by the plan's own flagged assumption: no source literal spans both the `String`-returning and `Either`-returning method descriptors, so a duck-typed accessor lookup by name is the only expressible option short of shipping two binaries.
- **Range/Position accessors stay typed.** They are unchanged across both generations per the LSP `uinteger` contract; making them reflective would add cost and noise for no coverage.

## Deviations from Plan

None - plan executed exactly as written, including the TDD sequencing exception the plan itself calls out (see TDD Gate Compliance below).

## TDD Gate Compliance

Both TDD tasks completed their commit sequence, but neither task produced a genuine RED failure, exactly as the plan predicted and explicitly sanctioned:

- **Task 1** (tracer, `tdd="true"`): the plan's own `<behavior>` block states the new end-to-end test is "written before the production change and watched fail — not with an error, but with the wrong answer, because on the pinned classpath the current code already returns the right string." Running the test before the production change confirmed it: 5/5 `CompileResultJsonBoundaryTest` tests passed immediately (verified via the test-results XML, `tests="5" ... failures="0" errors="0"`), because the test is deliberately shape-agnostic and the plain-string classpath already produced the correct output. The test was committed anyway as the RED-phase commit per the plan's explicit instruction ("Write this test first anyway: it is the slice that proves the whole path"), followed by the GREEN-phase production commit implementing the tolerant read.
- **Task 2** (`type="auto"`, `tdd="true"`): its six shape/failure-mode tests were written after Task 1's production implementation already existed (Task 1 is a prerequisite tracer for exactly this reason — it proves the path end to end before Task 2 exhaustively covers every shape). Running them therefore could not go RED either; they passed immediately (18/18 `CompileResultPresenterTest`, 3/3 `DiagnosticMessageAccessSourceGuardTest`). No production file changed in Task 2's commit — `git diff --stat` for `bbj-intellij/src/main` after Task 2 still names only `CompileResultPresenter.java`, unchanged since Task 1. This matches the plan's own sequencing note: "it is acceptable to write Task 1's test + Task 2's stand-in tests as the RED commit(s) before the production change, as long as each task's commits are attributable" — the plan anticipated this exact non-RED outcome for both tasks and explicitly sanctioned proceeding.

Both fail-fast investigations were performed (test-results XML checked before proceeding in each case) and confirmed the plan's prediction rather than an unexpected already-existing feature or a wrong test.

## Issues Encountered

None. The LSP4IJ 0.21.0 coordinate resolved on the first attempt with network access available in this environment; no fallback branch (offline revert, or revert due to unrelated API breakage) was needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-81-5 (the syntax-error compile balloon crash) is closed pending the deferred live-IDE UAT re-check (D5 above): re-run Test 5 in `81-UAT.md` against a plugin built and installed from this branch, confirming which LSP4IJ version the live IDE actually resolved.
- The plugin's other unpinned LSP4IJ call sites (`ServerStatus`, `LanguageServerManager`, `LSPClientFeatures`, `LSPCompletionFeature`, `LSPDocumentLinkFeature`, `LanguageClientImpl`, connection providers) remain out of scope, tracked as T-81-30 (accepted) and named for Phase 83's LSP4IJ experimental-API canary sweep.
- No blockers for closing Phase 81 once the live-IDE re-check passes.

---
*Phase: 81-feature-parity-and-correctness*
*Completed: 2026-09-05*
