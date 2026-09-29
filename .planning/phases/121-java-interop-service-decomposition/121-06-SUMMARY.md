---
phase: 121-java-interop-service-decomposition
plan: "06"
subsystem: api
tags: [java-interop, refactor, tracer]

requires:
  - phase: 121-java-interop-service-decomposition
    provides: "plan 05's completed connection module (shared connection, breaker, generation and parser lane) and exports-check.mjs, reused unchanged by this plan"
provides:
  - "bbj-vscode/src/language/java-interop-class-index.ts exporting CompleteClassIndex (ensure, has, clear, build, size, simpleNameMatches, prefixMatches) and ClassIndexHooks, with the getAllClassNamesRequest moved alongside it"
  - "the front's classIndex field, built with call-time hooks bound to its own connect/buildCompleteClassIndex and the connection module's probeIfDue"
  - "the front's ensureCompleteClassIndex/hasCompleteClassIndex/clearCompleteClassIndex/buildCompleteClassIndex as plain delegates onto classIndex, and resolveClassCandidatesBySimpleName/findClassCandidatesByPrefix kept on the front reading the index through classIndex.simpleNameMatches/prefixMatches while still calling the front's own overridable ensureCompleteClassIndex"
  - "test/java-interop-class-index.test.ts, the class index's own 7-test unit suite with stub hooks and no owning interop service"
affects: [121-07-through-121-10-javainteropservice-split]

actuals:
  tokens: 8300
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Third REF-12 extraction: a sibling module built and held by the front class as a private readonly field, with the front's own protected connect/buildCompleteClassIndex hooks and the connection module's probeIfDue wired in as call-time arrow functions so a subclass override still fires. The two candidate-lookup orchestration methods (resolveClassCandidatesBySimpleName, findClassCandidatesByPrefix) deliberately stayed on the front class rather than moving into the module, and both keep calling this.ensureCompleteClassIndex(token) — the front's own (possibly overridden) delegate — closing the hazard where a hermetic test double's ensureCompleteClassIndex override could be bypassed by an unoverridden method reading the collaborator directly."

key-files:
  created:
    - bbj-vscode/src/language/java-interop-class-index.ts
    - bbj-vscode/test/java-interop-class-index.test.ts
  modified:
    - bbj-vscode/src/language/java-interop.ts

key-decisions:
  - "buildCompleteClassIndex hook wiring in the module's own test uses a forward-declared `const index: CompleteClassIndex = new CompleteClassIndex({ ..., buildCompleteClassIndex: (fqns) => index.build(fqns) })` (the same forward-reference idiom plan 04's connection test used for its `connect` hook), matching how the real front wires the hook to its own buildCompleteClassIndex()."
  - "Reworded one JSDoc line in the new module to avoid a second literal occurrence of `limit * 2` (the prefixMatches doc comment now says \"twice `limit`\") so the extraction's own acceptance check — which counts exactly one `limit * 2` occurrence in the file, the code line itself — stays satisfied without weakening the doc comment's meaning."
  - "getAllClassNamesRequest (the RequestType and its JSDoc) moved into the new module unexported, exactly like ensureCompleteClassIndex's other sibling collaborators keep their own request types local; nothing outside the module needs it."

requirements-completed: []

coverage:
  - id: D1
    description: "CompleteClassIndex holds the complete class index (build, has, clear, size, simpleNameMatches, prefixMatches, ensure with the getAllClassNames request); the front's protected clearCompleteClassIndex/buildCompleteClassIndex hooks and public ensureCompleteClassIndex/hasCompleteClassIndex delegates stay on JavaInteropService; resolveClassCandidatesBySimpleName and findClassCandidatesByPrefix stay on the front as orchestration and both keep calling this.ensureCompleteClassIndex(token), reading the index only through classIndex.simpleNameMatches/prefixMatches"
    requirement: "REF-12"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-class-index.test.ts (7 tests: build() indexing/skip rules, simpleNameMatches case-insensitivity and unknown-name empty array, prefixMatches limit*2 stop, clear() dropping has(), ensure() success building once, MethodNotFound latching, a transient error not latching)"
        status: pass
      - kind: unit
        ref: "the eleven targeted suites (eight java-interop-*.test.ts plus the new java-interop-class-index, code-action, completion-test) — 11 files, 199 tests"
        status: pass
    human_judgment: false
  - id: D2
    description: "The extraction touches only its three files, no pre-existing test file changed since the REF-09 end commit, the whole suite matches the phase base in failing test names, lint/typecheck/build/hygiene are clean, and REQUIREMENTS.md is untouched"
    verification:
      - kind: unit
        ref: "Task 2's four verify commands (scope, whole-suite JSON comparison, gates, hygiene) — all four print their expected OK line"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-09-29
status: complete
---

# Phase 121 Plan 06: Java Interop Class Index Extraction (REF-12, fourth of five) Summary

