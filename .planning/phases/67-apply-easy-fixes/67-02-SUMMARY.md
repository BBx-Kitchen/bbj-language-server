---
phase: 67-apply-easy-fixes
plan: 02
subsystem: language-server
tags: [java-interop, vitest, testing-infra, promise-race, lru-cache, socket]

# Dependency graph
requires:
  - phase: 67-apply-easy-fixes
    provides: 67-01's apparatus (67-BASELINE.md, 67-APPLY-SET.md, the red-then-green commit
      convention) that this plan applies against the seven java-interop.ts easy-fix rows
provides:
  - java-interop.ts's connect() concurrency/dead-connection-recovery fix (P61-D2-001)
  - java-interop.ts's raced-request defensive catch (P61-D2-002)
  - java-interop.ts's resolveClass() fields/methods null-safety fix (P61-D2-003)
  - java-interop.ts's clearCache() complete-class-index fix (P61-D2-004)
  - java-interop.ts's LruMap-bounded _resolvedClasses cache (P61-D3-001)
  - java-interop.ts's sendRequestSafe() extraction (P61-D4-003)
  - bbj-vscode/test/java-interop-service.test.ts — the new unit-test home for JavaInteropService,
    driven with a mock socket, never touching port 5008
affects: [67-12, 68-doc-01]

# Actuals (#2632)
actuals:
  tokens: 10389
  tasks: 3
  commits: 13

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "In-flight promise guard: connect()'s connectingPromise field lets same-tick concurrent
      callers share one socket-open instead of racing to overwrite this.connection"
    - "LruMap<K,V>: a Map wrapper evicting the least-recently-used entry once a size cap is
      exceeded, via delete+re-insert on get()/set() to exploit Map's insertion-order iteration"
    - "sendRequestSafe(request, params, fallback, token): the shared connect+send+catch-fallback
      shape, extracted where request paths genuinely share it (not force-fit onto paths with
      extra success/error-branch logic)"
    - "Mock-socket unit testing: subclass JavaInteropService, override protected createSocket()
      with an EventEmitter-based FakeSocket implementing only what vscode-jsonrpc's
      SocketMessageReader/Writer actually touch (on/off, write, end, destroy) — never opens a
      real socket, exercises the real createMessageConnection()/connection.listen() machinery"

key-files:
  created:
    - bbj-vscode/test/java-interop-service.test.ts
  modified:
    - bbj-vscode/src/language/java-interop.ts
    - .planning/phases/67-apply-easy-fixes/67-APPLY-SET.md
    - .planning/phases/67-apply-easy-fixes/67-BASELINE.md

key-decisions:
  - "P61-D2-002 documented as a deviation from the plan's default red-before-green pattern:
    empirical reproduction against the REAL vscode-jsonrpc SocketMessageReader/Writer +
    createMessageConnection (not just Node's native Promise.race) proved that
    Promise.race([sendRequest(...), timeoutPromise]) already attaches a rejection handler to
    both race entries synchronously per the ECMAScript spec, so a losing branch's later
    rejection is never unhandled — with or without an extra .catch(). No failing-before state
    was producible. The prescribed fix (a no-op .catch()) was still applied verbatim per the
    record's classification test (5); fail_before is recorded as `inapplicable` with the full
    empirical reasoning in the ledger row's notes, not fabricated as an observed red."
  - "P61-D3-001's cap (RESOLVED_CLASSES_CACHE_LIMIT = 5000) is a discretionary choice — the
    record names no number — exported as a named constant per the plan's instruction and
    imported by the test file rather than duplicated as a literal."
  - "P61-D4-003's sendRequestSafe helper was routed through only 1 of the 4 call sites the
    record's location range spans (loadClasspath). The other 3 (getRawClass's timeout race,
    loadImplicitImports's multi-request per-package processing, ensureCompleteClassIndex's
    METHOD_NOT_FOUND-specific latch) carry logic beyond the helper's plain
    connect+send+catch-fallback shape and were left unrouted rather than force-fit into a
    behaviour-changing refactor. The plan's own acceptance criterion (at least one call site) is
    met; the exclusion reasoning is documented in the helper's doc comment and the ledger row."
  - "P61-D8-001 closed as a genuine no-op, not a re-triage: the finding record's own test-5
    clause offers 'fix the comment, or fix the code per P61-D2-004 so the comment becomes true'
    as two valid resolutions. P61-D2-004 (this same plan) took the code path, and re-reading
    clearCache()'s doc comment against its post-fix body confirmed it is now accurate. No commit
    landed for this row."
  - "FIX-01..04 left Pending in REQUIREMENTS.md, continuing 67-01's established decision: their
    own wording describes phase-end state, and 9 of 77 rows are applied after this plan (2 more
    plans remain of the first wave, 68 total pending rows across 67-03..67-11). Left for 67-12
    (phase close) to mark once genuinely discharged."

