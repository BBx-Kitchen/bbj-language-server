# Phase 67 Baseline

Captured per D-07/D-08/D-09 (`.planning/phases/67-apply-easy-fixes/67-CONTEXT.md`). This file
records the phase-start measurement FIX-03 is discharged against, plus a delta subsection per plan
and a phase-close delta filled by 67-12.

## start_commit

```
47bb785817d3e2949ed1ca9ba8363542cc7bde64
```

## npm test

Run from `bbj-vscode/`: `npm test 2>&1 | tail -80`. Two runs performed to distinguish deterministic
failures from load-dependent `beforeAll` hook timeouts, per D-08.

**Run 1:** `Test Files  3 failed | 47 passed (50)` / `Tests  11 failed | 828 passed | 47 skipped (886)`
**Run 2:** `Test Files  5 failed | 45 passed (50)` / `Tests  11 failed | 788 passed | 87 skipped (886)`

The 11 failed *tests* are identical across both runs (see below) — this is the deterministic gate
set. The failed *test file* count and skip count vary run-to-run (3 vs 5 files), which is the
load-dependent `beforeAll` hook-timeout flakiness D-08 excludes from the gate.

### Deterministic failures (gate set)

All 11 in `test/linking.test.ts > Linking Tests > Interop related tests`, all traced to an
unreachable java-interop peer (`No bbjdir set. No classpath and prefixes loaded.` on stderr) — no
`bbjdir` configured in this environment, matching INVENTORY's baseline table exactly:

1. `test/linking.test.ts > Linking Tests > Interop related tests > All BBj classes extends Object`
2. `test/linking.test.ts > Linking Tests > Interop related tests > Import and declare simple Java class without using FQNs`
3. `test/linking.test.ts > Linking Tests > Interop related tests > Import Java class`
4. `test/linking.test.ts > Linking Tests > Interop related tests > Declare with direct import`
5. `test/linking.test.ts > Linking Tests > Interop related tests > Class definition with direct import in extends`
6. `test/linking.test.ts > Linking Tests > Interop related tests > Class definition with direct import in implements`
7. `test/linking.test.ts > Linking Tests > Interop related tests > Unloaded Java FQN access - test for #6`
8. `test/linking.test.ts > Linking Tests > Interop related tests > Java FQN access - test for #6`
9. `test/linking.test.ts > Linking Tests > Interop related tests > Linked List is resolved`
10. `test/linking.test.ts > Linking Tests > Interop related tests > Resolve nested class in use statement`
11. `test/linking.test.ts > Linking Tests > Interop related tests > Resolve nested class FQN`

This set matches INVENTORY's 11 named tests exactly — no discrepancy to record.

### Flaky, excluded from the gate (D-08)

Every occurrence below is a suite marked failed purely by a `WorkspaceManager.initializeWorkspace()`
`beforeAll` hook exceeding vitest's default 10000ms `hookTimeout` — never a test assertion failure.
Which suite(s) hit the timeout varies by run (contention-dependent), confirming the flakiness is
load-dependent, not a fixed set:

- `test/builtin-functions-library.test.ts > builtin functions library` — `Error: Hook timed out in
  10000ms.` at `test/builtin-functions-library.test.ts:16`. Reproduced on run 1 (as part of the
  3-file failure set); did not reproduce as a distinct top-level FAIL line on run 2's tail (same
  duration profile, present in both runs' full failed-suite list — see raw run logs).
- `test/classes.test.ts > Inheritance chain resolution` — `Error: Hook timed out in 10000ms.` at
  `test/classes.test.ts:104`. Reproduced on both runs.
- `test/classes.test.ts > Cyclic inheritance detection` — `Error: Hook timed out in 10000ms.` at
  `test/classes.test.ts:400`. Reproduced on both runs.
- `test/variable-scoping.test.ts > Variable Scoping` — `Error: Hook timed out in 10000ms.` at
  `test/variable-scoping.test.ts:47`. Reproduced on both runs.
- `test/functional/chevrotain-tokens.test.ts > Chevrotain Token Runtime Verification` — `Error: Hook
  timed out in 10000ms.` at `test/functional/chevrotain-tokens.test.ts:17`. Reproduced on both runs.

