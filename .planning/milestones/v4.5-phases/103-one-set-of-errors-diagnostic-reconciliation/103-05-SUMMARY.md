---
phase: 103-one-set-of-errors-diagnostic-reconciliation
plan: 05
subsystem: diagnostics
tags: [langium, typescript, diagnostics, vitest, ci, release-process]

requires:
  - phase: 103-one-set-of-errors-diagnostic-reconciliation
    provides: >
      Plans 01-04's verdict reconciliation, diagnostic hierarchy, carry-over and the two
      real-endpoint confirmation tests — this plan gates, builds and ships that tree, it adds no
      reconciliation logic of its own
provides:
  - A green whole-suite run and a clean register/commit-body scan on the final tree
  - Both distributables (VS Code VSIX, IntelliJ plugin zip) built from the final tree and
    installed, proven byte-identical on the shared language-server bundle
  - Two self-contained hand-check runbooks (endpoint present; pre-endpoint jar) with every log
    line, source string and fixture substituted from the shipped code, ready for the phase
    verifier to harvest
  - PR #691 fast-forwarded to carry phases 98-103, with a refreshed title and body
affects: [104]

actuals:
  tokens: 5180
  tasks: 3
  commits: 0

tech-stack:
  added: []
  patterns:
    - "A jar-backup deviation kept both backups outside the BBj load directory and left the
       shipped endpoint jar active throughout, matching the phase's own tampering mitigation for
       T-103-16 even though the originally-planned backup file no longer existed on this host"

key-files:
  created:
    - .planning/phases/103-one-set-of-errors-diagnostic-reconciliation/103-05-SUMMARY.md
  modified: []

key-decisions:
  - "This plan changes no source file — it is a gate/build/ship plan over plans 01-04's work, so
     no task produced a task-level commit; only the final metadata commit (SUMMARY.md, STATE.md,
     ROADMAP.md, REQUIREMENTS.md) exists for this plan"
  - "The pre-endpoint jar for hand check B was rebuilt from the sibling bbj-ls repository at the
     commit immediately before the parseProgram endpoint was added, in a scratch worktree, rather
     than restored from a stale on-host backup that no longer exists after the fresh BBj install"

requirements-completed: []  # PSRV-06/PSRV-07 stay Pending — phase verification marks them complete after the hand checks run, per this plan's own shell rules

coverage:
  - id: D1
    description: "The whole test suite is green against the documented local baseline (interop-drift in the linking test file, at most one in the issue447 real-interop test) on the final tree"
    verification:
      - kind: other
        ref: "npm test -- --maxWorkers=2 (bbj-vscode) — 11 failing tests, all under Linking Tests > Interop related tests in test/linking.test.ts; 0 in the issue447 file; 4 suites reported a beforeAll hook-timeout Failed Suite with zero failing tests inside them"
        status: pass
    human_judgment: false
  - id: D2
    description: "The register check (no planning identifier in any line the phase added to source/test files) and the commit-body scan (no closing keyword) both exit clean over the phase's full diff against the phase base"
    verification:
      - kind: other
        ref: "git diff | grep -qE '<pattern>' (negated) and git log --format=%B | grep -niE '(closes|fixes|resolves) #' (negated) — both exit 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both distributables are built from the final tree and installed; the IntelliJ plugin zip's bundled language-server bundle is byte-identical to the freshly built bbj-vscode bundle"
    verification:
      - kind: other
        ref: "npm run build (bbj-vscode) + bbj-ext-install (force-install) + ./gradlew buildPlugin (bbj-intellij) + cmp of the zip's bundled main.cjs against the freshly built one — cmp exit 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "The endpoint build is backed up outside the BBj load directory, and a pre-endpoint jar (rebuilt from the sibling bbj-ls repository, since the on-host pre-endpoint backup no longer exists after the fresh BBj install) is also backed up outside it; the load directory itself is untouched, still holding exactly two files with the endpoint jar active"
    verification:
      - kind: other
        ref: "ls -l /opt/bbx/.lib/bbjls/ (two files, bbj-ls.jar 40889 bytes, unchanged) and ls -l /opt/bbx/.lib/bbjls-backup/ (bbj-ls.jar.phase-103-endpoint 40889 bytes, bbj-ls.jar.pre-endpoint 23369 bytes)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Two self-contained hand-check runbooks (endpoint present; pre-endpoint jar) are staged in this SUMMARY with every log line, source string and fixture substituted from the shipped code — a human still has to run them in two real IDEs"
    verification: []
    human_judgment: true
    rationale: "This executor cannot see a running IDE (the human_verification_boundary constraint); the runbooks are staged verbatim below for the phase verifier / a human tester to execute and report on, exactly as Phase 102's equivalent plan did"
  - id: D6
    description: "The phase branch is pushed and PR #691 is fast-forwarded to the phase head, with an updated title naming phases 98-103 and a body describing the one-set-of-errors behaviour in user terms, still open and held"
    verification:
      - kind: other
        ref: "git ls-remote (both refs at ecb57bbc, ancestor check passes) + gh pr view 691 --json state,headRefName,title (OPEN, correct head ref, title mentions 103) + body gate grep (negated, exit 0) + last-non-empty-line check"
        status: pass
    human_judgment: false

