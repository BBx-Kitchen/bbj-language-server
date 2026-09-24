---
phase: 103-one-set-of-errors-diagnostic-reconciliation
plan: 01
subsystem: diagnostics
tags: [langium, typescript, diagnostics, vitest]

requires:
  - phase: 102-live-compiler-diagnostics-with-backward-compatibility
    provides: >
      BBjParserService's once-per-connection on/off latch, BBJ_PARSER_SOURCE, parseErrorToRange's
      coordinate clamp, and the scriptable JavaInteropTestService.parseProgram double
provides:
  - A new pure module (bbj-diagnostic-reconciliation.ts) that downgrades or replaces a Langium
    syntax complaint against a BBj parser verdict, and remembers per-document verdict state and
    the pre-hierarchy Langium diagnostics list
  - A four-way LiveParseOutcome (verdict/failed/unavailable/cancelled) from requestLiveParse(),
    replacing the old collapse-everything-to-[] return shape
  - A live-parse-first debounce callback: a verdict reconciles and skips the save-time bbjcpl run
    for that cycle; every other outcome falls back to bbjcpl exactly as before
  - An exported diagnostic hierarchy with an explicit exemption for downgraded syntax warnings
    (Rule 2) and their own Rule 3 cap, plus the pure applyVerdictCarryOver carry-over function
affects: [103-02, 103-03, 103-04, 103-05]

actuals:
  tokens: 16370
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Pure reconciliation module, isolated from the validator/builder/parser-service/validations
       folder by import direction only, in the style of the existing mergeDiagnostics"
    - "Module-scoped Map/WeakMap state with getter/setter exports, matching the existing
       compilerTrigger/maxErrorsDisplayed pattern for state shared across services with no DI seam"
    - "Diagnostics tagged and matched by data.code, never by message-prefix matching"

key-files:
  created:
    - bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts
    - bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts
  modified:
    - bbj-vscode/src/language/bbj-parser-service.ts
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/src/language/bbj-document-validator.ts
    - bbj-vscode/test/bbj-parser-service.test.ts
    - bbj-vscode/test/document-builder.test.ts

key-decisions:
  - "downgradeSyntaxComplaint changes both severity AND data.code together — a severity-only
     downgrade would leave the diagnostic in the Parse tier and keep suppressing linking
     diagnostics and counting against the parse-error cap"
  - "reconcileWithVerdict never compares a non-syntax diagnostic against the verdict — semantic
     and validator diagnostics are untouched even on a line BBj also flags"
  - "A replaced complaint (dropped because it overlaps a verdict diagnostic) is still recorded in
     the verdict state's seen set, so it carries over like a downgraded complaint between verdicts
     rather than reappearing as an Error the moment BBj's own diagnostic vanishes on the next edit"
  - "The Rule 3 cap for downgraded syntax warnings is a second, independent cap at the same
     maxErrors value, filtering by original relative order rather than reordering the list"

requirements-completed: []  # PSRV-06/PSRV-07 close with phase verification per this plan's own shell rules, not here

coverage:
  - id: D1
    description: "An accepted verdict turns a real Langium parse error into a Warning with its own message/source, and the save-time compile does not run that cycle"
    requirement: PSRV-07
    verification:
      - kind: integration
        ref: "test/bbj-parser-service.test.ts#an accepted verdict turns the language server's parse error into a warning and skips the save-time compile"
        status: pass
    human_judgment: false
  - id: D2
    description: "A BBj diagnostic and an overlapping Langium syntax complaint reconcile to one diagnostic (BBj's), including colon-continued and touching/adjacent line spans"
    requirement: PSRV-06
    verification:
      - kind: unit
        ref: "test/bbj-diagnostic-reconciliation.test.ts#reconcileWithVerdict (15 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The diagnostic hierarchy never hides a downgraded syntax warning, no longer suppresses linking diagnostics because of one, and caps them as their own group; the pure carry-over keeps a seen complaint yellow by message and line text"
    requirement: PSRV-07
    verification:
      - kind: unit
        ref: "test/bbj-diagnostic-reconciliation.test.ts#applyDiagnosticHierarchy and #applyVerdictCarryOver (18 tests)"
        status: pass
    human_judgment: false

