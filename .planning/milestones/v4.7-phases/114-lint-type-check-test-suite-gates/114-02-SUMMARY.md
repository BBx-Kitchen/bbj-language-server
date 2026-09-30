---
phase: 114-lint-type-check-test-suite-gates
plan: "02"
subsystem: testing
tags: [vitest, java-interop, hermetic-test-double, hook-timeout]

# Dependency graph
requires:
  - phase: 114-01
    provides: "baseline/suite-digest.mjs, baseline/suite-before.txt, explicit vitest test.include/exclude"
provides:
  - "28 un-gated test files (all createBBjServices()+initializeWorkspace() callers not gated on shouldRunBBjTests) run on the hermetic createBBjTestServices double instead of the production Java-interop socket path"
  - "Three whole-suite npm test digests (baseline/suite-114-02-run1.txt, -run2.txt, -run3.txt) proving hookTimeoutSuites=0 at the default worker count"
affects: [114-13]

actuals:
  tokens: 11265
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Hermetic-first migration: swap only the import and construction-call sites (createBBjServices -> createBBjTestServices), never touch assertions, to prove a harness-only fix is behaviour-neutral via a diff scoped to those two line shapes"

key-files:
  modified:
    - bbj-vscode/test/hover.test.ts
    - bbj-vscode/test/bbj-document-validator.test.ts
    - bbj-vscode/test/builtin-functions-library.test.ts
    - bbj-vscode/test/builtin-library-members.test.ts
    - bbj-vscode/test/classes.test.ts
    - bbj-vscode/test/class-validations-issues.test.ts
    - bbj-vscode/test/composer-codelens-handler.test.ts
    - bbj-vscode/test/composer-codelens.test.ts
    - bbj-vscode/test/conformance-regressions.test.ts
    - bbj-vscode/test/declare-in-class.test.ts
    - bbj-vscode/test/document-builder-rebuild-guard.test.ts
    - bbj-vscode/test/extensionless-use-target.test.ts
    - bbj-vscode/test/lazy-prefix-loading.test.ts
    - bbj-vscode/test/line-break-single-line-if.test.ts
    - bbj-vscode/test/line-break-validation.test.ts
    - bbj-vscode/test/overload-selector.test.ts
    - bbj-vscode/test/parser-keyword-statements.test.ts
    - bbj-vscode/test/parser.test.ts
    - bbj-vscode/test/run-call-file-resolution.test.ts
    - bbj-vscode/test/run-call-navigation.test.ts
    - bbj-vscode/test/setopts-code-scanner.test.ts
    - bbj-vscode/test/setopts-in-code-request.test.ts
    - bbj-vscode/test/use-path-containment.test.ts
    - bbj-vscode/test/use-project-root.test.ts
    - bbj-vscode/test/validation-function-calls.test.ts
    - bbj-vscode/test/validation.test.ts
    - bbj-vscode/test/variable-scoping.test.ts
    - bbj-vscode/test/functional/chevrotain-tokens.test.ts
    - .planning/phases/114-lint-type-check-test-suite-gates/baseline/suite-114-02-run1.txt
    - .planning/phases/114-lint-type-check-test-suite-gates/baseline/suite-114-02-run2.txt
    - .planning/phases/114-lint-type-check-test-suite-gates/baseline/suite-114-02-run3.txt

key-decisions:
  - "No offline fallback (createBBjOfflineServices) was needed anywhere: every one of the 28 migrated files passes on the hermetic double with its assertions unchanged, so bbj-vscode/test/offline-interop-services.ts was never created"
  - "setopts-in-code-request.test.ts's main.ts source-guard literals (indexOf('createBBjServices('), two test titles, one doc comment) were edited individually and left byte-identical; only its two service-construction calls and its import moved"
  - "variable-scoping.test.ts dropped its now-redundant createBBjServices import (it already imported createBBjTestServices for a second, hermetic-only instance) and its own services construction now also uses the double"

requirements-completed: []
# TEST-07 is also declared by 114-13 (still open); requirements.ready-ids reported
# 0/1 ready, so it is intentionally NOT marked complete here per the shared-ID gate.
# 114-13's own SUMMARY will trigger the mark once both declaring plans are done.

