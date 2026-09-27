---
phase: 113-composer-webview-hardening-consolidation
plan: "06"
subsystem: refactor
tags: [vscode-extension, msgbox, addwindow, addchildwindow, cvs, call-locator, vitest]

requires:
  - phase: 113-composer-webview-hardening-consolidation
    provides: "plan 01's TEST-10 coverage (addwindow/addchildwindow/setopts *-ui.ts files unmocked) and plan 04's assignTo validation, as pre-existing behaviour this consolidation must leave unchanged"
provides:
  - "bbj-vscode/src/composer-call-scanner.ts: scanArgs, trimmedRange (moved from addwindow-composer.ts), the name-parameterised findCalls locator, findCallAt, CallSpan and CallLocatorOptions"
  - "addwindow-composer.ts, addchildwindow-composer.ts, msgbox-composer.ts, cvs-composer.ts: findXCalls/findXCallAt are one-line wrappers over the shared scanner; no composer keeps its own scanArgs/trimmedRange copy or exec-loop/reduce locator"
affects: [113-07, 113-08, 113-UAT]

actuals:
  tokens: 5800
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "findCalls<T extends CallSpan>(line, name, build, options) is the one generic call locator; each composer's findXCalls(line) is a one-line call of it with its own buildCallInfo and (for CVS) the notAfterIdentifierOrDot option, so callers and existing test assertions never change"
    - "findCallAt<T extends CallSpan>(calls, character) replaces every composer's own containing-span reduce; each findXCallAt(line, character) is a one-line call of it over findXCalls(line)"

key-files:
  created:
    - bbj-vscode/src/composer-call-scanner.ts
    - bbj-vscode/test/composer-call-scanner.test.ts
  modified:
    - bbj-vscode/src/addwindow-composer.ts
    - bbj-vscode/src/addchildwindow-composer.ts
    - bbj-vscode/src/msgbox-composer.ts
    - bbj-vscode/src/cvs-composer.ts

key-decisions:
  - "findCalls takes the boundary as an explicit CallLocatorOptions.notAfterIdentifierOrDot flag rather than interpolating the keyword into one shared plain regex template, so CVS's stricter obj.cvs(/xcvs(-excluding boundary is preserved while MSGBOX/addWindow/addChildWindow keep their existing looser matching (research Pitfall 1)"
  - "findCalls validates name against a plain-ASCII-identifier regex and throws otherwise, since the parameter is meant for a fixed BBj keyword, never attacker-controlled text"
  - "findCallAt takes an already-located calls array (not a line), so each composer's findXCallAt is exactly findCallAt(findXCalls(line), character) with no per-composer scanning logic left"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "composer-call-scanner.ts exists with scanArgs, trimmedRange moved verbatim, and a name-parameterised findCalls/findCallAt locator, with zero import statements (no vscode dependency)"
    requirement: REF-08
    verification:
      - kind: unit
        ref: "test/composer-call-scanner.test.ts (scanArgs, trimmedRange, findCalls, findCallAt describe blocks)"
        status: pass
      - kind: unit
        ref: "grep -c \"^import\" src/composer-call-scanner.ts prints 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "addWindow's findAddWindowCalls/findAddWindowCallAt run entirely on the shared scanner/locator; every addWindow and addwindow-composer-ui suite passes unchanged"
    requirement: REF-08
    verification:
      - kind: unit
        ref: "test/addwindow-composer.test.ts, test/addwindow-composer-ui.test.ts, test/composer-codelens.test.ts, test/composer-commands.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "MSGBOX, addChildWindow and CVS locate calls through the shared locator; CVS's stricter identifier/dot boundary survives via the notAfterIdentifierOrDot option; no composer keeps a private scanArgs/trimmedRange copy or its own exec-loop/reduce locator"
    requirement: REF-08
    verification:
      - kind: unit
        ref: "test/msgbox-composer.test.ts, test/addchildwindow-composer.test.ts, test/cvs-composer.test.ts, test/msgbox-composer-ui.test.ts, test/cvs-composer-ui.test.ts, test/composer-codelens-handler.test.ts, test/composer-lens-command.test.ts, test/composer-assign-to.test.ts, test/addchildwindow-composer-ui.test.ts, test/setopts-composer-ui.test.ts"
        status: pass
      - kind: unit
        ref: "grep -rn -E '^\\s*(export )?function (scanArgs|trimmedRange)\\(' bbj-vscode/src prints exactly 2 lines, both in composer-call-scanner.ts"
        status: pass
      - kind: unit
        ref: "test/composer-call-scanner.test.ts#per-composer boundary difference survives the consolidation"
        status: pass
    human_judgment: false
  - id: D4
    description: "No existing composer suite regressed: every listed test file is byte-identical to the phase base commit, tsc and eslint are clean, and the whole-suite gate at --maxWorkers=2 shows only the pre-existing linking.test.ts interop baseline"
    requirement: REF-08
    verification:
      - kind: unit
        ref: "npx tsc -p tsconfig.json (exit 0), npx eslint on all touched files (exit 0)"
        status: pass
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (whole suite)"
        status: pass
    human_judgment: false

