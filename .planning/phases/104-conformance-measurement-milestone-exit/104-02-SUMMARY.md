---
phase: 104-conformance-measurement-milestone-exit
plan: 02
subsystem: testing
tags: [conformance, whole-suite-gate, intellij, vsix, release-build]

requires:
  - phase: 104-01
    provides: leak-guard.mjs, the pinned baseline worktree at /home/coder/repos/bbj-corpus-baseline, and the endpoint-mode harness this plan's README points maintainers at
provides:
  - "bbj-vscode/test/test-data/conformance/README.md — maintainer pointer from the CONF-01 regression fixtures to the private bbj-corpus harness, no corpus content, not linked from the docs site"
  - "a pending todo recording the checkUseBeforeAssignment/getSymbolRefName exception caveat with a confirmed synthetic repro"
  - "three recorded whole-suite runs (interop-up, origin/main base comparison, CI-mode) proving CONF-03's suite half holds on the branch HEAD"
  - "a green IntelliJ Gradle suite (--rerun-tasks) and both distributables (VSIX, IntelliJ plugin zip) built from the final tree, the plugin carrying the freshly built language server byte for byte"
affects: [104-03-closing-measurement]

actuals:
  tokens: 33000
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "regression gate compares failing test NAMES against a scratch origin/main worktree (Node 22, symlinked node_modules), never counts alone"
    - "hook-timeout 'failed suites' with numFailedTests:0 are contention artifacts, not real failures — judged on numFailedTests"

key-files:
  created:
    - /home/coder/repos/bbj-language-server/bbj-vscode/test/test-data/conformance/README.md
    - /home/coder/repos/bbj-language-server/.planning/todos/pending/2026-09-23-use-before-assignment-check-throws-on-a-reference-without-a-symbol.md
  modified: []

key-decisions:
  - "D-11 todo's synthetic repro found via a scratch probe (built and deleted within this session): a bare single instance-access sigil ('#') as an Assignment's left-hand side does NOT reproduce the exception (the parser attaches that sigil to the Assignment's own instance-access flag, leaving the left-hand side unset, which the check already skips cleanly); TWO consecutive sigils immediately followed by '=' DOES reproduce it exactly (first sigil consumed by the Assignment's own flag, second becomes the left-hand-side expression's own instance-access flag with no reference target after it) — matching the two real reject files' AST shape (instance-access true on both levels, one-character CST span) found by walking their built ASTs"
  - "the same missing-reference shape also crashes a second, unrelated, UNCAUGHT call site (bbj-scope-local.ts's local-symbol collection) one build phase earlier than validation — noted in the todo's Fix options for the next investigator, not filed as a separate todo and not fixed here, since it is outside this plan's and D-11's scope"
  - "duplicate-vitest-run self-correction: an initial background dispatch (with '&' inside the command string) did not actually background under this harness's run_in_background semantics, and a second dispatch of the same command created a second vitest process racing on the same --outputFile; both were killed and the interop-up whole-suite run was restarted cleanly as a single process before any other verification depended on that file"

requirements-completed: [CONF-02, CONF-03]

coverage:
  - id: D1
    description: "Maintainer README at bbj-vscode/test/test-data/conformance/ names the covering test, the private bbj-corpus repository, the --endpoint flag, the BBj 26.03+ prerequisite, and the never-in-CI rule, with no corpus content or planning identifier"
    requirement: CONF-02
    verification:
      - kind: other
        ref: "leak-guard.mjs against both the rebuilt-main data root and the pinned baseline worktree (0 leaks); identifier/number-guard greps (0 hits); content-coverage greps for conformance-regressions.test.ts/bbj-corpus/--endpoint/26.03/never-in-CI (all present)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Phase 103 checkUseBeforeAssignment exception caveat is filed as a pending todo with a confirmed synthetic repro, no corpus text"
    requirement: CONF-02
    verification:
      - kind: other
        ref: "file existence + grep 'area: validation' (1 hit) + grep 'check-variable-scoping.ts' (present); scratch-session repro ('## = 1') reproduced the identical exception message and stack against createBBjTestServices(EmptyFileSystem)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The regression folder + examples suites still pass the way CI runs them, with the new README in place"
    verification:
      - kind: integration
        ref: "cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run test/conformance-regressions.test.ts test/example-files.test.ts test/examples-compile.test.ts — 9 passed, 2 skipped, 0 failed"
        status: pass
    human_judgment: false
  - id: D4
    description: "Whole-suite gate, interop-up mode: every failure sits in linking.test.ts's Interop related tests block, and every one of those 11 names also fails on origin/main (ebd535dc) in a scratch Node-22 worktree"
    requirement: CONF-03
    verification:
      - kind: integration
        ref: "cd bbj-vscode && npx vitest run --maxWorkers=2 (2570 total, 2519 passed, 11 failed, all in linking.test.ts); name-diff against the same file run on origin/main ebd535dc (11/42 failed, identical 11 names, 0 head-only)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Whole-suite gate, CI-mode (RUN_BBJ_TESTS=0): numFailedTests is 0"
    requirement: CONF-03
    verification:
      - kind: integration
        ref: "cd bbj-vscode && RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2 — 2570 total, 2507 passed, 0 failed, 63 skipped"
        status: pass
    human_judgment: false
  - id: D6
    description: "IntelliJ suite is green on the final tree (--rerun-tasks, so no UP-TO-DATE result can mask a stale green)"
    requirement: CONF-03
    verification:
      - kind: integration
        ref: "cd bbj-intellij && ./gradlew test --rerun-tasks — BUILD SUCCESSFUL; 122 JUnit result files, 0 carrying a failure or error"
        status: pass
    human_judgment: false
  - id: D7
    description: "Both distributables built from the final tree with no hand UAT; the plugin zip carries the freshly built main.cjs byte for byte"
    requirement: CONF-03
    verification:
      - kind: other
        ref: "npm run build (bbj-vscode); ./gradlew buildPlugin; unzip -p …zip … main.cjs | cmp - out/language/main.cjs (exit 0); npx vsce package --no-dependencies --out /tmp/bbj-104-02-final.vsix"
        status: pass
    human_judgment: false

