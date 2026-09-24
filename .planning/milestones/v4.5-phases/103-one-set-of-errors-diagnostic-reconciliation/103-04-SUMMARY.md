---
phase: 103-one-set-of-errors-diagnostic-reconciliation
plan: 04
subsystem: diagnostics
tags: [langium, typescript, diagnostics, vitest, conformance]

requires:
  - phase: 103-one-set-of-errors-diagnostic-reconciliation
    provides: >
      Plans 01-03's bbj-diagnostic-reconciliation.ts (reconcileWithVerdict, documentLineText,
      recallLangiumDiagnostics), applyDiagnosticHierarchy, and the BBjDocumentValidator/
      BBjParserService wiring that produces a verdict against the real endpoint
provides:
  - Two gated tests in parse-program-live.test.ts pinning the shipped reconciliation against the
    real, deployed BBj parser endpoint (a line both parsers reject; a compiler-accepted document
    Langium flags)
  - The invented accepted-document fixture text, confirmed against both the real endpoint and the
    hermetic validator, ready for plan 05's hand check in both IDEs
  - 103-CONFORMANCE.md: the phase-boundary working measurement -- the endpoint-absent harness run
    reproduces the pre-phase file sets exactly, and a private endpoint-active probe shows list B
    falling to 31 of 1,210 (2.6%) with no language-server syntax error surviving on any of the 31
    compiler-accepted files
affects: [103-05, 104]

