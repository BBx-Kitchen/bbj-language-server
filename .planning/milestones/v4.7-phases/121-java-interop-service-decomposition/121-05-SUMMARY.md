---
phase: 121-java-interop-service-decomposition
plan: "05"
subsystem: api
tags: [java-interop, refactor, parser, tracer]

requires:
  - phase: 121-java-interop-service-decomposition
    provides: "plan 04's connection/breaker extraction and the front's interopConnection field, hooks and _connectionGeneration accessor pair this plan builds on"
provides:
  - "bbj-vscode/src/language/java-interop-connection.ts extended with the dedicated parseProgram lane: the four lane fields, parseProgram, parseLaneConnection, openParseLane, onParseLaneLost, disposeParseLane, parseProgramRequest, and the exported ParseProgramParams/ParseError/ParseProgramResult types"
  - "the front's parseProgram as a plain non-async delegate returning this.interopConnection.parseProgram(params, token), and disconnect()'s single-call step 6"
  - "test/java-interop-connection.test.ts extended with 5 parse-lane tests (14 total), stub-hook only, no JavaInteropService"
affects: [121-06-through-121-10-javainteropservice-split]

actuals:
  tokens: 8727
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Completes D-05's end state: the connection lifecycle module now owns the shared connection, its breaker, the connection generation and the dedicated parser lane in one place; the front's protected createSocket/wrapSocket/connect hooks remain the single seam every hermetic test double overrides, reached by the lane the same way the shared connection already was."

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/java-interop-connection.ts
    - bbj-vscode/src/language/java-interop.ts
    - bbj-vscode/test/java-interop-connection.test.ts

key-decisions:
  - "disconnect() now absorbs the lane dispose and the retired-generation reset itself (this.disposeParseLane(); this.parseLaneRetiredGeneration = -1;), so the front's clearCache() step 6 collapses to the single this.interopConnection.disconnect() call the plan's must_haves specify — the two lines that used to sit beside the front's own disconnect() call moved inside the module's own disconnect() instead of staying as separate front-side statements."
  - "The delegate's JSDoc replaces the two now-cross-module {@link} targets (the old {@link connect} and {@link sendRequestSafe} references) with plain prose, since sendRequestSafe stays on the front and connect is now reached only through the hooks — a dangling cross-file {@link} would be misleading rather than helpful."
  - "The connection module's own parseProgram JSDoc keeps async (unlike the front's now-synchronous delegate) since it is the real implementation awaiting parseLaneConnection()/the hooks — matching the shape every other moved method (connect, requestClassInfo) already has in this module."

requirements-completed: []

coverage:
  - id: D1
    description: "The dedicated parser lane (four fields, parseProgram, parseLaneConnection, openParseLane, onParseLaneLost, disposeParseLane) plus parseProgramRequest and the ParseProgramParams/ParseError/ParseProgramResult types move verbatim into java-interop-connection.ts; the lane opens through hooks.createSocket()/hooks.wrapSocket() and falls back through hooks.connect(), never a bound method or the module's own connect(); the front's parseProgram is a plain non-async delegate; disconnect() carries the lane dispose and retired-generation reset in one call"
    requirement: "REF-12"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-connection.test.ts (14 tests: the 9 from plan 04 plus 5 new — lane-open-and-reuse, close-listener bumps generation and reopens, MethodNotFound retires the lane and falls back, an unopenable lane falls back without touching the breaker, disconnect() disposes the lane)"
        status: pass
      - kind: unit
        ref: "the ten targeted suites (eight java-interop-*.test.ts plus java-interop-connection and bbj-parser-service) — 10 files, 191 tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "The lane move touches only its three files, no pre-existing test file changed since the REF-09 end commit, the whole suite matches the phase base in failing test names, lint/typecheck/build/hygiene are clean, and REQUIREMENTS.md is untouched"
    verification:
      - kind: unit
        ref: "Task 2's four verify commands (scope, whole-suite JSON comparison, gates, hygiene) — all four print their expected OK line"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-09-29
status: complete
---

# Phase 121 Plan 05: Java Interop Connection Extraction, Second Half (REF-12, third of five) Summary

