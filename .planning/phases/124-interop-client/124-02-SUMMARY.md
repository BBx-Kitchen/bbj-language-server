---
phase: 124-interop-client
plan: 02
subsystem: infra
tags: [json-rpc, bbj-ls, validation, formatProgram, denumProgram, vitest]

requires:
  - phase: 124-interop-client
    provides: java-peer-guard.ts truncateText and MAX_PEER_ERROR_LENGTH (existing), java-interop-errors.ts classifier (plan 01)
provides:
  - "java-interop-program-types.ts: wire types, ProgramOutcome union and the formatProgram/denumProgram RequestType constants"
  - "java-program-guard.ts: validateFormatResult, validateDenumResult, sanitizeProgramDiagnostics, sanitizePeerText, programLineLengths, allowedProgramTextLength and the size/diagnostic bounds"
  - "test/java-program-guard.test.ts pinning every malformed shape, size cap and sanitising rule"
affects: [124-03, 124-04, 124-05, 124-06, 125-ls-formatting, 126-ls-denum]

actuals:
  tokens: 11100
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Peer answers validated against the request that was sent and rebuilt as fresh objects, never passed through"
    - "Refusals carry a fixed reason token, never peer text"
    - "Tolerant range check: the edit must overlap the requested lines but may be larger"

key-files:
  created:
    - bbj-vscode/src/language/java-interop-program-types.ts
    - bbj-vscode/src/language/java-program-guard.ts
    - bbj-vscode/test/java-program-guard.test.ts
  modified: []

key-decisions:
  - "Control-character stripping is a character loop (no regex literal), so the no-control-regex lint rule stays untouched"
  - "A range answer's diagnostics are bounded by the line count of the sent text, because a range answer has no text of its own"
  - "Absent or null denumbered reads as false on a format answer, but is refused on a DENUM answer, which always states it"

patterns-established:
  - "One private envelope check (plain object plus strict version echo) shared by both validators"
  - "Validators return { ok, value } or { ok, reason }; callers map a refusal to the malformed-result outcome"

requirements-completed: [INT-01, INT-05]

duration: 5min
completed: 2026-10-01
status: complete

coverage:
  - id: D1
    description: "Typed request and response shapes for whole-document and range formatProgram and for denumProgram, with an optional typed allowDenum and the request constants"
    requirement: INT-01
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-program-guard.test.ts#whole-document format answers; typecheck:test"
        status: pass
    human_judgment: false
  - id: D2
    description: "A whole-document, range or DENUM answer is accepted only in the exact contract shape with the echoed version, and a malformed or stale one is refused with a fixed reason token"
    requirement: INT-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-program-guard.test.ts#range format answers, DENUM answers, whole-document refusals"
        status: pass
    human_judgment: false
  - id: D3
    description: "Returned text and range newText above 4 x request + 64 KiB, or 16 MiB, are refused"
    requirement: INT-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-program-guard.test.ts#text size caps"
        status: pass
    human_judgment: false
  - id: D4
    description: "Diagnostics are capped at 500, stripped of control, bidi and line-separator characters, truncated, keep line 0, and drop a bad entry on its own; validated results are fresh objects"
    requirement: INT-05
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-program-guard.test.ts#diagnostics sanitising"
        status: pass
    human_judgment: false
---

# Phase 124 Plan 02: Program Wire Types and Response Guard Summary

**Typed formatProgram/denumProgram wire contract plus a guard that accepts a peer answer only in the exact shape of the request that was sent, with the echoed version, size bounds, in-document range edits and sanitised diagnostics, rebuilt as a fresh object or refused with a fixed token.**

## Performance

- **Duration:** about 5 min
- **Started:** 2026-10-01T12:21:00Z
- **Completed:** 2026-10-01T12:26:00Z
- **Tasks:** 3
- **Files modified:** 3 (all new)

## Accomplishments

- `java-interop-program-types.ts` defines the contract plans 03-06 and Phases 125/126 code against: positions, ranges, edits, diagnostics, `FormatProgramParams` (with typed optional `allowDenum`, optional `settings` and `range`), the document and range result variants, `DenumProgramParams/Result`, `ProgramOutcome<R>` and the two `RequestType` constants. The result generic is `unknown` on purpose so a raw wire value must pass the guard first.
- `java-program-guard.ts` validates a whole-document answer (string `text`, no `edits`), a range answer (no `text`, at most one edit with integer non-negative positions, `start` not after `end`, inside the sent document with lines split on LF, CRLF and lone CR, and overlapping the requested lines) and a DENUM answer (string `text`, boolean `denumbered`). Every answer must echo the version that was sent. Text and `newText` are capped at the smaller of 4 x request + 64 KiB and 16 MiB.
- Diagnostics are capped at 500, messages are truncated to 1024 and stripped of C0/C1, DEL, bidi and line-separator characters (line breaks and tab become a space), original line numbers are bounded to 32, line `0` is kept as "no location", and a bad entry is dropped alone. All results are fresh objects, including each edit, range and position.
- 76 tests cover each reason token, the live-observed range findings (clamped end, no trailing newline, CRLF, lone CR, empty edits, zero-width request widened to a statement), both size caps, and a `__proto__` JSON case.

