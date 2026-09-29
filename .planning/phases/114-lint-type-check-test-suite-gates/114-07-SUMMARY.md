---
phase: 114-lint-type-check-test-suite-gates
plan: "07"
subsystem: testing
tags: [typescript, tsconfig, type-check, java-interop, commands-cjs, vitest]

# Dependency graph
requires:
  - phase: 114-02
    provides: "the hermetic createBBjTestServices double every other 114-xx test-tree fix builds on"
  - phase: 114-05
    provides: "the lint gate's test/** no-explicit-any/no-unused-expressions overrides, matching this plan's own noImplicitAny relaxation rationale"
provides:
  - "bbj-vscode/tsconfig.test.json: a working test-tree type-check project (extends, noEmit, rootDir '.', noImplicitAny false commented, include test/**/*.ts, exclude test/.tmp) — no more TS6306/TS6310"
  - "bbj-vscode/package.json's typecheck:test script (tsc -p tsconfig.test.json --noEmit), next to lint; build unchanged"
  - "baseline/typecheck-before.txt: the first working per-file error digest (399 errors, 76 files), grouped by owning plan for 114-04 and 114-08 through 114-12"
  - "test/bbj-test-module.ts at zero type errors: fake JavaClass/JavaMethod/JavaField objects use the generated AST's .$type string constants, method parameters are complete JavaMethodParameter objects with $container set to the owning method, TestableBBjLexer.prepareLineSplitter is marked override"
  - "test/commands-cjs-harness.ts's CommandsModule/ConfigPathCacheModule interfaces and fakeVscode/fakeProcessRunner fakes are typed, closing the largest single error concentration (test/commands-cjs-execution.test.ts) at zero errors"
affects: [114-04, 114-08, 114-09, 114-10, 114-11, 114-12, 114-13]

actuals:
  tokens: 8130
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Typed AST-fake factories (makeMethod/makeField/makeParameter in bbj-test-module.ts): each factory builds a complete, correctly-typed generated-AST object with the owning $container wired in after construction, rather than a partial object literal papered over with a cast"
    - "TS assertion-function narrowing for optional test-fake properties (assertDefined in commands-cjs-execution.test.ts): narrows an Argv/ExecFileOptions optional field for every following statement in scope, letting the actual expect(...) assertion lines stay byte-identical to before"

key-files:
  created:
    - .planning/phases/114-lint-type-check-test-suite-gates/baseline/typecheck-before.txt
  modified:
    - bbj-vscode/tsconfig.test.json
    - bbj-vscode/package.json
    - bbj-vscode/src/language/bbj-comment-provider.ts
    - bbj-vscode/test/bbj-test-module.ts
    - bbj-vscode/test/commands-cjs-harness.ts
    - bbj-vscode/test/commands-cjs-execution.test.ts

key-decisions:
  - "TypeScript's 'evolving array types' inference for a bare `const x = []` only fires when noImplicitAny is on; the test program's noImplicitAny:false turned bbj-comment-provider.ts's two comment arrays into never[], producing four errors under the new test type-check that do not exist under the src build. Fixed with explicit (string | undefined)[] annotations on both arrays — a src/ change outside this task's file list, applied as a Rule 3 blocking-issue fix, since the tracer task's own acceptance criteria requires zero src/ errors."
  - "bbj-test-module.ts's method/field/parameter fakes are built through three small typed factories (makeMethod, makeField, makeParameter) rather than inline object literals: fixing the $type discriminant (object -> .$type string) unmasked that every method/field literal was also missing the required deprecated/isStatic properties (invisible before because the $type mismatch short-circuited TypeScript's assignability check before it reached them) — the factories set both explicitly, plus $container on every parameter once its owning method object exists, matching D-05's 'real fixes, typed fakes' rule."
  - "commands-cjs-harness.ts's ConfigPathCacheModule.setResolvedConfigPath is typed to the narrower `{ path: string; exists: boolean }` shape every test actually passes, not the full production ResolvedConfigPathResult (which also requires source/problem) — a deliberate, commented divergence describing what these tests exercise, matching the plan's own <interfaces> guidance."
  - "commands-cjs-execution.test.ts's env-narrowing and Error-shape fixes (assertDefined, fakeProcessError) are inserted only on non-assertion lines (destructuring/statement lines), so every expect(...)/test(...) line is byte-identical before and after, satisfying the plan's own diff-based no-assertion-change acceptance check."

