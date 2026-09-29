---
phase: 115-honest-interop-test-harness
plan: "02"
subsystem: testing
tags: [jsonrpc, interop-harness, test-harness, vscode-jsonrpc]

# Dependency graph
requires:
  - phase: 115-01
    provides: "Pinned tsx devDependency and npm run interop-harness as the harness's only entry point"
provides:
  - "runRequest — one generic JSON-RPC request scaffold every one of the 17 cases runs through"
  - "deriveStatus — the sole function deciding a case's pass/fail status from its field checks and assertions"
  - "isPeerErrorReply — excludes vscode-jsonrpc's four transport error codes from the opt-in peer-error path"
  - "defineCase/CaseRecord/CaseRunnable — the declarative case-record shape every one of the 17 cases is defined through"
  - "connect() disposes the connection on socket close, so a dropped connection rejects in-flight requests instead of hanging the run"
affects: [115-03, 115-04, 115-05, 115-06]

# Actuals (#2632)
actuals:
  tokens: 11584
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Case-as-data-record: a case is {name, request, params, validate, inMatrix?, acceptsPeerError?}; defineCase wraps a record into a runnable that always calls the shared scaffold"
    - "Opt-in outcome union for a case's rejection path: only acceptsPeerError records see {kind:'response',value} | {kind:'peer-error',error} instead of the raw response value"

key-files:
  created: []
  modified:
    - bbj-vscode/tools/interop-test-harness/run-tests.ts

key-decisions:
  - "The success-path outcome is only wrapped in the {kind:'response',value} union for acceptsPeerError records; every other case's validator keeps receiving the raw response value unchanged, so cases 1-11 and 14's existing validate closures needed no signature change beyond becoming named functions"
  - "A validator that throws is caught inside its own try/catch (separate from the request's), converted to a failed 'Validation threw: <message>' assertion, and the case still derives fail (not error) — a response did arrive"
  - "Case 12's field checks on the first returned class (validateClassFields) now count toward the case's status through the shared scaffold, where the old inline wrapper computed status from assertions alone and silently discarded its own fieldChecks array — documented here as the live before/after run (plan 06) may show case 12 flip from pass to fail if a peer omits one of those fields"

patterns-established:
  - "Every case is a data record consumed by defineCase, not a hand-written async closure — a later case can be added by appending one record, never a new scaffold"

requirements-completed: []

coverage:
  - id: D1
    description: "One generic runRequest scaffold sends every one of the 17 cases' requests and alone derives pass/fail/error via deriveStatus; no case hard-codes a result or a status"
    requirement: "HARN-01"
    verification:
      - kind: other
        ref: "grep -c 'sendRequest(' run-tests.ts === 1 (only inside runRequest)"
        status: pass
      - kind: other
        ref: "grep -c \"status: 'pass'\" run-tests.ts === 0; grep -c 'async (): Promise<TestResult>' run-tests.ts === 0"
        status: pass
      - kind: other
        ref: "npx tsc -p coverage/phase-115/tsconfig.harness-probe.json (only the pre-existing 'criticalFields' unused-variable error remains)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Case 17's rejection path is an explicit acceptsPeerError opt-in through isPeerErrorReply; a dropped connection or transport failure is error, never pass, and case 17's two hand-built always-true results are gone"
    requirement: "HARN-01"
    verification:
      - kind: other
        ref: "grep -c 'acceptsPeerError: true' run-tests.ts === 1; grep -cE 'ErrorCodes\\.(MessageWriteError|MessageReadError|PendingResponseRejected|ConnectionInactive)' run-tests.ts === 4"
        status: pass
      - kind: other
        ref: "tr newline-to-space then grep -oE \"assert\\('[^']*', *true *[,)]\" | wc -l === 8 (case 17's two tautologies removed; cases 9/10/13/14 keep theirs until the next plan per D-21)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A dropped socket rejects in-flight requests instead of hanging the run (connect()'s onClose disposes the connection)"
    requirement: "HARN-01"
    verification:
      - kind: other
        ref: "grep -c 'onClose(' run-tests.ts === 1"
        status: pass
    human_judgment: true
    rationale: "The onClose->dispose wiring is confirmed present and type-checks, but exercising a genuine mid-flight socket drop against a live or faked peer is proven by the fake-peer tests in plan 04, not by this plan's static checks alone."
  - id: D4
    description: "defineTests is a flat list of 17 case records, each with its own small named validator function; cases 1-8 and 11 carry inMatrix:true, replacing the positional matrixTestIndices array"
    requirement: "HARN-06"
    verification:
      - kind: other
        ref: "grep -c 'matrixTestIndices' run-tests.ts === 0; grep -c 'inMatrix: true' run-tests.ts === 9"
        status: pass
      - kind: other
        ref: "17-name diff against phase base commit d6d03647 (git show ... | grep -oE \"'[0-9]{1,2}\\. [^']+'\" sorted, diffed against the current file) prints nothing"
        status: pass
    human_judgment: false
  - id: D5
    description: "npm run interop-harness still loads and runs the CLI end to end against a refused port"
    requirement: "HARN-01"
    verification:
      - kind: other
        ref: "npm run interop-harness -- --host 127.0.0.1 --port 1 --timeout 2000 (exit 2, prints 'Make sure the BBj interop service is running')"
        status: pass
    human_judgment: false

# Metrics
duration: 11min
completed: 2026-09-28
status: complete
---

# Phase 115 Plan 02: Route All 17 Interop Harness Cases Through One Request Scaffold Summary

