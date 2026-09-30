---
phase: 116-java-interop-test-coverage
verified: 2026-09-28T13:50:29Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 116: Java-Interop Test Coverage Verification Report

**Phase Goal:** The suite exercises the real java-interop connection code and the language
server's LSP handlers instead of test doubles and text scans. The disabled parser assertions and
the failing linking tests are green, and the whole-suite baseline has no known failures, all
before Phases 119-121 refactor this code.
**Verified:** 2026-09-28T13:50:29Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The three previously disabled `parser.test.ts` assertions (substring parse, `BBjAPI()` chain, `String[]`/`byte[]` fields) run and pass | ✓ VERIFIED | `grep -c "DISABLED" test/parser.test.ts` → 0. `test('Java primitive types link in field, parameter and return positions (#660)')` exists at parser.test.ts:850. Targeted re-run: `test/parser.test.ts` passes with 0 failed (222 tests). The `BBjAPI().getGlobalNamespace().getValue().release()` chain resolves via the fixture's `getGlobalNamespace`/`BBjNamespace.getValue` (bbj-test-module.ts), and `isUniversalObjectReceiver` is wired into `bbj-document-validator.ts:473` per the human-resolved decision (suppress-object-receiver-warning) |
| 2 | The 11 `linking.test.ts` interop tests pass, and the whole suite reports zero failed tests both with BBjServices up and down | ✓ VERIFIED | `linking.test.ts`'s gated block is now `describe('Java class linking (test double)', ...)` with no `isInteropRunning`/`shouldRunBBjTests` reference (`grep -c` → 0 for the gate, 1 for the new name). Re-ran the targeted suite live: 0 failed. Whole-suite JSON evidence (re-read directly, not from SUMMARY prose): `coverage/phase-116/suite-down.json` → `numFailedTests: 0`, `numTotalTests: 3586`; `coverage/phase-116/suite-up.json` → `numFailedTests: 0`, `numTotalTests: 3586`, fewer pending tests (30 vs 53), confirming BBj-gated suites actually ran live in the "up" state |
| 3 | Tests run `java-interop.ts`'s real connect, timeout and request-lock code against a local fake socket server, covering a refused connection, a timeout and lock-serialized concurrency | ✓ VERIFIED | `test/java-interop-socket.test.ts` exists (289 lines added). `grep -cE "override (async )?(connect|createSocket|wrapSocket)\("` → 0 (no override — production code runs unmodified). `grep -c "createBBjTestServices"` → 0 (production DI used, not the double). Re-ran the file live: all cases pass, including refused-connection (ECONNREFUSED), unanswered-request (9,999ms pending / 10,000ms settle under `toFake: ['setTimeout','clearTimeout']`), and 3-way concurrency serialized to `maxInFlight: 1` with a non-vacuity control showing `maxInFlight >= 2` is measurable. `test/loopback-jsonrpc-peer.ts` binds only `127.0.0.1` on ephemeral port 0 (`grep -n "listen(0"` confirms); its only `5008` reference is a doc-comment disclaiming it |
| 4 | The `main.ts` handlers for Java class refresh and configuration change run in tests without a module-load `createConnection()`, and their bodies show execution coverage | ✓ VERIFIED | `src/language/java-class-refresh.ts` and `src/language/configuration-change-handler.ts` exist; `main.ts` read in full — `createConnection(` appears exactly once, no `connection.window.show*` or inline `onDidChangeConfiguration(async` remain, and both handlers are registered at their original positions (`registerRefreshJavaClassesRequest` before `registerCompileRequest`; `registerConfigurationChangeHandler` after `startLanguageServer`). `test/java-class-refresh.test.ts` and `test/configuration-change-handler.test.ts` exist and pass live (never import `main.ts`). 116-02-SUMMARY.md records a one-off 100%-lines/branches coverage reading for both new modules from `coverage/phase-116/coverage-summary.json` (gitignored, not re-derivable without re-running the one-off `--coverage` command, treated as a recorded reading per D-15, not re-run here to avoid an unnecessary extra whole-file pass) |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/test/loopback-jsonrpc-peer.ts` | Shared loopback JSON-RPC peer | ✓ VERIFIED | Exists, exports `startLoopbackPeer`, `neverAnswer`, `unusedLoopbackPort`; single `listen(0, '127.0.0.1', ...)` call site |
| `bbj-vscode/test/interop-harness-fake-peer.ts` | Adapter over shared peer | ✓ VERIFIED | `grep -c "createServer"` → 0; harness tests (`interop-harness.test.ts`, `interop-harness-report.test.ts`) pass unchanged, byte-identical to base (`git diff --quiet` confirmed by 116-01 executor and re-confirmed here via live run) |
| `bbj-vscode/test/java-interop-socket.test.ts` | Real connect/timeout/lock coverage | ✓ VERIFIED | Exists, 289 lines, overrides no connection member, passes live |
| `bbj-vscode/src/language/java-class-refresh.ts` | Refresh handler + reload sequence | ✓ VERIFIED | Exists; wired into `main.ts` at original position |
| `bbj-vscode/src/language/configuration-change-handler.ts` | Settings-change handler | ✓ VERIFIED | Exists; wired into `main.ts` after `startLanguageServer` |
| `bbj-vscode/test/bbj-test-module.ts` | Completed fixture (Object, Date, List, LinkedList, Map, Map.Entry, java.sql.Date, Boolean, String, BBjNamespace) | ✓ VERIFIED | 222 lines added over base; fixture classes confirmed present and referenced by the passing `linking.test.ts`/`parser.test.ts` runs |
| `bbj-vscode/test/test-helper.ts` | `isInteropPeerAnswering` replaces `isPortOpen` | ✓ VERIFIED | `grep -c "isPortOpen"` → 0; `grep -c "isInteropPeerAnswering(5008"` → 1; `shouldRunBBjTests()` signature unchanged |
| `bbj-vscode/test/test-helper.test.ts` | Probe positive/negative cases | ✓ VERIFIED | Exists, 133 lines, 12 tests, all pass live |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `java-interop-socket.test.ts` | `java-interop.ts` connect()/createSocket()/wrapSocket() | production service pointed at peer's ephemeral loopback port | ✓ WIRED | No override present; `connectionGeneration` and request-log assertions confirm the real path ran |
| `interop-harness-fake-peer.ts` | `loopback-jsonrpc-peer.ts` | `startFakePeer` delegates to `startLoopbackPeer` | ✓ WIRED | `createServer` count 0 in the adapter file |
| `main.ts` | `java-class-refresh.ts` | `registerRefreshJavaClassesRequest(connection, {...})` before `registerCompileRequest` | ✓ WIRED | Confirmed by direct line-number read of main.ts (lines 68, 72) |
| `main.ts` | `configuration-change-handler.ts` | `registerConfigurationChangeHandler(connection, {...})` after `startLanguageServer` | ✓ WIRED | Confirmed by direct line-number read of main.ts (lines 100, 177) |
| `test-helper.ts shouldRunBBjTests` | `isInteropPeerAnswering(5008)` | unset-flag branch | ✓ WIRED | grep-confirmed; behavior pinned by 12 passing tests including the plain-TCP-listener false-positive regression case |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 4 roadmap-relevant plan test files pass together | `env -u RUN_BBJ_TESTS npx vitest run test/parser.test.ts test/linking.test.ts test/java-interop-socket.test.ts test/test-helper.test.ts test/java-class-refresh.test.ts test/configuration-change-handler.test.ts test/interop-harness.test.ts test/interop-harness-report.test.ts test/scope-cost-regression.test.ts` | 9 files passed, 364 passed, 2 skipped, 0 failed | ✓ PASS |
| Whole-suite build/typecheck | `npm run build` (bbj-vscode) | exit 0, `tsc -b` + esbuild succeeded | ✓ PASS |
| Whole-suite BBjServices-down evidence | read `coverage/phase-116/suite-down.json` directly (not from prose) | `numFailedTests: 0`, `numTotalTests: 3586` | ✓ PASS |
| Whole-suite BBjServices-up evidence | read `coverage/phase-116/suite-up.json` directly (not from prose) | `numFailedTests: 0`, `numTotalTests: 3586`, `numPendingTests: 30` (< down's 53, confirming live tests actually ran) | ✓ PASS |

Per shell_rules, the whole suite was not re-run in this verification pass (already run twice this
phase; its JSON results were read directly with node/jq instead of trusted from SUMMARY prose).

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|--------------|--------|----------|
| TEST-04 | 116-04, 116-05 | Three disabled `parser.test.ts` assertions re-enabled and pass (#528) | ✓ SATISFIED | `DISABLED` count 0; all three tests live and passing; two required a genuine `src/` fix (primitive-type linking #660, Object-receiver suppression), recorded and reviewed |
| TEST-05 | 116-03, 116-06 | 11 `linking.test.ts` interop tests pass; whole-suite baseline has no known failures (#559) | ✓ SATISFIED | Gate removed, fixture completed, both whole-suite states report `numFailedTests: 0` |
| TEST-06 | 116-01 | Real connect/timeout/lock code exercised against a local fake socket server (#560) | ✓ SATISFIED | `java-interop-socket.test.ts` drives production `JavaInteropService` unmodified over a real loopback socket |
| TEST-08 | 116-02 | `main.ts` LSP handler logic testable without module-load `createConnection()`, covered by tests (#563) | ✓ SATISFIED | Two new modules extracted, wired unchanged in position/behavior, tested through fake connections with a recorded 100% coverage reading |

REQUIREMENTS.md marks all four Complete (lines 60-64, 151-155), matching plan declarations
exactly — no orphaned requirement IDs found for Phase 116.

### Anti-Patterns Found

None blocking. `TBD`/`FIXME`/`XXX` and `TODO`/`HACK`/`PLACEHOLDER` scans across every file this
phase's diff touches (`git diff fc496c9b^..HEAD --name-only`) turned up only pre-existing lines
outside the phase's own diff hunks (BBj test-fixture strings containing the literal substring
`MODE="XXX"`, and TODO comments in `bbj-scope-local.ts`/`bbj-scope.ts`/`parser.test.ts` that
predate this phase, confirmed by `git diff fc496c9b^..HEAD -- <file> | grep TODO` returning
nothing). No planning-ID leakage (`D-NN`, `116-0N`, `phase 116`) found in the added/changed
source or test text.

**Code review (116-REVIEW.md, advisory):** 1 warning, 1 info, 0 critical.
- **WR-01** (`unusedLoopbackPort()` TOCTOU race, `test/loopback-jsonrpc-peer.ts:139-144`): a
  test-only, low-severity port-reuse race that could rarely flake the refused-connection tests on
  a saturated CI host. Confirmed present in the current code (`unusedLoopbackPort` binds, reads
  the port, closes, and returns the bare number with no interim guard). Does not affect goal
  achievement — it is a test-infrastructure robustness nit, not a gap in the coverage the phase
  goal requires, and the reviewer's own assessment (low severity, accept-or-note) does not rise to
  a must-have failure. Left open for a future flaky-test pass; does not block this phase.
- **IN-01** (comment says "Warning path" but the suppressed diagnostic is pushed at `'error'`
  severity, `bbj-document-validator.ts:473-493`): confirmed a comment-wording nit only; the
  reviewer verified the suppression behavior itself is correct against the passing
  `linking.test.ts` cases. No functional impact.

Neither finding blocks the phase goal; both are appropriately advisory.

## Human Verification Required

None. All four ROADMAP success criteria are directly, mechanically checkable (file/grep evidence,
live re-run of the affected test files, and direct reads of the whole-suite JSON reports), and all
resolved to VERIFIED with no behavior-dependent truth left unexercised — the socket suite's
timeout/lock/refused-connection behaviors and the primitive-type/Object-receiver fixes are all
pinned by tests that were re-run live during this verification, not merely inferred from presence.

## Gaps Summary

None. All four ROADMAP success criteria hold, all four requirement IDs (TEST-04/05/06/08) are
satisfied with evidence independent of SUMMARY prose, the build/typecheck/targeted-test re-runs
are green, and both previously-recorded whole-suite JSON reports (read directly, not trusted)
confirm `numFailedTests: 0` in both BBjServices states. The phase goal — production java-interop
and LSP-handler code exercised by real tests instead of test doubles/text scans, with the disabled
parser assertions and previously-failing linking tests green and the whole-suite baseline clean —
is achieved before Phases 119-121 refactor this code.

---

*Verified: 2026-09-28T13:50:29Z*
*Verifier: Claude (gsd-verifier)*