None of these 5 suites contributes a test to the deterministic gate set — every test they contain
is reported `skipped` when the hook times out, not `failed`.

### Observations (not gate criteria)

Per D-08, file-level and skip-level counts vary run-to-run with no source change and are recorded
for reference only:

- Run 1: 3 failed suites, 47 skipped tests, 828 passed
- Run 2: 5 failed suites, 87 skipped tests, 788 passed

## npm run lint

```
> bbj-lang@0.12.0 lint
> eslint src test

/home/coder/repos/bbj-language-server/bbj-vscode/src/language/bbj-document-symbol-provider.ts
   75:13  warning  Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any')
  149:21  warning  Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any')

✖ 2 problems (0 errors, 2 warnings)
  0 errors and 2 warnings potentially fixable with the `--fix` option.
```

Exit code: `0`. Both warnings are `P61-D4-010`'s own evidence (D-10) — applying that finding is
expected to clear lint to literal cleanliness.

## gradlew build

Run from `bbj-intellij/`: `./gradlew build`.

```
FAILURE: Build failed with an exception.

* What went wrong:
25.0.3

BUILD FAILED in 5s
```

This is `build.gradle.kts`'s `sourceCompatibility`/`targetCompatibility` version-check clause
rejecting the only installed JDK (Temurin `25.0.3` at `/opt/java/default`) against the required
`JavaVersion.VERSION_17`. `java -version` confirms `openjdk version "25.0.3"` is the only JDK
present. Matches INVENTORY exactly: Gradle 8.13 itself starts and runs the Gradle Daemon fine —
this is a build-script version check, not a bootstrap rejection.

## Flaky exclusions (D-08)

See `### Flaky, excluded from the gate (D-08)` above under `## npm test` — all 5 exclusions are
recorded there with suite name, quoted timeout, and reproduction status.

- `test/variable-scoping.test.ts > Variable Scoping` — `Error: Hook timed out in 10000ms.` at
  `test/variable-scoping.test.ts:47`, observed again during plan 67-01's baseline delta below.
  Already named among the 5 suites recorded above; reproduction confirms the flakiness is
  load-dependent (not every run hits every suite), consistent with the original observation.
- `test/functional/chevrotain-tokens.test.ts > Chevrotain Token Runtime Verification` — `Error:
  Hook timed out in 10000ms.` at `test/functional/chevrotain-tokens.test.ts:17`, observed during
  plan 67-02's baseline delta above. Already named among the 5 suites recorded above; reproduction
  confirms the flakiness is load-dependent, not caused by this plan's changes.
- `test/classes.test.ts > Inheritance chain resolution` — `Error: Hook timed out in 10000ms.` at
  `test/classes.test.ts:104`, observed during plan 67-03's baseline delta below. Already named
  among the 5 suites recorded above; reproduction confirms the flakiness is load-dependent.