duration: 19min
completed: 2026-09-23
status: complete
---

# Phase 104 Plan 2: Test Gate & Maintainer Pointer Summary

**Maintainer README for the CONF-01 regression fixtures, a filed-and-reproduced todo for the checkUseBeforeAssignment exception caveat, and CONF-03's suite half proven on the branch HEAD — three whole-suite runs, a green IntelliJ suite, and both distributables built with the plugin's bundled language server byte-identical to the freshly built one.**

## Performance

- **Duration:** 19 min
- **Started:** 2026-09-23T20:13:22Z
- **Completed:** 2026-09-23T20:32:00Z
- **Tasks:** 3
- **Files modified:** 2 (both new)

## Accomplishments

- `bbj-vscode/test/test-data/conformance/README.md` tells a maintainer what the fixture folder is, that `test/conformance-regressions.test.ts` is the test that actually covers it (not `example-files.test.ts`, per D-09's correction), and points to the private `bbj-corpus` harness's command shape, its BBj 26.03+ endpoint-mode prerequisite, and the never-in-CI rule — no corpus content, no planning identifier, not linked from the docs site, `CLAUDE.md` untouched.
- The Phase 103 `checkUseBeforeAssignment` exception caveat is now a pending todo with a **confirmed synthetic reproduction** (`## = 1` — two consecutive instance-access sigils immediately followed by an assignment), found by walking the AST of the two actual reject files that threw in the Phase 104-01 endpoint run and matching their exact shape (an `Assignment`'s left-hand side is a `SymbolRef` whose own `symbol` cross-reference was never populated).
- The regression + examples suites still pass the way CI runs them with the new README in place (9 passed, 2 skipped, 0 failed).
- Whole-suite gate proven on the branch HEAD in both interop modes: with BBjServices up, the only 11 failures are all in `linking.test.ts`'s "Interop related tests" block, and every one of those 11 names also fails identically on `origin/main` (`ebd535dc`) in a scratch Node-22 worktree; with `RUN_BBJ_TESTS=0` (what CI sees), `numFailedTests` is 0.
- IntelliJ `./gradlew test --rerun-tasks` passes with 0 failures/errors across 122 result files.
- Both distributables built from the final tree (`ff987aa2`): `/tmp/bbj-104-02-final.vsix` and `bbj-intellij-0.1.0.zip`, with the plugin's bundled `main.cjs` confirmed byte-identical (`cmp` exit 0) to the freshly built language server.

## Task Commits

1. **Task 1: End-to-end — the maintainer pointer and the scoping-check todo land, and the regression suites still pass the way CI runs them** — `ff987aa2` (docs(104-02): point maintainers at the private conformance harness and file the scoping-check todo)
2. **Task 2: Whole-suite gate in both interop modes, compared by name against origin/main** — no commit (this task changes no repository file, per its own `<files>` spec: scratch JSON went to `/tmp`, the base worktree was created and removed)
3. **Task 3: IntelliJ suite and both distributables from the final tree** — no commit (build outputs only, all git-ignored: `bbj-vscode/out/`, `/tmp/bbj-104-02-final.vsix`, `bbj-intellij/build/`)

**Plan metadata:** committed separately after this SUMMARY (see below).

## Files Created/Modified

- `bbj-vscode/test/test-data/conformance/README.md` — maintainer pointer to the private conformance harness, no corpus content
- `.planning/todos/pending/2026-09-23-use-before-assignment-check-throws-on-a-reference-without-a-symbol.md` — the D-11 caveat, with a confirmed synthetic repro and a second, related-but-out-of-scope crash site noted for the next investigator

## Decisions Made

- The D-11 todo's repro required going one step past the 13 candidates 104-RESEARCH.md already tried: walking the two actual reject files' ASTs (built from the pinned baseline worktree, in a scratch script deleted at the end of this task) showed the exact broken shape — an `Assignment.variable` that is a `SymbolRef` with `instanceAccess: true` and a one-character CST span, meaning its mandatory `symbol=[NamedElement:FeatureName]` never matched. A bare single sigil doesn't reproduce this (the *outer* `Assignment`'s own optional instance-access flag consumes it instead, which the check already guards against cleanly); two consecutive sigils do, because the first is consumed by the Assignment's flag and the second becomes the inner expression's own unmatched instance-access sigil — confirmed against both corpus files' AST shape and reproduced synthetically with invented text (`## = 1`).
- The same missing-`symbol` shape was also found to crash a second, unrelated call site (`bbj-scope-local.ts`'s local-symbol collection) that is **not** caught by Langium's validation registry, because it runs one build phase earlier (scope computation, not validation). This is noted in the filed todo's "Fix options" section as directly relevant context for whoever picks it up, but is not itself filed as a separate todo or fixed here — it is the same root cause, out of this plan's and D-11's scope.
- Self-corrected operational issue, not a deviation to product code: the first background dispatch of the interop-up whole-suite run used a trailing `&` inside the command string, which returned immediately without actually backgrounding under this harness's `run_in_background` semantics; a second dispatch of the identical command then raced a duplicate `vitest` process against the same `--outputFile`. Both were killed via `ps`/`kill` before either could write a corrupted or partial result, and the run was restarted as a single clean process. No test result reported in this SUMMARY came from the corrupted attempt.

## Deviations from Plan

None — plan executed exactly as written. (The two items above are documented as decisions/self-corrections, not Rule 1-4 deviations: neither touched product code inside `bbj-vscode/src` or `bbj-intellij/src`, and Task 1's own repro work was explicitly scoped by the plan's own action text as "time-box to 45 minutes or 10 candidate snippets" investigative work, not a fix.)

## Issues Encountered

- `.planning/config.json` carries a one-line uncommitted modification (`_auto_chain_active: false` → `true`) that predates this plan's execution (visible in the session's initial git status before any task ran) — orchestrator-owned workflow state, out of this plan's scope per the task-commit protocol's scope boundary. Left untouched; not part of any commit in this plan.
- The duplicate-vitest-run race described above (self-corrected before any verification depended on its output).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- CONF-03's suite half is proven on the branch HEAD (`ff987aa2`): all three whole-suite runs green by the phase's own definition, IntelliJ green, both distributables built and verified byte-identical where required.
- The maintainer pointer and the D-11 todo are committed, both pass the leak guard and the identifier/number guards.
- Plan 03 (the closing conformance measurement) can now run on exactly this tree — no further commits to `bbj-vscode/` or `bbj-intellij/` are expected before its measurement, per D-05's "measured after every other Phase 104 commit in this repo" ordering.
- No blockers for plan 03.

## Self-Check: PASSED

- `/home/coder/repos/bbj-language-server/bbj-vscode/test/test-data/conformance/README.md` exists on disk — confirmed.
- `/home/coder/repos/bbj-language-server/.planning/todos/pending/2026-09-23-use-before-assignment-check-throws-on-a-reference-without-a-symbol.md` exists on disk — confirmed.
- `git -C /home/coder/repos/bbj-language-server log --oneline --all` contains `ff987aa2` — confirmed.
- `/home/coder/repos/bbj-corpus/conformance/snapshots/phase-104-scoping-probe.mts` does not exist (scratch script deleted) — confirmed.
- `git -C /home/coder/repos/bbj-language-server worktree list` no longer lists `/home/coder/repos/bbj-ls-base-104` — confirmed.
- `/tmp/bbj-104-02-final.vsix` and `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` exist, both newer than the last `bbj-vscode` commit (`2026-09-23T20:20:52Z`) — confirmed.
- `bbj-vscode/src` and `bbj-intellij/src` are unmodified by this plan — confirmed (only the two files listed under Files Created/Modified are in the task commit).

---
*Phase: 104-conformance-measurement-milestone-exit*
*Completed: 2026-09-23*
