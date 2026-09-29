---
phase: 115-honest-interop-test-harness
plan: "03"
subsystem: testing
tags: [interop-harness, gate, json-highlighter, jsonrpc]

# Dependency graph
requires:
  - phase: 115-02
    provides: "runRequest scaffold, deriveStatus, isPeerErrorReply, defineCase/CaseRecord/CaseOutcome, and the 17 case records every case now runs through"
provides:
  - "CRITICAL_FIELDS — the one exported list of the 8 fields the language server depends on, plus finalSegment/isCriticalFieldCheck matching on the exact final path segment"
  - "evaluateGate(results) — the single verdict (passCount/failCount/errorCount/criticalFailures/exitCode) driving the console summary, the report and process.exit"
  - "hasErrorField(value) — the one place a peer's error signal is read, used by cases 9 and 10"
  - "Honest disjunction assertions for cases 9, 10, 13 and 14 — no case can pass by construction"
  - "syntaxHighlightJson(rawJson) — highlight-then-escape JSON colouriser that actually colours keys and strings, escaped quotes included"
  - "A header comment that names CRITICAL_FIELDS, the gate rule, the three exit codes and every CLI flag"
affects: [115-04, 115-05, 115-06]

# Actuals (#2632)
actuals:
  tokens: 4548
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single verdict object (GateVerdict) computed once by evaluateGate and threaded through the console summary, generateReport and process.exit — no code path re-derives pass/fail/exit state independently"
    - "Exact-final-path-segment matching (finalSegment + isCriticalFieldCheck) replacing String.includes() substring matching for critical-field detection"
    - "Highlight-then-escape JSON rendering: a single regex token pass classifies each JSON token before escapeHtml runs on it, so escaping and highlighting can never race each other"

key-files:
  created: []
  modified:
    - bbj-vscode/tools/interop-test-harness/run-tests.ts

key-decisions:
  - "D-02 reading confirmed: case 10 opts into the same acceptsPeerError scaffold path as case 17 (not a hand-built result), so both a response with a non-empty error field and a genuine JSON-RPC error reply satisfy it; a class object with no error, or a transport failure, both fail/error as before"
  - "Cases 13 and 14's disjunction assertions guard every array access with Array.isArray computed up front, so a non-array peer response fails through the single assertion's false condition rather than throwing"
  - "The highlighter keeps the existing JSON-string regex pattern unchanged (per Pitfall 2) and only changes when escapeHtml runs relative to token classification — one combined token regex classifies key/string/number/bool/null before wrapping, escaping every token and every gap exactly once"
  - "Header rewrite lists all 8 CRITICAL_FIELDS on one line and documents --timeout's 15000ms default alongside the other three flags, with no source-text guard test added (per D-08)"

patterns-established:
  - "A gate/report/exit-code consumer reads one exported constant and one exported verdict function — no module re-declares its own critical-field list or its own pass/fail counting"

requirements-completed: []

