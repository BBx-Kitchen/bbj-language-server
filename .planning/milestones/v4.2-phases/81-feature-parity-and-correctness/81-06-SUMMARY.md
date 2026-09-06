---
phase: 81-feature-parity-and-correctness
plan: 06
subsystem: language-server
tags: [lsp, bbjcpl, compile, junit5, vitest, lsp4j]

# Dependency graph
requires:
  - phase: 81-feature-parity-and-correctness
    provides: "81-01's bbj/compile request/result JSON shape and reason vocabulary; 81-05's CompileModels DTO the JUnit boundary test deserializes into"
provides:
  - "lsp-position.ts — the one module defining LSP_MAX_UINTEGER/END_OF_LINE_CHARACTER (2147483647), imported by both whole-line-range emitting sites"
  - "A source guard (lsp-position.test.ts) failing the build if any character: literal in the language server ever exceeds the LSP uinteger maximum again"
  - "CompileResultJsonBoundaryTest — the first test on either side of the repo that parses a bbj/compile response envelope through LSP4IJ's own MessageJsonHandler/Gson, closing the cross-language boundary no test covered before"
affects: []

# Actuals (#2632)
actuals:
  tokens: 5060
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single named sentinel constant (lsp-position.ts) imported at every site that builds an LSP whole-line range, replacing two independent Number.MAX_SAFE_INTEGER literals"
    - "Source-guard test scanning every character: property under src/language/ (skip generated/), filtering whole-line comments before matching, to pin a numeric bound against silent drift"
    - "JVM-side boundary test built through the client's own deserializer (MessageJsonHandler + a MethodProvider callback) rather than a bare Gson instance, so LSP4IJ's registered type adapters are exercised exactly as they run in production"

key-files:
  created:
    - bbj-vscode/src/language/lsp-position.ts
    - bbj-vscode/test/lsp-position.test.ts
    - bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultJsonBoundaryTest.java
  modified:
    - bbj-vscode/src/language/bbj-cpl-parser.ts
    - bbj-vscode/src/language/bbj-document-validator.ts
    - bbj-vscode/test/compile-request.test.ts
    - bbj-vscode/test/cpl-parser.test.ts
    - bbj-vscode/test/cpl-integration.test.ts

key-decisions:
  - "END_OF_LINE_CHARACTER is set to the LSP uinteger maximum (2147483647), not the real line length — bbjcpl reports no column and the source text isn't in hand at either emitting site; both editors clamp an over-long end position to the actual line, so the rendered highlight is unaffected (CONTEXT-level flagged assumption 1, carried into the plan)."
  - "The JUnit boundary test's negative control asserts RuntimeException rather than com.google.gson.JsonParseException directly: LSP4IJ's MessageJsonHandler wraps the underlying Gson JsonSyntaxException in its own MessageIssueException before it reaches the caller. Confirmed empirically (a scratch debug run showed the actual thrown type and inspected MessageIssueException.getIssues()[0].getCause().getMessage()) rather than assumed from the plan's suggested fallback wording — the assertion checks that the oversized number appears in the exception's message or an issue's wrapped cause, not the exception's concrete class."
  - "The oversized literal 9007199254740991 is factored into a local String variable used once in the test method and interpolated into the envelope via String.formatted(), so the acceptance criterion 'the literal appears exactly once in the file' holds even though the value is used in both the envelope construction and the assertion."

requirements-completed: [PARITY-01]