actuals:
  tokens: 4180
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A gated real-interop test drives Langium's own side hermetically (createBBjTestServices) and
       only the BBj side against the real endpoint -- proven fixtures, not a scripted double, without
       ever building a document over the real JavaInteropService (which is slow/flaky, per this
       file's own established pattern)"
    - "A private, untracked scratch script in the corpus repository's own snapshots/ directory reuses
       the harness's hermetic worker setup plus the shipped reconciliation code to measure an
       endpoint-active number the harness itself does not yet compute (that is Phase 104's job)"

key-files:
  created:
    - .planning/phases/103-one-set-of-errors-diagnostic-reconciliation/103-CONFORMANCE.md
  modified:
    - bbj-vscode/test/functional/parse-program-live.test.ts

key-decisions:
  - "The accepted-document fixture is the pending A2 todo's own invented nested single-line
     IF...ELSE...FI repro -- confirmed by direct probe against both the real endpoint (0 errors)
     and the hermetic validator (exactly one line-break-coded Error) before being committed to the
     test, so no fallback candidate was needed"
  - "The endpoint-active probe always builds with validation, even for a document with a syntax
     error -- unlike the harness's own worker.mts, which skips validation once syntaxErrors > 0 --
     because the product validates every open document regardless of its own parse state"
  - "The probe re-measures all 1,210 rejects, not only the 669 the endpoint-absent run missed, since
     a verdict can also turn a previously-caught reject into a newly-missed one; none did in this run"
  - "A pre-existing, unrelated check-variable-scoping.ts exception (caught and logged by Langium's
     own ValidationRegistry, not by anything this phase touches) affected exactly 2 of 1,241 files
     during the probe -- recorded as a caveat, left unfixed per the deviation rules' scope boundary"

requirements-completed: []  # PSRV-06/PSRV-07 close with phase verification once plan 05 also finishes, per this plan's own shell rules

coverage:
  - id: D1
    description: "Against the real endpoint, a line both BBj's parser and Langium reject ends up with BBj's diagnostic alone on that line after reconciliation"
    requirement: PSRV-06
    verification:
      - kind: e2e
        ref: "test/functional/parse-program-live.test.ts#reconciliation against the live endpoint (real interop) > a line both parsers reject keeps BBj's diagnostic alone"
        status: pass
    human_judgment: false
  - id: D2
    description: "Against the real endpoint, a document BBj's parser accepts carries no Error-severity lexer/parser/line-break diagnostic after reconciliation; Langium's complaint survives as a Warning with its own message and source"
    requirement: PSRV-07
    verification:
      - kind: e2e
        ref: "test/functional/parse-program-live.test.ts#reconciliation against the live endpoint (real interop) > a document the BBj parser accepts carries no language-server syntax error"
        status: pass
    human_judgment: false
  - id: D3
    description: "A full harness run on the phase tree (endpoint-absent, fake interop) reproduces the pre-phase A, A2 and B file sets exactly -- the suppression is conditional at corpus scale"
    requirement: PSRV-06
    verification:
      - kind: other
        ref: "103-CONFORMANCE.md#Endpoint-absent run -- file-set diff against snapshots/phase-103-before-details.json, 0 left / 0 entered on all three lists"
        status: pass
    human_judgment: false
  - id: D4
    description: "The working measurement with the endpoint active records list B, the compiler-accepted-file syntax-error count, and endpoint failures separately, in aggregate form only"
    requirement: PSRV-07
    verification:
      - kind: other
        ref: "103-CONFORMANCE.md#Endpoint-active measurement -- B 31/1210 (2.6%), 0/31 accepted files still carry a syntax Error, 0 endpoint failures"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-09-23
status: complete
---

# Phase 103 Plan 04: Live-Endpoint Confirmation and the Phase-Boundary Conformance Measurement Summary

**Two gated tests pin the shipped reconciliation against the real, deployed BBj parser, and a private endpoint-active probe shows list B falling to 31 of 1,210 (2.6%) with zero language-server syntax errors surviving on any compiler-accepted file the language server still flags.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-09-23T07:07:00Z (approximate — right after 103-03's completion)
- **Completed:** 2026-09-23T08:02:00Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- A new `describe('reconciliation against the live endpoint (real interop)', …)` in
  `parse-program-live.test.ts`, gated by the file's existing `shouldRunBBjTests()` flag, drives
  Langium's own side hermetically (`createBBjTestServices(EmptyFileSystem)`) and only the BBj side
  against the real, deployed endpoint (the file's existing pattern of calling
  `JavaInteropService.parseProgram()` directly, never a full document build over the real service)
- Test one: an invented two-line fixture with an unclosed parenthesis both the real BBj parser and
  Langium reject — confirmed the shipped `reconcileWithVerdict` + `applyDiagnosticHierarchy` leaves
  every BBj diagnostic present exactly once and drops every overlapping Langium syntax complaint
- Test two: the pending A2 todo's own invented nested single-line `IF … ELSE … FI` repro — confirmed
  by direct probe that the real endpoint accepts it (0 errors) while Langium's hermetic validator
  flags exactly one line-break-coded Error ("needs to start in a new line: else"); after
  reconciliation no syntax Error survives and the original complaint is present as a Warning with
  its own message and source `bbj`
- With `RUN_BBJ_TESTS=0` every test in the file (7 total, including the pre-existing
  coordinate-convention suite) is skipped — no connection ever attempted
- `103-CONFORMANCE.md`: the endpoint-absent harness run (fake interop) reproduces the pre-phase
  file sets exactly (A 9, A2 22, B 669 of 1,210 — identical sets, not only totals, against a
  snapshot taken first)
- A private, untracked scratch probe (`bbj-corpus/conformance/snapshots/phase-103-endpoint-probe.mts`,
  never committed anywhere) reuses the harness's hermetic worker setup plus the shipped
  reconciliation code and calls the real endpoint sequentially over all 1,210 rejects and the 31
  compiler-accepted files still flagged: list B falls to **31 of 1,210 (2.6%)**, well under the 5%
  target; **0** of the 31 compiler-accepted files carries a language-server syntax Error after the
  verdict; **0** drew a live-endpoint/`bbjcpl` disagreement; **5** keep a non-syntax validation
  Error by design; **0** endpoint failures across all 1,241 real calls

## Task Commits

Each task was committed atomically:

1. **Task 1: The real BBj parser and the shipped reconciliation agree on the two headline cases** — `311c0170` (test)
2. **Task 2: The phase-boundary working measurement** — `e726a8f7` (docs)

**Plan metadata:** committed alongside this summary.

## Files Created/Modified

- `bbj-vscode/test/functional/parse-program-live.test.ts` — new `describe('reconciliation against
  the live endpoint (real interop)', …)` with the two gated tests described above
- `.planning/phases/103-one-set-of-errors-diagnostic-reconciliation/103-CONFORMANCE.md` — the
  phase-boundary working measurement: endpoint-absent file-set reproduction and the endpoint-active
  probe's aggregate numbers, own-words shape descriptions only, no corpus identifiers

## The confirmed accepted-document fixture (verbatim, for plan 05's hand check)

```
if a then if b then c=1 else d=1 fi else e=1 fi
```

Confirmed against the real endpoint (0 errors returned) and against the hermetic validator (exactly
one Error-severity, line-break-coded diagnostic: `This statement needs to start in a new line:
else`) before being committed to the test — no fallback candidate from the milestone's recorded
residue was needed.

## Decisions Made

- The accepted-document fixture is the pending A2 todo's own invented shape, confirmed by direct
  probe against both the real endpoint and the hermetic validator before committing to the test,
  rather than guessed or copied from corpus text
- The endpoint-active probe always builds with validation, even for a syntax-erroring document —
  unlike the harness's own `worker.mts`, which skips validation once `syntaxErrors > 0` — because
  the product validates every open document regardless of its own parse state
- The probe re-measures all 1,210 rejects, not only the 669 the endpoint-absent run missed, since a
  verdict can also turn a previously-caught reject into a newly-missed one; the run found none did
- A `check-variable-scoping.ts` exception (pre-existing, unrelated to this phase, caught and logged
  by Langium's own validation registry) affected exactly 2 of the 1,241 probed files; recorded as a
  caveat in `103-CONFORMANCE.md`, left unfixed per the deviation rules' scope boundary

## Deviations from Plan

None — plan executed exactly as written. The accepted-document fixture's own preconditions held on
the first candidate (the todo's own repro), so the plan's ten-alternative fallback path and the
`test.skip` branch were never needed.

## Issues Encountered

**A pre-existing validation exception, out of scope.** During the endpoint-active probe, 2 of 1,241
files triggered a pre-existing `TypeError` inside `check-variable-scoping.ts`'s
`checkUseBeforeAssignment` (`getSymbolRefName` reading a property of an undefined reference).
Langium's own `ValidationRegistry.handleException` caught and logged it per file without crashing
the probe or affecting any other file's measurement; `check-variable-scoping.ts` is unmodified by
this phase and unrelated to diagnostic reconciliation. Not investigated or fixed — out of scope per
the deviation rules' scope boundary. No file id, path or source text is recorded anywhere for the
two affected files.

**Whole-suite regression check (not part of this plan's own `<verification>` block, run as extra
diligence per project convention):** `npx vitest run --maxWorkers=2` reports `numFailedTests: 11` in
both of two runs, all in `test/linking.test.ts`'s pre-existing interop-backend-drift group —
matching the documented local baseline exactly. Between the two runs, a different set of files
reported a `beforeAll`-level "Failed Suite" (composer-codelens.test.ts,
installed-extension-e2e.test.ts, setopts-code-scanner.test.ts, setopts-in-code-request.test.ts,
validation-function-calls.test.ts) — consistent with this project's documented hook-timeout
contention pattern (zero-failed-test "failed suites" judged by `numFailedTests`, not the failed-suite
count). No file this plan modified is reachable from either failure group. Not investigated
further — out of scope per the deviation rules' scope boundary.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The two gated live-endpoint tests and the confirmed accepted-document fixture text are ready for
  plan 05's hand check in both IDEs (endpoint-present and pre-endpoint-jar states)
- `103-CONFORMANCE.md`'s endpoint-active numbers (B 2.6%, 0 accepted-file syntax errors, 0 endpoint
  failures) are on record as the working measurement Phase 104's formal exit gate will re-derive
  through the harness's own endpoint mode
- No blockers. PSRV-06/PSRV-07 remain `Pending` in `REQUIREMENTS.md` — correctly, since plan 05 also
  declares them and has not yet produced a summary

---
*Phase: 103-one-set-of-errors-diagnostic-reconciliation*
*Completed: 2026-09-23*

## Self-Check: PASSED

Both files confirmed present on disk with the expected changes; both task commits (311c0170,
e726a8f7) confirmed in `git log`. Re-ran this plan's `<verification>` block:
`RUN_BBJ_TESTS=1 npx vitest run test/functional/parse-program-live.test.ts` — 7/7 passed;
`RUN_BBJ_TESTS=0` run — all 7 skipped, exit 0; the corpus-path grep against `103-CONFORMANCE.md`
exits 0; `git -C /home/coder/repos/bbj-corpus status --short -- conformance/run.mjs
conformance/worker.mts` prints nothing; `git -C /home/coder/repos/bbj-corpus log -1 --format=%H`
is unchanged (`cdaf3761cbfec574216bc5d92ae7267e37c87ddc`) from the orchestrator's pre-plan value.
All `<acceptance_criteria>` for tasks 1-2 re-verified passing, including the literal `grep` checks
for `describe('reconciliation against the live endpoint (real interop)'`, `reconcileWithVerdict(`
and `parseErrorsToDiagnostics(` in the test file, and the absence of any planning identifier in it.
`npx tsc -b tsconfig.json` and `npm run lint` — both clean.
