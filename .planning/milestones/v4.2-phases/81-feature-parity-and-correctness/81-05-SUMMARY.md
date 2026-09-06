---
phase: 81-feature-parity-and-correctness
plan: 05
subsystem: ide-integration
tags: [intellij, lsp4ij, compile, junit5]

# Dependency graph
requires:
  - phase: 81-feature-parity-and-correctness
    provides: "81-01's bbj/compile request/result JSON shape and reason vocabulary; 81-04's compilerOutputDirectory setting that keeps the server from refusing every call"
provides:
  - "BbjCompileAction.actionPerformed(): saves the document, dispatches bbj/compile off the EDT via Task.Backgroundable, and renders a balloon plus a console line"
  - "CompileModels (CompileParams, CompileResult) — Gson DTOs mirroring bbj-vscode/src/language/compile-command.ts field-for-field"
  - "CompileResultPresenter — a plain-Java rendering seam dispatching on the machine-readable reason, never on message prose"
  - "bbj/compile declared on BbjComposerServer, the one interface BbjLanguageServerFactory.getServerInterface() proxies"
affects: []

# Actuals (#2632)
actuals:
  tokens: 8939
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain-Java rendering seam (CompileResultPresenter) with no IntelliJ import, switching on a machine-readable reason string rather than matching on message prose (D-10)"
    - "Task.Backgroundable body asserting assertIsNonDispatchThread() as its first statement, mirroring the Phase 79 run-action/EM-login convention, ahead of every blocking LSP4IJ call"
    - "Text-based source-guard test (readSource/countOccurrences/indexOf-ordering, copied from OffEdtDispatchSourceGuardTest) with a comment-line filter, as the regression fence for wiring no unit test can otherwise exercise"

key-files:
  created:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileModels.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileResultPresenter.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultPresenterTest.java
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/BbjCompileActionSourceGuardTest.java
  modified:
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java
    - bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java

key-decisions:
  - "bbj/compile is declared directly on BbjComposerServer rather than a new sibling interface — getServerInterface() returns exactly one interface (RESEARCH.md Pitfall 5), and the naming mismatch with 'composer' is cosmetic and explained in that interface's javadoc, per CONTEXT.md Flagged assumption 1."
  - "org.eclipse.lsp4j.Diagnostic is reused verbatim in CompileResult rather than a hand-rolled DTO; javap-verified field/getter shape (Range{start,end}, Position{line,character}, message) matches what the connection already deserializes."
  - "CompileResultPresenter.present() takes the five primitive/collection values (fileName, success, reason, message, diagnostics) rather than a CompileResult object, keeping the seam free of any DTO-package coupling and trivially testable with plain literals."
  - "The client-side wait uses a 45s bound, comfortably above the server's own 30s compile timeout, so a lost response cannot leave the progress indicator up forever (CONTEXT.md Flagged assumption 4)."

requirements-completed: [PARITY-01]

coverage:
  - id: D1
    description: "\"Compile BBj File\" saves the document unconditionally, then sends bbj/compile from a Task.Backgroundable whose body asserts off-EDT before the first blocking call"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/BbjCompileActionSourceGuardTest.java#assertIsNonDispatchThreadSitsInsideTheBackgroundBodyAheadOfTheFirstBlockingCall"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/BbjCompileActionSourceGuardTest.java#theDocumentIsSavedBeforeTheBackgroundTaskIsQueued"
        status: pass
    human_judgment: false
  - id: D2
    description: "The save is unconditional (not gated on autoSaveBeforeRun) and no compiler invocation logic (ProcessBuilder, GeneralCommandLine, resolveBbjBinary) leaked onto the IntelliJ side"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/BbjCompileActionSourceGuardTest.java#theSaveIsUnconditionalAndReadsNoSetting"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/BbjCompileActionSourceGuardTest.java#noCompilerInvocationLogicLeakedOntoTheIntelliJSide"
        status: pass
    human_judgment: false
  - id: D3
    description: "The action's update() gating (.bbj/.bbx/.src, server started, .bbl excluded) and the #571 reference are unchanged; bbj/compile is declared exactly once on BbjComposerServer"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/BbjCompileActionSourceGuardTest.java#theUpdateGatingAndTheHashtag571ReferenceAreUnchanged"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/BbjCompileActionSourceGuardTest.java#bbjComposerServerDeclaresTheCompileRequestExactlyOnce"
        status: pass
    human_judgment: false
  - id: D4
    description: "Success renders 'Compiled \"<file>\"'; the four settings-fixable reasons offer an Open Settings remedy and the five non-fixable reasons don't; compile-errors renders diagnostics as line:col message; bbjcpl-error shows the raw stderr verbatim"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultPresenterTest.java (12 tests: success, every reason, an unknown/null reason, range-less diagnostic, server-unavailable, request-failed, purity across calls)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The rendering seam (CompileResultPresenter) carries no IntelliJ import and chooses no branch by matching on message prose"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/BbjCompileActionSourceGuardTest.java#theResultPresenterCarriesNoIntelliJImport"
        status: pass
    human_judgment: false
  - id: D6
    description: "plugin.xml's bbj.compile action registration and BbjLanguageServerFactory (81-04's file) are both unchanged by this plan"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/BbjCompileActionSourceGuardTest.java#pluginXmlStillRegistersTheCompileAction"
        status: pass
    human_judgment: false
  - id: D7
    description: "Live-IDE behavior: a real compile writes a tokenized file to the configured output directory and shows the success balloon; a syntax error shows the error balloon with line:col diagnostics and the same text in the console; a missing output directory shows an error balloon with a working Open Settings action; editing without saving still compiles the edited content; the IDE stays responsive during a large-file compile; the action stays hidden for .bbl files and when the server is not started"
    verification: []
    human_judgment: true
    rationale: "The action, the balloons and the round trip require the IntelliJ platform and a running language server, which C-01 keeps out of the test module (Phase 79/80 practice). Deferred to /gsd-verify-work UAT in a live IDE, per the plan's <verification> Human check section."