**All 17 interop harness cases now run through one generic `runRequest` scaffold that alone derives pass/fail/error, replacing the class-info-only scaffold and six hand-duplicated inline wrappers, with case 17's accepted rejection turned into the scaffold's explicit `acceptsPeerError` opt-in.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-28T07:29:15Z
- **Completed:** 2026-09-28T07:40:24Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- `runRequest(conn, record)` is the one scaffold every case sends its request through — it times the call, runs the case's validator inside its own try/catch, and lets `deriveStatus` alone decide `pass`/`fail`; a rejection is `error` unless the case opted in and the rejection was a genuine peer error reply
- `deriveStatus(fieldChecks, assertions)` replaced the old "absent-only" field-check rule (`!c.present && c.expected !== 'undefined'`) with the tightened `present && typeMatch` rule from D-06, so a present-but-wrong-typed field now correctly fails a case instead of silently passing
- `isPeerErrorReply(err)` excludes vscode-jsonrpc's four transport error codes (`MessageWriteError`, `MessageReadError`, `PendingResponseRejected`, `ConnectionInactive`) from case 17's opt-in rejection path, so only a genuine JSON-RPC error reply from the peer — never a dropped connection or transport failure — can satisfy it
- `connect()` now disposes the connection on socket close (`conn.onClose(() => conn.dispose())`), so a dropped socket rejects any in-flight request with `PendingResponseRejected` instead of hanging the harness run
- Case 14 (#514) and case 17 no longer hard-code `status: 'pass'`; both derive their status from real assertions through the scaffold
- Cases 12, 13, 15, 16 and 17 moved off their own inline `try`/`catch`/result-object wrappers onto `runRequest`; `getClassInfos` and `getTopLevelPackages` validators guard every array use with `Array.isArray` first, so a non-array peer response fails through an assertion instead of throwing
- Case 17's validator makes exactly one real assertion — "Returns a boolean or rejects with a JSON-RPC error reply" — true when the outcome is a peer error reply or a boolean response, false otherwise; its two `assert(..., true)` tautologies and both hand-built `status: 'pass'` branches are gone
- Every one of the 17 cases now has its own small named validator function (`validateJavaLangString`, `validateGetClassInfosJavaLang`, `validateLoadClasspathFilePrefix`, etc.); `defineTests` is a flat, ordered list of 17 `CaseRecord` objects mapped through `defineCase`, with no inline closures left in the list itself
- Cases 1-8 and 11 carry `inMatrix: true`; `main()`'s field-presence-matrix loop reads that flag instead of the old positional `matrixTestIndices = [0, 1, 2, 3, 4, 5, 6, 7, 10]` array, which broke silently whenever cases were reordered

## Task Commits

Each task was committed atomically:

1. **Task 1: One request scaffold for every request type, proven on the class-info cases and case 14** - `b37ea415` (feat)
2. **Task 2: Cases 12-17 run through the same scaffold, case 17's accepted rejection is the scaffold opt-in, and the case list is small named validators** - `df70c08b` (feat)

**Plan metadata:** committed alongside this SUMMARY (see below)

## Files Created/Modified
- `bbj-vscode/tools/interop-test-harness/run-tests.ts` - generalized request scaffold (`runRequest`, `deriveStatus`, `isPeerErrorReply`, `defineCase`, `CaseRecord`/`CaseRunnable`/`CaseOutcome` types), 17 named per-case validators, a flat 17-record `defineTests`, `inMatrix`-flag-driven matrix building in `main()`, and an `onClose`-dispose handler in `connect()`

## Decisions Made
- The success-path outcome is only wrapped in the `{kind:'response', value}` union for `acceptsPeerError` records (only case 17); every other case's validator keeps receiving the raw response value, so the existing cases 1-11 and 14 validate logic needed no signature change beyond becoming named top-level functions
- A validator that throws is caught inside its own try/catch (separate from the request's own), turned into a failed `Validation threw: <message>` assertion, and the case still derives `fail`, never `error` — a response genuinely arrived
- Case 12's field checks on the first returned class (`validateClassFields`) now count toward the case's status through the shared scaffold — the old inline wrapper computed `failed` from assertions alone and silently discarded its own `fieldChecks` array. This is an intentional tightening per Task 2's instructions; if the live before/after run (plan 06) shows case 12 flip from `pass` to `fail`, it is this fix, not a regression.

## Deviations from Plan

None - plan executed exactly as written. One self-correction during execution: an early draft of two doc comments and one section header referenced `D-03`/`D-04`/`D-09` decision IDs and, once, a `T-115-05` threat ID; these were rewritten to describe the behavior in plain language before committing, per the project's rule against planning identifiers in source/comment text (GitHub issue numbers are exempt but decision/threat/phase IDs are not).

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The shared scaffold, `deriveStatus`, `isPeerErrorReply`, and the 17 case records are ready for plan 03 (the case, gate and highlighter fixes for D-01/D-02/D-05-D-08/D-10) and plan 04 (the module split and fake-peer tests).
- Cases 9, 10, 13 and 14 still carry their documented tautological `assert(..., true)` lines by design — Task 2 explicitly left them for plan 03's D-01/D-02 rewrite.
- No blockers.

## Self-Check: PASSED

- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/tools/interop-test-harness/run-tests.ts` — FOUND
- `git log --oneline --all | grep -q b37ea415` — FOUND
- `git log --oneline --all | grep -q df70c08b` — FOUND
- All task `<acceptance_criteria>` re-verified: PASS (see Accomplishments and Coverage)
- Plan-level `<verification>` re-run: harness type probe (only the known `criticalFields` unused-variable error remains) — PASS; `npm run interop-harness -- --host 127.0.0.1 --port 1 --timeout 2000` exits 2 with the connection hint — PASS

---
*Phase: 115-honest-interop-test-harness*
*Completed: 2026-09-28*