coverage:
  - id: D1
    description: "One exported CRITICAL_FIELDS constant (8 fields, in order) drives both the gate and the report; matching is by exact final path segment, not substring — no other list exists in the harness"
    requirement: "HARN-04"
    verification:
      - kind: other
        ref: "node -e regex check of CRITICAL_FIELDS array contents against the expected 8-field order"
        status: pass
      - kind: other
        ref: "grep -c 'includes(cf)' run-tests.ts === 0; grep -c 'const criticalFields' run-tests.ts === 0; grep -c 'CRITICAL_FIELDS' run-tests.ts === 4"
        status: pass
    human_judgment: false
  - id: D2
    description: "evaluateGate(results) is the single verdict; exitCode is 1 when any case is fail or error or any critical field check failed, 0 otherwise; main() computes it once and exits with that code, printing the summary and critical-failure lines from the same verdict"
    requirement: "HARN-04"
    verification:
      - kind: other
        ref: "grep -cE 'process\\.exit\\(1\\)' run-tests.ts === 0 (exit code always comes from verdict.exitCode); grep -cE 'process\\.exit\\(2\\)' run-tests.ts === 2 (connection failure + fatal handler unchanged)"
        status: pass
      - kind: other
        ref: "npx tsc harness probe clean; npm run interop-harness -- --port 1 exits 2 with the connection hint"
        status: pass
    human_judgment: false
  - id: D3
    description: "No case contains a literal-true assertion; cases 9, 10, 13 and 14 each report their real outcome through one disjunction assertion that can fail"
    requirement: "HARN-01"
    verification:
      - kind: other
        ref: "tr-then-grep for assert('...', true[,)]) over the whole file === 0; grep -c 'Responds without crashing' === 0"
        status: pass
      - kind: other
        ref: "each of the four new assertion descriptions occurs exactly once in the file (grep -c === 1)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Case 10 passes only when the peer signals an error (response error field or JSON-RPC error reply), using the same acceptsPeerError scaffold opt-in as case 17"
    requirement: "HARN-01"
    verification:
      - kind: other
        ref: "grep -c 'acceptsPeerError: true' run-tests.ts === 2 (cases 10 and 17); grep -c 'function hasErrorField' run-tests.ts === 1"
        status: pass
    human_judgment: true
    rationale: "The scaffold wiring and assertion logic are statically verified, but exercising a genuine peer error reply vs. a plain class-not-found response is proven against a live or faked peer, not by these static checks alone — the fake-peer tests land in plan 04/05."
  - id: D5
    description: "syntaxHighlightJson colours JSON keys and string values in the HTML report, escaped quotes included, with every character of peer data escaped exactly once"
    requirement: "HARN-03"
    verification:
      - kind: other
        ref: "grep -c 'escapeHtml(JSON.stringify' run-tests.ts === 0 (no pre-escape before highlighting); grep -cF '(?:\\\\.|[^\"\\\\])*' run-tests.ts >= 1 (existing JSON-string pattern kept)"
        status: pass
    human_judgment: true
    rationale: "The token-classification logic is statically verified and type-checks, but visually confirming keys/strings actually render in colour in a real generated report.html is a human-eye check reserved for plan 06's checkpoint, per the roadmap."
  - id: D6
    description: "The header comment names CRITICAL_FIELDS and its 8 fields on one line, states the present-and-typed rule and the three exit codes, and documents every CLI flag including --timeout's 15000ms default; no source-text guard test was added"
    requirement: "HARN-05"
    verification:
      - kind: other
        ref: "sed -extracted header block grep checks: field list line present once, CRITICAL_FIELDS mentioned, all 4 flags present, '15000' present, 'npm run interop-harness' present 3x"
        status: pass
    human_judgment: true
    rationale: "D-08 explicitly forbids a source-text guard test for the header's honesty over time; the plan-time greps prove today's snapshot, but the header stays a human-read artifact per the roadmap's plan-06 checkpoint."

# Metrics
duration: 22min
completed: 2026-09-28
status: complete
---

# Phase 115 Plan 03: Case, Gate and Highlighter Fixes Summary

**One CRITICAL_FIELDS list now drives the gate, the report and the exit code end to end; cases 9, 10, 13 and 14 each report their real outcome through a single disjunction assertion that can fail; the JSON highlighter colours keys and strings (escaped quotes included) via a highlight-then-escape token pass; and the header comment honestly documents the gate and every CLI flag.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-28T07:47:00Z
- **Completed:** 2026-09-28T08:09:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- `CRITICAL_FIELDS` is the one exported list (`isStatic`, `isDeprecated`, `constructors`, `name`, `returnType`, `type`, `parameters`, `packageName`); `finalSegment`/`isCriticalFieldCheck` match on the exact final path segment, closing #599's substring-match bug (`includes('type')` matching `returnType`, `includes('name')` matching `packageName`)
- `evaluateGate(results)` is the single verdict — `passCount`, `failCount`, `errorCount`, `criticalFailures`, `exitCode` — computed once in `main()` and consumed by the console summary, the critical-failure lines, `generateReport`'s counts and `process.exit`; an `error` case now correctly drives `exitCode` to 1 (the old gate silently excluded `error` cases from both its `failCount` and `criticalFailures` checks)
- `generateReport` reads `CRITICAL_FIELDS` instead of its own dead 8-field local list; the Field Presence Matrix subtitle names the gated fields and every field-check table gained a Critical column
- `hasErrorField(value)` is the one place a peer's error signal is read; case 9 ("Error response or a class named int") and case 10 ("Peer signals an error (error field or JSON-RPC error reply)") each collapse to one real disjunction assertion — case 10 now opts into the shared scaffold's `acceptsPeerError` path (the same opt-in case 17 uses), so a rejected RPC counts as its error signal without a hand-built result
- Cases 13 and 14 each collapse to one disjunction assertion over their array response ("empty or contains HashMap, ArrayList and Date" / "empty or contains a BBj class"), guarding every array access with `Array.isArray` computed up front so a non-array peer response fails through the assertion, never a thrown `TypeError`
- `syntaxHighlightJson(rawJson)` now takes raw (unescaped) JSON text and makes a single left-to-right pass over one combined token regex (string/number/bool/null), classifying each match — a string followed by an optional colon is a key, any other string is a `json-string` (array elements included) — and escaping every token and every gap between tokens exactly once via `escapeHtml`; the existing JSON-string pattern (`(?:\\.|[^"\\])*`, which already handles backslash-escaped quotes correctly) is unchanged, only the escape/highlight ordering is
- `toJsonText(value)` renders `JSON.stringify`'s `undefined` result as the text `null`; both report call sites (request/response) now pass raw JSON through it instead of pre-escaping
- The header comment names `CRITICAL_FIELDS` and its 8 fields on one line, states the present-and-typed gate rule and the three exit codes, and documents `--host`, `--port`, `--output` and `--timeout` (including its 15000ms default and that it bounds only the connection attempt); the three-line `npm run interop-harness` Usage block is unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: One CRITICAL_FIELDS list drives the gate, the report and the exit code, end to end through main()** - `0c95f9f0` (feat)
2. **Task 2: Cases 9, 10, 13 and 14 report their real outcome through one assertion that can fail** - `8ca5d849` (feat)
3. **Task 3: The JSON highlighter colours keys and string values, escaped quotes included, and the header describes the real gate and every flag** - `e787c5ad` (feat)