coverage:
  - id: D1
    description: "Every LSP Position the language server emits (bbj/compile result and the diagnostics/relatedInformation path) is a non-negative integer no greater than 2147483647, the LSP uinteger maximum a JVM client's int-typed Position field can hold"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/lsp-position.test.ts#the uinteger maximum is 2^31 - 1"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/lsp-position.test.ts#the end-of-line sentinel is within the uinteger range"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/compile-request.test.ts#everyPositionInACompileErrorsResultFitsAJavaInt"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/cpl-parser.test.ts#a whole-line range ends at the LSP uinteger maximum, which a JVM client can read as an int"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both whole-line diagnostic ranges (bbj-cpl-parser.ts and bbj-document-validator.ts) are built from one named, documented constant in lsp-position.ts, not two independent literals that can drift apart again"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/lsp-position.test.ts#no language-server source builds a position character beyond the uinteger maximum"
        status: pass
      - kind: other
        ref: "grep -v comment-lines bbj-cpl-parser.ts | grep -c END_OF_LINE_CHARACTER == 2; same for bbj-document-validator.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "A compile-errors response envelope parses through LSP4J's own MessageJsonHandler/Gson into CompileModels.CompileResult with its diagnostics intact; the same envelope carrying the previous oversized value still fails, pinning the failure mode rather than merely fixing it"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultJsonBoundaryTest.java#aCompileErrorsResponseParsesThroughTheLsp4jGson"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultJsonBoundaryTest.java#theOversizedEndCharacterIsRejectedByTheSameParser"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultJsonBoundaryTest.java#everyPositionInAParsedResultFitsAJavaInt"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultJsonBoundaryTest.java#aSuccessResultWithNoDiagnosticsStillParses"
        status: pass
    human_judgment: false
  - id: D4
    description: "No Java main source changed — CompileResultPresenter, CompileModels, BbjCompileAction and BbjComposerServer stay exactly as 81-05 shipped them; the only Java file this plan adds is a test"
    requirement: PARITY-01
    verification:
      - kind: other
        ref: "git diff --stat -- bbj-intellij/src/main (empty output) at every task boundary"
        status: pass
    human_judgment: false
  - id: D5
    description: "The bbj/compile contract (method name, result field names, nine-value reason vocabulary) and D-08's no-publish rule are untouched — this is a value-range fix inside an existing contract"
    requirement: PARITY-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/compile-request.test.ts (all 12 pre-existing tests plus the new wire-shape test, 13 total, unchanged assertions on reason/success/message fields)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Live-IDE behavior: invoking Compile BBj File on a file with a syntax error shows the error balloon listing line:col message with the same text in the language-server console, and no MessageIssueException/'Message could not be parsed' anywhere; a valid file still compiles"
    verification: []
    human_judgment: true
    rationale: "Requires a running IntelliJ instance, a rebuilt plugin, and a live BBjCPL compiler — the same live-IDE surface every prior plan in this phase (79/80/81-05) has deferred to /gsd-verify-work UAT, since C-01 keeps the IntelliJ platform test harness out of this repo's test module."
  - id: D7
    description: "The whole-line highlight convention is preserved in VS Code: a bbjcpl diagnostic still spans from character 0 to end of line (clamped by the editor), so the squiggle is visually unchanged by the sentinel's new value"
    verification: []
    human_judgment: true
    rationale: "A rendered-squiggle visual comparison requires a running VS Code instance; the value-level guarantee (the range still starts at 0 and ends beyond the line, clamped by the editor) is proven by the unit tests in D1/D2, but the visual outcome itself is a human judgment call, per the plan's <verification> Human check section."

duration: 13min
completed: 2026-09-05
status: complete
---

# Phase 81 Plan 06: Bound the LSP Position Sentinel to the JVM int Range Summary

**Replaced `Number.MAX_SAFE_INTEGER` with a shared `END_OF_LINE_CHARACTER = 2147483647` constant at both whole-line-range emitting sites, and added the first cross-language test that parses a `bbj/compile` response through LSP4IJ's own Gson — closing the boundary that let a syntax-error compile crash the IntelliJ plugin with `MessageIssueException: Message could not be parsed`.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-09-05T16:02:00Z (approx, from STATE.md session marker at plan start)
- **Completed:** 2026-09-05T16:15:00Z
- **Tasks:** 3
- **Files modified:** 8 (5 modified, 3 created)

## Accomplishments

- Added `bbj-vscode/src/language/lsp-position.ts`, a leaf module exporting `LSP_MAX_UINTEGER` and `END_OF_LINE_CHARACTER` (both `2147483647`, the LSP `uinteger` maximum, which is exactly `Integer.MAX_VALUE`), with a doc comment explaining the JVM-client rationale.
- Both whole-line-range emitting sites — `bbj-cpl-parser.ts`'s `parseBbjcplOutput` and `bbj-document-validator.ts`'s `extractCyclicReferenceRelatedInfo` — now import and use that one constant instead of independently hardcoding `Number.MAX_SAFE_INTEGER`.
- Added a TypeScript wire-shape test (`compile-request.test.ts`) that JSON-round-trips a real `compile-errors` result and asserts every `Position` field fits a Java `int`, plus a source-guard test (`lsp-position.test.ts`) that scans every `character:` property under `src/language/` and fails the build if a literal ever exceeds the bound or is built from `Number.MAX_SAFE_INTEGER` again.
- Added `bbj-intellij/.../compile/CompileResultJsonBoundaryTest.java`, four JUnit 5 tests that parse captured `bbj/compile` response envelopes through LSP4IJ's own `MessageJsonHandler`/Gson: the exact previously-broken payload now deserializes into `CompileModels.CompileResult` with usable positions; the previous oversized value is pinned as still rejected (now via `MessageIssueException`, confirmed empirically rather than assumed); and the always-worked success path is confirmed unaffected.
- Both suites are green on every file this plan touched: the language-server's four affected test files (34 tests, 0 failures) and the IntelliJ module (316 tests, 0 failures, up from 312).

## Task Commits

Each task was committed atomically:

1. **Task 1: One path end to end — sentinel, parser, wire shape, LSP4J parse** - `03506428` (feat)
2. **Task 2: The second emitting site and a guard against drift** - `744993fb` (test)
3. **Task 3: Pin the failure mode, then prove both suites green** - `fc984238` (test)

**Plan metadata:** commit hash recorded below after this SUMMARY is written.