duration: 13min
completed: 2026-09-23
status: complete
---

# Phase 103 Plan 05: Gate, Build and Ship the Phase Summary

**A green suite and clean register on the final tree, both distributables built and installed with a byte-identical shared language-server bundle, two fully substituted hand-check runbooks staged for the phase verifier, and PR #691 fast-forwarded to carry phases 98-103 under a refreshed title and body.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-23T08:06:12Z
- **Completed:** 2026-09-23T08:19:13Z
- **Tasks:** 3
- **Files modified:** 1 (this SUMMARY.md; the final metadata commit additionally touches STATE.md, ROADMAP.md and REQUIREMENTS.md)

## Accomplishments

- Whole suite run clean against the documented local baseline: `numFailedTests: 11`, every one of
  them under `Linking Tests > Interop related tests` in `test/linking.test.ts` (the documented
  interop-backend-drift group); zero in `test/functional/issue447-real-interop.test.ts` (within
  the "at most one" tolerance). Four suites — `test/builtin-library-members.test.ts`,
  `test/run-call-file-resolution.test.ts`, `test/run-call-navigation.test.ts`,
  `test/functional/installed-extension-e2e.test.ts` — reported a `Failed Suite` from a
  `beforeAll` hook timing out at 10s, with zero failing tests inside any of them: the documented
  worker-startup-contention pattern, judged on failing test names/counts, not suite-level status.
- Register check (no `PSRV-0*`/`D-##`/`10#-##`/`CR-#`/`WR-#`/`T-103-*` token in any line the
  phase added to `bbj-vscode/src` or `bbj-vscode/test`) and the commit-body closing-keyword scan
  both exit clean against `gsd/phase-102-live-compiler-diagnostics-with-backward-compatibility..HEAD`.
- No IntelliJ file and no auto-parsed test fixture changed anywhere in the phase (`git diff --stat`
  over `bbj-intellij` and `bbj-vscode/test/test-data` against the phase base is empty).
- Both distributables built from the final tree: `npm run build` (bbj-vscode) succeeded with no
  `error TS` line and produced `out/language/main.cjs`; `bbj-ext-install` packaged
  `/tmp/bbj-lang.vsix` (48 files, 2.55 MB) and force-installed it into the isolated `~/.ext-test`
  profile; `./gradlew buildPlugin` (bbj-intellij) reported `BUILD SUCCESSFUL` and produced
  `bbj-intellij-0.1.0.zip`. `cmp` between the zip's bundled `bbj-intellij/lib/language-server/main.cjs`
  and the freshly built `bbj-vscode/out/language/main.cjs` exited 0 (byte-identical).
- The endpoint jar was backed up outside `/opt/bbx/.lib/bbjls/` and a pre-endpoint jar was rebuilt
  from the sibling `bbj-ls` repository (the on-host pre-endpoint backup this plan expected no
  longer exists after the 2026-09-23 fresh BBj install — see Deviations). The load directory
  itself was never touched: it still holds exactly the same two files it held at the start,
  `bbj-ls.jar` (40889 bytes) unchanged.
- Both hand-check runbooks (endpoint present; pre-endpoint jar) are staged below with every log
  line, source string and fixture substituted from the shipped code, adjusted for the rebuilt
  pre-endpoint jar's real filename and size.
