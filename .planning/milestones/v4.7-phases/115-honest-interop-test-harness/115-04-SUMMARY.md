---
phase: 115-honest-interop-test-harness
plan: "04"
subsystem: testing
tags: [interop-harness, module-split, fake-jsonrpc-server, vitest, typescript]

# Dependency graph
requires:
  - phase: 115-03
    provides: "CRITICAL_FIELDS/evaluateGate, honest case 9/10/13/14 assertions, and the highlight-then-escape JSON report — all still inline in run-tests.ts at the start of this plan"
provides:
  - "types.ts — type-only module: result/case/outcome types, request params, and the harness-local wire DTOs (ClassInfoDto, MethodInfoDto, FieldInfoDto, ParameterInfoDto, PackageInfoDto), all-optional, never importing the generated AST"
  - "scaffold.ts — the four RequestType constants, connect, runRequest, deriveStatus, isPeerErrorReply, defineCase and the field-check helpers, fully typed with no explicit any"
  - "cases.ts — harnessCases (the 17 real case records via the shared scaffold), runSuite(conn, onResult?) and buildMatrixRow"
  - "gate.ts — CRITICAL_FIELDS, finalSegment, isCriticalFieldCheck and evaluateGate, moved unchanged"
  - "test/interop-harness-fake-peer.ts — a real loopback JSON-RPC server (net.createServer + vscode-jsonrpc) with hand-written healthy fixtures and per-test overrides, including a drop() hook for simulating a dropped connection"
  - "test/interop-harness.test.ts — 26 tests: status derivation, the scaffold against the fake peer, all 17 cases against a healthy peer, the #514 regression, the D-19 fixture mutations, the pure critical-field gate rules, and peer-error classification — no :5008 dependency"
affects: [115-05, 115-06]

# Actuals (#2632)
actuals:
  tokens: 27950
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Side-effect-free library modules (types/scaffold/cases/gate) plus a thin CLI (run-tests.ts: parseArgs + main() + report generation) — nothing outside run-tests.ts parses argv, connects on its own, or writes a file"
    - "Harness-local wire DTOs with every property optional, typed against unknown + narrowing casts at each validator's top line — never the generated Langium AST types (isDeprecated vs. deprecated mismatch)"
    - "A real in-process net.createServer + vscode-jsonrpc server, not a hand-rolled duck-typed connection, drives the harness's own real client code end to end in CI"

key-files:
  created:
    - bbj-vscode/tools/interop-test-harness/types.ts
    - bbj-vscode/tools/interop-test-harness/scaffold.ts
    - bbj-vscode/tools/interop-test-harness/cases.ts
    - bbj-vscode/tools/interop-test-harness/gate.ts
    - bbj-vscode/test/interop-harness-fake-peer.ts
    - bbj-vscode/test/interop-harness.test.ts
  modified:
    - bbj-vscode/tools/interop-test-harness/run-tests.ts

key-decisions:
  - "CaseRecord's request/params/validate fields are typed against RequestType<unknown, unknown, null>/unknown rather than per-case generics — TypeScript's readonly-tuple covariance on RequestType's phantom `_` field makes a concrete RequestType<P,R,null> assignable to the widened field with no cast, and every validator narrows via an `as <Dto>` cast at its own top line instead"
  - "FakePeerHandlers' four methods all return `unknown`, with the concrete cast (`as ClassInfoDto`, `as ClassInfoDto[]`, etc.) applied once inside startFakePeer's onRequest wiring — this lets a single override return a deliberately malformed value (a non-array, a mistyped field) for a mutation test without fighting the DTO types at the call site"
  - "parseArgs moved into parseCliArgs(), called from main(), during the same edit that extracted scaffold.ts/types.ts (Task 1) rather than deferred to Task 2 as the plan's task split implied — no behavioral difference, and it let the CLI-args side-effect requirement land in one place"

patterns-established:
  - "A case's outcome flows through one scaffold (runRequest) and one status function (deriveStatus); no case or fixture ever builds a TestResult by hand"
  - "Fixture mutations are built by spreading the healthy fixture and overriding one field (methods/fields array element), never by hand-writing a full class object — keeps every mutation test anchored to the same healthy baseline every other test uses"

requirements-completed: []  # HARN-01, HARN-02, HARN-04 and HARN-06 are also declared by sibling plans 115-05/115-06 still in progress; requirements.ready-ids reports 0/4 ready — none marked here, per the shared-ID gate

