---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 03
subsystem: composer-discoverability
tags: [cvs, composer, lsp, vscode, builtin-functions]

# Dependency graph
requires:
  - phase: 87-shared-composer-command-layer-intellij-setopts-dialog
    provides: the vscode-free catalog+compose+decode+preview module shape (setopts-catalog.ts) this plan's cvs-composer.ts mirrors
provides:
  - CVS(str, conversion_flags, chars?, ERR?!) — the widened builtin signature in both functions.ts and functions.bbl, so a composed chars argument never trips the arity check
  - cvs-composer.ts — CVS_BITS catalog, encodeCvsMask/cvsBitsSet/charsApplies, composeCvsCall, parseCvsLiteralSum, findCvsCalls/findCvsCallAt/parseCvsCallOnLine, decodeCvsCall, describeCvsMask, cvsPreview — zero vscode dependency, ready for both the VS Code UI (plan 89-05) and the language server (plan 89-07)
affects: [89-05-vs-code-cvs-composer-ui, 89-07-intellij-cvs-composer-command-layer, 89-09-additional-composer-kinds]

# Actuals (#2632)
actuals:
  tokens: 9700
  tasks: 2
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A composer domain module (catalog + encode/decode + compose + call-location + edit-in-place decode + single preview function) with zero vscode import, following setopts-catalog.ts/addwindow-composer.ts/msgbox-composer.ts's established shape"
    - "Call location reuses scanArgs/trimmedRange from addwindow-composer.ts and field validation reuses validateStringField from msgbox-composer.ts, rather than re-implementing either"

key-files:
  created:
    - bbj-vscode/src/cvs-composer.ts
    - bbj-vscode/test/cvs-composer.test.ts
  modified:
    - bbj-vscode/src/language/lib/functions.ts
    - bbj-vscode/src/language/lib/functions.bbl
    - bbj-vscode/test/validation-function-calls.test.ts

key-decisions:
  - "CVS_BITS labels/charsCustomizable/detail exactly as specified in the plan: bit 128 carries detail 'BBj-specific (not in PRO/5)'; charsCustomizable is true for 1, 2, 16, 32, 128 and false for 4, 8, 64."
  - "CVS_CHARS_TOOLTIP names both BBj 19.0 (single replacement character for 1, 2, 16, 32, 128) and BBj 19.10 (multiple characters for 1, 2, 128) gates, and states the composer never checks the target BBj version itself — chars is never length-counted or trimmed anywhere in this module."
  - "decodeCvsCall's three not-editable reasons (missing-mask, non-literal-mask, unknown-bits) all still return found: true and the call's edit span, so a caller can report exactly why a given CVS() call was left alone rather than silently doing nothing."

patterns-established:
  - "parseCvsLiteralSum recognizes only a +-sum of bare integer literals (no named constants, no java-interop) as the boundary between 'safe to decode and rewrite in place' and 'leave the call untouched' — same closed-recognizer shape as MSGBOX's parseMsgboxOptionsSum (plan 89-02) and SETOPTS-in-code's traceOptsChain (phase 88)."

requirements-completed: [DISC-03]