duration: 39min
completed: 2026-09-27
status: complete
---

# Phase 113 Plan 06: Call locator and argument scanner consolidation Summary

**`scanArgs`, `trimmedRange` and one name-parameterised call locator (`findCalls`/`findCallAt`) now live in a single dependency-free `composer-call-scanner.ts`; MSGBOX, addWindow, addChildWindow and CVS each reduce their `find*Calls`/`find*CallAt` exports to one-line wrappers, with CVS's stricter identifier/dot boundary preserved through an explicit locator option.**

## Performance

- **Duration:** 39 min
- **Started:** 2026-09-27T12:04:00Z
- **Completed:** 2026-09-27T12:43:13Z
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- New `bbj-vscode/src/composer-call-scanner.ts`: `scanArgs`/`trimmedRange` moved verbatim from `addwindow-composer.ts`, plus `findCalls<T extends CallSpan>(line, name, build, options)` — a generic, case-insensitive, name-validated locator — and `findCallAt<T extends CallSpan>(calls, character)`, the smallest-containing-span lookup. Zero imports, so the module stays free of any `vscode` dependency.
- `addwindow-composer.ts`'s `findAddWindowCalls`/`findAddWindowCallAt` are now one-line wrappers over the shared locator; its own `scanArgs`/`trimmedRange` definitions and exec-loop/reduce locator are gone.
- `addchildwindow-composer.ts` and `cvs-composer.ts` import `scanArgs`/`trimmedRange` from the new module instead of `addwindow-composer.ts`.
- `msgbox-composer.ts`'s private `scanArgs`/`trimmedRange` copies are deleted; `findMsgboxCalls`/`findMsgboxCallAt` are one-line wrappers.
- `addchildwindow-composer.ts`'s `findAddChildWindowCalls`/`findAddChildWindowCallAt` are one-line wrappers.
- `cvs-composer.ts`'s `findCvsCalls` wraps `findCalls` with the `notAfterIdentifierOrDot` option (replacing its own `CVS_CALL_BOUNDARY_SOURCE` regex constant), and `findCvsCallAt` wraps `findCallAt` — `obj.cvs(`/`xcvs(` still don't match.
- New `bbj-vscode/test/composer-call-scanner.test.ts`: `scanArgs`/`trimmedRange` edge cases (nested parens/quoted strings, unterminated call, empty call, all-whitespace segment), the generic locator's default vs. stricter matching, `findCallAt`'s span semantics, the identifier-name guard, and a per-composer test pinning that `findMsgboxCalls` stays looser while `findCvsCalls` stays stricter after the move.

## Task Commits

Each task was committed atomically:

1. **Task 1: One shared scanner and name-parameterised locator serve the addWindow composer end to end** - `320b0bf5` (feat)
2. **Task 2: MSGBOX, addChildWindow and CVS locate calls through the shared locator; CVS keeps its boundary; no copy is left** - `2fe62ef8` (refactor)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP update)