coverage:
  - id: D1
    description: "The scaffold, cases and gate live in side-effect-free library modules (types.ts, scaffold.ts, cases.ts, gate.ts); run-tests.ts is the thin CLI (parseArgs + main) plus report generation, with no case/gate/scaffold logic declared inline"
    requirement: HARN-06
    verification:
      - kind: other
        ref: "grep -lE 'parseArgs|process\\.argv|process\\.exit|writeFileSync' over types.ts/scaffold.ts/cases.ts/gate.ts — no matches"
        status: pass
      - kind: other
        ref: "harness type probe (scratch tsconfig extending tsconfig.json, include tools/interop-test-harness/**/*.ts) clean; CLI smoke (npm run interop-harness -- --port 1) exits 2 with the connection hint"
        status: pass
    human_judgment: false
  - id: D2
    description: "No explicit any in the moved code; peer responses are typed with harness-local wire DTOs (ClassInfoDto, MethodInfoDto, FieldInfoDto, ParameterInfoDto, PackageInfoDto), every property optional, never importing the generated AST"
    requirement: HARN-06
    verification:
      - kind: other
        ref: "npx eslint tools/interop-test-harness/scaffold.ts tools/interop-test-harness/types.ts --rule no-explicit-any:error, and cases.ts/gate.ts --max-warnings 0 — both exit 0"
        status: pass
      - kind: other
        ref: "grep -c 'the generated AST' pattern over types.ts/scaffold.ts confirms no import from the language server's generated ast module"
        status: pass
    human_judgment: false
  - id: D3
    description: "test/interop-harness.test.ts drives all 17 real cases through the real connect(), runRequest and evaluateGate against an in-process fake JSON-RPC peer on 127.0.0.1 with an ephemeral port; passes with RUN_BBJ_TESTS unset"
    requirement: HARN-02
    verification:
      - kind: integration
        ref: "test/interop-harness.test.ts (26 tests, all pass; env -u RUN_BBJ_TESTS npx vitest run)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Against the healthy fake peer all 17 cases pass, results come back in definition order (1..17) with the exact expected names, cases 1-8 and 11 give 9 matrix rows, and evaluateGate exits 0"
    requirement: HARN-01
    verification:
      - kind: integration
        ref: "test/interop-harness.test.ts#the full suite against the fake peer > all 17 cases pass against a healthy peer"
        status: pass
    human_judgment: false
  - id: D5
    description: "#514 acceptance: a non-array getClassInfos and a non-boolean loadClasspath response make cases 12, 13, 14, 16 and 17 report fail (not error), the other 12 pass, and evaluateGate exits 1"
    requirement: HARN-01
    verification:
      - kind: integration
        ref: "test/interop-harness.test.ts#the full suite against the fake peer > non-array getClassInfos (#514) makes cases 14 and 17 fail and the gate exit 1"
        status: pass
    human_judgment: false
  - id: D6
    description: "The D-19 targeted mutations each flip exactly the expected case: missing/mistyped critical field on String's first method/field (case 1, exact critical failure reported), a nonexistent class answered without vs. rejected with a peer error (case 10 fail/pass), loadClasspath rejected by the peer (case 17 pass) vs. a dropped connection (case 17 error, gate exit 1), and empty getClassInfos arrays (cases 13/14 pass, case 12 fail)"
    requirement: HARN-01
    verification:
      - kind: integration
        ref: "test/interop-harness.test.ts#fixture mutations (7 tests, all pass)"
        status: pass
    human_judgment: false
  - id: D7
    description: "isPeerErrorReply is true only for a genuine JSON-RPC ResponseError and false for the PendingResponseRejected transport code, a ConnectionError and a plain Error; the critical-field gate's exact-final-segment matching, empty-input verdict and order-independence of a mixed result list are pinned as pure functions"
    requirement: HARN-04
    verification:
      - kind: unit
        ref: "test/interop-harness.test.ts#critical field gate (6 tests) and #peer error classification (4 tests)"
        status: pass
    human_judgment: false

# Metrics
duration: 16min
completed: 2026-09-28
status: complete
---

# Phase 115 Plan 04: Module Split, Typed DTOs and Fake-Peer CI Tests Summary

**The scaffold, the 17 cases and the gate moved into four side-effect-free, `any`-free library modules behind a thin CLI, and a real in-process JSON-RPC server now drives all of it through 26 CI tests — including the #514 regression and every D-19 fixture mutation — with zero dependency on the live `:5008` peer.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-09-28T07:57:00Z
- **Completed:** 2026-09-28T08:13:25Z
- **Tasks:** 3
- **Files modified:** 7 (6 created, 1 rewritten)

