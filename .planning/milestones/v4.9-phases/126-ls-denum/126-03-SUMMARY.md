---
phase: 126-ls-denum
plan: 03
subsystem: language-server
tags: [lsp, denum, notifications, window-messages, vitest]

requires:
  - phase: 126-ls-denum
    provides: "BBjDenumService.run, the DenumMessenger seam, the diagnostics notification contract and the hermetic DENUM harness (plan 01); the VS Code list handlers (plan 02)"
  - phase: 125-ls-formatting
    provides: "mixedNumberingMessage, GO_TO_LINE_ACTION, showFormatterWarningWithAction, showFormatterDocument"
provides:
  - "Diagnostics flow: an applied DENUM with diagnostics sends bbj/denumDiagnostics, then shows one counts message with a Show button; Show sends bbj/showDenumDiagnostics"
  - "denumSuccessMessage, SHOW_DENUM_DIAGNOSTICS_ACTION and the seven failure message constants"
  - "A single table-driven failure presenter: every outcome ends in exactly one Warning of its own, never deduplicated"
  - "showInformationWithAction, notifyDenumDiagnostics, notifyShowDenumDiagnostics connection-free senders"
affects: [126-04, 126-05, 127-vscode-denum, 128-intellij-denum]

actuals:
  tokens: 21000
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Messenger members that take an onAction callback; the default messenger starts the prompt unawaited and runs the callback only when the picked title matches"
    - "Failure presenter keyed on the typed outcome; one private fail() owns the single warn log line and the single Warning"
    - "Go to Line uses primitives captured at run start (uri, line count) and re-reads the live document only at click time"

key-files:
  created:
    - bbj-vscode/test/bbj-denum-outcomes.test.ts
  modified:
    - bbj-vscode/src/language/bbj-denum-service.ts
    - bbj-vscode/src/language/bbj-notifications.ts
    - bbj-vscode/test/denum-test-harness.ts

key-decisions:
  - "The list notification is sent before the message is shown, and the message is a Warning when any entry is an ERROR and an Information message otherwise; failures are always Warnings, nothing is an error message"
  - "A run whose answer produced an empty edit (denumbered true, identical text) keeps the plain confirmation and sends no list: nothing was applied, and a real peer cannot answer this"
  - "fail() now logs at warn, with the reason and fixed tokens (failure kind, numeric code, timeout origin, 'line known' / 'no line'); the former debug line is gone, so every failed run leaves exactly one warn line"
  - "A -33001 parser exception gets the characters-BBj-cannot-represent hint; the peer's own error text is never shown or logged"

patterns-established:
  - "Secret-marker test over every window message, every showDocument call and every logger level for every failure row"

requirements-completed: [DEN-03, DEN-04]

coverage:
  - id: D1
    description: "An applied DENUM with diagnostics sends the list in bbj-ls order, then shows one counts message with Show (Warning with any error, Information otherwise); a clean run shows 'Denumbered.' and sends no list"
    requirement: DEN-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-outcomes.test.ts#a DENUM run that reported diagnostics"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-outcomes.test.ts#the counts message"
        status: pass
    human_judgment: false
  - id: D2
    description: "Choosing Show sends bbj/showDenumDiagnostics with no payload; the prompt is never awaited; a list over 500 entries arrives cut to 500 in both the list and the counts"
    requirement: DEN-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-outcomes.test.ts#a DENUM run that reported diagnostics"
        status: pass
    human_judgment: false
  - id: D3
    description: "No list is sent for an unnumbered answer, a refused edit, a stale answer, a failure or a cancelled run"
    requirement: DEN-04
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-outcomes.test.ts#a DENUM run that sends no list"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every failure outcome ends in exactly one Warning with its own text (older BBjServices, not reachable, timeout, too large, protected, parser exception, DENUM failed, service unavailable, tokenized), without a second popup"
    requirement: DEN-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-outcomes.test.ts#every failure outcome ends in exactly one Warning of its own"
        status: pass
    human_judgment: false
  - id: D5
    description: "Mixed numbering names the line and offers Go to Line to that line in the request's own document, clamped at click time, never to a document the peer names"
    requirement: DEN-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-outcomes.test.ts#mixed numbering"
        status: pass
    human_judgment: false
  - id: D6
    description: "Nothing is deduplicated, overlapping runs end in exactly two messages, a cancelled run ends silently, and no message or log line carries document or peer text"
    requirement: DEN-03
    verification:
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-outcomes.test.ts#nothing is deduplicated"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-outcomes.test.ts#runs that overlap or are cancelled"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/bbj-denum-outcomes.test.ts#what the user and the log are never shown"
        status: pass
    human_judgment: false
  - id: D7
    description: "A protected program answers -33005 from denumProgram against a real peer"
    requirement: DEN-03
    verification: []
    human_judgment: true
    rationale: "Documented in the bbj-ls README but not reproducible against the dev peer (no protected program text was available); proven by hermetic tests only"

