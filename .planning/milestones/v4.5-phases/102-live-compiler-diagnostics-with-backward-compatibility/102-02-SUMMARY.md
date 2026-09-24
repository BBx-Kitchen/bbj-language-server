---
phase: 102-live-compiler-diagnostics-with-backward-compatibility
plan: 02
subsystem: language-server
tags: [langium, diagnostics, vitest, coordinate-conversion, lsp, jsonrpc]

# Dependency graph
requires:
  - phase: 102-01
    provides: "BBjParserService, parseErrorToRange/parseErrorsToDiagnostics as production code with bounds already in place, and the interim DEFAULT_MAX_ERRORS constant this plan retires as the sole source of the cap"
provides:
  - "getMaxErrors() on bbj-document-validator.ts, mirroring the existing setMaxErrors()/getCompilerTrigger() getter-setter shape, added with no lines removed from the file"
  - "The diagnostics.maxErrors setting wired into the live parser path: the ParseError[] list is sliced to the cap before conversion, keeping the parser's own order by construction; a non-positive or non-finite pushed value falls back to the module default instead of blanking every diagnostic"
  - "A restored clamp in parseErrorToRange: a collapsed or inverted character range (end at or before start) or a start character of zero now spans the whole clamped line, matching D-11 — a real gap the fixture suite exposed and this plan fixed in the service, not in the test"
  - "test/parser-coordinate-converter.test.ts: a 14-test, sub-second, no-Langium, no-socket fixture suite pinning all four PSRV-05 document shapes against coordinates measured live against the real endpoint, plus every out-of-range/collapsed-range shape and a pure-function no-shared-state assertion"
affects: [102-03-live-endpoint-and-docs, 103-diagnostic-reconciliation, 104-conformance-measurement]

# Actuals (#2632)
actuals:
  tokens: 6355
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Getter added beside an existing setter with a byte-identical diff elsewhere in the file (git diff shows only added lines) — mirrors getCompilerTrigger()'s own shape"
    - "Cap enforced by slicing the DTO list before conversion, not the converted Diagnostic[] — keeps ordering trivially correct and avoids converting records that will never be shown"
    - "Pure-function coordinate converter tested with hand-written typed DTO fixtures and no Langium services, document build, timers, or socket — the phase's fastest feedback loop"

key-files:
  created:
    - bbj-vscode/test/parser-coordinate-converter.test.ts
  modified:
    - bbj-vscode/src/language/bbj-document-validator.ts
    - bbj-vscode/src/language/bbj-parser-service.ts
    - bbj-vscode/test/bbj-parser-service.test.ts

key-decisions:
  - "getMaxErrors() is a two-line getter beside setMaxErrors(), written in the same shape as getCompilerTrigger() directly below it; applyDiagnosticHierarchy() and its own Rule 3 cap are untouched"
  - "The cap is applied by BBjParserService slicing errors.slice(0, cap) before mapping to Diagnostic[], not by extending applyDiagnosticHierarchy() to recognize the new source — keeps the two cap paths independent, per the plan's own two-option analysis"
  - "parseErrorToRange's collapsed/inverted-range clamp (present in the original research sketch but dropped from plan 01's production shape) is restored: start character 0 whenever startCharacter<=0 OR endCharacter<=startCharacter, else startCharacter-1 — fixed in the service per the plan's explicit instruction, not papered over in a fixture"
  - "Fixture line counts are derived by splitting each literal on the newline character (text.split('\\n').length), matching vscode-languageserver-textdocument's own line-offset counting (including the phantom trailing line a trailing newline produces), so a later fixture edit cannot silently invalidate its own expectation"

patterns-established:
  - "A pure-function DTO-to-Range/Diagnostic converter gets its own no-Langium, no-socket Vitest suite, separate from the document-builder integration suite — established for this phase's converter, no prior codebase analog"

requirements-completed: [PSRV-05]