- `test/declare-in-class.test.ts > DECLARE in class body (#380)` — `Error: Hook timed out in
  10000ms.` at `test/declare-in-class.test.ts:16`, observed during plan 67-03's baseline delta
  below. Not among the original 5; a new suite hitting the same load-dependent `beforeAll
  initializeWorkspace()` hookTimeout pattern (per P61-D5-013's cost-profile trace). Reproduced on
  a same-day re-run (see plan 67-03 delta below) — confirmed flaky, not a one-off.
- `test/variable-scoping.test.ts > Variable Scoping` — `Error: Hook timed out in 10000ms.` at
  `test/variable-scoping.test.ts:47`, observed during plan 67-03's baseline delta below. Already
  named among the 5 suites recorded above; reproduction confirms the flakiness is load-dependent.
- `test/lazy-prefix-loading.test.ts > Lazy PREFIX loading (#32)` — `Error: Hook timed out in
  10000ms.` at `test/lazy-prefix-loading.test.ts:58`, observed during plan 67-03's baseline delta
  below. Not among the original 5; a new suite hitting the same pattern. Did not reproduce on the
  immediately following re-run in this same delta (contention-dependent, per D-08).
- `test/use-project-root.test.ts > USE resolves relative to the project root (#378)` — `Error:
  Hook timed out in 10000ms.` at `test/use-project-root.test.ts:28`, observed twice during plan
  67-03's baseline delta below (two separate re-runs). Not among the original 5; a new suite
  hitting the same pattern, reproduced across runs — confirmed flaky.
- `test/builtin-functions-library.test.ts > builtin functions library` — `Error: Hook timed out in
  10000ms.` at `test/builtin-functions-library.test.ts:16`, observed during plan 67-03's baseline
  delta below. Already named among the 5 suites recorded above; reproduction confirms the
  flakiness is load-dependent.
- `test/run-call-file-resolution.test.ts > RUN/CALL file resolution (#173)` — `Error: Hook timed
  out in 10000ms.` at `test/run-call-file-resolution.test.ts:23`, observed twice during plan
  67-03's baseline delta below (two separate re-runs). Not among the original 5; a new suite
  hitting the same pattern, reproduced across runs — confirmed flaky.
- `test/use-project-root.test.ts > USE resolves relative to the project root (#378)` — `Error: Hook
  timed out in 10000ms.` at `test/use-project-root.test.ts:28`, observed during plan 67-04's
  baseline delta below (run 3 of 3). Already named among the suites recorded above; reproduction
  confirms the flakiness is load-dependent.
- `test/class-validations-issues.test.ts > Class validation issues (#79, #80, #86, #87)` —
  `Error: Hook timed out in 10000ms.` at `test/class-validations-issues.test.ts:22`, observed
  during plan 67-04's baseline delta below (run 1 of 3). Not among the previously named suites; a
  new suite hitting the same load-dependent `beforeAll initializeWorkspace()` pattern. Did not
  reproduce on runs 2 or 3 of the same delta (contention-dependent, per D-08).
- `test/validation.test.ts > BBj validation` — `Error: Hook timed out in 10000ms.` at
  `test/validation.test.ts:19`, observed during plan 67-04's baseline delta below (run 1 of 3).
  Not among the previously named suites; a new suite hitting the same pattern. Did not reproduce
  on runs 2 or 3 of the same delta.
- `test/validation-function-calls.test.ts > builtin function call validation (#451)` — `Error: Hook
  timed out in 10000ms.` at `test/validation-function-calls.test.ts:15`, observed during plan
  67-04's baseline delta below (run 3 of 3). Not among the previously named suites; a new suite
  hitting the same pattern. Did not reproduce on runs 1 or 2 of the same delta.

### Plan 67-01 delta

**Verdict: identical.**

Ran from `bbj-vscode/`: `npm test 2>&1 | tail -40` and `npm run lint`, on HEAD after plan 67-01's
three commits (`382a068` test, `32faeff` fix, `2b121ee` test — the P61-D2-011/P66-D2-001 red/green
pair and the P61-D5-009 regression test; no `bbj-intellij/` file changed, so `./gradlew build` is
not re-run per D-09).

**`npm test`:** `Test Files  2 failed | 48 passed (50)` / `Tests  11 failed | 845 passed | 32
skipped (888)`. The failing-test NAME set compared against `### Deterministic failures (gate set)`
above:

1. `test/linking.test.ts > Linking Tests > Interop related tests > All BBj classes extends Object`
2. `test/linking.test.ts > Linking Tests > Interop related tests > Import and declare simple Java class without using FQNs`
3. `test/linking.test.ts > Linking Tests > Interop related tests > Import Java class`
4. `test/linking.test.ts > Linking Tests > Interop related tests > Declare with direct import`
5. `test/linking.test.ts > Linking Tests > Interop related tests > Class definition with direct import in extends`
6. `test/linking.test.ts > Linking Tests > Interop related tests > Class definition with direct import in implements`
7. `test/linking.test.ts > Linking Tests > Interop related tests > Unloaded Java FQN access - test for #6`
8. `test/linking.test.ts > Linking Tests > Interop related tests > Java FQN access - test for #6`
9. `test/linking.test.ts > Linking Tests > Interop related tests > Linked List is resolved`
10. `test/linking.test.ts > Linking Tests > Interop related tests > Resolve nested class in use statement`
11. `test/linking.test.ts > Linking Tests > Interop related tests > Resolve nested class FQN`

Set-equal to the phase-start gate set — same 11 names, none added, none removed. The one failed
suite beyond these 11 (`test/variable-scoping.test.ts > Variable Scoping`) is the flaky
`beforeAll` hook-timeout exclusion recorded above, not a test failure, and contributes 0 tests to
the deterministic gate set (all 29 of its tests reported `skipped`).

**`npm run lint`:** exit code `0`, the same 2 pre-existing "Unused eslint-disable directive"
warnings at `bbj-document-symbol-provider.ts:75,149` (`P61-D4-010`'s own evidence, not yet
applied) — unchanged from the phase-start baseline.

**`./gradlew build`:** not re-run — no `bbj-intellij/` file changed in this plan (D-09).

### Plan 67-02 delta

**Verdict: identical.**

Ran from `bbj-vscode/`: `npm test 2>&1 | tail -100` and `npm run lint`, on HEAD after plan 67-02's
commits (the P61-D2-001/002/003/004, P61-D3-001, P61-D4-003 fixes on `java-interop.ts` plus the
new `test/java-interop-service.test.ts`; no `bbj-intellij/` file changed, so `./gradlew build` is
not re-run per D-09).

**`npm test`:** `Test Files  2 failed | 49 passed (51)` / `Tests  11 failed | 879 passed | 4
skipped (894)`. The failing-test NAME set compared against `### Deterministic failures (gate set)`
above:

1. `test/linking.test.ts > Linking Tests > Interop related tests > All BBj classes extends Object`
2. `test/linking.test.ts > Linking Tests > Interop related tests > Import and declare simple Java class without using FQNs`
3. `test/linking.test.ts > Linking Tests > Interop related tests > Import Java class`
4. `test/linking.test.ts > Linking Tests > Interop related tests > Declare with direct import`
5. `test/linking.test.ts > Linking Tests > Interop related tests > Class definition with direct import in extends`
6. `test/linking.test.ts > Linking Tests > Interop related tests > Class definition with direct import in implements`
7. `test/linking.test.ts > Linking Tests > Interop related tests > Unloaded Java FQN access - test for #6`
8. `test/linking.test.ts > Linking Tests > Interop related tests > Java FQN access - test for #6`
9. `test/linking.test.ts > Linking Tests > Interop related tests > Linked List is resolved`
10. `test/linking.test.ts > Linking Tests > Interop related tests > Resolve nested class in use statement`
11. `test/linking.test.ts > Linking Tests > Interop related tests > Resolve nested class FQN`

Set-equal to the phase-start gate set — same 11 names, none added, none removed. The new
`test/java-interop-service.test.ts` suite (18 tests, mock-socket-driven, never touching port 5008)
passed in full and contributes 0 failures.

One additional suite-level FAIL beyond these 11:
`test/functional/chevrotain-tokens.test.ts > Chevrotain Token Runtime Verification` —
`Error: Hook timed out in 10000ms.` at `test/functional/chevrotain-tokens.test.ts:17`. This is one
of the 5 known load-dependent `beforeAll` hook-timeout exclusions already named in
`### Flaky, excluded from the gate (D-08)` above; reproduced again here (contention-dependent,
consistent with the original observation), contributing 0 tests to the deterministic gate set (its
tests report `skipped`, not `failed`). Appended below under `## Flaky exclusions (D-08)`.

**`npm run lint`:** exit code `0`, the same 2 pre-existing "Unused eslint-disable directive"
warnings at `bbj-document-symbol-provider.ts:75,149` (`P61-D4-010`'s own evidence, not yet
applied) — unchanged from the phase-start baseline.

**`./gradlew build`:** not re-run — no `bbj-intellij/` file changed in this plan (D-09).

### Plan 67-03 delta

**Verdict: identical.**

Ran from `bbj-vscode/`: `npm test 2>&1 | tail -100` (four times, per D-08 — this plan touches a
service on the build hot path, so the delta was checked more than the usual two runs before
accepting it) and `npm run lint`, on HEAD after plan 67-03's nine commits (the P61-D2-015,
P61-D2-016, P61-D2-017, P61-D3-005 red/green pairs, the P61-D5-016 test-is-the-fix commit, and the
P61-D8-006 no-op; no `bbj-intellij/` file changed, so `./gradlew build` is not re-run per D-09).