duration: 12min
completed: 2026-10-02
status: complete
---

# Phase 126 Plan 03: DENUM outcomes and diagnostics Summary

**An applied DENUM with diagnostics sends the host-neutral list and then one counts message with a Show button (Warning when any entry is an error), and every failure outcome now ends in its own single, never-deduplicated Warning that carries no document or peer text.**

## Performance

- **Duration:** about 12 min
- **Tasks:** 2 (tracer plus one TDD task)
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- `bbj-notifications.ts` gains `showInformationWithAction`, `notifyDenumDiagnostics` and `notifyShowDenumDiagnostics`, all never-throw and no-ops before `initNotifications`; it still imports nothing from `main.ts` and only types from `vscode-languageserver`.
- `DenumMessenger` gains `infoWithAction`, `warnWithAction`, `showDocument`, `denumDiagnostics` and `showDenumDiagnostics`. The default messenger starts each prompt without awaiting it and runs the action callback only on a matching pick.
- On an applied success with diagnostics the server sends the list (document's own uri, bbj-ls order) and then shows `Denumbered. 2 errors, 1 warning.` with `Show`; counts are exact tallies of the received (guard-capped) list.
- The failure presenter maps every typed outcome to its reason and fixed text; mixed numbering reuses `mixedNumberingMessage` and `GO_TO_LINE_ACTION` and jumps only inside the document the run started with.
- `test/bbj-denum-outcomes.test.ts` (66 tests) covers one message per outcome, severity, no dedup, list, counts, Show, Go to Line clamping, overlap, cancellation and a secret-marker sweep over every message and logger level.

## Task Commits

1. **Task 1 (tracer): diagnostics list, counts message and Show** - `8c1874ef` (feat)
2. **Task 2 (TDD): every failure ends in its own single Warning** - `b1eb1a10` (test, RED: 37 failing), `755d534e` (feat, GREEN)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified
- `bbj-vscode/src/language/bbj-denum-service.ts` - messenger members, `denumSuccessMessage`, the seven failure constants, `presentSuccess`, the failure presenter and Go to Line handling
- `bbj-vscode/src/language/bbj-notifications.ts` - the three new senders
- `bbj-vscode/test/denum-test-harness.ts` - the recording messenger gains the five new members
- `bbj-vscode/test/bbj-denum-outcomes.test.ts` - the outcome suite

## Decisions Made
- See `key-decisions` above. The empty-edit success keeps the plain confirmation and no list.
- A `-33006` (line numbers), `-33009`, `-32602`, malformed-result and invalid-settings outcome all map to the generic `denum-failed` text; only `-33001` gets the charset hint.

## Deviations from Plan

**1. [Process] Commit trailer** - The plan text names `Claude Opus 5.5`; the orchestrator's instructions for this run specify `Claude Sonnet 5.5`, which every commit carries.

**2. [Process] `denum-command.test.ts` untouched** - The plan allowed changing a plain-confirmation assertion for a run with diagnostics; no such assertion exists there (the diagnostics test only checks the result's `diagnostics`), so the file is unchanged.

**3. [Rule 1 - Behaviour] Failure log line moved from debug to warn** - `fail()` logged at debug from plan 01; the plan's behavior asks for exactly one warn line per failure naming the reason, so the line is now a warn. The cancelled-run debug line and its existing test are unchanged.

**Total deviations:** 1 behaviour adjustment, 2 process notes. **Impact:** none on scope.

## Issues Encountered
None.

## Known Stubs
None.

## Threat Flags
None. The list notification, the reveal notification and the Go to Line request are the surface named in the plan's threat model (T-126-11 to T-126-15); each mitigation has a test (own-uri only, click-time clamp, fixed texts, secret-marker sweep, one presenter per exit).

## Next Phase Readiness
Ready for 126-04: the format offer can call `run`; the messenger already has `warnWithAction`/`showDocument`, and the 126-04 members (`warnWithActions`, `openFormatterSettings`) are still to be added. The IntelliJ side has no handler for either notification yet.

## Verification Run
- `npx vitest run test/bbj-denum-outcomes.test.ts test/bbj-denum-service.test.ts test/denum-command.test.ts`: 3 files, 104 tests, all passed
- `npx vitest run test/bbj-format-notices.test.ts test/denum-diagnostics-output.test.ts test/java-interop-program-test-double.test.ts`: 3 files, 96 tests, all passed
- `npm run typecheck:test`: clean
- `npm run lint`: clean (max-warnings 0)
- All task `<acceptance_criteria>` grep checks pass, including no planning identifiers in source or test comments and no `notifyJavaConnectionError` in the service

## Self-Check: PASSED

`bbj-vscode/test/bbj-denum-outcomes.test.ts` exists; commits `8c1874ef`, `b1eb1a10`, `755d534e` are in `git log`.