**The complete class index (`completeClassIndex`, `completeIndexResolved`, `ensureCompleteClassIndex`, `hasCompleteClassIndex`, `clearCompleteClassIndex`, `buildCompleteClassIndex`, the `getAllClassNames` request) moves out of `JavaInteropService` into a new `java-interop-class-index.ts` module (`CompleteClassIndex`), reached only through call-time hooks; the two candidate-lookup orchestration methods stay on the front and keep deferring to its own overridable `ensureCompleteClassIndex`, with a 7-test unit suite of its own and the interop, code-action and completion suites staying green against the phase base.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-29T11:45:08Z (approx.)
- **Completed:** 2026-09-29T11:53:54Z (approx.)
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `bbj-vscode/src/language/java-interop-class-index.ts` created (141 lines): `export class CompleteClassIndex` built with `constructor(private readonly hooks: ClassIndexHooks)`. Holds the moved `index`/`resolved` fields (renamed from `completeClassIndex`/`completeIndexResolved`), and public methods `ensure(token)` (body verbatim except `this.interopConnection.probeIfDue()` → `this.hooks.probeIfDue()`, `this.connect()` → `this.hooks.connect()`, `this.buildCompleteClassIndex(fqns)` → `this.hooks.buildCompleteClassIndex(fqns)`), `has()`, `clear()`, `build(fqns)`, `get size()`, `simpleNameMatches(simpleName)` (lowercasing internally, returning a fresh array or `[]`) and `prefixMatches(lowerPrefix, limit)` (the index loop verbatim, stopping once the set reaches `limit * 2`). Also holds the moved, now-unexported `getAllClassNamesRequest`. Imports only `vscode-jsonrpc/node.js`, `METHOD_NOT_FOUND` from `./java-interop-connection.js`, and `logger` — no other sibling module and not `java-interop.ts`.
- `java-interop.ts` (down to roughly 1,250 lines): the two index fields and `getAllClassNamesRequest` deleted; `private readonly classIndex = new CompleteClassIndex({ connect: () => this.connect(), probeIfDue: () => this.interopConnection.probeIfDue(), buildCompleteClassIndex: (fqns) => this.buildCompleteClassIndex(fqns) })` added where the old fields sat. `ensureCompleteClassIndex`/`hasCompleteClassIndex` are now plain (non-`async`) public delegates returning `this.classIndex.ensure(token)`/`this.classIndex.has()`; `clearCompleteClassIndex`/`buildCompleteClassIndex` stay protected hooks, now one-line delegates to `this.classIndex.clear()`/`this.classIndex.build(fqns)`. `resolveClassCandidatesBySimpleName`'s index branch is `return this.classIndex.simpleNameMatches(simpleName).sort();`; `findClassCandidatesByPrefix`'s index branch loops `this.classIndex.prefixMatches(lower, limit)` into `matches`. Both methods keep `await this.ensureCompleteClassIndex(token)` exactly as written, unchanged fallback branches, JSDoc and return statements. `clearCache()`'s step 2 (`this.clearCompleteClassIndex();`) is untouched. `METHOD_NOT_FOUND` was removed from the front's own value import (it was only used inside the moved `ensureCompleteClassIndex` body) — the existing `export { ... METHOD_NOT_FOUND } from './java-interop-connection.js';` re-export line, a separate statement, is unaffected and still satisfies D-08.
- `bbj-vscode/test/java-interop-class-index.test.ts` created (7 tests): builds `CompleteClassIndex` alone with stub hooks — a `connect` hook returning a fake `MessageConnection` whose `sendRequest` answers from a script (`'ok' | 'method-not-found' | 'transient-error'`), a `probeIfDue` hook counting calls, and a `buildCompleteClassIndex` hook forwarding to the instance's own `build()` via a forward-declared `const index` reference (mirroring the real front's wiring and plan 04's own stub-hook idiom). Covers: `build()` indexing by lowercased simple name while skipping `$`-inner and packageless names; `simpleNameMatches` case-insensitive lookup and an empty array for an unknown name; `prefixMatches` collecting matches and stopping once the set reaches `limit * 2`; `clear()` dropping the index so `has()` is false; `ensure()` on success building once and returning true, with a second call probing instead of re-sending; a `MethodNotFound` answer latching (`ensure()` returns false, a second call sends no request and calls `probeIfDue`); a transient error not latching (`ensure()` returns false, a second call sends the request again).
- Tracer feedback gate (auto mode active, `workflow.auto_advance: true`): re-ran Task 1's three `<verify>` commands end-to-end after the commit — all passed (`class index extracted`, `exports OK`, 11/11 test files / 199/199 tests) — before proceeding to Task 2.
- Task 2 measured the move against the phase base: scope check (only the three planned files changed since this plan's own start, no pre-existing test file touched since the REF-09 end commit, no `src` file outside `java-interop*.ts` changed, no module imports `./java-interop.js`, the connection and lock modules import no sibling), whole-suite run (3,701 tests, 0 failed, the one pre-existing failing suite name (`installed-extension-e2e.test.ts`) unchanged from the base list), `lint`/`typecheck:test`/`build` all green, and the hygiene id-scan clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: The complete class index runs from CompleteClassIndex, with its own unit test, and the interop, code-action and completion suites pass** - `23c6226d` (refactor)
2. **Task 2: Class-index extraction measured against the phase base** - no code commit (measurement/SUMMARY only)

**Plan metadata:** this SUMMARY's own commit.

## Files Created/Modified

- `bbj-vscode/src/language/java-interop-class-index.ts` - the extracted `CompleteClassIndex` class, its `ClassIndexHooks` interface, and the moved `getAllClassNamesRequest`
- `bbj-vscode/src/language/java-interop.ts` - uses `this.classIndex` in place of the former index fields; `resolveClassCandidatesBySimpleName`/`findClassCandidatesByPrefix` stay on the front, reading the index through the new module while still calling the front's own `ensureCompleteClassIndex`
- `bbj-vscode/test/java-interop-class-index.test.ts` - the class index's own 7-test unit suite

## Decisions Made

See `key-decisions` in the frontmatter: the forward-reference `buildCompleteClassIndex` hook wiring in the test, the doc-comment reword to keep the `limit * 2` acceptance check exact, and keeping `getAllClassNamesRequest` unexported inside the new module.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Verification Evidence

**Plan start SHA:** `8d3bf808dbbec1b4ab39d3be95a39067bb8003fc`
**REF-09 end SHA (from plan 02):** `c42513d31ca4cad14e58001bffd7f75a5e6ce51a`
**Precondition (plan 05 committed, exports-check.mjs green before this plan's own edits):** `exports base=15 head=15 missing=0` / `exports OK`

**Task 1 — class index extraction check:** `class index extracted` (no `completeClassIndex`/`completeIndexResolved`/`getAllClassNamesRequest` survive in non-comment lines of `java-interop.ts`; the front builds `classIndex` with call-time hooks; the delegates, orchestration methods and `.bind(this)`-free wiring are all present; the new module's `CompleteClassIndex` class, its hook calls and its single `limit * 2` occurrence are all present; it imports no sibling other than the connection module).

**Task 1 — exports check:** `exports base=15 head=15 missing=0` then `exports OK`.

**Task 1 — targeted suites:** `Test Files 11 passed (11)`, `Tests 199 passed (199)` (the eight `java-interop-*.test.ts` suites plus the new `java-interop-class-index`, `code-action` and `completion-test`).

**Tracer feedback gate (auto mode):** all three of Task 1's `<verify>` commands re-run and passed identically after the commit.

**Task 2 — scope check:**
```
scope OK
```
(no pre-existing test file changed since the REF-09 end commit; the only added test files since the REF-09 end commit are `java-interop-class-index.test.ts`, `java-interop-connection.test.ts` and `java-interop-lock.test.ts`; the full diff since this plan's own start touches exactly `java-interop-class-index.ts`, `java-interop.ts`, `java-interop-class-index.test.ts`; no `src` file outside `java-interop*.ts` changed since the REF-09 end commit; no module imports `./java-interop.js`; the connection and lock modules import no sibling)

**Task 2 — whole suite (suite-06):**
```
numFailedTests=0 numPassedTests=3671 numPendingTests=30 numTotalTests=3701 failedSuites=1 lines=1
```
Failing suite name: `test/functional/installed-extension-e2e.test.ts > (suite failed)` — identical to the base list (`comm -13` returned empty). `suite names OK`.

**Task 2 — gates:** `npm run lint`, `npm run typecheck:test`, `npm run build` all exit 0 (`gates OK`).

**Task 2 — hygiene:** no new planning identifier in any added `src`/`test` line, no closing-keyword commit body since the phase base, `hygiene OK`.

**REQUIREMENTS.md:** unchanged by this plan (`git diff --quiet` against the plan start SHA — REF-12 is declared by plans 03-10 and only plan 10 marks it, per the executor shell rules).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The complete class index is fully extracted and independently testable; the front class's protected hooks, public delegates and the two candidate-lookup orchestration methods all route through `classIndex` while still deferring to the front's own overridable `ensureCompleteClassIndex`.
- `/home/coder/repos/tmp/phase-121/exports-check.mjs` continues to pass (base=15, head=15, missing=0) and is ready for plan 07 onward.
- Per CONTEXT.md's planner assumptions, the remaining plans extract classpath loading and resolution/cache/tree into their own modules; neither needs to import `java-interop.ts` back.

## Self-Check: PASSED

All key files confirmed present on disk:
- `bbj-vscode/src/language/java-interop-class-index.ts` — `export class CompleteClassIndex` present.
- `bbj-vscode/test/java-interop-class-index.test.ts` — 7 `test(` blocks present.
- `bbj-vscode/src/language/java-interop.ts` — `private readonly classIndex = new CompleteClassIndex(` present; none of the moved index fields or `getAllClassNamesRequest` remain in non-comment lines.

Commit `23c6226d` confirmed present in `git log --oneline -5`.

---
*Phase: 121-java-interop-service-decomposition*
*Completed: 2026-09-29*