duration: 48min
completed: 2026-09-22
status: complete
---

# Phase 103 Plan 01: Pure Diagnostic Reconciliation Summary

**One pure module (`bbj-diagnostic-reconciliation.ts`) decides which Langium diagnostic gives way to BBj's own verdict, downgrades the rest to warnings instead of hiding them, and the document builder now asks the live parser before ever running the save-time `bbjcpl` compile.**

## Performance

- **Duration:** 48 min
- **Started:** 2026-09-22T21:43:00Z
- **Completed:** 2026-09-22T22:31:00Z
- **Tasks:** 3
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

- New module `bbj-diagnostic-reconciliation.ts`: `reconcileWithVerdict` downgrades every Langium
  syntax complaint on an accepted verdict, replaces one whose line span overlaps BBj's diagnostic,
  and leaves every other diagnostic untouched — proven by 32 unit tests covering every documented
  edge (empty inputs, colon-continued spans, touching vs. adjacent, ordering, purity, state)
- `requestLiveParse()` now returns a `LiveParseOutcome` (`verdict`/`failed`/`unavailable`/
  `cancelled`) instead of collapsing every non-verdict outcome into an indistinguishable `[]`
- The document builder's `debouncedCompile()` asks the live parser first: a verdict reconciles
  against the pre-hierarchy Langium diagnostics list and skips the save-time compile that cycle;
  every other outcome falls back to `bbjcpl` exactly as before this phase
- The diagnostic hierarchy now exempts downgraded syntax warnings from Rule 2 (never hidden by a
  coexisting Error) and caps them as their own group under Rule 3, independent of the parse-error
  cap; Rule 0 and Rule 1's pre-existing behaviour is pinned unchanged by dedicated tests
- `applyVerdictCarryOver` re-applies the last verdict's downgrade decisions to a freshly produced
  Langium diagnostics list between verdicts, matched by message and current line text so a
  keystroke never flashes a carried-over complaint back to red before the next verdict arrives
- End-to-end tracer test proves the whole path through a real `BBjDocumentBuilder` and
  `BBjParserService`: a genuine Langium parse error becomes a Warning with its own message and
  `bbj` source, the save-time compile is never invoked, and the client is notified exactly once

## Task Commits

Each task was committed atomically (tasks 2 and 3 as separate RED/GREEN commits per their `tdd="true"` attribute):

1. **Task 1: End-to-end tracer — accepted verdict downgrades and skips bbjcpl** — `65a2d0b9` (feat)
2. **Task 2 RED: failing tests for line-span-overlap replacement** — `7defeca0` (test)
2. **Task 2 GREEN: `lineSpansOverlap` + overlap-based replacement** — `ab386c2d` (feat)
3. **Task 3 RED: failing tests for hierarchy exemptions and carry-over** — `636f5877` (test)
3. **Task 3 GREEN: Rule 2/3 exemptions + `applyVerdictCarryOver`** — `3c396fef` (feat)

**Plan metadata:** committed alongside this summary.

## Files Created/Modified

- `bbj-vscode/src/language/bbj-diagnostic-reconciliation.ts` — new pure module: downgrade/replace
  reconciliation, `lineSpansOverlap`, `applyVerdictCarryOver`, per-document verdict state, and the
  remembered pre-hierarchy Langium diagnostics list
- `bbj-vscode/test/bbj-diagnostic-reconciliation.test.ts` — new: 32 unit tests, no services, no
  workspace, in the style of `cpl-integration.test.ts`
- `bbj-vscode/src/language/bbj-parser-service.ts` — `requestLiveParse()` returns `LiveParseOutcome`
- `bbj-vscode/src/language/bbj-document-builder.ts` — `debouncedCompile()` asks the live parser
  first, reconciles on a verdict, falls back to `bbjcpl` otherwise