**`npm test`:** across all four runs, the failing-test NAME set was identical every time:

1. `test/linking.test.ts > Linking Tests > Interop related tests > All BBj classes extends Object`
2. `test/linking.test.ts > Linking Tests > Interop related tests > Import and declare simple Java class without using FQNs`
3. `test/linking.test.ts > Linking Tests > Interop related tests > Import Java class`
4. `test/linking.test.ts > Linking Tests > Interop related tests > Declare with direct import`
5. `test/linking.test.ts > Linking Tests > Interop related tests > Class definition with direct import in extends`
6. `test/linking.test.ts > Linking Tests > Interop related tests > Class definition with direct import in implements`
7. `test/linking.test.ts > Linking Tests > Interop related tests > Unloaded Java FQN access - test for #6`
8. `test/linking.test.ts > Linking Tests > Interop related tests > Java FQN access - test for #6`
9. `test/linking.test.ts > Linking Tests > Interop related tests > Linked List is resolved`
10. `test/linking.test.ts > Linking Tests > Interop related tests > Resolve nested class in use statement`
11. `test/linking.test.ts > Linking Tests > Interop related tests > Resolve nested class FQN`

Set-equal to the phase-start gate set — same 11 names, none added, none removed, on every one of
the four runs. `test/ws-manager.test.ts` (3 tests) and `test/document-builder.test.ts` (4 tests),
the two new suites this plan adds, passed in full on every run and contribute 0 failures.