coverage:
  - id: D1
    description: "The diagnostics.maxErrors setting caps the live parser's own errors per document, in the parser's own order, the same way it already caps Langium's own parse-error tier"
    verification:
      - kind: unit
        ref: "test/bbj-parser-service.test.ts (6 tests under 'the diagnostics setting caps the live errors, per document, in scripted order')"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each of PSRV-05's four document shapes (colon continuation, user line numbers, CRLF, no trailing newline) converts BBj's one-based editor coordinates to the correct zero-based LSP range, pinned against coordinates measured live against the real endpoint"
    requirement: PSRV-05
    verification:
      - kind: unit
        ref: "test/parser-coordinate-converter.test.ts (describe 'parseErrorToRange: the four document shapes a live BBj parser reports against')"
        status: pass
    human_judgment: false
  - id: D3
    description: "An out-of-range line, an inverted range, and a zero start character each produce a shown, bounded diagnostic — clamped, never dropped — and no produced range carries a negative value or exceeds the LSP unsigned-integer maximum"
    requirement: PSRV-05
    verification:
      - kind: unit
        ref: "test/parser-coordinate-converter.test.ts (describe 'parseErrorToRange: an out-of-range or collapsed input is clamped, never dropped')"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-09-22
status: complete
---

# Phase 102 Plan 02: Coordinate Converter Fixtures And Diagnostics Cap Summary

