---
phase: 103-one-set-of-errors-diagnostic-reconciliation
plan: 03
subsystem: diagnostics
tags: [langium, typescript, diagnostics, vitest]

requires:
  - phase: 103-one-set-of-errors-diagnostic-reconciliation
    provides: >
      Plan 01's bbj-diagnostic-reconciliation.ts (reconcileWithVerdict, applyVerdictCarryOver,
      the per-document verdict state accessors, the remembered pre-hierarchy Langium diagnostics
      list) and plan 02's forgetVerdict()/clearAllVerdictStates() lifecycle wiring
provides:
  - BBjDocumentValidator.validateDocument() re-applies the last verdict's carry-over to every
    freshly produced diagnostics list before the hierarchy runs, so a syntax complaint the last
    verdict downgraded stays a Warning on every keystroke until the next verdict, matched by
    message and current line text
  - An explicit BBjDocumentValidator constructor that subscribes to the shared TextDocuments'
    close event and forgets a closed document's verdict state, since a LangiumDocument survives
    editor close
  - The line-break validator's three diagnostics (start-new-line, end-with-line-break, the
    missing-terminator message) now carry LINE_BREAK_DIAGNOSTIC_CODE in data.code, letting
    reconciliation recognize them without matching on message text
  - An end-to-end test suite proving the whole reconciliation path against real validator output:
    the no-verdict baseline, carry-over across a keystroke/line-shift/edit/unseen-complaint/
    trigger-off, close-clears-state, real line-break tagging, a real BBj-diagnostic replacement
    on a shared line, and a linking diagnostic hidden by a parse error becoming visible again
affects: [103-04, 103-05]

actuals:
  tokens: 5051
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Empirically-derived syntax-error fixtures: rather than hand-guessing Chevrotain's error
       recovery text/line attribution, each fixture's actual diagnostic (message, line, and how
       far recovery continues past it) was confirmed by running the real validator before being
       asserted on, since an unclosed-paren statement's own recovery behavior differs sharply
       depending on whether it is the document's last statement or has more text after it"
    - "Uri-keyed carry-over state read at validateDocument() time, written at debounce time,
       matching the module-scoped compilerTrigger/maxErrorsDisplayed pattern this file already
       used for exactly this kind of no-DI-seam cross-service state"

key-files:
  created:
    - bbj-vscode/test/bbj-document-validator.test.ts
  modified:
    - bbj-vscode/src/language/bbj-document-validator.ts
    - bbj-vscode/src/language/validations/line-break-validation.ts

key-decisions:
  - "The carry-over read in validateDocument() is gated on the compiler trigger not being 'off'
     before even checking for a stored verdict state -- so a document that never had one, and a
     document validated while the trigger is off, both reach the hierarchy with the exact same
     list Langium itself produced, with no branch that could accidentally treat 'no state' and
     'trigger off' differently"
  - "The close listener is registered in BBjDocumentValidator's own constructor, before any
     document is ever validated, rather than lazily on first use -- there is no code path where a
     document could be validated before the listener exists"
  - "Test fixtures that need two independent, distinguishable syntax errors on separate lines use
     the dangling-binary-operator pattern (`x = 1 +`) resynchronized by an intervening comment
     line, not two unclosed-paren statements -- an unclosed parenthesis that is not the document's
     last statement produces exactly one 'Expecting end of file' diagnostic and silently swallows
     every following line as unparsed trailing text, which would have made a second, independent
     error unreachable from that shape"

requirements-completed: []  # PSRV-06/PSRV-07 close with phase verification once plans 04/05 also finish, per this plan's own shell rules