Beyond these 11, each run showed 2-3 additional `FAIL` lines, every one a `beforeAll`
`Error: Hook timed out in 10000ms.` — never an assertion failure. Two were already-known members
of the 5-suite flaky list (`test/classes.test.ts > Inheritance chain resolution`,
`test/variable-scoping.test.ts > Variable Scoping`, `test/builtin-functions-library.test.ts >
builtin functions library`, across the four runs); four were new suites hitting the identical
load-dependent pattern for the first time in this phase
(`test/declare-in-class.test.ts > DECLARE in class body (#380)`,
`test/lazy-prefix-loading.test.ts > Lazy PREFIX loading (#32)`,
`test/use-project-root.test.ts > USE resolves relative to the project root (#378)`,
`test/run-call-file-resolution.test.ts > RUN/CALL file resolution (#173)`). All are appended above
under `## Flaky exclusions (D-08)` with suite name, quoted timeout, and reproduction status. None
contributes a test to the deterministic gate set — every test in a timed-out suite reports
`skipped`, not `failed`. This plan touches `bbj-ws-manager.ts` (the exact file whose
`initializeWorkspace()` P61-D5-013 already identified as the routing-table's flakiness source) and
adds two new `beforeAll`-driven suites of its own, so the wider spread of suites hitting the same
pre-existing hookTimeout under contention is consistent with — not caused by — this plan's changes:
every affected suite's `beforeAll` calls the same shared, pre-existing
`WorkspaceManager.initializeWorkspace()` path this plan's own new test file avoids exercising via
`createBBjTestServices` specifically to sidestep this cost (see `test/ws-manager.test.ts`'s and
`test/document-builder.test.ts`'s header comments).

**`npm run lint`:** exit code `0`, the same 2 pre-existing "Unused eslint-disable directive"
warnings at `bbj-document-symbol-provider.ts:75,149` (`P61-D4-010`'s own evidence, not yet
applied) — unchanged from the phase-start baseline.

**`./gradlew build`:** not re-run — no `bbj-intellij/` file changed in this plan (D-09).

### Plan 67-04 delta

**Verdict: identical.**

Ran from `bbj-vscode/`: `npm run lint` and `npm test 2>&1 | tail -40` (three full runs, per D-08),
on HEAD after plan 67-04's ten commits (the P61-D2-013, P61-D3-004, P61-D2-014, P61-D2-008
red/green pairs, the P61-D4-010 and P61-D4-005 no-test D4 fixes; no `bbj-intellij/` file changed,
so `./gradlew build` is not re-run per D-09).

**`npm run lint`: exit code `0`, zero warnings.** This is the lint-clean milestone D-10 predicted:
the two baseline warnings —

```
bbj-vscode/src/language/bbj-document-symbol-provider.ts
   75:13  warning  Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any')
  149:21  warning  Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any')
```

— are cleared by `P61-D4-010` (commit `91f8329`), which deletes both now-unused
`eslint-disable-next-line @typescript-eslint/no-explicit-any` directives. This is the finding named
as the cause, not housekeeping: no other file in this plan's diff touches an eslint directive, and
`git diff 6343f90..HEAD --name-only` contains no path matching `eslint`.

**`npm test`:** across all three runs, the failing-test NAME set was identical every time:

1. `test/linking.test.ts > Linking Tests > Interop related tests > All BBj classes extends Object`
2. `test/linking.test.ts > Linking Tests > Interop related tests > Import and declare simple Java class without using FQNs`
3. `test/linking.test.ts > Linking Tests > Interop related tests > Import Java class`
4. `test/linking.test.ts > Linking Tests > Interop related tests > Declare with direct import`
5. `test/linking.test.ts > Linking Tests > Interop related tests > Class definition with direct import in extends`
6. `test/linking.test.ts > Linking Tests > Interop related tests > Class definition with direct import in implements`
7. `test/linking.test.ts > Linking Tests > Interop related tests > Unloaded Java FQN access - test for #6`
8. `test/linking.test.ts > Linking Tests > Interop related tests > Java FQN access - test for #6`
9. `test/linking.test.ts > Linking Tests > Interop related tests > Linked List is resolved`
10. `test/linking.test.ts > Linking Tests > Interop related tests > Resolve nested class in use statement`
11. `test/linking.test.ts > Linking Tests > Interop related tests > Resolve nested class FQN`

Set-equal to the phase-start gate set — same 11 names, none added, none removed, on every one of
the three runs. `test/completion-test.test.ts`, `test/file-path-completion.test.ts`,
`test/document-symbol.test.ts`, `test/lexer.test.ts`, `test/parser.test.ts` and
`test/example-files.test.ts` — the six suites this plan's `<verify>` blocks target directly —
passed in full on every run.

Beyond these 11, each of the three runs showed exactly 1-2 additional `FAIL` lines, every one a
`beforeAll` `Error: Hook timed out in 10000ms.`, never an assertion failure: run 1
(`test/class-validations-issues.test.ts`, `test/validation.test.ts`), run 2
(`test/classes.test.ts > Cyclic inheritance detection`), run 3
(`test/run-call-file-resolution.test.ts`, `test/use-project-root.test.ts`,
`test/validation-function-calls.test.ts`). `test/classes.test.ts`,
`test/run-call-file-resolution.test.ts` and `test/use-project-root.test.ts` are already named in
`## Flaky exclusions (D-08)` above (same file, load-dependent hookTimeout); `test/class-validations-issues.test.ts`,
`test/validation.test.ts` and `test/validation-function-calls.test.ts` are new suites hitting the
identical `beforeAll initializeWorkspace()` hookTimeout pattern for the first time in this phase —
none of the three touches any file this plan modifies
(`bbj-completion-provider.ts`, `bbj-document-symbol-provider.ts`, `bbj-token-builder.ts`), so the
new names are consistent with — not caused by — this plan's changes; excluded per D-08 with the
exclusion argued per occurrence above. Every test in a timed-out suite reports `skipped`, not
`failed`, which is why the total passed/skipped counts vary slightly run to run (852-892 passed,
4-44 skipped) while the 11-name deterministic failure set and the 907 total never move.

**`./gradlew build`:** not re-run — no `bbj-intellij/` file changed in this plan (D-09).

### Plan 67-05 delta

**Verdict: identical.**

Ran from `bbj-vscode/`: `npm run lint` and `npm test 2>&1` (three full runs, per D-08), on HEAD
after plan 67-05's ten commits (the P61-D2-005, P61-D2-006, P61-D2-009 red/green pairs from Task 1,
and the P61-D2-010, P61-D2-019 red/green pairs from Task 2; no `bbj-intellij/` file changed, so
`./gradlew build` is not re-run per D-09).