## Accomplishments
- `types.ts` holds only type declarations (0 runtime `const`/`let`/`function`/`class` lines): `TestStatus`, `FieldCheck`, `Assertion`, `TestResult`, `MatrixRow`, the case/outcome types, the three request-param interfaces, and the five wire DTOs (`ClassInfoDto`, `MethodInfoDto`, `FieldInfoDto`, `ParameterInfoDto`, `PackageInfoDto`) — every property optional, no import from the generated AST
- `scaffold.ts` holds the four `RequestType` constants (now concretely typed against the DTOs instead of `any`), `connect`, `runRequest`, `deriveStatus`, `isPeerErrorReply`, `defineCase` and the field-check helpers — zero explicit `any`, verified by an eslint run with `no-explicit-any` forced to `error`
- `cases.ts` exports `harnessCases` (the 17 case records, unchanged names and behaviour, built through `defineCase`), `runSuite(conn, onResult?)` and `buildMatrixRow`; `gate.ts` exports `CRITICAL_FIELDS`, `finalSegment`, `isCriticalFieldCheck` and `evaluateGate`, moved unchanged from `run-tests.ts`
- `run-tests.ts` is now the CLI plus report generation only: `parseCliArgs()` runs inside `main()`, so importing any of the four library modules touches no argv, no socket and no filesystem — confirmed by a `grep` across all four modules for `parseArgs`/`process.argv`/`process.exit`/`writeFileSync`
- `test/interop-harness-fake-peer.ts` is a genuine loopback JSON-RPC server (`net.createServer` + `vscode-jsonrpc`'s server-side `createMessageConnection`) with hand-written minimal fixtures for all 17 cases' classes/packages, exported for test-side mutation, plus a `context.drop()` hook per handler for simulating a dropped connection
- `test/interop-harness.test.ts` grew from 0 to 26 tests across 6 describe blocks: status derivation (pure), the scaffold against the fake peer, the full 17-case suite against a healthy peer, the #514 non-array regression, the seven D-19 fixture mutations, the pure critical-field gate rules, and peer-error classification — every test passes with `RUN_BBJ_TESTS` unset and none opens a socket to `:5008`

## Task Commits

Each task was committed atomically:

1. **Task 1: A vitest test drives a request through the real connect(), the extracted scaffold and an in-process fake peer on loopback** - `3f82c349` (feat)
2. **Task 2: All 17 real cases run against the fake peer, and #514's non-array stub makes cases 14 and 17 fail and the gate exit 1** - `6776a59c` (feat)
3. **Task 3: The remaining fixture mutations, the peer-error rules and the pure gate rules are pinned by tests** - `029d0712` (test)

**Plan metadata:** committed alongside this SUMMARY (see below)

## Files Created/Modified
- `bbj-vscode/tools/interop-test-harness/types.ts` — type-only module (result/case/outcome types, request params, wire DTOs)
- `bbj-vscode/tools/interop-test-harness/scaffold.ts` — connect, runRequest, deriveStatus, isPeerErrorReply, defineCase, field-check helpers, the four RequestType constants
- `bbj-vscode/tools/interop-test-harness/cases.ts` — harnessCases, runSuite, buildMatrixRow
- `bbj-vscode/tools/interop-test-harness/gate.ts` — CRITICAL_FIELDS, finalSegment, isCriticalFieldCheck, evaluateGate
- `bbj-vscode/tools/interop-test-harness/run-tests.ts` — thinned to the CLI (parseCliArgs + main) plus report generation
- `bbj-vscode/test/interop-harness-fake-peer.ts` — the in-process fake JSON-RPC server, healthy fixtures and overrides
- `bbj-vscode/test/interop-harness.test.ts` — 26 CI tests covering HARN-01, HARN-02, HARN-04 and HARN-06

## Decisions Made
- `CaseRecord`'s `request`/`params`/`validate` fields are typed against `RequestType<unknown, unknown, null>`/`unknown` rather than per-case generics, relying on TypeScript's readonly-tuple covariance to accept a concretely-typed `RequestType` without a cast; every validator narrows with an `as <Dto>` cast at its own top line instead of threading generics through the whole case array.
- `FakePeerHandlers`' four methods all return `unknown`, with the concrete cast applied once inside `startFakePeer`'s `onRequest` wiring — lets a test's override return a deliberately malformed value (a non-array, a mistyped field) for a mutation test without fighting the DTO types at the override's own call site.
- `parseArgs` was moved into `parseCliArgs()` (called from `main()`) during Task 1's edit rather than deferred to Task 2 as the plan's task split implied one file at a time — no behavioral difference; it let the CLI's own side-effect boundary land in a single edit instead of two.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Self-corrected a planning-id leak in a types.ts comment before Task 2's commit**
- **Found during:** Task 2 (running the plan-level diff-scan acceptance check against the phase base commit, immediately after also finding the fix needed in the same session)
- **Issue:** The Task 1 commit's `types.ts` doc comment for the case-outcome types read `(the opt-in peer-error path, D-02/D-03/D-04)` — decision ids in source comment text, which the project's rules forbid (GitHub issue numbers are exempt, decision ids are not).
- **Fix:** Reworded to `(the opt-in peer-error path)`, dropping the decision-id reference; no logic change.
- **Files modified:** `bbj-vscode/tools/interop-test-harness/types.ts`
- **Verification:** `git diff d6d03647 -- bbj-vscode/tools/interop-test-harness bbj-vscode/test/interop-harness.test.ts bbj-vscode/test/interop-harness-fake-peer.ts | grep '^+[^+]' | grep -cE '\bD-[0-9]+\b|\b(HARN|DEP)-[0-9]+\b|...'` prints 0 after the fix (the leak was present in the already-committed Task 1 diff; fixed and folded into the Task 2 commit rather than amending Task 1, per the no-amend rule).
- **Committed in:** `6776a59c` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — a self-caught planning-id leak in a comment, not a functional defect)
**Impact on plan:** No behavioral change. No scope creep.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Regression Check