coverage:
  - id: D1
    description: "A syntax complaint the last verdict downgraded stays a Warning on the immediate next validation, survives a line shift (matched by message + line text, not line number), reverts to an Error when its own line's text changes, and a genuinely new unseen complaint on another line is an Error while the seen one stays a Warning"
    requirement: PSRV-07
    verification:
      - kind: unit
        ref: "test/bbj-document-validator.test.ts#BBjDocumentValidator: carry-over between verdicts (5 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "With no verdict state, the compiler trigger off, or a closed-then-reopened document, validation is byte-for-byte what it was before this phase"
    requirement: PSRV-07
    verification:
      - kind: unit
        ref: "test/bbj-document-validator.test.ts#BBjDocumentValidator: no verdict state; #BBjDocumentValidator: carry-over between verdicts > with the compiler trigger off...; #BBjDocumentValidator: verdict state is cleared on document close"
        status: pass
    human_judgment: false
  - id: D3
    description: "The line-break validator's three diagnostics carry LINE_BREAK_DIAGNOSTIC_CODE with their messages, severities and ranges unchanged, proven against the pinned IF/FI fixture and the full line-break/regression suite"
    requirement: PSRV-07
    verification:
      - kind: unit
        ref: "test/bbj-document-validator.test.ts#a verdict on real validator output > line-break diagnostics carry the line-break code..."
      - kind: integration
        ref: "test/line-break-validation.test.ts, test/line-break-walk-termination.test.ts, test/line-break-single-line-if.test.ts, test/line-break-walk-timeout.test.ts, test/conformance-regressions.test.ts, test/example-files.test.ts (144 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "On real validator output, an accepted verdict downgrades both line-break complaints to Warnings with source bbj and leaves no syntax Error; a BBj diagnostic spanning the shared line replaces both line-break complaints there with BBj's own diagnostic; a linking diagnostic Rule 1 hides because of a parse error is visible once a verdict exists"
    requirement: PSRV-06
    verification:
      - kind: unit
        ref: "test/bbj-document-validator.test.ts#a verdict on real validator output (4 tests)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-23
status: complete
---

# Phase 103 Plan 03: Verdict Carry-Over, Close Lifecycle, and Line-Break Tagging Summary

**BBjDocumentValidator now carries a verdict's downgrade decisions across every keystroke until the next verdict, forgets them when a document closes, and the line-break validator's three diagnostics carry a `data.code` so reconciliation recognizes them without matching message text — proven end to end against real validator output, including a BBj diagnostic replacing a line-break complaint and a linking diagnostic reappearing once a parse error is downgraded.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-23T06:41:00Z (approximate — first tool call in this session)
- **Completed:** 2026-09-23T07:06:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- `BBjDocumentValidator.validateDocument()` now reads the document's stored verdict state (when
  the compiler trigger is not `'off'`) and re-applies its carry-over decisions to the freshly
  produced Langium diagnostics list before the hierarchy runs — a syntax complaint the last
  verdict downgraded stays a Warning on every keystroke, matched by message and the flagged
  line's current text, so an edit above it (a line shift) doesn't break the match while an edit
  to the line itself does
- An explicit `BBjDocumentValidator` constructor subscribes to
  `services.shared.workspace.TextDocuments.onDidClose` and forgets the closing document's verdict
  state — the same pattern Langium's own semantic-token provider uses for per-document state,
  needed because a `LangiumDocument` survives editor close
- `line-break-validation.ts`'s three `accept('error', ...)` calls now carry
  `data: { code: LINE_BREAK_DIAGNOSTIC_CODE }`, imported from the reconciliation module, with
  every message, severity and range left untouched — confirmed unchanged against the phase-102
  branch tip and against the full line-break/regression test suite (144 tests)
- A new `test/bbj-document-validator.test.ts` (11 tests) proves the whole path: the no-verdict
  baseline exactly equals `applyDiagnosticHierarchy` over the remembered pre-hierarchy list; the
  carry-over behavior across a keystroke, a line shift, an edited line, an unseen complaint and a
  trigger-off override; a closed document forgetting its verdict; a real `IF`/`FI` fixture's two
  line-break diagnostics carrying the new code; those two diagnostics downgrading to Warnings
  with source `bbj` and leaving no syntax Error once a verdict exists; a synthetic BBj diagnostic
  on the shared line replacing both of them; and a linking diagnostic Rule 1 hides today becoming
  visible once a verdict downgrades the parse error suppressing it

## Task Commits

Each task was committed as its own RED/GREEN pair per its `tdd="true"` attribute:

1. **Task 1 RED: failing tests for verdict carry-over and close-clears-state** — `d27cdf58` (test)
1. **Task 1 GREEN: carry a seen verdict complaint forward and forget it on document close** — `bc043559` (feat)
2. **Task 2 RED: failing tests for line-break tagging on real validator output** — `0809428e` (test)
2. **Task 2 GREEN: tag line-break diagnostics with a distinguishing code** — `5bb49f47` (feat)

**Plan metadata:** committed alongside this summary.

## Files Created/Modified

- `bbj-vscode/test/bbj-document-validator.test.ts` — new: 11 tests across four `describe` blocks
  (no verdict state, carry-over between verdicts, close-clears-state, a verdict on real validator
  output), all against the real `BBjDocumentValidator`/`checkLineBreaks` pipeline via
  `validationHelper`, no mocking