coverage:
  - id: D1
    description: "CVS(str, mask, chars) — including a chars argument — produces no builtin-call arity or type diagnostic in both functions.ts and functions.bbl; a fourth positional argument is still flagged as too many"
    requirement: "DISC-03"
    verification:
      - kind: unit
        ref: "test/validation-function-calls.test.ts#flags/accepts %j (#649 CVS cases) and composeCvsCall output validates cleanly (#649)"
        status: pass
      - kind: unit
        ref: "test/builtin-functions-library.test.ts#functions.bbl parses without lexer or parser errors"
        status: pass
    human_judgment: false
  - id: D2
    description: "CVS_BITS catalog lists exactly the eight documented operations ascending, with the correct charsCustomizable set and a tooltip naming both BBj 19.0/19.10 gates; composeCvsCall never measures, trims or version-gates chars"
    requirement: "DISC-03"
    verification:
      - kind: unit
        ref: "test/cvs-composer.test.ts#CVS() composer logic (#649) — catalog/tooltip/encode/compose tests"
        status: pass
    human_judgment: false
  - id: D3
    description: "parseCvsLiteralSum recognizes only integer-literal +-sums; decodeCvsCall marks a non-literal, missing or undocumented-bit mask not-editable with a named reason, and a literal-sum mask within 1..128 editable with the string/chars/trailing arguments preserved verbatim; cvsPreview composes the same call, discloses charsEnabled per D-12 and validates the str/chars fields"
    requirement: "DISC-03"
    verification:
      - kind: unit
        ref: "test/cvs-composer.test.ts#CVS() composer logic (#649) — literal-sum, call-location, decode and preview tests"
        status: pass
    human_judgment: false

duration: 17min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 03: CVS() Composer Domain Summary

**A vscode-free `cvs-composer.ts` module (catalog, compose, call-location, edit-in-place decode and single preview function) plus a widened `CVS(str, mask, chars?, ERR?!)` signature in both hand-synced lib files, so every call the composer writes — including one carrying the new `chars` argument — passes the language server's own builtin-call arity check.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-09-12T07:51:00Z (approx.)
- **Completed:** 2026-09-12T08:08:00Z (approx.)
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- Widened `CVS()` in both `functions.ts` and `functions.bbl` to `CVS(str:string, conversion_flags:int, chars?:string, ERR?!:lineref): string`, with an identical doc block in both files: the syntax line reads `CVS(string,int{,chars}{,ERR=lineref})`, a new `128-Strip all spaces (BBj-specific)` row was added to the operation table, and a sentence names the `chars` version gates (BBj 19.0 for one replacement character on 1/2/16/32/128, BBj 19.10 for multiple characters on 1/2/128).
- `cvs-composer.ts`: `CVS_BITS` — the eight documented operation bits (1, 2, 4, 8, 16, 32, 64, 128) in ascending order with labels, bit 128's `detail: 'BBj-specific (not in PRO/5)'`, and `charsCustomizable: true` for exactly 1, 2, 16, 32, 128; `CVS_KNOWN_MASK = 255`; `CVS_CHARS_TOOLTIP` naming both version gates and the no-version-check policy; `encodeCvsMask`, `cvsBitsSet`, `charsApplies`; `composeCvsCall`, which never measures, trims or version-gates `chars`.
- `parseCvsLiteralSum` recognizes only a `+`-sum of bare integer literals (no named constants, no java-interop) — the sole basis for "safe to decode and rewrite in place."
- `findCvsCalls`/`findCvsCallAt`/`parseCvsCallOnLine` locate `CVS(...)` calls case-insensitively via an identifier-boundary regex (`(?<![A-Za-z0-9_.])cvs\s*\(`) reusing `scanArgs`/`trimmedRange` from `addwindow-composer.ts`, so longer names (`MYCVS`) and method calls (`obj!.cvs`) are correctly excluded.
- `decodeCvsCall` returns an editable verdict (preserving `str`, `chars` and any trailing `ERR=`/other arguments verbatim) only for a literal-sum mask within the documented bits; a missing mask, non-literal mask or undocumented bits each get their own named `CvsNotEditableReason` via `CVS_NOT_EDITABLE_REASON_TEXT`, with `found: true` and the call's `edit` span still reported.
- `describeCvsMask`/`cvsPreview` compose the single preview payload every UI will call: `charsEnabled` reflects whether any checked bit is chars-customizable (D-12), the summary lists labels in ascending bit order noting "applied in ascending order" for two or more bits, and `str`/`chars` are validated via `validateStringField` reused from `msgbox-composer.ts`.

## Task Commits

Each task followed its own RED/GREEN cycle (`tdd="true"`):