- `bbj-vscode/src/language/bbj-document-validator.ts` — `applyDiagnosticHierarchy` exported, new
  `applyConfiguredDiagnosticHierarchy`, `validateDocument` remembers the pre-hierarchy list, Rule 2
  and Rule 3 exempt/cap downgraded syntax warnings
- `bbj-vscode/test/bbj-parser-service.test.ts` — retyped mocks, replaced the now-obsolete
  "coexist" test, added the end-to-end tracer test
- `bbj-vscode/test/document-builder.test.ts` — retyped `requestLiveParseMock`, real `TextDocument`
  in `fakeDocument()`, rewrote the stale-diagnostics test for the new verdict-first order

## Decisions Made

- Downgrading a syntax complaint changes both `severity` and `data.code` together (never severity
  alone) — `getDiagnosticTier()` keys the Parse tier on `data.code`, so a severity-only downgrade
  would silently keep suppressing linking diagnostics and counting against the parse-error cap
- A syntax complaint replaced by an overlapping BBj diagnostic is still recorded in the verdict
  state's `seen` set — between verdicts it carries over exactly like a downgraded complaint, since
  BBj's own diagnostic disappears again on the very next keystroke
- The Rule 3 downgraded-warning cap filters the result list in place (preserving original relative
  order) rather than reordering, unlike the pre-existing parse-error cap's slice-and-concat shape
- Rule 0 and the pre-existing Parse-tier cap are confirmed unchanged and pinned by a diff-based
  verify command against the phase-102 branch tip

## Deviations from Plan

None — plan executed exactly as written, including the TDD RED/GREEN split for tasks 2 and 3.

## Issues Encountered

**Whole-suite regression check (not part of this plan's own `<verification>` block, run as extra
diligence per project convention):** `npx vitest run --maxWorkers=2` reports `numFailedTests: 11`,
all in `test/linking.test.ts`'s pre-existing interop-backend-drift group — matching the documented
local baseline exactly (STATE.md: "the documented local baseline of 12 should now be 11"). A
second file, `test/functional/installed-extension-e2e.test.ts`, reports a `beforeAll`-level
"Failed Suite" (not counted in `numFailedTests`): `Error: No document found for URI: .../
issue475-setopts-in-code.bbj`. That test spawns the *installed* extension bundle from
`~/.ext-test/extensions/out/language/main.cjs` (a compiled artifact, not the current source tree)
to close a packaging-staleness gap unrelated to composer/SETOPTS code this plan never touched;
re-running it in isolation reproduces the identical failure deterministically, consistent with a
stale or missing installed bundle rather than any change in this plan. No file this plan modified
is reachable from that test. Not investigated further — out of scope per the deviation rules'
scope boundary (pre-existing/unrelated-file failures are logged, not fixed).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `bbj-diagnostic-reconciliation.ts`'s full exported surface (`reconcileWithVerdict`,
  `applyVerdictCarryOver`, verdict-state accessors, the remembered-diagnostics accessors) is ready
  for plan 02 (fallback/cancelled wiring, connection-reset clearing) and plan 03 (the line-break
  validator's `data.code` tagging, `BBjDocumentValidator`'s carry-over call, its explicit
  constructor for the close-listener)
- No blockers. The whole-suite anomaly above is pre-existing/environment, not a regression from
  this plan's changes.

---
*Phase: 103-one-set-of-errors-diagnostic-reconciliation*
*Completed: 2026-09-22*

## Self-Check: PASSED

All 7 created/modified files confirmed present on disk; all 5 task commits (65a2d0b9, 7defeca0,
ab386c2d, 636f5877, 3c396fef) confirmed in `git log`. Re-ran the plan's `<verification>` block:
`npx vitest run test/bbj-diagnostic-reconciliation.test.ts test/bbj-parser-service.test.ts
test/document-builder.test.ts test/cpl-integration.test.ts` — 70/70 passed; `npx tsc -b
tsconfig.json` and `npm run lint` — both clean; `git branch --show-current` prints
`gsd/phase-103-one-set-of-errors-diagnostic-reconciliation`. All `<acceptance_criteria>` for
tasks 1-3 re-verified passing.