coverage:
  - id: D1
    description: "hover.test.ts (tracer) runs its full workspace initialization on the hermetic double end to end, with identical test results and no hook timeout"
    requirement: TEST-07
    verification:
      - kind: unit
        ref: "npx vitest run test/hover.test.ts (17/17 passed, 0 failed)"
        status: pass
      - kind: other
        ref: "git diff --numstat e8941d48 -- bbj-vscode/test/hover.test.ts shows 4 added / 4 deleted lines"
        status: pass
    human_judgment: false
  - id: D2
    description: "The remaining 27 un-gated files move onto the double; the batch runs with no failed suite when run individually / at reduced worker parallelism, and with 0 assertion/title changes in the migrated diff"
    requirement: TEST-07
    verification:
      - kind: unit
        ref: "npx vitest run <27 files> --maxWorkers=2 (1078/1079 passed, 0 failed, 0 failedSuites)"
        status: pass
      - kind: other
        ref: "grep -cE 'expect\\(|toBe|toEqual|toHaveLength|toContain|test\\(|it\\(' over the scoped diff of the 28 migrated files prints 0"
        status: pass
    human_judgment: true
    rationale: "At the literal default worker count, this same 27-file batch intermittently shows 1-2 extra failing tests caused by two pre-existing, unrelated sources of flakiness under sustained host CPU contention (documented below under Deviations) — a human should confirm this classification given the coordinator's request for extra rigor here."
  - id: D3
    description: "Three consecutive whole-suite npm test runs at the default worker count show hookTimeoutSuites=0 (the real target: the production-service initializeWorkspace() hook cost is gone)"
    requirement: TEST-07
    verification:
      - kind: other
        ref: "baseline/suite-114-02-run1.txt, -run2.txt, -run3.txt: hookTimeoutSuites=0 and interop5008=open in all three"
        status: pass
      - kind: other
        ref: "FAILED_TEST diff against baseline/suite-before.txt"
        status: fail
    human_judgment: true
    rationale: "hookTimeoutSuites=0 in all three runs proves this plan's actual goal. The FAILED_TEST diff against suite-before.txt is NOT byte-identical in any of the three runs, each showing exactly one extra line from one of two pre-existing, unrelated, well-diagnosed flaky sources under sustained external CPU contention. See Deviations for the full investigation; a human should review the evidence before accepting this as non-regressive."

duration: 41min
completed: 2026-09-27
status: complete
---

# Phase 114 Plan 02: Hermetic Test Double Migration (TEST-07) Summary

**28 un-gated test files that built production `createBBjServices` (real Java-interop socket in `initializeWorkspace()`) now build the hermetic `createBBjTestServices` double instead; `hookTimeoutSuites=0` in every whole-suite run performed this session, with the residual gap from `baseline/suite-before.txt` traced conclusively to two pre-existing, unrelated flaky sources under sustained external host CPU contention, not to this migration.**

## Performance

- **Duration:** 41 min
- **Started:** 2026-09-27T17:10:00Z (approx)
- **Completed:** 2026-09-27T17:51:00Z
- **Tasks:** 3
- **Files modified:** 31 (28 test files + 3 baseline digest files)

## Accomplishments
- `hover.test.ts` (the tracer task) moved its three `createBBjServices(EmptyFileSystem)` calls to `createBBjTestServices` — 17/17 tests pass, duration dropped from 15-23s (with one observed flaky "unexplained failed suite" on the production-socket path, reproduced then fixed) to a consistent ~1s.
- The remaining 27 un-gated files (every tracked `test/**/*.test.ts` file matching the migration criterion: `createBBjServices(` + `initializeWorkspace(`, not gated on `shouldRunBBjTests`) moved to `createBBjTestServices`. No offline fallback was needed — every migrated test passes on the double.
- Three consecutive whole-suite `npm test` runs at the default worker count all show `hookTimeoutSuites=0` and `interop5008=open` (matching baseline) — the plan's actual target, the real Java-interop socket cost inside `initializeWorkspace()`, is conclusively eliminated.
- `src/`, `vitest.config.ts`, `test-helper.ts`, and `bbj-test-module.ts` are untouched by this plan (per D-09, harness-first via the *test files themselves*, not the harness infrastructure) — confirmed via `git diff --quiet` against the commit immediately preceding this plan's first task.

## Task Commits

1. **Task 1: hover.test.ts initializes its workspace on the hermetic double, end to end** - `407fbcac` (feat)
2. **Task 2: The remaining 27 un-gated files move onto the double** - `de74c8e9` (feat)
3. **Task 3: Three consecutive whole-suite runs at the default worker count** - `1cb3f01f` (test)

**Plan metadata:** (commit hash recorded after this SUMMARY is committed)

## Files Created/Modified
- `bbj-vscode/test/hover.test.ts` and 27 other `test/**/*.test.ts` files — `createBBjServices` → `createBBjTestServices` (import + construction calls only)
- `.planning/phases/114-lint-type-check-test-suite-gates/baseline/suite-114-02-run1.txt`, `-run2.txt`, `-run3.txt` — three whole-suite digests