requirements-completed: []
# TEST-02 is also declared by 114-08 through 114-13 (all still open); requirements.ready-ids
# reported not ready, so it is intentionally NOT marked complete here per the shared-ID gate.
# The last of those plans' SUMMARY triggers the mark once all seven declaring plans are done.

coverage:
  - id: D1
    description: "npm run typecheck:test type-checks the test tree end to end (no TS6306/TS6310/TS5xxx/TS6xxx configuration error, zero src/ errors, at least one test/ error before the fix plans land), and the first per-file error digest is committed for the fix plans to own"
    requirement: TEST-02
    verification:
      - kind: other
        ref: "cd bbj-vscode && npx tsc -p tsconfig.test.json --noEmit (399 errors, 76 files, 0 in src/, digest committed at baseline/typecheck-before.txt grouped by owning plan)"
        status: pass
      - kind: other
        ref: "grep -c '\"references\"' tsconfig.test.json = 0; grep -c '\"noImplicitAny\": false' = 1; grep -cE '\"(strict|noUnusedLocals|skipLibCheck|noImplicitReturns|noImplicitOverride)\"' = 0 (nothing else overridden); npm run build exits 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "test/bbj-test-module.ts's fake Java AST objects are complete, typed AST objects (string $type constants, full JavaMethodParameter objects with $container/realName, TestableBBjLexer override) with zero type errors, and every suite that uses them behaves exactly as before"
    requirement: TEST-02
    verification:
      - kind: other
        ref: "npx tsc -p tsconfig.test.json --noEmit | grep -c '^test/bbj-test-module.ts' = 0; npx eslint test/bbj-test-module.ts --max-warnings 0 exits 0"
        status: pass
      - kind: unit
        ref: "RUN_BBJ_TESTS=0 npx vitest run test/linking.test.ts test/completion-test.test.ts test/overload-selector.test.ts test/inlay-hints.test.ts test/code-action.test.ts test/method-return-java-type.test.ts (111 passed, 19 skipped, 0 failed)"
        status: pass
      - kind: other
        ref: "Whole-suite run after this task: FAILED_TEST lines byte-identical to baseline/suite-before.txt (the 11-test linking.test.ts interop baseline)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The Commands.cjs harness (CommandsModule/ConfigPathCacheModule interfaces, fakeVscode, fakeProcessRunner) is typed and its execution test type-checks with zero errors, with no assertion or title changes and every other harness consumer still green"
    requirement: TEST-02
    verification:
      - kind: other
        ref: "npx tsc -p tsconfig.test.json --noEmit | grep -cE '^test/(commands-cjs-harness\\.ts|commands-cjs-execution\\.test\\.ts|config-path-consumers\\.test\\.ts|em-properties-reader-guard\\.test\\.ts|no-shell-command-construction\\.test\\.ts)' = 0"
        status: pass
      - kind: unit
        ref: "npx vitest run test/commands-cjs-execution.test.ts test/config-path-consumers.test.ts test/em-properties-reader-guard.test.ts test/no-shell-command-construction.test.ts (56/56 passed)"
        status: pass
      - kind: other
        ref: "git diff e8941d48 -- test/commands-cjs-execution.test.ts | grep '^[-+][^-+]' | grep -cE 'expect\\(|\\.toBe|\\.toEqual|\\.toContain|\\.toHaveBeenCalled|test\\(' = 0 (no assertion/title line touched); grep -cE '@ts-(nocheck|expect-error|ignore)' on both files = 0 for both; npx eslint on both files --max-warnings 0 exits 0"
        status: pass
      - kind: other
        ref: "Two whole-suite npm test runs: both hookTimeoutSuites=0/interop5008=open; run 2's FAILED_TEST set is byte-identical to baseline/suite-before.txt; run 1's two extra failures (installed-extension-e2e.test.ts, parser-keyword-statements.test.ts) are the same pre-existing contention-timing flakiness already diagnosed in 114-02/114-05/114-06, re-confirmed here (parser-keyword-statements.test.ts passes 332/332 standalone; both files untouched by this plan's diff)"
        status: fail
    human_judgment: true
    rationale: "Run 1 of 2 whole-suite verifications after Task 3 did not reproduce baseline/suite-before.txt's FAILED_TEST set byte-for-byte (2 extra failures). Both extra-failure sources are the exact two files 114-02's, 114-05's and 114-06's SUMMARYs already diagnosed as pre-existing, unrelated, contention-timing flakiness under sustained external host CPU load (the same pipeline.knowledge_build process, ~559% CPU, observed throughout this plan's own execution) — re-confirmed independently here rather than merely cited. Run 2 reproduced the baseline exactly. Per the coordinator's standing instruction for this phase requesting extra rigor on whole-suite comparisons, a human should confirm this classification."