- The phase branch was pushed and fast-forwarded onto PR #691's head branch
  (`e0b2cd1c..ecb57bbc`); the PR's title and body were refreshed to describe phases 98-103 in
  user terms, with the phase 102 hand-verification paragraph rewritten to note that both walkthroughs
  have since passed (per `REQUIREMENTS.md`'s recorded PSRV-03/PSRV-04 verification), and a new
  section describing the one-set-of-errors behaviour added. The PR is still `OPEN`, not merged,
  not marked ready.

## Task Commits

This plan changes no repository file in tasks 1-2 (both are pure gate/build/ship tasks against
the already-committed tree from plans 01-04); task 3 pushes the branch and updates the PR, and
writes this SUMMARY.md. No task-level commit exists for this plan — only the final metadata
commit below.

**Plan metadata:** committed alongside this summary (SUMMARY.md, STATE.md, ROADMAP.md — REQUIREMENTS.md is
deliberately **not** touched by this plan; PSRV-06/PSRV-07 stay `Pending` per the plan's own shell rules).

## Files Created/Modified

- `.planning/phases/103-one-set-of-errors-diagnostic-reconciliation/103-05-SUMMARY.md` — this file

## Decisions Made

- This is a gate/build/ship plan with no source deliverable of its own — every artifact it
  verifies was produced by plans 01-04; no task in this plan modifies `bbj-vscode/src` or
  `bbj-vscode/test`, so there is no task-level commit to record beyond the final metadata commit.
- The pre-endpoint jar needed for hand check B was rebuilt from the sibling `bbj-ls` repository at
  the commit immediately before the `parseProgram` endpoint was added (`b518069^`), in a scratch
  worktree removed afterward, rather than restored from the stale on-host backup path this plan
  originally expected — see Deviations below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rebuilt the pre-endpoint jar; the on-host backup this plan expected no longer exists**
- **Found during:** Task 2 (build both distributables and stage both hand checks)
- **Issue:** The plan's precondition and hand-check runbook both name
  `/opt/bbx/.lib/bbjls-backup/bbj-ls.jar.26.02` at 23389 bytes as the pre-endpoint jar to swap in
  for hand check B. A fresh BBj install landed on this host on 2026-09-23 (the day this plan ran):
  `/opt/bbx/.lib/bbjls-backup/` no longer existed at all, and `/opt/bbx/.lib/bbjls/` now holds
  exactly the shipped endpoint jar (`bbj-ls.jar`, 40889 bytes, `root:root`) plus the lsp4j jar —
  nothing that predates the endpoint was left on disk anywhere.
- **Fix:** Created `/opt/bbx/.lib/bbjls-backup/` (`sudo mkdir -p`, passwordless sudo available) and
  backed up the currently-deployed endpoint jar as `bbj-ls.jar.phase-103-endpoint` (40889 bytes).
  Rebuilt a pre-endpoint jar from the sibling `bbj-ls` repository: identified the first endpoint
  commit (`b518069`, "feat(#689): add parseProgram endpoint wiring…") and its parent (`b518069^`,
  "Merge branch 'feat/447-get-all-class-names' of BASIS/bbj-ls into develop"); created a detached
  scratch worktree at that parent commit (`git worktree add --detach
  /home/coder/.claude-shared/dot-claude/jobs/d04ed82b/tmp/bbjls-pre b518069^`); built it offline
  (`mvn -o -f <worktree>/pom.xml -DskipTests package`, `BUILD SUCCESS`, all dependencies already in
  `~/.m2`); confirmed via `unzip -l` that the built jar contains no `parseProgram`/`Parser`-named
  class entries (grep found none); backed it up as
  `/opt/bbx/.lib/bbjls-backup/bbj-ls.jar.pre-endpoint` (23369 bytes — close to but not identical to
  the plan's remembered 23389-byte figure, since this is a fresh build off a slightly different
  toolchain/timestamp, not a byte-for-byte copy of the original artifact); removed the scratch
  worktree (`git worktree remove --force`).
- **Files modified:** none in the repository — only files outside the repository
  (`/opt/bbx/.lib/bbjls-backup/*`) and a removed scratch git worktree in the sibling `bbj-ls` repo.
- **Verification:** `ls -l /opt/bbx/.lib/bbjls/` before and after shows the same two files at the
  same sizes (untouched); `ls -l /opt/bbx/.lib/bbjls-backup/` shows both new backups outside the
  load directory; the pre-endpoint jar was never copied into the load directory by this plan — the
  shipped endpoint jar stayed active throughout, as the plan requires ("Do NOT swap the jar
  yourself").
- **Committed in:** not applicable — no repository file changed; this deviation only touched
  files outside the repository and a removed scratch worktree in a sibling repository.

---

**Total deviations:** 1 auto-fixed (1 blocking — Rule 3, package/artifact substitution, not a
package-manager install so the package-legitimacy exclusion does not apply).
**Impact on plan:** The substitution is purely a filename/on-host-state adjustment the orchestrator
had already anticipated and pre-authorized; the hand-check runbook below uses the real filenames
and real recorded sizes instead of the plan's stale ones. No behavior, no source file and no test
changed. No scope creep.

## Issues Encountered

None beyond the jar-backup deviation above.

## User Setup Required

None — no external service configuration required.

## Hand-Check Runbooks (staged verbatim for the phase verifier)

Every log line, source string and fixture text below is copied from the shipped code (read by
this plan's Task 2 `<read_first>`), not paraphrased:

- On-mode log line (`bbj-parser-service.ts`, `latchOn`): `Live compiler diagnostics: on`
- Off-mode log line (`bbj-parser-service.ts`, `latchOff`): `Live compiler diagnostics: off (endpoint not available)`
- Live-parser diagnostic source (`bbj-parser-service.ts`, `BBJ_PARSER_SOURCE`): `BBj Parser`
- Language server's own diagnostic source (Langium `languageId`, `generated/module.ts`): `bbj`
- The `bbjcpl` debug-line prefix a save-time run leaves (`bbj-cpl-service.ts`, `compile()`, logged
  only when bbjcpl wrote to stdout): `bbjcpl stdout: `
- The confirmed accepted-document fixture (from `103-04-SUMMARY.md`, invented and confirmed
  against both the real endpoint (0 errors) and the hermetic validator (exactly one Error-severity,
  line-break-coded diagnostic reading `This statement needs to start in a new line: else`):
  ```
  if a then if b then c=1 else d=1 fi else e=1 fi
  ```

### A. Endpoint present — verify in both IDEs

Setup (done by this plan, confirm it): both distributables built from the final tree —
`npm run build` succeeded with no `error TS` line, `bbj-ext-install` reported a successful
force-install, `./gradlew buildPlugin` reported `BUILD SUCCESSFUL` and the zip's bundled
`main.cjs` is byte-identical (`cmp` exit 0) to the freshly built one. VS Code's `bbj.debug`
setting is already `true` in `~/.ext-test/data/User/settings.json` (confirmed by this plan — no
action needed there). In IntelliJ, turn the equivalent BBj debug setting on before starting; this
executor cannot toggle a running IDE's UI-only setting. `ls -l /opt/bbx/.lib/bbjls/` shows exactly
two files, `bbj-ls.jar` at 40889 bytes.

**VS Code (browser tab on port 13338):**
1. Open a `.bbj` file from `examples/`. In the BBj output channel find exactly one line saying
   `Live compiler diagnostics: on`. Paste it.
2. On new lines, type the accepted-document fixture above and stop typing:
   `if a then if b then c=1 else d=1 fi else e=1 fi`. The language server's own complaint (source
   `bbj`) may appear red at first. Within about a second it turns into a Warning with the same
   message and source `bbj`. No red remains on those lines.
3. Keep typing for a few seconds on a DIFFERENT line. The warning from step 2 stays yellow the
   whole time — it never flashes red.
4. Type a clearly invalid line and stop. After the pause that line carries exactly ONE
   diagnostic: BBj's message, source `BBj Parser`. No second diagnostic from source `bbj` on that
   line.
5. Save. No diagnostic with source `BBjCPL` appears, and the log shows no line starting
   `bbjcpl stdout: ` for this save.
6. Set the compiler trigger setting to `off`, type one character: the step 2 complaint is red
   again. Set the trigger back.
7. Close the file and reopen it: the step 2 complaint is red until the first verdict, then yellow.

**IntelliJ:** repeat steps 1-5 and 7. Hover shows the source in the tooltip. Paste the mode line
from `idea.log` — expected `Live compiler diagnostics: on`.

**Answer:** Did step 2 turn yellow and stay yellow through step 3 in BOTH IDEs? Was there exactly
one diagnostic on the invalid line? Did saving add nothing from `BBjCPL` and leave no
`bbjcpl stdout: ` line in the log? Paste the mode lines and one warning's message and source.

### B. Pre-endpoint jar — verify both IDEs behave as 0.16.x

Swap (run verbatim, in order — `sudo` is needed for the `cp` steps against the `root:root` load
directory):
1. `sudo /opt/bbx/bin/stopbbjservices` — wait for it to exit.
2. `sudo cp /opt/bbx/.lib/bbjls-backup/bbj-ls.jar.pre-endpoint /opt/bbx/.lib/bbjls/bbj-ls.jar`
3. `ls -l /opt/bbx/.lib/bbjls/` — exactly two files, `bbj-ls.jar` **23369 bytes** (this plan's
   rebuilt pre-endpoint jar — not the plan's originally-remembered 23389 bytes; see Deviations).
4. `sudo /opt/bbx/bin/bbjservices`, then wait until 127.0.0.1:5008 accepts a connection (30-60 s).
5. Reload the VS Code (ext test) tab and restart the language server in IntelliJ.

In VS Code and in IntelliJ:
6. The log holds exactly ONE line saying `Live compiler diagnostics: off (endpoint not
   available)`. Paste it.
7. Type the accepted-document fixture: the complaint is red and STAYS red — it never turns
   yellow.
8. Type an invalid line: only the language server's own error (source `bbj`), no `BBj Parser`
   diagnostic.
9. Save a file with an error: a line starting `bbjcpl stdout: ` appears in the log (when bbjcpl
   wrote to stdout) and a save-time diagnostic appears; on a line the language server also flags,
   that diagnostic reads source `BBjCPL` with the language server's message (the 0.16.x merge).
10. Java completion works; no dialog, popup or warning about the endpoint appears.

Restore:
11. `sudo /opt/bbx/bin/stopbbjservices`
12. `sudo cp /opt/bbx/.lib/bbjls-backup/bbj-ls.jar.phase-103-endpoint /opt/bbx/.lib/bbjls/bbj-ls.jar`
13. `ls -l /opt/bbx/.lib/bbjls/` — exactly two files, `bbj-ls.jar` at **40889 bytes** (the
    recorded endpoint size).
14. `sudo /opt/bbx/bin/bbjservices`, wait for 5008, reload both IDEs; the fixture from check A,
    step 2, turns yellow again once typing stops.

**Answer:** Did both IDEs keep the complaint red, show no live-parser diagnostic, and merge
`bbjcpl`'s result on save? Paste the off-mode lines. Any dialog or endpoint warning? After the
restore, does the load directory show two files at the endpoint size (40889 bytes)?

## Next Phase Readiness

- Both hand-check runbooks above are ready for the phase verifier / a human tester to run in two
  real IDEs; this executor cannot see a running IDE. PSRV-06 and PSRV-07 stay `Pending` in
  `REQUIREMENTS.md`, correctly — phase verification marks them complete once both runbooks are
  executed and pass, per this plan's own shell rules.
- The load directory is left exactly as this plan found it: `/opt/bbx/.lib/bbjls/` holds the same
  two files at the same sizes it held at the start (`bbj-ls.jar` 40889 bytes,
  `org.eclipse.lsp4j.jsonrpc-0.20.1.jar` 137420 bytes), with both backups
  (`bbj-ls.jar.phase-103-endpoint`, `bbj-ls.jar.pre-endpoint`) kept outside it in
  `/opt/bbx/.lib/bbjls-backup/`.
- PR #691 is `OPEN`, fast-forwarded to `ecb57bbc5585371c8be802d433c613771ed80844`, titled
  "v4.5 phases 98-103: parser conformance, live compiler diagnostics and one set of errors", and
  its body ends with the required attribution line. It is not merged and not marked ready.
- No blockers for Phase 104 beyond the two hand checks staged above.

---
*Phase: 103-one-set-of-errors-diagnostic-reconciliation*
*Completed: 2026-09-23*

## Self-Check: PASSED

- `103-05-SUMMARY.md`, `bbj-vscode/out/language/main.cjs`, `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`, `/opt/bbx/.lib/bbjls-backup/bbj-ls.jar.phase-103-endpoint` and `/opt/bbx/.lib/bbjls-backup/bbj-ls.jar.pre-endpoint` all confirmed present on disk with `[ -f ]`.
- No task-level commit exists to verify (this plan changed no source file); local `HEAD` (`ecb57bbc5585371c8be802d433c613771ed80844`) matches both remote refs from the `git ls-remote` check.
- Re-ran the plan's `<verification>` block: whole suite reports `numFailedTests: 11`, all in the documented baseline; the register check and commit-body scan both exit 0; `ls -l /opt/bbx/.lib/bbjls/` lists exactly two files with the endpoint jar (40889 bytes) active; `gh pr view 691 --json state` reports `OPEN` and `headRefName` matches local `HEAD`.
- Re-ran every task's `<acceptance_criteria>`: Task 1 (suite/register/commit-body/porcelain) all pass; Task 2 (artifact mtimes later than the last source commit, `cmp` exit 0, `bbj-ext-install` success, load-dir file count 2, both hand checks staged) all pass; Task 3 (both remote refs at the same ancestor-verified commit, no `--force` used, PR OPEN with title naming 103 and body ending in the exact attribution line, both hand checks reproduced verbatim in this SUMMARY) all pass.