**`npm run lint`: exit code `0`, zero warnings.** Unchanged from the `P61-D4-010` lint-clean
milestone plan 67-04 reached — no later plan may regress it, and none of this plan's five edits
touches an eslint directive.

**`npm test`:** across all three runs, the failing-test NAME set was identical every time:

1. `test/linking.test.ts > Linking Tests > Interop related tests > All BBj classes extends Object`
2. `test/linking.test.ts > Linking Tests > Interop related tests > Import and declare simple Java class without using FQNs`
3. `test/linking.test.ts > Linking Tests > Interop related tests > Import Java class`
4. `test/linking.test.ts > Linking Tests > Interop related tests > Declare with direct import`
5. `test/linking.test.ts > Linking Tests > Interop related tests > Class definition with direct import in extends`
6. `test/linking.test.ts > Linking Tests > Interop related tests > Class definition with direct import in implements`
7. `test/linking.test.ts > Linking Tests > Interop related tests > Unloaded Java FQN access - test for #6`
8. `test/linking.test.ts > Linking Tests > Interop related tests > Java FQN access - test for #6`
9. `test/linking.test.ts > Linking Tests > Interop related tests > Linked List is resolved`
10. `test/linking.test.ts > Linking Tests > Interop related tests > Resolve nested class in use statement`
11. `test/linking.test.ts > Linking Tests > Interop related tests > Resolve nested class FQN`