duration: 27min
completed: 2026-09-27
status: complete
---

# Phase 114 Plan 07: Test-Tree Type-Check Gate — tsconfig Repair, Baseline Digest, Interop Double and Commands.cjs Harness Typing Summary

**`npm run typecheck:test` now runs the test tree end to end against a repaired `tsconfig.test.json` (399 errors → a committed per-file digest for the remaining fix plans), and this plan's own 99-error share is fixed for real: the interop test double's fake Java AST objects and the Commands.cjs harness are both fully typed with zero type errors and zero behaviour change.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-09-27T18:53:00Z (approx)
- **Completed:** 2026-09-27T19:20:00Z (approx)
- **Tasks:** 3
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments
- `tsconfig.test.json` is repaired per D-06: extends `./tsconfig.json`, drops the invalid `references` block, sets `rootDir "."`, adds a commented `noImplicitAny: false` (the only relaxation, per D-05), includes `test/**/*.ts`, excludes `test/.tmp`. `package.json` gains the `typecheck:test` script (`tsc -p tsconfig.test.json --noEmit`) next to `lint`; `build` is untouched.
- The first working type check reports 399 errors across 76 test files (0 in `src/`, confirmed by the tracer's own verify command), committed as `baseline/typecheck-before.txt` grouped by owning plan (114-04, 114-08 through 114-12, plus one file — `test/eslint-disable-directives.test.ts`, created by 114-05 after the plan's research — flagged under an explicit UNOWNED heading for the orchestrator to assign).
- `test/bbj-test-module.ts` is at zero type errors: every `$type: JavaClass`/`JavaMethod`/`JavaField` object literal is now the `.$type` string constant; three small typed factories (`makeMethod`, `makeField`, `makeParameter`) build complete `JavaMethod`/`JavaField`/`JavaMethodParameter` objects (with `deprecated`/`isStatic` — previously silently missing — and `$container`/`realName` on every parameter); `TestableBBjLexer.prepareLineSplitter` is marked `override`; the unused `IndexManager` import is gone. Every fake class/method/parameter name, type and order is unchanged.
- `test/commands-cjs-harness.ts`'s `CommandsModule` interface gains named function members for every command the execution test calls; `ConfigPathCacheModule` gains a `setResolvedConfigPath` member; `fakeVscode`'s message/command fakes and `fakeProcessRunner`'s process fakes are typed with their real parameter lists. `test/commands-cjs-execution.test.ts` gets three small type-only helpers (`fakeProcessError`, `assertDefined`, typed `appendLine` fakes) that close the remaining errors with zero assertion or title-line changes.
- Total test-tree error count dropped from 399 to 300 (this plan's full 99-error share), with `npm run build` staying green throughout and two whole-suite verification passes each confirming `hookTimeoutSuites=0`/`interop5008=open` matching baseline.

## Task Commits

1. **Task 1: npm run typecheck:test type-checks the test tree end to end and records per-file counts for the fix plans** - `0ee03de4` (feat)
2. **Task 2: The interop test double's fakes are complete, typed AST objects** - `3975d6f5` (fix)
3. **Task 3: The Commands.cjs harness is typed, and its execution test type-checks with zero errors** - `7f5f8053` (fix)

**Plan metadata:** (commit hash recorded after this SUMMARY is committed)

## Files Created/Modified
- `bbj-vscode/tsconfig.test.json` - repaired test-tree type-check project (D-06/D-05)
- `bbj-vscode/package.json` - `typecheck:test` script added
- `.planning/phases/114-lint-type-check-test-suite-gates/baseline/typecheck-before.txt` - first working per-file error digest, grouped by owning plan
- `bbj-vscode/src/language/bbj-comment-provider.ts` - two comment arrays given explicit `(string | undefined)[]` types (Rule 3 deviation, see below)
- `bbj-vscode/test/bbj-test-module.ts` - fake Java AST objects rebuilt through typed `makeMethod`/`makeField`/`makeParameter` factories
- `bbj-vscode/test/commands-cjs-harness.ts` - `CommandsModule`/`ConfigPathCacheModule` typed; `fakeVscode`/`fakeProcessRunner` fakes typed
- `bbj-vscode/test/commands-cjs-execution.test.ts` - `fakeProcessError`/`assertDefined` helpers, typed `appendLine` fakes; no assertion changes

## Decisions Made
- Fixed `bbj-comment-provider.ts`'s two `const comments = []` declarations with explicit `(string | undefined)[]` annotations rather than leaving the relaxed test-config's `noImplicitAny: false` to silently break this `src/` file. TypeScript's "evolving array types" inference for a bare `const x = []` (which resolves the array's real element type from later `.push()` calls) only activates when `noImplicitAny` is on; with it off, the array types as `never[]`, causing four false errors in this `src/` file under the test program only — not under `npm run build`'s own `tsconfig.json`. This is a Rule 3 (blocking-issue) auto-fix: the tracer task's own acceptance criteria requires zero `src/` errors under the repaired test config, and this was the one file blocking that.
- `bbj-test-module.ts`'s method/field/parameter objects are built through three small factories rather than kept as inline literals with a per-field `.$type` fix, because fixing the `$type` discriminant alone unmasked a second, previously-invisible gap: every method/field literal was also missing the interface's required `deprecated`/`isStatic` properties. (TypeScript's literal-vs-discriminated-type error reporting short-circuits on the first discriminant mismatch and does not enumerate every other missing property until the discriminant itself matches.) The factories set every required field explicitly and wire `$container` on each parameter once its owning method object exists, per D-05's "real fixes, typed fakes" rule — not a cast.
- `ConfigPathCacheModule.setResolvedConfigPath` is typed to the narrower `{ path: string; exists: boolean }` shape every test in this file actually passes, rather than the real `ResolvedConfigPathResult` (which also requires `source`/`problem`). This is a deliberate, commented divergence from the production type describing exactly what these tests exercise — the real implementation accepts the narrower object fine at runtime (the extra fields are simply `undefined`), matching the plan's own `<interfaces>` guidance verbatim.
- The `commands-cjs-execution.test.ts` type-only fixes (`fakeProcessError`, `assertDefined`, typed `appendLine`) were placed exclusively on non-assertion statement lines (helper declarations, destructuring lines, fake declarations) so that every `expect(...)`/`test(...)` line in the file's diff against the phase base is byte-identical — verified directly via the plan's own diff-based acceptance-criteria grep, not merely by inspection.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `bbj-comment-provider.ts`'s comment arrays typed `never[]` under the new test config**
- **Found during:** Task 1 (tracer verification)
- **Issue:** The repaired `tsconfig.test.json`'s `noImplicitAny: false` (D-05's sanctioned relaxation) disables TypeScript's "evolving array types" inference for `const comments = []` in this `src/` file (imported transitively by the test tree). Under the plain `src/` build (`tsconfig.json`, `noImplicitAny` on via `strict`), the same file type-checks cleanly — the discrepancy only appears under the test program, and the tracer's own acceptance criteria (`! grep -qE '^src/' ...`) fails if any `src/` file has an error.
- **Fix:** Gave both `const comments = []` declarations (one per branch of `getComment`) an explicit `(string | undefined)[]` type annotation, matching the type TypeScript's evolving-array inference would otherwise have produced.
- **Files modified:** `bbj-vscode/src/language/bbj-comment-provider.ts`
- **Verification:** `npx tsc -p tsconfig.test.json --noEmit` reports zero `src/` errors; `npx vitest run test/comment-provider.test.ts` (2/2 passed); `npm run build` exits 0.
- **Committed in:** `0ee03de4` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking). **Impact on plan:** Necessary to satisfy the tracer task's own zero-src/-errors acceptance criterion; no scope creep — a two-line type annotation with no behaviour change.