duration: 12min
completed: 2026-09-05
status: complete
---

# Phase 81 Plan 05: IntelliJ Compile Action Summary

**"Compile BBj File" now saves the document and sends `bbj/compile` to the shared language server from an off-EDT background task, rendering VS-Code-style balloons keyed on a machine-readable `reason` — no bbjcpl invocation logic on the IntelliJ side.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-05T11:15:00Z (approx, from prior plan's commit)
- **Completed:** 2026-09-05T11:27:00Z
- **Tasks:** 3
- **Files modified:** 6 (2 modified, 4 created)

## Accomplishments

- Added `CompileModels` — Gson DTOs `CompileParams { uri }` and `CompileResult { success, diagnostics, reason, message, file }` — mirroring `bbj-vscode/src/language/compile-command.ts`'s JSON shape field-for-field, reusing `org.eclipse.lsp4j.Diagnostic` rather than a hand-rolled range/position DTO.
- Added `CompileResultPresenter`, a plain-Java rendering seam with no IntelliJ import: `present()` switches on the result's `reason` (never `message` prose) to build a title, body, `error` flag and `offerSettings` flag; `serverUnavailable()` and `requestFailed()` cover the two client-side failure paths. An unrecognised or `null` reason still renders a visible error naming that value.
- Declared `@JsonRequest("bbj/compile")` on `BbjComposerServer` — the one interface `BbjLanguageServerFactory.getServerInterface()` proxies — so LSP4IJ's dynamic proxy actually carries the new request.
- Rewrote `BbjCompileAction.actionPerformed()`: an unconditional document save on the dispatch thread, then a `Task.Backgroundable("Compiling <file>…")` whose body asserts `assertIsNonDispatchThread()` before resolving the server and sending the request. A 45s bound on both waits (comfortably above the server's own 30s timeout) prevents a lost response from leaving the progress indicator up forever. Rendering happens back on the dispatch thread via `invokeLater`, building a balloon in the existing "BBj Language Server" notification group with an "Open Settings" action when the presenter's `offerSettings` flag is set, and logging failures to the language-server console.
- Added `CompileResultPresenterTest` (12 tests) and `BbjCompileActionSourceGuardTest` (8 tests) pinning the behavioural and wiring guarantees respectively. Whole IntelliJ module green at 312 tests, 0 failures.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end compile — save, dispatch off the EDT, show "Compiled <file>"** - `a5a423bb` (feat)
2. **Task 2: The whole result table — every reason, an unknown reason, and the two client-side failures** - `bd8e6ae8` (test)
3. **Task 3: Pin the off-EDT dispatch, the save order and the untouched gating, then prove the module green** - `549398b4` (test)

_Note: Task 1 is `type="tracer"`; its production code and its 3 initial tests landed in one `feat` commit rather than a separate failing-test commit preceding it — see "Process Note" below. The tracer feedback gate (interactive, `end-of-phase`, automated-only `<verify>`) was re-run after Task 1 and passed (compileJava + the 3-test targeted run), so expansion into Tasks 2-3 proceeded without a checkpoint._

## Files Created/Modified

- `bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileModels.java` - `CompileParams`/`CompileResult` Gson DTOs
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/compile/CompileResultPresenter.java` - plain-Java rendering seam, `Presentation` value type, `present`/`serverUnavailable`/`requestFailed`
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java` - `@JsonRequest("bbj/compile")` added alongside the existing `bbj/composer/*` requests
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjCompileAction.java` - real `actionPerformed`: save, `Task.Backgroundable`, off-EDT request dispatch, balloon + console rendering; `update()`/`getActionUpdateThread()` unchanged
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultPresenterTest.java` - 12 behavioural tests over the whole rendering table
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/BbjCompileActionSourceGuardTest.java` - 8 source-guard tests pinning off-EDT dispatch, save order, and unchanged wiring

## Decisions Made

See `key-decisions` in frontmatter. All decisions were within the discretion CONTEXT.md and RESEARCH.md left open (DTO field names beyond D-10's constraints, the request's naming home on `BbjComposerServer`, reuse of `lsp4j.Diagnostic`, and the client-side timeout value).

## Deviations from Plan

### Auto-fixed Issues

None — no Rule 1-3 auto-fixes were needed. The plan's action items matched the codebase exactly as CONTEXT.md, RESEARCH.md and 81-01's `compile-command.ts` described it; every field name, reason string and read_first file matched on the first read.

### Process Note (not a Rule 1-4 deviation)

**Task 1's test and implementation landed in one `feat` commit rather than a strict failing-test-then-implementation sequence**, matching 81-01's and 81-04's precedent: the plan's frontmatter `type` is `execute`, not `tdd`, so `tdd.md`'s strict plan-level RED/GREEN gate-sequence enforcement does not apply. The three Task 1 tests were written from the plan's `<behavior>` block before the presenter implementation was verified against them (compile-then-run showed all three passing on the first try, since the presenter was written to satisfy them). All 12 `CompileResultPresenterTest` tests and all 8 `BbjCompileActionSourceGuardTest` tests pass; no acceptance criterion or `<verify>` command was skipped.

---

**Total deviations:** 0 auto-fixed. **Impact:** None — plan executed as specified; the note above documents commit-granularity and tracer-gate handling only.

## Issues Encountered

None specific to this plan. The whole IntelliJ module (`./gradlew test`) ran green at 312 tests, 0 failures (up from 292 at the end of 81-04, plus 3 + 9 + 8 = 20 new tests from this plan's three tasks).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `PARITY-01` is now fully implemented across 81-01 (language-server request), 81-04 (IntelliJ setting) and 81-05 (this plan, the IntelliJ action). All three plans now have summaries, so the shared-requirement gate (`requirements.ready-ids`) can mark `PARITY-01` complete.
- The compile round trip (save → `bbj/compile` off-EDT → balloon + console) is implemented and behaviourally/wiring-tested; live-IDE verification of the balloons and the actual bbjcpl output (D7 above) is deferred to `/gsd-verify-work` UAT, per Phase 79/80 practice — no automated test can drive the Swing/notification layer without the IntelliJ platform test harness this repo deliberately does not carry (C-01).
- This is the last plan in Phase 81 (81-01 through 81-05, wave 2 of 2). With this plan's SUMMARY in place, the phase's three requirements (PARITY-01, PARITY-02, PARITY-03) all have completed plans; phase-level verification and UAT are the natural next steps.
- No blockers for any later phase. Phase 83 (BUILD-05) is noted in PROJECT.md as expecting LSP4IJ canary/source-guard coverage on this new `bbj/compile` surface — `BbjCompileActionSourceGuardTest` and the `BbjComposerServer` guard already narrow that coupling to the same few files, so Phase 83 has a clean starting point.

## Self-Check: PASSED

All six created/modified files verified present on disk with `[ -f ]`; all three task commit hashes (`a5a423bb`, `bd8e6ae8`, `549398b4`) verified present in `git log --oneline`. All acceptance criteria for all three tasks re-verified via grep/node ordering checks and `./gradlew` re-runs; the plan-level `<verification>` commands (`./gradlew compileJava`; targeted `CompileResultPresenterTest`, 12 tests; targeted `BbjCompileActionSourceGuardTest`; whole-module `./gradlew test`, 312 tests) all passed with 0 failures.

---
*Phase: 81-feature-parity-and-correctness*
*Completed: 2026-09-05*