**Plan metadata:** committed alongside this SUMMARY (see below)

## Files Created/Modified
- `bbj-vscode/tools/interop-test-harness/run-tests.ts` — `CRITICAL_FIELDS`/`finalSegment`/`isCriticalFieldCheck`/`evaluateGate`/`hasErrorField`, honest case 9/10/13/14 outcomes, highlight-then-escape `syntaxHighlightJson`/`toJsonText`, and the rewritten header comment

## Decisions Made
- D-02's case-10 reading is the same scaffold opt-in case 17 uses per D-04: only a genuine peer error signal (an `error` field on the response, or a JSON-RPC error reply through `acceptsPeerError`/`isPeerErrorReply`) passes; a class object with no error, or a transport failure/dropped connection, both fail or error as they did before this plan.
- The highlighter's fix is "highlight before escape" (Claude's Discretion, both approaches were allowed): a single token-classification pass runs first, then `escapeHtml` wraps each token and each gap — this keeps the existing JSON-string regex untouched per the phase research's Pitfall 2 guidance, rather than rewriting it to match `&quot;`.
- Numbers, booleans and null are now highlighted wherever they appear (array elements included), not only after a colon as before — a documented side effect of the single-pass tokenizer that only adds colour, called out in the plan's own edge-probe notes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Self-correction: removed a decision-id reference from a Task 2 doc comment before Task 3's commit**
- **Found during:** Task 3 (running the plan-level diff-scan acceptance check against the phase base commit)
- **Issue:** `hasErrorField`'s doc comment (written during Task 2) read `(#514/D-02)` — a decision id alongside the GitHub issue number, violating the project's rule against planning identifiers in source/comment text (GitHub issue numbers are exempt, decision ids are not).
- **Fix:** Reworded the comment to `(#514)`, dropping the decision-id reference; no logic change.
- **Files modified:** `bbj-vscode/tools/interop-test-harness/run-tests.ts`
- **Verification:** `git diff d6d03647 -- run-tests.ts | grep '^+[^+]' | grep -cE '\bD-[0-9]+\b|\b(HARN|DEP)-[0-9]+\b|...'` prints 0 after the fix (was 1 before).
- **Committed in:** `e787c5ad` (Task 3 commit, alongside the highlighter/header changes since Task 2 was already committed when this was caught)

---

**Total deviations:** 1 auto-fixed (1 bug — a self-caught planning-id leak in a comment, not a functional defect)
**Impact on plan:** No behavioral change; the fix only reworded a doc comment before it ever reached a separate commit boundary. No scope creep.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `CRITICAL_FIELDS`, `evaluateGate`, `hasErrorField`, the four rewritten case validators, `syntaxHighlightJson`/`toJsonText`, and the rewritten header are all ready for plan 04's module split (scaffold/cases/gate/report/template + thin CLI) and plan 05's fake-peer and highlighter tests.
- The harness was not run against the live interop peer on :5008 in this plan, per the plan's shell rules; plan 06 owns the live before/after diff (D-20).
- No blockers.

## Self-Check: PASSED

- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/tools/interop-test-harness/run-tests.ts` — FOUND
- `git log --oneline --all | grep -q 0c95f9f0` — FOUND
- `git log --oneline --all | grep -q 8ca5d849` — FOUND
- `git log --oneline --all | grep -q e787c5ad` — FOUND
- All task `<acceptance_criteria>` re-verified: PASS (see Accomplishments and Coverage)
- Plan-level `<verification>` re-run: harness type probe clean (`npx tsc -p coverage/phase-115/tsconfig.harness-probe.json`, no output) — PASS; CLI smoke exits 2 with the connection hint — PASS; zero always-true assertions, `CRITICAL_FIELDS` with all 8 fields, no substring field matching, no literal `process.exit(1)` — PASS

---
*Phase: 115-honest-interop-test-harness*
*Completed: 2026-09-28*