_Note: Task 1 is `type="tracer"`. Its production code and its two initial tests (the TypeScript wire-shape test and the first JUnit boundary test) landed in one `feat` commit rather than a separate failing-test commit preceding it, matching 81-01's and 81-05's precedent in this phase — the plan's frontmatter `type` is `execute`, not `tdd`, so `tdd.md`'s strict RED/GREEN gate-sequence enforcement does not apply at the plan level. The tracer feedback gate (interactive, `end-of-phase`, automated-only `<verify>`, no `gate="blocking-human"` on the task) was re-run after Task 1 — both automated `<verify>` commands (`npm test -- test/compile-request.test.ts test/cpl-parser.test.ts`, `./gradlew test --tests '...CompileResultJsonBoundaryTest'`) passed — so expansion into Tasks 2-3 proceeded without a checkpoint, per row 3 of checkpoints.md's tracer feedback gate precedence chain._

## Files Created/Modified

- `bbj-vscode/src/language/lsp-position.ts` - `LSP_MAX_UINTEGER`/`END_OF_LINE_CHARACTER` sentinel module
- `bbj-vscode/src/language/bbj-cpl-parser.ts` - imports and uses the shared sentinel for `range.end.character`
- `bbj-vscode/src/language/bbj-document-validator.ts` - `extractCyclicReferenceRelatedInfo` imports and uses the shared sentinel
- `bbj-vscode/test/compile-request.test.ts` - added `everyPositionInACompileErrorsResultFitsAJavaInt`, a JSON-round-tripped wire-shape assertion
- `bbj-vscode/test/cpl-parser.test.ts` - retargeted three end-character assertions and one test title to the shared constant; added an explicit-literal bound test
- `bbj-vscode/test/cpl-integration.test.ts` - `makeDiag` fabrication helper now uses the shared constant
- `bbj-vscode/test/lsp-position.test.ts` - the constant's own bounds plus a source guard over every `character:` literal under `src/language/`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/compile/CompileResultJsonBoundaryTest.java` - four JUnit 5 tests parsing response envelopes through LSP4IJ's own Gson (positive parse, negative control, position sanity, success-path regression)

## Decisions Made

See `key-decisions` in frontmatter. The one departure from the plan's literal wording (widening the negative control's expected exception type from `com.google.gson.JsonParseException` to `RuntimeException`) was explicitly anticipated by the plan itself ("if the thrown type turns out to be broader, widen the expectation to `RuntimeException`") and confirmed empirically with a throwaway debug test (deleted before committing) rather than guessed.

## Deviations from Plan

### Auto-fixed Issues

None — no Rule 1-3 auto-fixes were needed beyond the plan's own anticipated fallback (widening the negative-control exception type, which the plan pre-authorized and is documented above as a decision, not a deviation).

---

**Total deviations:** 0 auto-fixed. **Impact:** None — plan executed as specified, including its own documented fallback for the exact exception type LSP4IJ throws.

## Issues Encountered

**Whole-suite `npm test -- --maxWorkers=2` shows 14 pre-existing failures, unrelated to this plan.** All 14 are in `test/linking.test.ts`'s "Interop related tests" describe block (11 tests) and `test/functional/issue447-real-interop.test.ts`'s capability-detection test — the exact same failure set 81-01-SUMMARY.md documented under "Issues Encountered": the live `:5008` java-interop backend has exposed `getAllClassNames` since 2026-09-03 (an environment drift, todo filed the same day; see MEMORY.md "Interop backend getAllClassNames test drift"). None of the 14 failing tests are in `linking.test.ts` or `issue447-real-interop.test.ts`'s file list for this plan — this plan touches none of those files. The four files this plan does touch (`compile-request.test.ts`, `cpl-parser.test.ts`, `cpl-integration.test.ts`, `lsp-position.test.ts`) pass with 0 failures both individually and inside the whole-suite run. 1161 tests passed, 5 skipped.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-81-4 (the syntax-error compile crashing IntelliJ with `MessageIssueException: Message could not be parsed`) is fixed at the value level and pinned by tests on both sides of the JSON-RPC boundary. The live-IDE re-check (D6/D7 above) is deferred to `/gsd-verify-work` UAT with a plugin rebuilt from this branch, per the plan's `<verification>` Human check section and this phase's established C-01 practice (no IntelliJ platform test harness in this repo).
- No blockers for phase-level verification. `PARITY-01` was already marked complete by 81-01/81-04/81-05's shared-ID gate; this plan is a gap-closure fix on top of that requirement, not a new requirement.
- The pre-existing 14-test interop drift (documented above) remains open with a filed todo — unrelated to this plan and not newly introduced by it.

## Self-Check: PASSED

All eight created/modified files verified present on disk. All three task commit hashes (`03506428`, `744993fb`, `fc984238`) verified present in `git log --oneline`. All acceptance criteria for all three tasks re-verified via grep/test-count checks and targeted `npm test`/`./gradlew test` re-runs (34 vitest tests across the four affected files, 0 failures; 4 targeted JUnit tests, 0 failures; 316 whole-module JUnit tests, 0 failures). The plan-level `<verification>` commands were re-run: items 1-4 and 6 pass cleanly; item 5 (whole vitest suite) shows the pre-existing, already-documented 14-test interop drift unrelated to any file this plan touched (see Issues Encountered).

---
*Phase: 81-feature-parity-and-correctness*
*Completed: 2026-09-05*