**The dedicated `parseProgram` lane moves out of `JavaInteropService` into `java-interop-connection.ts`, completing D-05's end state: the connection lifecycle module now owns the shared connection, its circuit breaker, the connection generation and the dedicated parser connection in one place, reached only through the front's call-time hooks, with 5 new unit tests and the parse-lane, parser-service and whole test suite staying green against the phase base.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-29T11:31:49Z
- **Completed:** 2026-09-29T11:44:00Z (approx.)
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `bbj-vscode/src/language/java-interop-connection.ts` (579 lines, up from 371): gained the module-level `parseProgramRequest` (unexported `RequestType`) and the exported `ParseProgramParams`/`ParseError`/`ParseProgramResult` interfaces, placed beside `getClassInfoRequest`/`ClassInfoParams`. `JavaInteropConnection` gained the four lane fields (`parseLane`, `parseLaneGeneration`, `parseLaneConnecting`, `parseLaneRetiredGeneration`), a public `parseProgram(params, token)` (lane first, falling back to `this.hooks.connect()` when no lane; a `METHOD_NOT_FOUND` answer retires the lane for the generation and disposes it), and the private `parseLaneConnection`/`openParseLane`/`onParseLaneLost`/`disposeParseLane` — bodies moved verbatim apart from `this.connect()` → `this.hooks.connect()`, `this.createSocket()` → `this.hooks.createSocket()`, `this.wrapSocket(socket)` → `this.hooks.wrapSocket(socket)`, and `this._connectionGeneration` → `this.generation` (plus the matching `{@link}` targets). `disconnect()` now ends with `this.disposeParseLane(); this.parseLaneRetiredGeneration = -1;` (with their original comment), completing D-07's single-call step 6.
- `java-interop.ts` (down to roughly 1,290 lines): the four lane fields and five lane methods deleted; `parseProgram` is now a plain non-async delegate — `public parseProgram(params: ParseProgramParams, token?: CancellationToken): Promise<ParseProgramResult> { return this.interopConnection.parseProgram(params, token); }`. `clearCache()`'s former step 6 (`this.interopConnection.disconnect(); this.disposeParseLane(); this.parseLaneRetiredGeneration = -1;`) collapsed to the single `this.interopConnection.disconnect();` call, since the module's own `disconnect()` now does the lane cleanup itself. Added `type ParseProgramParams, type ParseProgramResult` to the existing `java-interop-connection.js` import (needed by the delegate's signature) and a new `export type { ParseProgramParams, ParseError, ParseProgramResult } from './java-interop-connection.js';` line (D-08) so `bbj-parser-service.ts`'s unchanged `import { ParseError, ParseProgramParams } from './java-interop.js'` keeps resolving.
- `bbj-vscode/test/java-interop-connection.test.ts` (14 tests, up from 9): extended the stub `FakeConnectionRecord`/`createFakeMessageConnection` with a scriptable `sendRequestOutcome` (`'ok' | 'method-not-found'`, driving a `METHOD_NOT_FOUND`-coded rejection) and a `sendRequestCalls` counter, plus a `failingSocketAttempts` index set on the `createSocket` hook so a specific socket attempt (the lane's own) can be made to fail independently of the shared `socketMode`. New tests: (1) the first `parseProgram()` opens the lane and sends on it, a second call in the same generation reuses it; (2) firing the lane's close listener bumps `generation` by 1 and the next `parseProgram()` opens a fresh lane; (3) a `METHOD_NOT_FOUND` answer rejects the call, disposes the lane, and the next call in the same generation falls back through the connect hook; (4) a lane whose socket cannot be opened falls back to the connect hook with no throw and two consecutive socket attempts — proving the lane's own `createSocket()` failure never opened the breaker; (5) `disconnect()` disposes the lane and the next `parseProgram()` opens a fresh one.
- Tracer feedback gate (auto mode active, `workflow.auto_advance: true`): re-ran Task 1's four `<verify>` commands end-to-end after the commit — all passed (`parse lane moved`, `exports OK`, 10/10 test files / 191/191 tests) — before proceeding to Task 2.
- Task 2 measured the move against the phase base: scope check (only the three planned files changed since this plan's own start, no pre-existing test file touched since the REF-09 end commit, no `src` file outside `java-interop*.ts` changed, no module imports `./java-interop.js`), whole-suite run (3,694 tests, 0 failed, the one pre-existing failing suite name (`installed-extension-e2e.test.ts`) unchanged from the base list), `lint`/`typecheck:test`/`build` all green, and the hygiene id-scan clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: The dedicated parser connection runs from JavaInteropConnection, with its unit tests, and the parse-lane and parser-service suites pass** - `e0f21152` (refactor)
2. **Task 2: Parse-lane move measured against the phase base** - no code commit (measurement/SUMMARY only)

**Plan metadata:** this SUMMARY's own commit.

## Files Created/Modified

- `bbj-vscode/src/language/java-interop-connection.ts` - gained the dedicated parser lane, `parseProgramRequest`, and the `ParseProgramParams`/`ParseError`/`ParseProgramResult` types; `disconnect()` now disposes the lane and resets the retired generation itself
- `bbj-vscode/src/language/java-interop.ts` - `parseProgram` is now a plain delegate onto `this.interopConnection.parseProgram`; `clearCache()`'s step 6 is a single `interopConnection.disconnect()` call; the three parse types are re-exported
- `bbj-vscode/test/java-interop-connection.test.ts` - 5 new lane tests plus the scriptable `sendRequestOutcome`/`failingSocketAttempts` test infrastructure they needed

## Decisions Made

See `key-decisions` in the frontmatter: `disconnect()` absorbing the lane cleanup (matching the plan's stated D-07 end state), the JSDoc `{@link}` cleanup for the now-cross-module references, and keeping the connection module's `parseProgram` `async` while the front's delegate is plain.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Verification Evidence

**Plan start SHA:** `32c404363564f3c7f0d8698829bba884813621ab`
**REF-09 end SHA (from plan 02):** `c42513d31ca4cad14e58001bffd7f75a5e6ce51a`
**Precondition (plan 04 committed, exports-check.mjs green before this plan's own edits):** `exports base=15 head=15 missing=0` / `exports OK`

**Task 1 — parse lane moved check:** `parse lane moved` (no `parseLane`/`openParseLane`/`onParseLaneLost`/`disposeParseLane`/`parseProgramRequest`/`export interface Parse*` survive in non-comment lines of `java-interop.ts`; the delegate returns `this.interopConnection.parseProgram(params, token)`; the `export type` re-export line is present; no `.bind(this)`; the connection module's `parseProgram` signature matches; `this.hooks.connect()` appears 3+ times, `this.hooks.createSocket()`/`this.hooks.wrapSocket(socket)` appear exactly twice each; no `this.connect()`/`_connectionGeneration` survive in the module's non-comment lines; `disconnect()`'s three statements and `clearCache()`'s fourteen steps are in their exact expected order; the module imports no sibling `java-interop*` file).

**Task 1 — exports check:** `exports base=15 head=15 missing=0` then `exports OK`.

**Task 1 — targeted suites:** `Test Files 10 passed (10)`, `Tests 191 passed (191)` (the eight `java-interop-*.test.ts` suites plus `java-interop-connection` and `bbj-parser-service`).

**Tracer feedback gate (auto mode):** all four of Task 1's `<verify>` commands re-run and passed identically after the commit.

**Task 2 — scope check:**
```
scope OK
```
(no pre-existing test file changed since the REF-09 end commit; the only added test files since the REF-09 end commit are `java-interop-connection.test.ts` and plan 03's `java-interop-lock.test.ts`; the full diff since this plan's own start touches exactly `java-interop-connection.ts`, `java-interop.ts`, `java-interop-connection.test.ts`; no `src` file outside `java-interop*.ts` changed since the REF-09 end commit; no module imports `./java-interop.js`)

**Task 2 — whole suite (suite-05):**
```
numFailedTests=0 numPassedTests=3664 numPendingTests=30 numTotalTests=3694 failedSuites=1 lines=1
```
Failing suite name: `test/functional/installed-extension-e2e.test.ts > (suite failed)` — identical to the base list (`comm -13` returned empty). `suite names OK`.

**Task 2 — gates:** `npm run lint`, `npm run typecheck:test`, `npm run build` all exit 0 (`gates OK`).

**Task 2 — hygiene:** no new planning identifier in any added `src`/`test` line, no closing-keyword commit body since the phase base, `hygiene OK`.

**REQUIREMENTS.md:** unchanged by this plan (`git diff --quiet` against the plan start SHA — REF-12 is declared by plans 03-10 and only plan 10 marks it, per the executor shell rules).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The connection lifecycle module is now complete per D-05's end state: shared connection, breaker, generation and the dedicated parser lane all live in `java-interop-connection.ts`, reached only through the front's protected hooks; `parseProgram` is a public delegate; `disconnect()` carries the full lane/breaker/connection cleanup in one call.
- `/home/coder/repos/tmp/phase-121/exports-check.mjs` continues to pass (base=15, head=15, missing=0) and is ready for plan 06 onward.
- Per CONTEXT.md's planner assumptions, the next plans extract the remaining responsibilities (resolution/cache/tree, classpath loading, complete class index) into their own modules; none of them need to import `java-interop.ts` back.

## Self-Check: PASSED

All key files confirmed present on disk:
- `bbj-vscode/src/language/java-interop-connection.ts` — the lane fields, `parseProgram`, and the four private lane methods present.
- `bbj-vscode/test/java-interop-connection.test.ts` — 14 `test(` blocks present.
- `bbj-vscode/src/language/java-interop.ts` — `public parseProgram(params: ParseProgramParams, token?: CancellationToken): Promise<ParseProgramResult> {` present; none of the moved lane fields or methods remain.

Commit `e0f21152` confirmed present in `git log --oneline -5`.

---
*Phase: 121-java-interop-service-decomposition*
*Completed: 2026-09-29*