1. **Task 1 (`type="tracer"`): A composed CVS(str, mask, chars) call that the language server accepts — signature widened in both lib files**
   - `f38d8f20` test(89-03): add failing test for CVS() composer signature and chars argument
   - `7ac1444f` feat(89-03): widen CVS() signature and add cvs-composer catalog/compose module
2. **Task 2: CVS call location, literal-sum edit-in-place verdict and the single preview function**
   - `2f0cd245` test(89-03): add failing test for CVS() call location, decode and preview
   - `0564d9f0` feat(89-03): add CVS() call location, edit-in-place decode and preview

_Task 1 is `type="tracer"`; its own `<verify>` (targeted tests + build) was re-run end-to-end after the commit per the auto-mode tracer feedback gate before Task 2 began, and passed._

## Files Created/Modified
- `bbj-vscode/src/cvs-composer.ts` - CVS_BITS catalog, encode/decode helpers, composeCvsCall, parseCvsLiteralSum, findCvsCalls/findCvsCallAt/parseCvsCallOnLine, decodeCvsCall, describeCvsMask, cvsPreview
- `bbj-vscode/src/language/lib/functions.ts` - Widened CVS() signature and doc block (bit 128, chars note)
- `bbj-vscode/src/language/lib/functions.bbl` - Identical widened CVS() signature and doc block (hand-synced mirror)
- `bbj-vscode/test/cvs-composer.test.ts` - New file: catalog/compose/literal-sum/call-location/decode/preview behavior tests
- `bbj-vscode/test/validation-function-calls.test.ts` - New CVS() cases in the flagged/unflagged `test.each` lists plus a `composeCvsCall`-output validation test

## Decisions Made
- Bit labels, `charsCustomizable` set, `CVS_KNOWN_MASK` and `CVS_CHARS_TOOLTIP` wording exactly as specified in the plan's frontmatter `key-decisions`.
- `decodeCvsCall`'s three not-editable reasons all carry `found: true` plus the call's `edit` span (not a bare `false`), so a caller can report exactly why a call was left alone.

## Deviations from Plan

None - plan executed exactly as written. One test-authoring mistake was caught and self-corrected during Task 2's RED/GREEN cycle (not a deviation from the plan): the `decodeCvsCall` call-span test's own `callEnd` expectation was off by one character (18 instead of the correct 17); it was corrected to match `scanArgs`'s documented "index just past the closing `)`" semantics before the GREEN commit, and both the module's committed test and implementation are internally consistent.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `cvs-composer.ts` is a complete, vscode-free CVS() composer domain (catalog, compose, call-location, edit-in-place decode, single preview function), ready for:
  - Plan 89-05 to build the VS Code webview/lightbulb UI on top of `cvsPreview`/`decodeCvsCall`.
  - Plan 89-07 to expose the same module through a `bbj/composer/cvs/*` shared command layer for IntelliJ, mirroring the SETOPTS/MSGBOX precedent.
  - Plan 89-09 to add a CVS() cue to the shared composer CodeLens (plan 89-01's `findAddWindowCalls`-shaped detector), now that `findCvsCalls` exists in the same shape.
- No blockers.

---
*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Completed: 2026-09-12*

## Self-Check: PASSED

Both created files verified present on disk (`bbj-vscode/src/cvs-composer.ts`,
`bbj-vscode/test/cvs-composer.test.ts`). All 4 commit hashes (`f38d8f20`, `7ac1444f`,
`2f0cd245`, `0564d9f0`) verified present in `git log`. Plan-level `<verification>` steps
re-run and passing: targeted tests (71/71, including `functions.bbl parses without lexer or
parser errors`), `npm run build` (exit 0), `npm run lint` (exit 0), whole-suite gate at
`numFailedTests: 0` (1607 passed, 29 skipped under `RUN_BBJ_TESTS=0`, `--maxWorkers=2`), and
the register check (no plan/decision/threat ids in the diff `f38d8f20~1..HEAD`).
