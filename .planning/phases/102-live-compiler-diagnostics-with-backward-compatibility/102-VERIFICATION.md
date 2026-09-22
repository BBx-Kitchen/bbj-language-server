---
phase: 102-live-compiler-diagnostics-with-backward-compatibility
verified: 2026-09-22T18:20:00Z
status: gaps_found
score: 4/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Live and save-time compiler diagnostics on the same line coexist as two separate diagnostics, neither rewriting the other's source (D-03, D-09) — plan 102-01's must-have truth #11"
    status: failed
    reason: >
      102-REVIEW.md's CR-01 (classified critical by the phase's own code review) is confirmed still
      present, unfixed, in the shipped source. bbj-document-builder.ts's debouncedCompile() clears
      only the 'BBjCPL' source before calling mergeDiagnostics(), and clears BBJ_PARSER_SOURCE only
      AFTER that merge runs. mergeDiagnostics() (bbj-document-validator.ts) matches a new BBjCPL
      diagnostic against any existing same-line diagnostic whose source is not 'BBjCPL' and rewrites
      that diagnostic's source to 'BBjCPL', keeping its OLD message. When a leftover BBJ_PARSER_SOURCE
      diagnostic from a prior debounce cycle is still present at merge time, this produces exactly the
      violation the must-have forbids: a diagnostic labelled 'BBjCPL' that actually carries a stale
      live-parser message, and the new BBjCPL diagnostic for that line is silently dropped.

      Verifier's own analysis of the trigger conditions (requested by the orchestrator): Langium's own
      document lifecycle (resetToState() in document-builder.js) sets document.diagnostics = undefined
      on every edit-triggered rebuild, which closes off the reviewer's literal "several debounce cycles
      while the user keeps typing elsewhere" framing for the *ordinary* case — a rebuild triggered by
      the very next keystroke wipes the prior cycle's diagnostics before the next debounce timer can
      fire. However, a narrower and still realistic race remains open: debouncedCompile() deletes its
      own timer from cplDebounceTimers the instant it FIRES (before awaiting cplService.compile()), so
      if the bbjcpl subprocess takes longer than the 500ms debounce window while the user keeps editing,
      a second debounce cycle's timer can fire and its callback can run concurrently with the first
      cycle's still-in-flight compile — both then read-modify-write the same document.diagnostics field
      unsynchronized. No test in the suite (bbj-parser-service.test.ts, parser-coordinate-converter.test.ts)
      exercises overlapping/concurrent debounce cycles; every test uses vi.useFakeTimers() with a single
      sequential advanceTimersByTimeAsync call. The 18/18 human UAT pass (102-UAT.md) also would not
      reliably surface this: it requires a slow bbjcpl compile plus continued typing, a timing condition
      a short manual session is unlikely to hit, and Block 1's own instructions in 102-04-SUMMARY.md
      explicitly tell the tester that "two diagnostics on one line is EXPECTED" — priming them to treat
      any same-line anomaly as expected overlap rather than to check the diagnostic's message/source
      pairing for staleness.
    artifacts:
      - path: "bbj-vscode/src/language/bbj-document-builder.ts"
        issue: "debouncedCompile() (lines ~248-280) clears BBJ_PARSER_SOURCE diagnostics only after mergeDiagnostics() runs, not before — the exact code 102-REVIEW.md's CR-01 flagged and proposed a fix for (clear both sources together, before the merge). The proposed fix was never applied; no commit after 7b53dc80 (\"docs(102): add code review report\") touches this file."
    missing:
      - "Apply (or a functionally equivalent variant of) 102-REVIEW.md's CR-01 fix: filter out both 'BBjCPL' and BBJ_PARSER_SOURCE diagnostics together, before mergeDiagnostics() runs, so mergeDiagnostics() never has a live-parser diagnostic to collide with."
      - "A regression test that reproduces the race directly (two debouncedCompile() invocations for the same document with the second cycle's callback resolving before the first's — e.g. by controlling the order in which two scripted compile-mock promises resolve) rather than relying on the existing fake-timer sequential-only harness."
deferred: []
human_verification: []
---