patterns-established:
  - "Mock-socket JavaInteropService unit testing (P61-D2-001's own record blessing): a
    MockableJavaInteropService test double overriding protected createSocket(), driven directly
    (not through the language pipeline), for testing connection lifecycle and cache invariants
    that test/linking.test.ts's live-peer-dependent Interop tests cannot exercise deterministically"
  - "When a finding record's claimed mechanism doesn't survive empirical reproduction against the
    real library (not just a native-JS approximation), the prescribed fix is still applied
    (classification is never re-litigated), but fail_before is recorded as
    `inapplicable — <full empirical reasoning>` rather than a fabricated observed-red claim"

requirements-completed: []

coverage:
  - id: D1
    description: "connect() concurrency fix: same-tick callers share one socket via an in-flight
      connectingPromise, and a dropped connection (close/error) is cleared so the next connect()
      reconnects instead of returning the dead reference (P61-D2-001)"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-service.test.ts#two same-tick connect() calls open exactly one socket and share the connection"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/java-interop-service.test.ts#drops the dead connection and reconnects after the peer closes it"
        status: pass
    human_judgment: false
  - id: D2
    description: "getRawClass()'s raced sendRequest promise gets a defensive no-op .catch()
      (P61-D2-002) — empirically the underlying mechanism doesn't produce an unhandled rejection
      with or without this fix, documented as a deviation rather than a fabricated red state"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-service.test.ts#a request that times out is surfaced to the caller with no unhandled rejection"
        status: pass
    human_judgment: true
    rationale: "The fix's effectiveness could not be empirically demonstrated via a red/green
      test pair (see key-decisions) — a human should confirm the documented deviation reasoning
      is sound rather than have it auto-pass on a technicality."
  - id: D3
    description: "resolveClass() defaults javaClass.fields/methods to [] when a classpath
      response omits them, instead of throwing synchronously (P61-D2-003)"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-service.test.ts#defaults missing fields and methods to empty arrays instead of throwing"
        status: pass
    human_judgment: false
  - id: D4
    description: "clearCache() now also clears the complete-class index (completeClassIndex/
      completeIndexResolved) so a classpath reload rebuilds it instead of serving stale FQNs
      (P61-D2-004)"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-service.test.ts#hasCompleteClassIndex() is false after clearCache()"
        status: pass
    human_judgment: false
  - id: D5
    description: "_resolvedClasses is bounded by a named-constant LRU size cap
      (RESOLVED_CLASSES_CACHE_LIMIT = 5000), evicting the least-recently-used entry instead of
      growing without bound (P61-D3-001)"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/java-interop-service.test.ts#resolving more distinct classes than the cap evicts the least-recently-used entry"
        status: pass
    human_judgment: false
  - id: D6
    description: "sendRequestSafe() helper extracted for the duplicated connect+send+catch
      shape; loadClasspath() routed through it (P61-D4-003, behaviour-preserving, no test
      required per D-11)"
    requirement: "FIX-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/imports.test.ts (existing suite, exercises loadClasspath indirectly)"
        status: pass
    human_judgment: false
  - id: D7
    description: "P61-D8-001's clearCache() doc-comment finding closed as a genuine no-op: the
      comment is accurate after P61-D2-004's fix, per the record's own 'or fix the code' escape
      clause"
    requirement: "FIX-01"
    verification: []
    human_judgment: true
    rationale: "Documentation-accuracy judgment call (comparing prose against code behaviour),
      not machine-verifiable; the executor's own comparison is recorded in the ledger row for
      human confirmation."

duration: ~9min
completed: 2026-08-19
status: complete
---

# Phase 67 Plan 02: java-interop.ts Easy Fixes Summary

**Fixed four D2 connection-lifecycle/cache-invalidation defects, bounded an unbounded LRU cache, extracted a duplicated request-handling helper, and closed a stale doc comment — all seven on `java-interop.ts` — behind a new mock-socket unit-test suite that never touches port 5008.**

## Performance

- **Duration:** ~9 min (commit span 10:27:59Z → 10:36:41Z)
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)
- **Commits:** 13

## Accomplishments