**`getMaxErrors()` wires the one `diagnostics.maxErrors` setting into the live parser path, and a 14-test fixture suite pins every PSRV-05 document shape against live-measured coordinates while exposing and fixing a real collapsed-range clamp bug in the converter.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-22T14:50:00Z
- **Completed:** 2026-09-22T15:03:00Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- `getMaxErrors()` added beside `bbj-document-validator.ts`'s existing `setMaxErrors()`, in the exact two-line shape of the `getCompilerTrigger()` getter directly below it — the diff is added-lines-only, `applyDiagnosticHierarchy()` untouched.
- `bbj-parser-service.ts`'s `requestLiveParse` now calls `getMaxErrors()` instead of the plan-01 interim `DEFAULT_MAX_ERRORS` constant; `parseErrorsToDiagnostics` slices the error-record list to that cap *before* converting, so a malformed non-positive pushed value falls back to the module default instead of blanking every live diagnostic.
- Six new tests in `bbj-parser-service.test.ts` prove the cap end-to-end through the real document builder: the default of 20, a pushed value of 3, a shorter-than-cap list left unpadded, the cap applied per document (two 25-error documents each end up with 20, not 20 between them), a non-positive pushed cap falling back to the default, and an empty scripted list producing zero diagnostics.
- A new, sub-second, 14-test `test/parser-coordinate-converter.test.ts` pins `parseErrorToRange`/`parseErrorsToDiagnostics` against hand-written, typed `ParseError` fixtures for all four PSRV-05 shapes (colon continuation anchoring to the joined statement's first physical line, user line numbers, byte-identical CRLF vs LF ranges, and a final line with no trailing newline), every out-of-range/collapsed-range shape (a line far beyond the document, a zero/negative line, an inverted or equal-bounds character range, a zero start character), an LSP-bounds assertion, and a pure-function no-shared-state assertion.
- That fixture suite exposed a real defect: `parseErrorToRange` clamped a zero/negative start character to 0 but did **not** clamp a collapsed or inverted range (`endCharacter <= startCharacter` with a positive `startCharacter`) to the whole line — it produced a zero-width marker instead. Fixed in the service per the plan's own instruction that a fixture is never weakened to match a wrong result.

## Task Commits

Each task was committed atomically:

1. **Task 1: One setting caps both kinds of syntax error** - `077d651f` (feat)
2. **Task 2: Every document shape lands on the right line** - `e19f8d79` (test)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `bbj-vscode/src/language/bbj-document-validator.ts` - `getMaxErrors()` getter added beside `setMaxErrors()`; no other line changed
- `bbj-vscode/src/language/bbj-parser-service.ts` - `getMaxErrors()` imported and used as the live-path cap; `parseErrorsToDiagnostics` validates the cap argument; `parseErrorToRange` restores the collapsed/inverted-range whole-line clamp
- `bbj-vscode/test/bbj-parser-service.test.ts` - 6 new tests under "the diagnostics setting caps the live errors, per document, in scripted order"; `manyErrors()` fixture helper; `afterEach` now also resets `setMaxErrors(20)`
- `bbj-vscode/test/parser-coordinate-converter.test.ts` - new: 14 tests across three `describe` blocks (the four PSRV-05 shapes; out-of-range/collapsed clamping; `parseErrorsToDiagnostics` count/order/message pass-through)

## Decisions Made

- The cap is enforced by slicing the DTO list (`errors.slice(0, cap)`) before conversion, not by extending `applyDiagnosticHierarchy`'s Rule 3 to recognize the new source — keeps the two independent cap mechanisms (Langium's own parse-error tier vs. the live parser's own errors) from sharing logic that would otherwise need to distinguish sources.
- Fixture line counts are derived via `text.split('\n').length` rather than hard-coded, which matches `vscode-languageserver-textdocument`'s own line-offset counting exactly (including the phantom trailing line a trailing newline produces), so the fixtures stay self-consistent if edited later.
- The "reported line far beyond the document" and "zero/negative line" fixture deliberately has no trailing newline, so its own derived line count is exactly 4 and the "clamped to the last line, zero-based 3" assertion has an unambiguous target.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `parseErrorToRange` did not clamp a collapsed or inverted character range to the whole line**
- **Found during:** Task 2, writing the "an end character at or below the start character" and "a start character of zero" fixtures
- **Issue:** Plan 01's shipped `parseErrorToRange` only clamped a start character `<= 0` to `0`; it did not check `endCharacter <= startCharacter`, so an inverted range (e.g. `startCharacter: 8, endCharacter: 3`) produced `character: 7` instead of spanning the whole clamped line from `0`, contradicting D-11's clamp-never-drop policy for a collapsed range.
- **Fix:** Restored the whole-line clamp for both conditions (`error.startCharacter <= 0 || error.endCharacter <= error.startCharacter`) in `parseErrorToRange`, matching the research sketch this file's own doc comments already described.
- **Files modified:** `bbj-vscode/src/language/bbj-parser-service.ts`
- **Verification:** `parser-coordinate-converter.test.ts`'s "an end character at or below the start character..." and "a start character of zero..." tests pass; full targeted suite (`test/parser-coordinate-converter.test.ts test/bbj-parser-service.test.ts`) green (39 tests); `test/validation.test.ts test/example-files.test.ts` unaffected (44 tests, all pass)
- **Committed in:** `e19f8d79` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix is exactly the scope the plan itself carved out for Task 2 ("where a fixture shows the converter producing a wrong range, the fix belongs here"); no scope creep, no fixture weakened to match a wrong result.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `getMaxErrors()`, the wired cap, and the pinned coordinate converter are complete and tested; the two remaining DEFAULT_MAX_ERRORS-shaped concerns from plan 01's Known Stubs are now resolved (one source of truth for the cap).
- No blockers. Ready for `102-03-PLAN.md` (the gated live endpoint test, documentation, hand UAT, and the phase's branch/PR per the plan's Discretion default ordering).

## Self-Check: PASSED

Both created/modified test files and the modified production files were verified present on
disk; both task commit hashes (`077d651f`, `e19f8d79`) were verified present in git history via
`git log --oneline -3`. All four plan-level `<verification>` commands were re-run after the
second task commit and passed: `parser-coordinate-converter.test.ts test/bbj-parser-service.test.ts`
(39 tests), `test/validation.test.ts test/example-files.test.ts` (44 tests), `npx tsc -b
tsconfig.json` (clean), `npm run lint` (clean).

---
*Phase: 102-live-compiler-diagnostics-with-backward-compatibility*
*Completed: 2026-09-22*