## Task Commits

1. **Task 1: Whole-document answer becomes a typed result, a stale one is refused** - `e8da43b5` (feat, tracer)
2. **Task 2: Range answers validated against the sent document** - TDD:
   - RED `62f01b9e` (test) - 34 of 37 tests failed
   - GREEN `34fbf894` (feat)
3. **Task 3: DENUM answers validated, every malformed shape and sanitising rule pinned** - TDD:
   - RED `4da9e5d3` (test) - 14 of 76 tests failed (all needing the DENUM validator); the cap and sanitising tests already passed because Task 1 already built those helpers
   - GREEN `da219fa9` (feat)

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified

- `bbj-vscode/src/language/java-interop-program-types.ts` - wire types, outcome union, request constants
- `bbj-vscode/src/language/java-program-guard.ts` - answer validation and sanitising
- `bbj-vscode/test/java-program-guard.test.ts` - every malformed shape and sanitising rule

## Decisions Made

- Stripping is a plain character loop rather than a regular expression, which keeps `no-control-regex` quiet without a lint directive.
- A range answer's diagnostics are bounded by the line count of the text that was sent; a whole-document or DENUM answer's by the line count of its own text.
- A format answer reads an absent `denumbered` as `false`; a DENUM answer refuses it, per the plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A test fixture miscounted the document's lines**
- **Found during:** Task 2 (writing the range refusal tests)
- **Issue:** The first draft of the "a line past the last line" case used line 3, but `'if a then print 1\n  x=1\nrem y\n'` has four lines (the last is empty), so line 3 is inside the document.
- **Fix:** The case now uses line 4.
- **Files modified:** `bbj-vscode/test/java-program-guard.test.ts`
- **Verification:** the case is refused with `edit-outside-document`
- **Committed in:** `62f01b9e` (before the RED commit was made)

Commit trailer: the plan's executor rules name `Claude Opus 5.5` in the trailer; this executor is Claude Sonnet 5.5 and the session's attribution instruction names that model, so commits carry `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

---

**Total deviations:** 1 auto-fixed (1 test fixture bug), plus the trailer note above.
**Impact on plan:** None; no production behaviour changed.

## Issues Encountered

None. The Grep tool was not registered in this session, so acceptance greps ran as scoped `grep` calls on absolute paths.

## Regression Judgement

Targeted run only, as written in the plan's verify: `npx vitest run test/java-program-guard.test.ts` (76 passed), `npm run typecheck:test` and `npm run lint` are clean. The whole suite was not run; the three files are new and nothing imports them yet, so no existing test can be affected. The known environment failures (linking interop drift, issue447 capability) were not re-observed.

## Known Stubs

None.

## Threat Flags

None. The only new surface is peer answer data crossing the guard, which is the plan's own threat model (T-124-06 to T-124-12), each mitigated and tested: size caps, diagnostics caps and truncation, positions checked against the sent document, strict version echo, control and bidi stripping, fresh objects with `__proto__` coverage, and fixed refusal tokens.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 124-03 can import `formatProgramRequest`, `denumProgramRequest`, `ProgramOutcome`, `validateFormatResult` and `validateDenumResult` with the exact names from the plan contract, and map a `{ ok: false, reason }` refusal to `{ kind: 'malformed-result', reason }`.
- `requirements-completed` lists INT-01 and INT-05; both are also declared by later plans in this phase, so `requirements.ready-ids` reported 0 of 2 ready and neither was marked complete in REQUIREMENTS.md here (shared-ID gate).

## Self-Check: PASSED

- FOUND: bbj-vscode/src/language/java-interop-program-types.ts
- FOUND: bbj-vscode/src/language/java-program-guard.ts
- FOUND: bbj-vscode/test/java-program-guard.test.ts
- FOUND commits: e8da43b5, 62f01b9e, 34fbf894, 4da9e5d3, da219fa9
- Acceptance greps for all three tasks pass; no planning identifiers in the three files; vitest, typecheck:test and lint clean.

---
*Phase: 124-interop-client*
*Completed: 2026-10-01*