Whole-suite run (`npx vitest run --maxWorkers=2`): 3482 passed, 11 failed, 30 skipped, 3523 total; 159/161 test files passed. The 11 failures are all in `test/linking.test.ts`'s "Interop related tests" describe block (`All BBj classes extends Object`, `Import and declare simple Java class without using FQNs`, `Import Java class`, `Declare with direct import`, `Class definition with direct import in extends`, `Class definition with direct import in implements`, `Unloaded Java FQN access - test for #6`, `Java FQN access - test for #6`, `Linked List is resolved`, `Resolve nested class in use statement`, `Resolve nested class FQN`), plus `test/functional/installed-extension-e2e.test.ts` reporting as a failed suite with 0 failed assertions. Both match the project's standing documented baseline (`shouldRunBBjTests()` switches on against a live local BBjServices on `:5008`, independent of `RUN_BBJ_TESTS`; the installed-extension-e2e failure is a pre-existing stale-bundle condition) — none of the 11 failing tests or the e2e suite touch any file this plan changed, and `npm run lint` and `npm run typecheck:test` both exit 0 clean across the whole tree.

## Next Phase Readiness
- `types.ts`, `scaffold.ts`, `cases.ts`, `gate.ts`, the fake-peer helper and its healthy fixtures are ready for plan 05, which moves `generateReport`/the page template into their own module and adds the highlighter tests plus #596's escaped-quote fixture.
- `lint`'s scanned directories and `tsconfig.test.json`'s `include` still do not name `tools/interop-test-harness` (D-13/D-14 land in a later plan, per D-21's ordering) — the harness type probe and the targeted eslint runs in this plan's own verification are the only checks proving the new modules today; `npm run typecheck:test` already exercises them transitively because the new test file imports them, confirmed clean above.
- The harness was not run against the live interop peer on `:5008` in this plan, per its own shell rules; D-20's before/after live diff is owned by a later plan.
- No blockers.

## Self-Check: PASSED

- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/tools/interop-test-harness/types.ts` — FOUND
- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/tools/interop-test-harness/scaffold.ts` — FOUND
- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/tools/interop-test-harness/cases.ts` — FOUND
- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/tools/interop-test-harness/gate.ts` — FOUND
- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/test/interop-harness-fake-peer.ts` — FOUND
- `test -f /home/coder/repos/bbj-language-server/bbj-vscode/test/interop-harness.test.ts` — FOUND
- `git log --oneline --all | grep -q 3f82c349` — FOUND
- `git log --oneline --all | grep -q 6776a59c` — FOUND
- `git log --oneline --all | grep -q 029d0712` — FOUND
- All task `<acceptance_criteria>` re-verified: PASS (see Accomplishments and Coverage)
- Plan-level `<verification>` re-run: `env -u RUN_BBJ_TESTS npx vitest run test/interop-harness.test.ts` — 26 passed, 0 failed — PASS; `npm run typecheck:test` — clean — PASS; `npm run lint` — clean — PASS; harness type probe clean — PASS; CLI smoke exits 2 with the connection hint — PASS

---
*Phase: 115-honest-interop-test-harness*
*Completed: 2026-09-28*