- Created `bbj-vscode/test/java-interop-service.test.ts`, the first dedicated unit-test home for `JavaInteropService`: a `MockableJavaInteropService` test double overrides the protected `createSocket()` with an in-memory `FakeSocket` (EventEmitter implementing only what vscode-jsonrpc's `SocketMessageReader`/`SocketMessageWriter` touch), so the real `createMessageConnection()`/`connection.listen()` machinery runs against a mock socket instead of a live peer — 18 tests, all mock-driven, zero reliance on port 5008.
- Fixed the two most severe connection-lifecycle bugs (P61-D2-001): concurrent same-tick `connect()` calls now share one in-flight promise instead of each opening its own socket, and `close`/`error` listeners on the established connection clear the cached reference so a dropped peer forces reconnection instead of handing back a dead `MessageConnection`.
- Defaulted `resolveClass()`'s `fields`/`methods` to `[]` (P61-D2-003), closing a synchronous-throw crash on malformed classpath responses, and fixed `clearCache()` to also clear the complete-class index (P61-D2-004), closing a stale-FQN-after-classpath-reload bug.
- Bounded `_resolvedClasses` with a new `LruMap<K,V>` (P61-D3-001) — a `Map` wrapper evicting the least-recently-used entry via delete+re-insert on `get()`/`set()`, capped at a named `RESOLVED_CLASSES_CACHE_LIMIT` constant (5000, a documented discretionary choice) instead of growing without bound across a long editor session.
- Extracted `sendRequestSafe()` (P61-D4-003) for the shared connect+send+catch-fallback shape and routed `loadClasspath()` through it; documented why the other 3 candidate call sites weren't force-fit into the same helper.
- Closed `P61-D8-001` as a genuine no-op: `clearCache()`'s doc comment became accurate once P61-D2-004 landed, per the finding record's own "or fix the code" escape clause.
- Ran the plan-level baseline delta (D-09): `npm test`'s failing-test NAME set is set-equal to the phase-start gate set (same 11 `linking.test.ts` interop names); `npm run lint` unchanged (exit 0, same 2 pre-existing warnings). Verdict: **identical**.

## Task Commits

Each task was committed atomically, red-then-green where a genuine regression state existed:

1. **Task 1: The four D2 correctness fixes**
   - `38fe1d1` — `test(P61-D2-001): add failing test for concurrent connect and dropped-peer recovery` (RED)
   - `59dc2be` — `fix(P61-D2-001): guard connect with an in-flight promise and clear on close/error` (GREEN)
   - `7ae80a2` — `test(P61-D2-002): assert getRawClass's raced request never produces an unhandled rejection` (always green — see Deviations)
   - `b0696aa` — `fix(P61-D2-002): attach a no-op catch to the raced connect promise`
   - `2770752` — `test(P61-D2-003): add failing test for missing fields/methods on classpath response` (RED)
   - `4c92662` — `fix(P61-D2-003): default fields and methods to empty arrays` (GREEN)
   - `e82f9c2` — `test(P61-D2-004): add failing test for unresolved JavaMethod... clearCache index leak` (RED — commit subject has a leftover-phrase typo, see Issues Encountered)
   - `557ab62` — `fix(P61-D2-004): clear the complete-class index in clearCache` (GREEN)
2. **Task 2: The unbounded cache (D3), the duplicated request path (D4), and the stale comment (D8)**
   - `7a4448d` — `test(P61-D3-001): add failing test for unbounded resolved-class cache` (RED)
   - `6d7be38` — `fix(P61-D3-001): bound _resolvedClasses with an LRU size cap` (GREEN)
   - `8c9028c` — `fix(P61-D4-003): extract sendRequestSafe helper for the duplicated request paths`
   - (P61-D8-001: no commit — no-op, comment already accurate after P61-D2-004)
3. **Task 3: Close the seven ledger rows and run the plan baseline delta**
   - `ddffdcc` — `docs(67-02): close the seven java-interop apply-set rows`
   - `391594a` — `docs(67-02): record plan baseline delta`

## Files Created/Modified

- `bbj-vscode/test/java-interop-service.test.ts` — new unit-test module for `JavaInteropService`, mock-socket-driven, 18 tests across 5 describe blocks
- `bbj-vscode/src/language/java-interop.ts` — `connect()`/`establishConnection()` split, `getRawClass()`'s defensive catch, `resolveClass()`'s fields/methods defaults, `clearCache()`'s index clear, `LruMap<K,V>` + `RESOLVED_CLASSES_CACHE_LIMIT`, `sendRequestSafe()` helper
- `.planning/phases/67-apply-easy-fixes/67-APPLY-SET.md` — 7 rows closed (6 applied, 1 no-op)
- `.planning/phases/67-apply-easy-fixes/67-BASELINE.md` — `### Plan 67-02 delta` subsection appended, verdict identical

## Decisions Made

See `key-decisions` in the frontmatter for the full text. Summary:
- P61-D2-002's fail_before is `inapplicable` with a fully-documented empirical justification, not a fabricated red state (the finding's claimed mechanism does not reproduce against the real vscode-jsonrpc library).
- P61-D3-001's 5000-entry cap is a discretionary, named-constant choice.
- P61-D4-003's helper is routed through 1 of 4 candidate call sites, with the other 3 documented as genuinely not fitting the extracted shape.
- P61-D8-001 closed no-op per its own record's escape clause.
- FIX-01..04 left Pending in REQUIREMENTS.md, continuing 67-01's precedent.