### Investigated, Non-Regressive Environmental Flakiness (whole-suite verification, per coordinator instruction)

Task 3's acceptance criteria and the plan-level `<verification>` both require the whole-suite `FAILED_TEST` lines to equal `baseline/suite-before.txt`. Two whole-suite `npm test` runs were captured after all three tasks landed:

- **Run 1:** 13 failed tests — the 11-test `linking.test.ts` baseline, plus `test/functional/installed-extension-e2e.test.ts` (composer cue assertion) and `test/parser-keyword-statements.test.ts` (the same `LEN=` verifier-option test already named in 114-02's and 114-06's SUMMARYs).
- **Run 2:** 11 failed tests — byte-identical to `baseline/suite-before.txt`.

**Classification, with evidence gathered this session:**
1. Both extra-failure sources in Run 1 are the exact files 114-02's, 114-05's and 114-06's SUMMARYs already diagnosed as pre-existing, contention-timing flakiness, unrelated to any `114-xx` code change.
2. `parser-keyword-statements.test.ts` run alone (`npx vitest run test/parser-keyword-statements.test.ts`) passed 332/332 in 6.7s with no flakiness, confirming the whole-suite failure is a contention artifact, not a logic break.
3. `git diff --quiet` against `HEAD` (this plan's own commits) confirms both files are untouched by any commit in this plan; `git diff --stat e8941d48 -- test/parser-keyword-statements.test.ts` shows only 114-02's prior, unrelated harness migration.
4. `ps aux` during this session's whole-suite runs showed the same unrelated host process already documented in 114-02's, 114-05's and 114-06's investigations (`.venv/bin/python -m pipeline.knowledge_build`, ~559% CPU continuously), confirming the same sustained external contention source.
5. Both runs show `hookTimeoutSuites=0` and `interop5008=open` matching baseline exactly — the invariants this phase's test-suite-gate work actually protects, and the ones this plan's changes could plausibly have affected (they can't: this plan touches only `test/bbj-test-module.ts`, `test/commands-cjs-harness.ts`, `test/commands-cjs-execution.test.ts`, `src/language/bbj-comment-provider.ts`, none of which either failing file imports or depends on).

**Classification: not a regression.** Both extra failures are (a) confirmed untouched by this plan and (b) shaped exactly like the timing-only contention artifacts already diagnosed three times before in this phase (114-02, 114-05, 114-06) — a rotating single/double extra test failure under sustained unrelated CPU load, not a functional difference introduced by this plan's type-only fixes. No fix was applied to either file — both are out of scope per the deviation-rules scope boundary.

---

**Total deviations:** 1 auto-fixed (1 blocking, described above). 1 investigated-and-classified environmental finding (two pre-existing flaky sources, both independently re-confirmed in this session), reported per the coordinator's standing instruction for this phase.
**Impact on plan:** All three tasks' own deliverables (repaired config + digest, typed interop double, typed Commands.cjs harness) are fully verified and green, both individually/at targeted scope and in a byte-identical whole-suite run. The residual Run 1 gap against baseline is attributable entirely to pre-existing, unrelated flakiness under sustained external host contention, consistent with this phase's established precedent (114-02, 114-05, 114-06) and the project's standing decision that the regression gate is `numFailedTests`-based plus deterministic targeted-file runs, not a failing-suite identity delta.

## Issues Encountered

None beyond the whole-suite flakiness documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `bbj-vscode/tsconfig.test.json` and the `typecheck:test` script are now in place for every remaining 114-xx fix plan (114-04, 114-08 through 114-12) to drive their owned file share to zero, using `baseline/typecheck-before.txt`'s per-plan digest as the starting count.
- `test/bbj-test-module.ts` and `test/commands-cjs-harness.ts`/`test/commands-cjs-execution.test.ts` (the two largest error concentrations, 99 of 399 errors) are done; the test-tree total is now 300 errors across 74 files.
- TEST-02 is also declared by 114-08 through 114-13 (all still open); per the shared-ID gate (`requirements.ready-ids`), it is intentionally left un-marked in `REQUIREMENTS.md` here. The last of those plans' SUMMARY triggers the mark once all seven declaring plans are done.
- Recommend a human review the "Investigated, Non-Regressive Environmental Flakiness" section above, and, time permitting, re-run the whole-suite verification once the host's external CPU contention has cleared, to obtain a second byte-identical match against `baseline/suite-before.txt` for the record (Run 2 already achieved this once).

## Self-Check: PASSED

All 7 created/modified files verified present on disk with their described edits. All three task commits (`0ee03de4`, `3975d6f5`, `7f5f8053`) verified present in `git log`. Plan-level `<verification>` re-confirmed: `npm run typecheck:test` exits non-zero (300 errors remain, owned by later plans) with zero `src/` errors and zero errors in this plan's own files; `npm run build` exits 0; whole-suite Run 2's `FAILED_TEST` lines are byte-identical to `baseline/suite-before.txt`, with Run 1's gap fully investigated and classified above.

---
*Phase: 114-lint-type-check-test-suite-gates*
*Completed: 2026-09-27*