# Phase 102: Live Compiler Diagnostics With Backward Compatibility Verification Report

**Phase Goal:** With a BBj that has the endpoint, developers see the compiler's own syntax errors while they type in either IDE; with an older BBj or none at all, both extensions behave exactly as 0.16.x did.
**Verified:** 2026-09-22T18:20:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Typing invalid BBj in VS Code or IntelliJ, against a BBjServices offering the endpoint, surfaces the compiler's syntax errors without saving (PSRV-03) | ✓ VERIFIED | `BBjParserService.requestLiveParse()` wired into `debouncedCompile()`'s 500ms timer; 39 passing unit tests (`bbj-parser-service.test.ts`, `parser-coordinate-converter.test.ts`); 5/5 passing gated live-endpoint test against the real deployed jar (`parse-program-live.test.ts`); human UAT 2026-09-22 pass-with-caveat (large-workspace scheduling issue explicitly deferred to issue #692 / Phase 105, added to the roadmap for exactly this — see Deferred Items). |
| 2 | Against a BBj older than 26.03 or no connection, both extensions keep every 0.16.x feature — Java completion, save-time `bbjcpl`, existing diagnostics — with no error/dialog/repeated log line, decided by probing the endpoint once per connection, with an automated test against a service double lacking the endpoint (PSRV-04) | ✓ VERIFIED | `BBjParserService.isEnabled()` latch keyed on `connectionGeneration`, reset only on reconnect/cache-clear; `METHOD_NOT_FOUND` (-32601) latches off without a version-string comparison (grep-verified: no `localeCompare`/`parseFloat`/`semver`/`.split('.')` in `bbj-parser-service.ts`); 9+ tests under "no endpoint failure ever becomes a diagnostic" and "an older server" scenarios all pass; human UAT 2026-09-22 pass on macOS against the pre-endpoint jar. |
| 3 | Diagnostics land on the right editor line/range for continuation lines, user line numbers, CRLF files, and a last line with no trailing newline | ✓ VERIFIED | `parseErrorToRange()` fixture suite (`parser-coordinate-converter.test.ts`, 14 tests) pins all four PSRV-05 document shapes against coordinates measured live against the real endpoint, plus out-of-range/collapsed-range clamping; confirmed again against the real endpoint by the gated `parse-program-live.test.ts` (5/5 passing). |
| 4 | An endpoint exception, timeout, or unreachable BBjServices never appears as a syntax error — visible only in the server log/status | ✓ VERIFIED | Failure-kind classification (`parser-exception`, `timeout`, `size-cap`, `service-unavailable`, `protected-program`, `transport`, `malformed-result`) in `bbj-parser-service.ts`, each producing zero diagnostics; `RequestCancelled` produces zero diagnostics and zero log lines at any level; 12+ tests under "never becomes a diagnostic" all pass. |
| 5 | The user can tell which mode is active: one log line per connection, and both extensions' published docs say the feature needs BBj 26.03+ | ✓ VERIFIED | `logger.info('Live compiler diagnostics: on'/'off (endpoint not available)')`, idempotent per connection generation (tested); all six documentation pages (`vscode`/`intellij` × `getting-started.md`/`index.md`/`features.md`) contain the literal `26.03` and a `### Live Compiler Diagnostics` subsection (grep-verified in this run); human UAT read the exact off-mode line from a real log: `2026-09-22 19:11:29.120 [info] Live compiler diagnostics: off (endpoint not available)`. |

### Plan-Level Must-Have Truths (102-01-PLAN.md, additional to the five roadmap criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | "Live and save-time compiler diagnostics on the same line coexist as two separate diagnostics, neither rewriting the other's source; that overlap is accepted in this phase (D-03, D-09)." | ✗ FAILED | See Gaps: 102-REVIEW.md's CR-01 (critical) is unresolved in the shipped `bbj-document-builder.ts`. Under a realistic timing condition (a slow `bbjcpl` compile plus continued edits), `mergeDiagnostics()` can absorb a stale live-parser diagnostic and relabel it `'BBjCPL'` — a rewrite of source and message, not the accepted overlap. |

**Score:** 4/5 roadmap success criteria verified as fully sound; one plan-level must-have (a sub-clause of PSRV-03/D-09) fails on inspection of the current source.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/bbj-parser-service.ts` | `BBJ_PARSER_SOURCE`, `BBjParserService`, `parseErrorToRange`, `parseErrorsToDiagnostics` | ✓ VERIFIED | All exports present; `getMaxErrors()` wired in; 39 unit tests pass; `tsc -b` clean. |
| `bbj-vscode/src/language/java-interop.ts` | `ParseProgramParams/Result/Error`, `parseProgram()`, `connectionGeneration` | ✓ VERIFIED | All present; `_connectionGeneration++` occurs in `establishConnection()` and `clearCache()`. |
| `bbj-vscode/src/language/bbj-document-validator.ts` | `getMaxErrors()` beside `setMaxErrors()` | ✓ VERIFIED | Present, two-line getter shape confirmed. |
| `bbj-vscode/src/language/bbj-module.ts` | `BBjParserService` registered in `compiler` group | ✓ VERIFIED | Present in both `BBjAddedServices` and `BBjModule`. |
| `bbj-vscode/src/language/bbj-document-builder.ts` | debounce hook + trigger-off clear | ⚠️ WIRED, WITH ORDERING DEFECT | Wired and functional for the common single-cycle case; the same-line clear-before-merge ordering has the confirmed CR-01 defect (see Gaps). |
| `bbj-vscode/test/bbj-parser-service.test.ts` | 19+ tests | ✓ VERIFIED | 19 tests present, all pass (part of a 39-test combined run with the converter suite). |
| `bbj-vscode/test/parser-coordinate-converter.test.ts` | 14+ tests | ✓ VERIFIED | 14 tests present, all pass, sub-second runtime. |
| `bbj-vscode/test/functional/parse-program-live.test.ts` | gated, 5 tests | ✓ VERIFIED | 5/5 pass with `RUN_BBJ_TESTS=1` against the deployed jar; 5/5 skip cleanly with `RUN_BBJ_TESTS=0` — reconfirmed in this verification run. |
| Six documentation pages | BBj 26.03 requirement | ✓ VERIFIED | All six contain `26.03`; both `features.md` pages carry a `### Live Compiler Diagnostics` subsection; base BBj 25.00 bullets unchanged. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `bbj-document-builder.ts`'s `debouncedCompile()` | `BBjParserService.requestLiveParse()` | `langServices.compiler.BBjParserService.isEnabled()` gate, lazy service-registry resolution | ✓ WIRED | Confirmed by reading the current file; matches plan's lazy-resolution key link. |
| `BBjParserService.requestLiveParse()` | `JavaInteropService.parseProgram()` | direct call, not `sendRequestSafe` | ✓ WIRED | Confirmed: `parseProgram()` body has no `sendRequestSafe` occurrence. |
| `bbj-document-builder.ts`'s clear-then-merge-then-clear-then-concat sequence | `mergeDiagnostics()` (bbj-document-validator.ts) | same-line collapse into `'BBjCPL'` | ⚠️ WIRED, HAZARDOUS ORDERING | This is the CR-01 defect: the live-parser filter runs after, not before, the merge call it needs to precede. |
| Both `features.md` pages | `bbj.compiler.trigger` setting | prose cross-reference | ✓ WIRED | Both pages state the feature follows the existing setting; no new setting documented. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| PSRV-03 | 102-01, 102-04 | Live syntax errors while typing, both IDEs | ✓ SATISFIED (caveat) | REQUIREMENTS.md records "Complete (caveat)" — large-workspace scheduling issue, tracked as issue #692 / Phase 105 (already added to the roadmap). Core behavior fully implemented and tested; the CR-01 defect above is a same-line-overlap correctness issue, not a failure of "the error appears while typing." |
| PSRV-04 | 102-01 | Backward compatibility with pre-26.03/no connection | ✓ SATISFIED | Automated + human-verified; no gap found. |
| PSRV-05 | 102-02, 102-03 | Correct coordinate conversion for all four document shapes | ✓ SATISFIED | Automated (hermetic + gated live) fully verified. |
| PSRV-08 | 102-01 | Endpoint failures never surface as document errors | ✓ SATISFIED | Automated, comprehensive (7 failure kinds + cancellation), no gap found. |
| PSRV-09 | 102-01, 102-03, 102-04 | Mode visibility (log line) + documentation | ✓ SATISFIED | Automated + human-verified (real log line quoted) + documentation grep-verified. |

No orphaned requirements found: REQUIREMENTS.md's Phase 102 mapping (PSRV-03/04/05/08/09) matches exactly the `requirements:` fields declared across the four plans' frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `bbj-vscode/src/language/bbj-document-builder.ts` | 248-280 | Ordering defect (CR-01, confirmed unresolved) | 🛑 Blocker | See Gaps — violates an explicit must-have ("neither rewriting the other's source"). |
| `bbj-vscode/src/language/bbj-parser-service.ts` | 39-40 | `endLine` not clamped to be ≥ `startLine` (WR-01, confirmed unresolved) | ⚠️ Warning | Lower severity per the code review's own classification; not observed in any live probe or test fixture (all measured/fixture records have `editorStartLine === editorEndLine`); if the endpoint ever reports an inverted line pair, the resulting `Range` could be rejected by a JVM client's deserializer, the exact failure class `parseErrorToRange`'s own doc comment says the function exists to prevent. No test exercises this axis. |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any file this phase modified.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 102 unit suite | `npx vitest run test/bbj-parser-service.test.ts test/parser-coordinate-converter.test.ts` | 2 files, 39 tests, all passed | ✓ PASS |
| Gated live-endpoint suite skips cleanly when gate closed | `RUN_BBJ_TESTS=0 npx vitest run test/functional/parse-program-live.test.ts` | 1 file, 5 skipped, 0 failed | ✓ PASS |
| TypeScript build | `npx tsc -b tsconfig.json` | clean, no output | ✓ PASS |
| Service registration wiring | grep `BBjParserService` in `bbj-module.ts` | present in both service groups | ✓ PASS |
| CR-01 fix applied? | Read `bbj-document-builder.ts` lines 240-297 | Code is byte-identical to the "before" snippet quoted in 102-REVIEW.md — fix NOT applied | ✗ FAIL (confirms the gap) |

The gated live-endpoint suite was not re-run with `RUN_BBJ_TESTS=1` in this verification pass (would require driving requests against the shared BBjServices instance again beyond what's necessary to confirm the phase's own claims); 102-04-SUMMARY.md's own re-confirmation (5 passed, timestamped 2026-09-22) plus the skip-path re-confirmation above are treated as sufficient corroboration together with the hermetic suite's full pass.

### Human Verification Required

None beyond what 102-UAT.md and 102-04-SUMMARY.md already recorded (18/18 pass, including the two staged hand-verification blocks with real-log evidence). The CR-01 gap is a code-level defect provable by static inspection, not something that needs a fresh human observation.

### Gaps Summary

One plan-level must-have — "live and save-time compiler diagnostics on the same line coexist... neither rewriting the other's source" — is falsified by the current, committed state of `bbj-document-builder.ts`. The phase's own code review (102-REVIEW.md) found this as CR-01, classified it critical, and proposed a concrete fix; that fix was never applied (the only commit after the review, `7b53dc80`, adds the review document itself and touches no source). The four other roadmap success criteria and all remaining plan-level must-haves verified cleanly against the codebase, with unit, gated-integration, and human-UAT evidence all consistent and none contradicting SUMMARY.md's claims.

This looks like an oversight rather than a deliberate deviation — the review report exists, was reviewed for content, but its fix commit is simply missing from the branch. The straightforward remediation is the one-line reordering 102-REVIEW.md already specifies (filter both `'BBjCPL'` and `BBJ_PARSER_SOURCE` together, before `mergeDiagnostics()` runs), plus a regression test that can actually reach the race (not just the sequential single-cycle path the existing suite covers).

---

_Verified: 2026-09-22T18:20:00Z_
_Verifier: Claude (gsd-verifier)_
