# Phase 97 Plan 05 — UAT Artifacts and Suite Gate Record

Source commit for this record (final code-wave tree, before this plan's own docs commits):
`84d485b26ed3a2ac6a577260b37e9c7c6727f66e`

---

## Suite gate

### IntelliJ whole-suite (`--rerun-tasks`)

Command: `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --rerun-tasks`

Result: **BUILD SUCCESSFUL in 7s** (18 actionable tasks: 18 executed — `--rerun-tasks` forbids the
UP-TO-DATE `:test` no-op).

Aggregated from `build/test-results/**/*.xml` (122 test classes):

| tests | skipped | failures | errors |
|-------|---------|----------|--------|
| 1101  | 0       | 0        | 0      |

### Vitest whole-suite (`RUN_BBJ_TESTS=0 --maxWorkers=2`)

Command: `cd /home/coder/repos/bbj-language-server/bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2`

JSON summary (`--reporter=json`):

| numTotalTestSuites | numFailedTestSuites | numTotalTests | numFailedTests | numPassedTests | numPendingTests |
|---|---|---|---|---|---|
| 452 | 4 | 1947 | **0** | 1895 | 52 |

**Expected-vs-observed statement:** `numFailedTests: 0` is the gate this plan judges on (per
97-05-PLAN.md and DEBT.md item 5) — met. The documented local baseline of 12 interop failures
(11 `linking.test.ts` + 1 issue447) applies only when `RUN_BBJ_TESTS` is unset and BBjServices is
live on `:5008`; this run pinned `RUN_BBJ_TESTS=0`, so that baseline does not apply here and none
of those 12 appeared.

**Failed-suite classification (2 files reported failed at the `--reporter=default` text-summary
level, both with zero attributed failed tests):**

1. `test/builtin-library-members.test.ts` — failed in the full run with `Hook timed out in 10000ms`
   in its `beforeAll(async () => { await initializeWorkspace(...) })`. Re-run in isolation (paired
   with the second file, `--maxWorkers` default): **passed**, 0 failures. This is exactly the
   documented `initializeWorkspace` `beforeAll` contention timeout (DEBT.md / project memory), not
   a regression — confirmed by isolation.
2. `test/functional/installed-extension-e2e.test.ts` — failed in the full run and reproduced when
   re-run alone (twice): `Error: No document found for URI: file:///.../issue475-setopts-in-code.bbj`,
   thrown inside `vscode-jsonrpc`'s `handleResponse`/`processMessageQueue` — an async LSP response
   handler firing after a preceding nested `describe`'s `afterAll` has torn down that connection, not
   a `beforeAll` timeout. Both isolated re-runs still reported **0 failed tests** for the file
   (19-28 passed, 15 skipped, varying by run) — the failure is a file-level uncaught-rejection event,
   not an assertion failure, so it does not add to `numFailedTests`. Confirmed pre-existing and
   unrelated to this phase's diff: `git diff --stat 84d485b26e -- bbj-vscode/test/functional/installed-extension-e2e.test.ts`
   is empty (this phase touched neither the test file nor its production dependencies — plans
   97-01/97-02/97-04 are `bbj-intellij`-only, and 97-03 touched only
   `issue447-real-interop.test.ts`). Per the executor scope boundary (CLAUDE.md / gsd-executor
   deviation rules), a pre-existing failure unrelated to this phase's changes is reported, not fixed.

Both suites therefore satisfy the plan's gate: IntelliJ `BUILD SUCCESSFUL` under `--rerun-tasks`;
Vitest `numFailedTests: 0`.

### Register check (source/test diff against `origin/main`, whole code wave)

Command:
```
git -C /home/coder/repos/bbj-language-server diff origin/main...HEAD -- bbj-intellij bbj-vscode documentation .github \
  | grep -nE '(^\+.*)(\b(D|C|CR)-[0-9]+\b|\b(COMP|PLAT|EM|IOP|REL)-[0-9]+\b|\b9[0-7]-[0-9]{2}\b)'
```

Result: **prints nothing** (grep exit 1, no match). No planning identifier (plan number, `D-xx`,
`C-xx`/`CR-xx`, or a requirement id) appears in an added source/test line of the whole code-wave
diff against `origin/main`. GitHub issue numbers (`#475`, `#663`, etc.) are unaffected by this
pattern and were not flagged. No fix was needed.

---

## Artifacts under test

_(Filled in by Task 2.)_

---

## Hand UAT verdict

_(Filled in by Task 3 — the maintainer's checkpoint.)_
