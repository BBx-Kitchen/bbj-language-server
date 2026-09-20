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

Both built in the required order (VS Code first, since the IntelliJ build's `verifyLanguageServerBundle`
task fails fast without `bbj-vscode/out/language/main.cjs`), from source commit
`25821695e0c94dec84fa998c576457377ab15bdf` (Task 1's docs-only commit on top of the final
code-wave tree `84d485b26ed3a2ac6a577260b37e9c7c6727f66e` — no source file changed between the two,
so the artifacts are built from the same code the suite gate above just verified).

**VS Code extension:**
- File: `bbj-lang-0.15.3.vsix`
- Absolute path: `/home/coder/repos/bbj-language-server/bbj-vscode/bbj-lang-0.15.3.vsix`
- sha256 (`sha256sum` output line):
```
daf676bb8939105df89c848b42df378ece268fd44c8a474fba40bb669fe5baff  bbj-lang-0.15.3.vsix
```
- Size: 2,631,405 bytes
- Built via `npm run build && npx vsce package` — no dependency-resolution issue occurred, so
  `--no-dependencies` was not needed.

**IntelliJ plugin:**
- File: `bbj-intellij-0.1.0.zip`
- Absolute path: `/home/coder/repos/bbj-language-server/bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`
- sha256 (`sha256sum` output line):
```
abdd589edf2c7602ea71a44829cbc8467f37bcce324c586ab556f439f909bd55  bbj-intellij-0.1.0.zip
```
- Size: 1,160,565 bytes
- Built via `./gradlew buildPlugin` after the VS Code build produced `main.cjs`.

**Verdict-shape sentence (97-PATTERNS.md § "96-08 UAT-record shape"):** the hand-UAT verdict in
Task 3 below is recorded as: closed on the maintainer's verbatim reply, tied to artefact
`bbj-intellij-0.1.0.zip` sha256 `abdd589edf2c7602ea71a44829cbc8467f37bcce324c586ab556f439f909bd55`
(1,160,565 bytes) and source commit `25821695e0c94dec84fa998c576457377ab15bdf`, plus VS Code side
`bbj-lang-0.15.3.vsix` sha256 `daf676bb8939105df89c848b42df378ece268fd44c8a474fba40bb669fe5baff`
(2,631,405 bytes).

No install, publish or push command was run against either file — both are staged on local disk
only, at the absolute paths above, for the maintainer to install by hand.

**Standing rebuild rule:** if a code-review fix lands after this build, both distributables are
rebuilt from the final tree (VS Code first, then IntelliJ) and this section is re-filled with the
new filenames/hashes/sizes/source-commit before the hand-UAT verdict below is considered current.

---

## Hand UAT verdict

### Round 1 — 2026-09-20, macOS, IntelliJ IDEA 2026.2 — FAILED (blocking)

Verdict recorded against `bbj-intellij-0.1.0.zip` sha256
`abdd589edf2c7602ea71a44829cbc8467f37bcce324c586ab556f439f909bd55` (1,160,565 bytes) and
`bbj-lang-0.15.3.vsix` sha256 `daf676bb8939105df89c848b42df378ece268fd44c8a474fba40bb669fe5baff`
(2,631,405 bytes), both built from source commit `25821695e0c94dec84fa998c576457377ab15bdf`.

Maintainer's replies, verbatim:

> it restarted once after a kill (it was the 2nd in my case) but then never again (MacOS) but hold
> on - I have to click into an editor, then it restarts. False alarm I assume

> I ever only saw "Show Log" "Disable Error Reporting" "More" in one box. Never "restarting"
> (though it did)

Evidence — the maintainer's `idea.log` (19 status lines, 17:05:20 – 17:08:07): every stop arrives as
two transitions, `started -> stopping (classified as NOT_A_STOP)` then
`stopping -> stopped (classified as NOT_A_STOP)`. There is no `classified as CRASH` line, no
`Scheduled a BBj language server restart` line and no `Restarting the BBj language server` line in
the session. Every restart the maintainer observed was LSP4IJ starting the server on demand when
an editor gained focus; the box they saw is LSP4IJ's own error notification, not this plugin's
crash balloon.

| Expectation | Result |
|---|---|
| Unexpected stop is classified as a crash and auto-restarts | **FAIL** — never classified CRASH; plugin crash handling never ran |
| Crash notification with Show Log / Restart | **FAIL** — never raised (and the step's premise was wrong: the crash counter resets on every `started`, so two kills of a fully started server never reach the give-up branch) |
| No `Unsupported notification method: bbj/bbjcplAvailability` WARN | **PASS** — absent from the 2026.2 session (only hit is a 2026-07-16 log from before the fix) |
| Status log lines name the real from-state | **PASS** — e.g. `started -> stopping`, `stopping -> stopped` |
| No `IllegalStateException` for `setFraction` during a Node.js download | not exercised |

Root cause: with the full status feed, a dying process passes through `stopping` before `stopped`,
and `ExpectedStopGuard.classify` only treats `started`/`starting` as a live predecessor. The
before/after trace shown at the classifier-input checkpoint assumed a direct `started -> stopped`
transition and was wrong. LSP4IJ's own deliberate stops (last file closed, project close, idle
shutdown) take the same `started -> stopping -> stopped` path, so status alone cannot separate a
kill from a normal stop; treating `stopping` as live would raise a false crash on every file close.

Side observation (not blocking): each on-demand start logs
`stopped -> stopping -> starting -> stopping -> starting -> started` within ~300 ms — the
double-launch churn already reported upstream as redhat-developer/lsp4ij#1673.

**Maintainer decision (2026-09-20, blocking question): "Pull it out of 0.16.0".** The status-feed
move and the from-state change are reverted (`8fe7cb72`, `a22b78ad`); both todos return to pending
with this evidence; 0.16.0 ships the remaining folded work. Both distributables are rebuilt from the
post-revert tree and a short Round 2 UAT covers what is left.

### Round 2

_(Filled in after the rebuild.)_