## Deviations from Plan

### 1. [Judgment call, not Rule 1-4] P61-D2-002's red/green pattern could not be honestly produced

- **Found during:** Task 1, P61-D2-002
- **Issue:** The plan's `<behavior>` block specifies a red state ("a raced connect promise that rejects produces an unhandled rejection") that the finding record attributes to `Promise.race`'s losing branch not being independently handled. Rigorous empirical testing — against the REAL `vscode-jsonrpc` `SocketMessageReader`/`SocketMessageWriter` + `createMessageConnection`, not just a hand-rolled `Promise.race` script — proved this claim does not hold under real ECMAScript/Node semantics: `Promise.race` attaches a rejection handler to every array entry synchronously when constructed, so a losing branch's later rejection is never "unhandled," with or without an extra `.catch()`. (A genuinely reproducible unhandled rejection DOES exist elsewhere in `vscode-jsonrpc`'s own `sendRequest` implementation, triggered by a socket *write* failure, but it is caused by a library-internal double-reject/re-throw bug in code this plan cannot touch, and is unaffected by the prescribed fix either way.)
- **Resolution:** Applied the plan's exact prescribed fix (harmless, defensive, matches the record's classification test (5)) regardless, since Rule 1 (integrity: classification is never re-litigated) forbids treating this as grounds to skip or reclassify the finding. For the regression test obligation, wrote a test asserting the invariant the fix is meant to defend (no unhandled rejection across a realistic timeout race) — this test is honestly documented as always-green (verified failing to fail before the fix, i.e. it already passed) rather than claiming an observed red that never occurred. `fail_before` in the ledger row reads `inapplicable — <full empirical reasoning>`, matching the ledger's own supported `inapplicable — reason` shape (already used for D5/test-is-the-fix rows).
- **Files modified:** `bbj-vscode/test/java-interop-service.test.ts`, `bbj-vscode/src/language/java-interop.ts`
- **Verification:** `cd bbj-vscode && npm run build && npx vitest run test/java-interop-service.test.ts test/method-return-java-type.test.ts` — both pass.
- **Committed in:** `7ae80a2` (test), `b0696aa` (fix)

---

**Total deviations:** 1 (transparency judgment call, not a Rule 1-4 auto-fix)
**Impact on plan:** The plan's acceptance criterion ("checking out the red commit... exits non-zero") does not literally hold for P61-D2-002's test commit, since no genuine red state exists to produce. This is disclosed here, in the test file's own inline comment, and in the ledger row's `fail_before`/`notes` fields — nowhere is an unobserved red claimed as observed. No other row is affected; the other three D2 rows (001, 003, 004) and D3-001 all have genuine, observed red commits.

## Issues Encountered

- Commit `e82f9c2`'s subject line (`test(P61-D2-004): add failing test for unresolved JavaMethod... clearCache index leak`) carries a leftover phrase from an unrelated earlier commit message (a copy-paste artifact) — the body/content is correct and the ledger's `fail_before`/`commit` fields cite the correct sha, but the subject reads as slightly garbled. Left uncorrected per the git safety protocol's "always create new commits rather than amending" rule; noted here for transparency rather than silently left unexplained.
- None of the other planned fixes required deviation from the record's exact-edit instructions.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- 6 more of the 77 apply-set rows closed (9 of 77 total after 67-01 + 67-02), all on `java-interop.ts`. Plans 67-03 through 67-11 continue applying the remaining rows per `67-PATTERNS.md`'s file-grouped serialization.
- `java-interop.ts` now has dedicated, deterministic unit-test coverage independent of the unreachable java-interop peer — a pattern (`MockableJavaInteropService` + `FakeSocket`) later plans touching other socket/JSON-RPC-adjacent files may want to reuse.
- No blockers. The 11-name deterministic gate set and the 2 lint warnings are unchanged and stable across this plan, matching 67-01's observation.

## Self-Check: PASSED

All 4 created/modified files confirmed present on disk; all 13 commit hashes confirmed present in `git log --oneline --all` (and individually verified via `git cat-file -e` for every sha recorded in the ledger).
