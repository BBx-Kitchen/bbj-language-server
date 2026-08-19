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

## Phase-close delta

*(To be filled by plan 67-12 at phase close.)*