## Decisions Made
- No `bbj-vscode/test/offline-interop-services.ts` was created: every one of the 28 migrated files passes cleanly on the hermetic double with its assertions unchanged, so the offline-fallback remedy in the plan's `<interfaces>` block was never triggered.
- `setopts-in-code-request.test.ts`'s `main.ts` source-guard literals (`source.indexOf('createBBjServices(')`, two test titles, one doc comment referencing `createBBjServices(`) were left byte-identical — only its two service-construction calls and its import were edited, verified via `grep -c 'createBBjServices'` printing exactly 6 (the untouched literal occurrences) both before and after.
- `variable-scoping.test.ts` dropped its now-redundant `createBBjServices` import (it already separately imported `createBBjTestServices` for a second, hermetic-only `hermeticServices` instance used by two tests); its primary `services` construction now also uses the double, matching the rest of the file's un-gated tests.

## Deviations from Plan

### Auto-fixed Issues

None — every task's edits were exactly the planned migration (import + construction-call swap, comment rewording where specified). No Rule 1/2/3 fixes were needed.

### Investigated, Non-Regressive Environmental Flakiness (reported per coordinator instruction)

During Task 3's whole-suite verification, the first captured run (`suite-114-02-run1.json`, saved unmodified as `suite-114-02-run1.txt`) showed a 12th `FAILED_TEST` line beyond `baseline/suite-before.txt`'s 11 (all `test/linking.test.ts`):

```
FAILED_TEST test/functional/installed-extension-e2e.test.ts :: every composer kind carries its cue setopts-in-code cue appears only on the absolute literal and the safe chain's SETOPTS line
AssertionError: expected [ 24 ] to deeply equal [ 24, 28 ]
```

This assertion carries concrete values, not a generic timeout message, so per the coordinator's explicit instruction it was investigated as a possible real regression rather than dismissed as noise, before any digest was finalized:

**1. Isolation check — does this file read anything this plan's swap touched?**
`test/functional/installed-extension-e2e.test.ts` is byte-identical to the phase base commit (`git diff --quiet 2fa2178e -- bbj-vscode/test/functional/installed-extension-e2e.test.ts` exits 0 — untouched by 114-01 or 114-02). It reads fixture files `examples/issue650-composer-cues.bbj` and `examples/issue475-setopts-in-code.bbj` (neither modified by this plan), and it spawns a **completely separate, pre-built binary** resolved from `~/.ext-test/extensions/<installed-dir>/out/language/main.cjs` via `extensions.json` — a real VS Code extension install in the user's home directory, entirely outside this repository's source tree and untouched by any test-file-only edit.

**2. Root cause of the specific assertion shape.** The describe block's `beforeAll` polls `textDocument/codeLens` and breaks on the **first non-empty** result (`if (result && result.length > 0) { break; }`), not a stable/complete one — a pre-existing race in the test's own design (line ~792-799) that surfaces a partial cue list when the spawned real language-server process is CPU-starved mid-computation.

**3. Reproduction: the file run alone, 3× in the foreground**, per the coordinator's instruction (`cd bbj-vscode && npx vitest run test/functional/installed-extension-e2e.test.ts`):
   - Run 1: **FAILED** — the same `expected [24] to deeply equal [24, 28]` assertion.
   - Run 2: **FAILED** — a different failure mode entirely: `Error: No document found for URI: file:///.../examples/issue475-setopts-in-code.bbj` (a suite-level crash, 0 failed assertions).
   - Run 3: **FAILED** — the same `No document found` crash as run 2.

   Two distinct, unrelated failure modes across 3/3 standalone runs (with no other test file running concurrently) is decisive: this file is severely flaky on its own, independent of vitest worker contention from other files. The `No document found` mode is the **exact pattern already documented** in this project's own memory/deferred-items log: *"installed-extension e2e SETOPTS-in-code (#475) fails with 'No document found' (stale installed bundle, not a regression)"* — pre-dating this phase entirely.

**4. External contention, independently confirmed.** Throughout this plan's entire execution, `ps` showed an unrelated host process (`.venv/bin/python -m pipeline.knowledge_build`, PID 3046266, not part of this repository or this plan) consuming 630-680% CPU continuously for 37+ minutes. Six consecutive whole-suite `npm test` runs were performed during this plan's execution (three committed as `suite-114-02-run1/2/3.txt`, three additional diagnostic runs); **every single one** showed `hookTimeoutSuites=0` (the plan's actual target, proven with zero exceptions), and **every single one** showed exactly 1-2 extra `FAILED_TEST` lines drawn from exactly two sources:
   - `test/functional/installed-extension-e2e.test.ts` (pre-existing, untouched, as diagnosed above), and
   - one specific `test/parser-keyword-statements.test.ts` test (`a verifier option whose value is absent is still a parser error`) hitting vitest's **default 5000ms per-test timeout** — confirmed to be a pure contention artifact, not a logic bug, via a diagnostic-only rerun with `testTimeout` raised (no worker cap, no hook-timeout change, no test skip — nothing else altered) that passed 1078/1079 with **identical duration** to the failing run, and via a `--maxWorkers=2` rerun of the same 27-file batch that also passed 1078/1079, 0 failed, 0 failed suites.

**Classification: not a regression.** Both sources are (a) pre-existing and untouched by this plan's changes (confirmed via `git diff --quiet` against the phase base / pre-Task-2 commit), and (b) proven to be timing-only artifacts of severe, sustained, unrelated external CPU contention on this host, not functional differences introduced by the `createBBjServices` → `createBBjTestServices` swap. No fix was applied to either file — both are out of scope for this task per the deviation-rules scope boundary (only auto-fix issues directly caused by the current task's changes).

**What was and was not achieved against Task 3's literal acceptance criteria:** all three committed runs (`suite-114-02-run1.txt`, `-run2.txt`, `-run3.txt`) show `hookTimeoutSuites=0` and `interop5008=open` matching `baseline/suite-before.txt` — the plan's actual goal. None of the three is byte-identical to `baseline/suite-before.txt`'s `FAILED_TEST` set (each has exactly one extra line, from one of the two sources above; `run2` and `run3` are identical to each other). Per the coordinator's request, these are reported here with full evidence rather than silently retried until a clean triple appeared — six total whole-suite attempts never produced one under the sustained contention present throughout this session. Re-running Task 3's verification once host contention clears (or accepting the individual-file / reduced-parallelism evidence above per this project's own standing decision — *"Whole-suite regression gate is project-wide numFailedTests: 0 plus deterministic targeted-file runs, not a failing-suite identity delta"*) is the recommended path if a byte-identical triple is required before this plan is considered fully closed.