Set-equal to the phase-start gate set — same 11 names, none added, none removed, on every one of
the three runs. `test/value-converter.test.ts`, `test/lexer.test.ts`, `test/cpl-parser.test.ts`,
`test/variable-scoping.test.ts` and `test/builtin-functions-library.test.ts` — the five suites this
plan's two tasks touch directly — passed in full (234, then 76, passing respectively across their
own scoped runs) on every run.

Beyond these 11, each run showed a different 1-3 additional `FAIL` lines, every one a `beforeAll`
`Error: Hook timed out in 10000ms.`, never an assertion failure: run 1
(`test/class-validations-issues.test.ts`, `test/classes.test.ts > Inheritance chain resolution`,
`test/run-call-file-resolution.test.ts`, `test/functional/chevrotain-tokens.test.ts`), run 2
(`test/run-call-file-resolution.test.ts > RUN/CALL file resolution (#173)`), run 3
(`test/classes.test.ts > Classes access-levels`, `test/declare-in-class.test.ts`,
`test/use-project-root.test.ts`). All are already named in `## Flaky exclusions (D-08)` above
(same files, load-dependent `beforeAll initializeWorkspace()` hookTimeout pattern) or are the same
pattern recurring in a different describe block of an already-named file; none touches any file
this plan modifies (`bbj-value-converter.ts`, `bbj-lexer.ts`, `bbj-cpl-parser.ts`,
`check-variable-scoping.ts`, `lib/events.ts`), so they are consistent with — not caused by — this
plan's changes; excluded per D-08. Every test in a timed-out suite reports `skipped`, not `failed`,
which is why the total passed/skipped counts vary run to run (895-897 passed, 8-10 skipped) while
the 11-name deterministic failure set and the 916 total never move.

**`./gradlew build`:** not re-run — no `bbj-intellij/` file changed in this plan (D-09).

### Plan 67-06 delta

**Verdict: identical.**