## Files Created/Modified
- `bbj-vscode/src/composer-call-scanner.ts` - new module: `scanArgs`, `trimmedRange`, `findCalls`, `findCallAt`, `CallSpan`, `CallLocatorOptions`
- `bbj-vscode/src/addwindow-composer.ts` - `scanArgs`/`trimmedRange` removed (imported instead); `findAddWindowCalls`/`findAddWindowCallAt` reduced to one-line wrappers
- `bbj-vscode/src/addchildwindow-composer.ts` - import source for `scanArgs`/`trimmedRange` changed; `findAddChildWindowCalls`/`findAddChildWindowCallAt` reduced to one-line wrappers
- `bbj-vscode/src/msgbox-composer.ts` - private `scanArgs`/`trimmedRange` removed; `findMsgboxCalls`/`findMsgboxCallAt` reduced to one-line wrappers
- `bbj-vscode/src/cvs-composer.ts` - import source for `scanArgs`/`trimmedRange` changed; `CVS_CALL_BOUNDARY_SOURCE` constant removed; `findCvsCalls`/`findCvsCallAt` reduced to one-line wrappers using the `notAfterIdentifierOrDot` option
- `bbj-vscode/test/composer-call-scanner.test.ts` - new file, both tasks' behavior coverage

## Decisions Made
- The generic locator is parameterised by both the keyword name AND an explicit boundary option, never by interpolating the keyword into one shared plain regex template — this is what lets CVS keep its stricter `obj.cvs(`/`xcvs(`-excluding rule while MSGBOX/addWindow/addChildWindow keep their existing looser matching (research's Pitfall 1, the primary hazard this consolidation needed to avoid).
- `findCalls` validates `name` against a plain-ASCII-identifier regex and throws otherwise, since the parameter is meant for a fixed BBj keyword supplied by this codebase's own composer modules, never external/attacker-controlled text.
- `findCallAt` takes an already-located `calls` array rather than a `line`, so each composer's `findXCallAt` is exactly `findCallAt(findXCalls(line), character)` with no per-composer scanning or reduce logic left anywhere.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- REF-08 (Task 2's `must_haves.truths`) is delivered by this plan alone: exactly one definition each of `scanArgs`/`trimmedRange` exists (both in `composer-call-scanner.ts`), and none of the four composer domain modules contains its own regex exec loop or innermost-call reduce. Per the shared-ID convention with plan 08, `REF-08` is left unmarked in `REQUIREMENTS.md` here — the orchestrator's shared-ID gate marks it complete once every declaring plan has a SUMMARY.
- `composer-call-scanner.ts` is ready for plan 07/08's remaining consolidation work (CSP helper, window-composer UI helper) to build alongside without re-touching this module.
- Whole-suite regression gate at `--maxWorkers=2`: 11 failed / 3400 passed / 41 skipped (3452 total) — the 11 failures are exactly the pre-existing `linking.test.ts` interop baseline (documented in `.planning/STATE.md`/`.planning/DEBT.md`), with no composer-test or other regressions. 3 "failed" test files at the file-summary level (154 passed) reflect the same known `beforeAll` hook-timeout-under-contention pattern (house rule: judge on `numFailedTests`, not the failing-suite identity delta) plus `linking.test.ts` itself.

---
*Phase: 113-composer-webview-hardening-consolidation*
*Completed: 2026-09-27*

## Self-Check: PASSED

- `bbj-vscode/src/composer-call-scanner.ts` and `bbj-vscode/test/composer-call-scanner.test.ts` found on disk.
- Both task commit hashes (`320b0bf5`, `2fe62ef8`) found in `git log --oneline`.
- Task-level acceptance criteria re-verified: `grep -c "^import" src/composer-call-scanner.ts` prints 0; `grep -v -E '^\s*(//|\*|/\*)' src/{msgbox,addwindow,addchildwindow,cvs}-composer.ts | grep -c -E 're\.exec\(line\)|reduce\(\(best|function (scanArgs|trimmedRange)\('` prints 0; `grep -rn -E '^\s*(export )?function (scanArgs|trimmedRange)\(' bbj-vscode/src` prints exactly 2 lines (both in `composer-call-scanner.ts`); `grep -c "findCalls(line, 'cvs'" src/cvs-composer.ts` prints 1; `npx tsc -p tsconfig.json` and `npx eslint` on all touched files both exit 0; `git diff --quiet 90031944` shows zero diff for every listed composer/UI test file and the register-check regex matches 0 lines in the full source+test diff against the phase base.
- Plan-level `<verification>` re-run: `npx vitest run test/composer-call-scanner.test.ts test/msgbox-composer.test.ts test/addwindow-composer.test.ts test/addchildwindow-composer.test.ts test/cvs-composer.test.ts` passes (132 tests, 5 files); the whole-suite gate at `--maxWorkers=2` reports `numFailedTests: 11`, matching the pre-existing `linking.test.ts` interop baseline with no composer-test or other regressions.