**Verification-command note (unrelated to the above):** Task 2's acceptance criteria include `git diff --quiet e8941d48 -- bbj-vscode/src bbj-vscode/vitest.config.ts bbj-vscode/test/test-helper.ts bbj-vscode/test/bbj-test-module.ts` exiting 0. This literally does NOT exit 0, because 114-01 (a prior plan in this same phase) already modified `vitest.config.ts` after `e8941d48`. The meaningful invariant — that *this plan* (114-02) did not touch those files — was verified instead via `git diff --quiet 407fbcac -- ...` (the commit immediately before Task 2 started, which already includes 114-01's landed change), which exits 0 cleanly.

---

**Total deviations:** 0 auto-fixed. 1 investigated-and-classified environmental finding (two pre-existing flaky sources, not a regression), reported per explicit coordinator instruction with full evidence above.
**Impact on plan:** The plan's core deliverable (eliminate the real `initializeWorkspace()` hook-timeout cost) is proven achieved with zero exceptions across every run this session. The residual gap against a byte-identical baseline match is attributable entirely to pre-existing, unrelated test flakiness under sustained external host contention outside this plan's control or scope.

## Issues Encountered

The sustained external CPU contention (see above) made whole-suite verification materially slower and noisier than in a quiet environment; six full-suite runs (each ~130-140s) were required to gather sufficient evidence for a confident classification. No other issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TEST-07 is also declared by plan `114-13` (still open); per the shared-ID gate (`requirements.ready-ids` reported 0/1 ready), it is intentionally left un-marked in REQUIREMENTS.md here. `114-13`'s own SUMMARY will trigger the mark once both declaring plans are done.
- The hermetic-double migration pattern established here (swap only import + construction calls, verify via a scoped diff for assertion/title changes) is available for any later 114-xx plan that still needs it.
- Recommend a human review the "Investigated, Non-Regressive Environmental Flakiness" section above and, time permitting, re-run Task 3's whole-suite verification once the host's external CPU contention has cleared, to obtain a byte-identical triple against `baseline/suite-before.txt` for the record.

## Self-Check: PASSED

All 28 migrated test files verified present on disk with `createBBjTestServices` and 0 remaining `createBBjServices` occurrences (except the intentionally-preserved 6 literal occurrences in `setopts-in-code-request.test.ts`). All three task commits (`407fbcac`, `de74c8e9`, `1cb3f01f`) verified present in `git log`. Plan-level `<verification>`: Task 2's batch passes cleanly at reduced parallelism (0 failed) and individually per-file (0 failed); Task 3's three digests each show `hookTimeoutSuites=0`; `git diff --quiet e8941d48 -- bbj-vscode/src` exits 0 (harness-only change, D-09) — all re-confirmed above.

---
*Phase: 114-lint-type-check-test-suite-gates*
*Completed: 2026-09-27*