Ran from `bbj-vscode/`: `npm run lint` and `npm test` (three full runs, per D-08), on HEAD after
this plan's nine commits (P61-D4-006, P61-D4-008, P61-D4-009, P61-D4-012, P61-D8-004, P61-D8-003,
P61-D8-005, P62-D8-001, plus P61-D8-002's no-op with zero commits). No `bbj-intellij/` file changed
directly by this plan — `bbj-language-configuration.json` and `bbx-language-configuration.json`
are documented in CLAUDE.md's TextMate bullet but not themselves modified — so `./gradlew build` is
not re-run per D-09.

This plan deletes a file (`assertions.ts`) and extracts three helpers
(`resolveWorkspaceRoot`/`formatSourceLocation` in `bbj-linker.ts`, `reloadJavaClassesAndRevalidate`
in `main.ts`) with no new regression tests behind them (D-11: D4/D8 dimensions require none) — this
delta is the only evidence the plan's "no behaviour change" claim held.

**`npm run lint`: exit code `0`, zero warnings.** Unchanged from the `P61-D4-010` lint-clean
milestone; none of this plan's nine edits touches an eslint directive.

**`npm test`:** across all three runs, the failing-test NAME set was identical every time — the
same 11 names as the phase-start gate set:

1. `test/linking.test.ts > Linking Tests > Interop related tests > All BBj classes extends Object`
2. `test/linking.test.ts > Linking Tests > Interop related tests > Import and declare simple Java class without using FQNs`
3. `test/linking.test.ts > Linking Tests > Interop related tests > Import Java class`
4. `test/linking.test.ts > Linking Tests > Interop related tests > Declare with direct import`
5. `test/linking.test.ts > Linking Tests > Interop related tests > Class definition with direct import in extends`
6. `test/linking.test.ts > Linking Tests > Interop related tests > Class definition with direct import in implements`
7. `test/linking.test.ts > Linking Tests > Interop related tests > Unloaded Java FQN access - test for #6`
8. `test/linking.test.ts > Linking Tests > Interop related tests > Java FQN access - test for #6`
9. `test/linking.test.ts > Linking Tests > Interop related tests > Linked List is resolved`
10. `test/linking.test.ts > Linking Tests > Interop related tests > Resolve nested class in use statement`
11. `test/linking.test.ts > Linking Tests > Interop related tests > Resolve nested class FQN`

Set-equal to the phase-start gate set on all three runs — same 11 names, none added, none removed.
The formatted `[in <file>.bbj:<line>]` location suffix embedded in each of these 11 messages is
produced by `bbj-linker.ts`'s newly-extracted `formatSourceLocation` helper (P61-D4-008); its
byte-identical output across all three runs is the direct evidence that extraction preserved the
formatting exactly.

Beyond these 11, each run showed a different 0-3 additional `FAIL` lines, every one a `beforeAll`
`Error: Hook timed out in 10000ms.`, never an assertion failure: run 1 (none beyond the 11 — 2
failed test files, 888 passed, 17 skipped), run 2 (none beyond the 11, same shape), run 3
(`test/run-call-file-resolution.test.ts > RUN/CALL file resolution is inert without project
context`, `test/validation.test.ts > BBj validation`, `test/variable-scoping.test.ts > Variable
Scoping` — 4 failed test files, 828 passed, 77 skipped). All three of run 3's extra failures are
the same load-dependent `beforeAll initializeWorkspace()` hookTimeout pattern already named in
`## Flaky exclusions (D-08)` above; none touches a file this plan modifies (`bbj-validator.ts`,
`bbj-linker.ts`, `assertions.ts`, `main.ts`, `bbj-cpl-service.ts`, `bbj.langium`, `CLAUDE.md`) —
`validation.test.ts` exercises checks registered in `bbj-validator.ts`, but this plan's only edit
to that file deleted a dead, never-registered method pair, so the hook-timeout there is consistent
with — not caused by — the change. Excluded per D-08. Every test in a timed-out suite reports
`skipped`, not `failed`, which is why the total passed/skipped counts vary run to run (828-888
passed, 17-77 skipped) while the 11-name deterministic failure set and the 916 total never move.

**`./gradlew build`:** not re-run — no `bbj-intellij/` file changed in this plan (D-09).

## Phase-close delta

*(To be filled by plan 67-12 at phase close.)*