- `bbj-vscode/src/language/bbj-document-validator.ts` — explicit constructor with the
  `onDidClose` subscription; `validateDocument()` reads and applies verdict carry-over before the
  hierarchy runs
- `bbj-vscode/src/language/validations/line-break-validation.ts` — `data: { code:
  LINE_BREAK_DIAGNOSTIC_CODE }` added to all three `accept('error', ...)` calls

## Decisions Made

- The carry-over read is gated on `getCompilerTrigger() !== 'off'` before even looking up a
  stored verdict state, so "no state" and "trigger off" both leave `diagnostics` completely
  untouched through one shared code path rather than two separately-reasoned branches
- The close listener lives in the constructor (registered before any document is validated), not
  lazily on first use — there is no window where a document could validate before the listener
  exists
- Two-independent-syntax-error test fixtures use the dangling-binary-operator pattern (`x = 1 +`,
  resynchronized by an intervening comment line) rather than two unclosed-paren statements: an
  unclosed paren that is not the document's last statement collapses into a single "Expecting end
  of file" diagnostic and swallows everything after it as unparsed trailing text, which would
  have made a second, independently-attributable error impossible to construct from that shape —
  confirmed by running the real validator against several candidate fixtures before committing to
  one, per this plan's own instruction to assert fixture preconditions before relying on them

## Deviations from Plan

None — plan executed exactly as written, including the TDD RED/GREEN split for both tasks.

## Issues Encountered

**Whole-suite regression check (not part of this plan's own `<verification>` block, run as extra
diligence per project convention):** `npx vitest run --maxWorkers=2` reports `numFailedTests: 11`,
all in `test/linking.test.ts`'s pre-existing interop-backend-drift group — matching the
documented local baseline exactly (STATE.md / `103-01-SUMMARY.md` / `103-02-SUMMARY.md`: "the
documented local baseline of 12 should now be 11"). A second test file reports a `beforeAll`-level
"Failed Suite" (not counted in `numFailedTests`), consistent with the pre-existing
`installed-extension-e2e.test.ts` packaging-staleness gap documented in `103-01-SUMMARY.md` (that
test spawns the *installed* extension bundle, not the current source tree). No file this plan
modified is reachable from either failure group. Not investigated further — out of scope per the
deviation rules' scope boundary (pre-existing/unrelated-file failures are logged, not fixed).

**Chevrotain error-recovery shape for two-line fixtures:** constructing the "second, unseen
syntax error" test required discovering, by running the real validator against several candidate
fixtures, that an unclosed-paren statement that is not a document's last statement produces one
"Expecting end of file" diagnostic covering everything after it, rather than a second independent
diagnostic on a later line. Resolved by using the dangling-binary-operator pattern instead (see
Decisions Made) — no source-code change, test-authoring only.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `applyVerdictCarryOver`, the `onDidClose` lifecycle hook, and the tagged line-break diagnostics
  are all proven against real validator output, ready for plan 04 (the conformance run) and plan
  05 (the live check and hand UAT in both IDEs)
- No blockers. PSRV-06/PSRV-07 remain `Pending` in `REQUIREMENTS.md` — correctly, since plans
  04-05 also declare them and have not yet produced a summary; `requirements.ready-ids` will mark
  them `Complete` only once the last declaring plan finishes

---
*Phase: 103-one-set-of-errors-diagnostic-reconciliation*
*Completed: 2026-09-23*

## Self-Check: PASSED

All 3 created/modified files confirmed present on disk with the expected changes; all 4 task
commits (d27cdf58, bc043559, 0809428e, 5bb49f47) confirmed in `git log`. Re-ran this plan's
`<verification>` block: `npx vitest run test/bbj-document-validator.test.ts
test/bbj-diagnostic-reconciliation.test.ts test/line-break-validation.test.ts
test/validation.test.ts --maxWorkers=2` — 184/184 passed; `npx tsc -b tsconfig.json` and
`npm run lint` — both clean. All `<acceptance_criteria>` for tasks 1-2 re-verified passing,
including the literal `grep` checks for `applyVerdictCarryOver(`, `getVerdictState(`,
`onDidClose(`, `clearVerdictState(`, the `constructor(` calling `super(services)`, the four
`LINE_BREAK_DIAGNOSTIC_CODE` occurrences, the diff-based check that no line-break message text
was removed against the phase-102 branch tip, and the absence of planning identifiers in every
shipped file.
