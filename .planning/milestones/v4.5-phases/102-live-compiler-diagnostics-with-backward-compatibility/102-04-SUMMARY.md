---
phase: 102-live-compiler-diagnostics-with-backward-compatibility
plan: 04
subsystem: language-server
tags: [uat, ci, release-engineering, jar-swap, vitest]

# Dependency graph
requires:
  - phase: 102-01
    provides: "BBjParserService, the mode/failure log lines this plan's runbook quotes verbatim"
  - phase: 102-02
    provides: "getMaxErrors() wiring and the coordinate converter this plan's suite gate re-runs"
  - phase: 102-03
    provides: "the gated live-endpoint confirmation test and both extensions' documentation this plan re-verifies"
provides:
  - "Both distributables built and installed from the final tree (bbj-lang.vsix installed into the isolated VS Code ext-test profile; bbj-intellij-0.1.0.zip built and confirmed byte-identical to the fresh language server, staged for manual install — no running IntelliJ instance was reachable from this environment to install into non-interactively)"
  - "A second jar backup (bbj-ls.jar.endpoint, 36620 bytes) taken outside the load directory so the older-server replay can restore byte-identically; the load directory verified to hold exactly its two intended jars"
  - "A precise, click-by-click human runbook for both staged hand-verification blocks (endpoint-present live diagnostics; pre-endpoint 26.02 replay and restore), quoting the exact mode/diagnostic-source strings from the shipped source"
  - "A green whole suite judged against the documented interop baseline, a clean register check over the full branch diff, a clean commit-body scan, and an open pull request"
affects: [103-diagnostic-reconciliation, 104-conformance-measurement]

# Actuals (#2632)
actuals:
  tokens: 3800
  tasks: 3
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Executor-authored human runbook in place of a live IDE observation the executor cannot make — quotes exact source strings, never paraphrased, per this plan's own explicit instruction"

key-files:
  created:
    - .planning/phases/102-live-compiler-diagnostics-with-backward-compatibility/102-04-SUMMARY.md
  modified: []

key-decisions:
  - "The IntelliJ plugin zip was built and confirmed fresh (byte-identical bundled main.cjs) but NOT installed into a running IntelliJ instance: this environment has no accessible running IDE to install into non-interactively (only a JetBrains Gateway client daemon is present, not a full backend), and this repository's own standing practice (uat-build-both-extensions-first memory) is that 'Install Plugin from Disk' is the human's own step. The zip's path and the install action are in the runbook below."
  - "An additional `npx vsce package --no-dependencies --out bbj-lang.vsix` run was added beyond `bbj-ext-install`'s own packaging (which writes only to /tmp/bbj-lang.vsix) so a fresh, git-ignored .vsix also exists under bbj-vscode/ with a modification time after the last commit, satisfying the plan's own acceptance criterion literally. Functionally identical build; does not change what was installed into the ext-test profile."
  - "The register check and commit-body scan were run over the full origin/main..HEAD diff as the plan's own verify block specifies — origin/main is still at the prior release's tip (last synced 2026-09-20), so this branch and diff also carry the already-completed, unreleased work from the earlier phases of this development cycle. That is disclosed in the pull request body rather than treated as this plan's own change set."
  - "Every commit this plan itself makes carries the `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` trailer per the active session's attribution instruction, matching every other commit already on this branch — not the `Claude Fable 5.1` string named in the plan's own acceptance criterion text, which does not match any commit actually on the branch (including commits from before this plan ran) and predates this session's attribution."

patterns-established: []

requirements-completed: [PSRV-03, PSRV-04, PSRV-09]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Both distributables are built and installed from the final tree, so what a human observes is the behaviour that ships"
    verification:
      - kind: other
        ref: "npm run build (tsc -b + esbuild, exit 0, main.cjs mtime 2026-09-22T15:26 > last commit 2026-09-22T15:16); bbj-ext-install (packaged + force-installed into ~/.ext-test); ./gradlew buildPlugin (BUILD SUCCESSFUL, zip built, bundled main.cjs confirmed byte-identical to bbj-vscode/out/language/main.cjs via cmp)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A developer typing an invalid line sees BBj's own syntax error appear in the editor without saving, in VS Code and in IntelliJ, against the endpoint-present server"
    requirement: PSRV-03
    verification:
      - kind: manual
        ref: "Hand-verified in both IDEs 2026-09-22. Passes on a project with few files. CAVEAT: on a project with many files nothing live appears until the initial whole-workspace build finishes — the live-parse timer is armed inside buildDocuments(), behind Langium's FIFO WorkspaceLock, and the request then shares one interop socket with that build's bulk class resolution. Pre-existing scheduling exposed, not introduced, by this phase. Tracked as issue #692 and Phase 105."
        status: pass-with-caveat
    human_judgment: true
  - id: D3
    description: "With the pre-endpoint jar swapped back in, both IDEs behave exactly as 0.16.x: Java completion works, the save-time compile still runs, no live diagnostic ever appears, and the log holds exactly one quiet off-mode line that does not grow on repeated typing"
    requirement: PSRV-04
    verification:
      - kind: manual
        ref: "Hand-verified on macOS 2026-09-22 against the pre-endpoint bbj-ls.jar: both IDEs behave as expected, no problem reported. The jar swap was performed by the tester on their own machine, not by the staged devcontainer replay."
        status: pass
    human_judgment: true
  - id: D4
    description: "The server log states the mode once per connection in each IDE, in both directions, read out of a real log file"
    requirement: PSRV-09
    verification:
      - kind: manual
        ref: "Off-mode line read out of a real log 2026-09-22, matching the shipped string verbatim: `2026-09-22 19:11:29.120 [info] Live compiler diagnostics: off (endpoint not available)`. Real log output, not a hand-derived trace."
        status: pass
    human_judgment: true
  - id: D5
    description: "The whole suite is green against the documented interop baseline on the final tree"
    verification:
      - kind: other
        ref: "cd bbj-vscode && npm test -- --maxWorkers=2 — 11 failed / 2414-2427 passed across two runs; every failing test name is under 'test/linking.test.ts > Linking Tests > Interop related tests', matching the documented local baseline exactly; the other file-level FAIL headers seen across runs (run-call-navigation.test.ts, installed-extension-e2e.test.ts) attributed zero tests to the 'Failed Tests' list — worker-startup timeout noise, not failures, per this repository's own documented pattern"
        status: pass
    human_judgment: false
  - id: D6
    description: "The live endpoint confirmation test passes 5/5 against the restored, endpoint-present deployed jar"
    verification:
      - kind: integration
        ref: "cd bbj-vscode && RUN_BBJ_TESTS=1 npx vitest run test/functional/parse-program-live.test.ts — 5 passed"
        status: pass
    human_judgment: false
  - id: D7
    description: "The register check is clean over the whole branch diff, and no commit body carries a closing keyword"
    verification:
      - kind: other
        ref: "git diff -U0 origin/main..HEAD -- bbj-vscode/src bbj-vscode/test documentation | grep '^+' | grep -E 'PSRV-0|D-[0-9][0-9]|102-[0-9][0-9]|CR-[0-9]' — no match (clean); git log --format=%B origin/main..HEAD | grep -niE '(closes|fixes|resolves) #' — no match (clean)"
        status: pass
    human_judgment: false
  - id: D8
    description: "The branch is pushed and a pull request describing the feature in user terms is open"
    verification:
      - kind: other
        ref: "gh pr view --repo BBx-Kitchen/bbj-language-server --json state,headRefName,url"
        status: pass
    human_judgment: false

duration: ~28min
completed: 2026-09-22
status: complete
---

# Phase 102 Plan 04: Ship The Branch — Build, Replay, Suite, Register, Pull Request Summary

**Both distributables built and installed from the final tree, the older-server replay staged with a byte-verified second backup, a green whole suite against the documented 11-case interop baseline, a clean register check and commit-body scan over the full branch diff, and an open pull request — with the two IDE hand-verifications written up as a precise, quote-exact runbook still awaiting a human.**

## Performance

- **Duration:** ~28 min
- **Started:** 2026-09-22T15:10:00Z (approximate)
- **Completed:** 2026-09-22T15:38:25Z
- **Tasks:** 3
- **Files modified:** 1 (this SUMMARY.md; the plan itself changes no other repository file)

## Accomplishments

- VS Code extension built (`npm run build`, `tsc -b` + esbuild, clean) and installed into the isolated `~/.ext-test` profile via `bbj-ext-install`; a second `.vsix` also packaged under `bbj-vscode/` (git-ignored) so a fresh artifact exists at the expected path.
- IntelliJ plugin built (`./gradlew buildPlugin`, `BUILD SUCCESSFUL`) with its bundled `lib/language-server/main.cjs` confirmed byte-identical to the freshly built `bbj-vscode/out/language/main.cjs` via `cmp`. The zip is staged at `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`; installing it into a running IntelliJ ("Install Plugin from Disk") is a human step — this environment has no running IntelliJ instance reachable for a non-interactive install.
- Confirmed the environment stayed endpoint-present throughout: `/opt/bbx/.lib/bbjls/` holds exactly two files, `bbj-ls.jar` at 36620 bytes; port 5008 accepts a TCP connection.
- Took a second jar backup outside the load directory (`/opt/bbx/.lib/bbjls-backup/bbj-ls.jar.endpoint`, 36620 bytes) alongside the existing pre-endpoint backup (`bbj-ls.jar.26.02`, 23389 bytes), so the older-server replay in the runbook below can restore byte-identically. The deployed jar and the load directory's file count were left unchanged — the swap itself was deliberately NOT performed by this executor (see the runbook).
- Ran the whole suite twice (`npm test -- --maxWorkers=2`): both runs report exactly 11 failing tests, and every one of them is under `test/linking.test.ts > Linking Tests > Interop related tests`, matching this repository's documented local interop baseline by name. Other file-level `FAIL` headers seen in either run (`run-call-navigation.test.ts`, `installed-extension-e2e.test.ts`) attributed zero tests to the "Failed Tests" list in both runs — worker-startup timeout contention, not a real failure, per this repository's own documented pattern.
- Ran the gated live-endpoint confirmation test against the still-deployed, endpoint-present jar: `RUN_BBJ_TESTS=1 npx vitest run test/functional/parse-program-live.test.ts` — 5 passed.
- Register check over the full `origin/main..HEAD` diff (source, test and documentation paths): clean, no match. Commit-body scan over the same range for closing keywords: clean, no match.
- Pushed the branch and opened pull request [#691](https://github.com/BBx-Kitchen/bbj-language-server/pull/691), state `OPEN`, `headRefName` `gsd/phase-102-live-compiler-diagnostics-with-backward-compatibility`, confirmed via `gh pr view --json state,headRefName,url` (the plan's own literal command, which additionally passes `--repo BBx-Kitchen/bbj-language-server`, errors on the installed `gh` version — "argument required when using the --repo flag" — since that flag requires an explicit PR number/url/branch argument on this version; `gh pr view <number> --repo ...` and the flagless form both confirm the same result, recorded as a second minor plan-vs-tooling deviation below).

## Task Commits

This plan produced no per-task production commits (Tasks 1 and 2 change no repository file by design; their outputs are jar-directory state and this SUMMARY's runbook). One metadata commit closes the plan:

**Plan metadata:** committed alongside this SUMMARY (hash recorded in STATE.md's next session line and in the final commit list below).

## Files Created/Modified

- `.planning/phases/102-live-compiler-diagnostics-with-backward-compatibility/102-04-SUMMARY.md` - this file
- `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` - updated by the standard plan close-out steps

Outside the repository (not committed, verified by `ls -l` / `cmp`, not tracked by git):
- `/opt/bbx/.lib/bbjls-backup/bbj-ls.jar.endpoint` (new, 36620 bytes)
- `bbj-vscode/bbj-lang.vsix` (new, git-ignored)
- `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` (rebuilt)
- `bbj-vscode/out/language/main.cjs` and the rest of `bbj-vscode/out/` (rebuilt)

## Decisions Made

See `key-decisions` in the frontmatter: the IntelliJ install step is a human action in this environment; an extra `.vsix` was packaged under `bbj-vscode/` to satisfy the plan's own path-based acceptance criterion; the register check and commit-body scan ran over the full `origin/main..HEAD` diff exactly as the plan's verify block specifies, which is disclosed in the pull request body; commits carry this session's `Claude Sonnet 5` attribution trailer, matching every other commit already on the branch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `bbj-ext-install` never produces a `.vsix` under `bbj-vscode/`, but the plan's own acceptance criterion for Task 1 requires one there with a fresh mtime**
- **Found during:** Task 1, verifying acceptance criteria after the build/install
- **Issue:** `bbj-ext-install` always packages to `/tmp/bbj-lang.vsix` (confirmed by reading the script) before installing into `~/.ext-test`; the repository's `bbj-vscode/` directory only held a stale `bbj-lang-0.15.3.vsix` from 2026-09-20, predating this branch's commits.
- **Fix:** Ran `npx vsce package --no-dependencies --out bbj-lang.vsix` from `bbj-vscode/` in addition to `bbj-ext-install`, producing a fresh, git-ignored `.vsix` at the expected path with a post-commit mtime. This does not change what was installed into the ext-test profile (same source, same `--no-dependencies` packaging).
- **Files modified:** none tracked by git (`bbj-vscode/*.vsix` is git-ignored)
- **Verification:** `ls -la bbj-vscode/*.vsix` shows `bbj-lang.vsix` with an mtime after the last commit; `git status --short -- bbj-vscode/*.vsix` prints nothing (ignored, as expected)
- **Committed in:** not applicable — no repository file changed

---

**2. [Rule 3 - Blocking] The plan's literal `gh pr view --repo ... --json ...` verify command errors on the installed `gh` version**
- **Found during:** Task 3, confirming the pushed PR
- **Issue:** `gh pr view --repo BBx-Kitchen/bbj-language-server --json state,headRefName,url` (no positional argument) exits 1 with "argument required when using the --repo flag" on the `gh` version installed in this environment — that flag combination requires an explicit PR number, URL, or branch name here.
- **Fix:** Confirmed the same information two ways instead: `gh pr view 691 --repo BBx-Kitchen/bbj-language-server --json state,headRefName,url,number` (explicit number) and the flagless `gh pr view --json state,headRefName,url` (relies on the current directory's git context, which is this exact branch). Both report `state: OPEN`, `headRefName: gsd/phase-102-live-compiler-diagnostics-with-backward-compatibility`.
- **Files modified:** none
- **Verification:** both commands' output pasted above in Accomplishments
- **Committed in:** not applicable — no repository file changed

---

**Total deviations:** 2 auto-fixed (2 blocking — plan-vs-tooling mismatches, no source or behavior change)
**Impact on plan:** Cosmetic in both cases; the actually-installed extension and the actually-open PR are unaffected. No scope creep.

## Known Stubs

None — this plan ships no source code.

## Human UAT — Results (recorded 2026-09-22)

Both runbook blocks below were run by hand and are no longer outstanding.

- **Block 1 (endpoint present):** PASS WITH CAVEAT. The live diagnostic appears while typing,
  without saving, in both IDEs on a project with few files. On a project with many files nothing
  live appears until the initial whole-workspace scan completes. Tracked as issue #692; Phase 105
  was appended to the v4.5 milestone to fix it. PSRV-03 is recorded Complete (caveat).
- **Block 2 (older server):** PASS. Run on macOS against the pre-endpoint `bbj-ls.jar`; both IDEs
  behave as expected, no problem. The tester performed the swap on their own machine — the staged
  devcontainer replay was not used, and `/opt/bbx/` was left endpoint-present and untouched.
- **Mode line:** PASS, from a real log —
  `2026-09-22 19:11:29.120 [info] Live compiler diagnostics: off (endpoint not available)` —
  matching the shipped string verbatim.

The original runbook is kept below unchanged, as the procedure that was followed.

## Awaiting Human UAT (original runbook, now executed)

**Neither of the two staged hand-verification blocks below has been observed.** This executor cannot
see a running IDE. Both are recorded here `pending`, with `human_judgment: true` in the coverage
block above — do not read anything in this SUMMARY as a passed human check. Everything below this
line is a precise procedure a human can run start to finish without re-deriving anything; every
quoted string is copied verbatim from the shipped source, not guessed or paraphrased.

**Exact strings this runbook quotes (source of record: `bbj-vscode/src/language/bbj-parser-service.ts`,
as shipped in this branch, read on 2026-09-22):**

| What | Exact text |
|---|---|
| Mode line, endpoint present | `Live compiler diagnostics: on` |
| Mode line, endpoint absent | `Live compiler diagnostics: off (endpoint not available)` |
| Diagnostic `source` field | `BBj Parser` |
| Failure log line shape | `Live compiler diagnostics: request failed (<kind>): <message>` (must NOT appear during either block below — a failure line means something is wrong, not part of the expected happy path) |
| Setting that must be on to see the mode line | VS Code: `bbj.debug` (Settings UI: "BBj › Debug" / search `bbj.debug`) — its own description: "Enable debug logging in the BBj language server. Shows detailed diagnostics, class loading, and validation messages." IntelliJ: the same setting under BBj/BBj Language Server plugin settings. The mode line is logged at info level; the server's default level is warn, so with the default (debug off) the line is correctly absent, not missing. |
| Setting that must stay at its default | `bbj.compiler.trigger`, default `debounced` — do not set it to `off` for these checks (that disables both the live parser and the save-time compiler check together) |

### Block 1 — Endpoint-present: live diagnostics while typing, in both IDEs

Setup already done by this executor (confirm, do not redo):
- `npm run build` succeeded; `bbj-ext-install` reported a successful force-install into the isolated
  VS Code test profile on port 13338.
- `./gradlew buildPlugin` produced `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`; its
  bundled `lib/language-server/main.cjs` is byte-identical to the just-built
  `bbj-vscode/out/language/main.cjs` (confirmed by `cmp`, not re-derived).
- `/opt/bbx/.lib/bbjls/bbj-ls.jar` is 36620 bytes; the load directory holds exactly two files; a TCP
  connect to `127.0.0.1:5008` succeeds.

Human steps:
1. Reload the "VS Code (ext test)" browser tab on port 13338 to pick up the freshly installed
   extension (this executor installed the extension but cannot reload a browser tab).
2. In IntelliJ, install `bbj-intellij-0.1.0.zip` via Settings/Preferences → Plugins → gear icon
   → Install Plugin from Disk, then restart the IDE if prompted (this executor cannot reach a
   running IntelliJ instance to do this itself).
3. In both IDEs, turn the `bbj.debug` setting on and reload/restart the language server so it takes
   effect for this connection.
4. **VS Code:** Open a `.bbj` file from `examples/`. Confirm the language server started. Open the
   BBj output channel and find the one line stating the mode. Expected: exactly the text
   `Live compiler diagnostics: on`, once for this connection, and no `Live compiler diagnostics:
   request failed` line. Paste the line you actually saw.
5. Type a clearly invalid BBj line into the file and stop typing — do NOT save. Within about a
   second a squiggle should appear. Hover it: the tooltip should show BBj's own message text
   followed by the diagnostic's source, which should read `BBj Parser`, and a code value (the
   joined category string).
6. Fix the line, do NOT save — confirm the squiggle disappears.
7. Save the file. A save-time compiler diagnostic may now also appear on a line that already has a
   live one — two diagnostics on one line is EXPECTED in this phase (removed in the next one); do
   not file it as a defect.
8. Set `bbj.compiler.trigger` to `off`. Confirm both kinds of diagnostic disappear. Set it back to
   `debounced`.
9. **IntelliJ:** repeat steps 4-6 against the same file. The diagnostic should appear as a squiggle
   with the category shown in the tooltip. Open `idea.log` and paste the one line stating the mode —
   expected text: `Live compiler diagnostics: on`.

Answer, for the record:
- Did the error appear while typing, without saving, in BOTH IDEs? (yes/no, describe if no)
- Was there exactly ONE mode line per IDE session, matching the exact text above? (paste both lines)
- Was there any error dialog, popup, or repeated log line? (there must not be)
- Paste one live diagnostic's message text and its code value, from either IDE.

### Block 2 — Older-server replay and restore, in both IDEs

Setup already done by this executor:
- `/opt/bbx/.lib/bbjls-backup/bbj-ls.jar.26.02` exists (23389 bytes) and
  `/opt/bbx/.lib/bbjls-backup/bbj-ls.jar.endpoint` exists (36620 bytes) — both OUTSIDE the load
  directory. `/opt/bbx/.lib/bbjls/` currently holds exactly two files with `bbj-ls.jar` at 36620
  bytes (endpoint-present). This executor did NOT perform the swap — the tester needs the older
  server running while looking at two IDEs, which a single automated pass cannot leave observable.

Human steps — run these verbatim, in order:
1. `/opt/bbx/bin/stopbbjservices` — wait for it to exit.
2. `cp /opt/bbx/.lib/bbjls-backup/bbj-ls.jar.26.02 /opt/bbx/.lib/bbjls/bbj-ls.jar`
3. `ls -l /opt/bbx/.lib/bbjls/` — expect exactly two files, `bbj-ls.jar` at 23389 bytes.
4. `/opt/bbx/bin/bbjservices` — then wait until `127.0.0.1:5008` accepts a connection (30-60 s).
5. Reload the VS Code (ext test) browser tab and restart the language server in IntelliJ, so each
   makes a fresh connection (this bumps the connection generation and forces a fresh probe).

Then, in VS Code and in IntelliJ:
6. Java completion still works: type a Java class reference and confirm members are offered.
7. Save a `.bbj` file that has a syntax error — the save-time compiler diagnostic still appears.
8. Type several more invalid lines WITHOUT saving. No live diagnostic should ever appear — nothing
   should carry the `BBj Parser` source.
9. No error dialog and no popup should appear at any point.
10. The log should hold exactly ONE line with the exact text
    `Live compiler diagnostics: off (endpoint not available)`. After step 8's repeated typing, that
    line's count must NOT have grown (still exactly one).
11. Nothing should be logged at warning or error level about the parse endpoint (no
    `Live compiler diagnostics: request failed` line either, since `MethodNotFound` latches the
    mode rather than being reported as a failure).

Restore the endpoint build:
12. `/opt/bbx/bin/stopbbjservices`
13. `cp /opt/bbx/.lib/bbjls-backup/bbj-ls.jar.endpoint /opt/bbx/.lib/bbjls/bbj-ls.jar`
14. `ls -l /opt/bbx/.lib/bbjls/` — expect exactly two files, `bbj-ls.jar` at 36620 bytes.
15. `/opt/bbx/bin/bbjservices`, wait for 5008, reload both IDEs.
16. Type an invalid line without saving: the live diagnostic should appear again (the mode line
    should read `Live compiler diagnostics: on` again for the new connection).
17. Confirm `RUN_BBJ_TESTS=1 npx vitest run test/functional/parse-program-live.test.ts` from
    `bbj-vscode/` reports 5 passed against the restored jar (this executor last confirmed this at
    2026-09-22T15:36:53Z before the swap; re-confirm after the restore).

Answer, for the record:
- Did Java completion and the save-time compiler check both still work, in BOTH IDEs, against the
  pre-endpoint server?
- Paste the single off-mode line from each IDE's log (real output channel, real `idea.log`) —
  expected exact text `Live compiler diagnostics: off (endpoint not available)`.
- How many times does that line appear after the repeated typing in step 8? (must be exactly once)
- Was there any dialog, popup, warning or error about the endpoint? (there must not be)
- After the restore, does a live diagnostic appear again while typing?
- Does `ls -l /opt/bbx/.lib/bbjls/` show exactly two files with `bbj-ls.jar` at 36620 bytes?

## Issues Encountered

- No running IntelliJ instance was reachable from this environment to install the built plugin
  into non-interactively — only a JetBrains Gateway client daemon process was found, not a full IDE
  backend. This matches this repository's own standing practice (installing the IntelliJ plugin is
  a human "Install Plugin from Disk" step); it is called out explicitly here because Task 1's plan
  text asked the executor to "install the produced zip into the IntelliJ instance" and that could
  not be completed by this executor. The zip is built, fresh, and confirmed byte-identical to the
  language server; installing it is Block 1's step 2 above.
- The whole-suite gate is non-deterministic in which auxiliary test files show a bare `FAIL` header
  with zero attributed failing tests (worker-startup timeout contention, documented in this
  repository's own memory) — two different files showed this across two consecutive runs
  (`run-call-navigation.test.ts` then, on the next run, both that file and
  `installed-extension-e2e.test.ts`). The stable signal — the "Failed Tests" list, always exactly
  the same 11 `test/linking.test.ts` names across both runs — is what this plan's gate is judged on,
  per the plan's own explicit instruction.
- Eight commits already on this branch (7 from before this plan's phase, 1 the most recent
  documentation-sync commit) do not carry any `Co-Authored-By` trailer at all; none were made by
  this plan's own executor. The plan's acceptance criterion asking that "every commit on the branch"
  carry a specific `Claude Fable 5.1` trailer text does not hold for the branch as it actually stands
  (every trailer-bearing commit instead says `Claude Sonnet 5`, this session's own attribution) and
  was not something this plan could fix without a history rewrite, which is explicitly prohibited.
  Documented here rather than silently accepted or silently "fixed" by rebasing.

## User Setup Required

None - no external service configuration required. The two human UAT blocks above are the outstanding item, not a setup task.

## Next Phase Readiness

- Both live and fallback behaviour are implemented, unit-tested, and staged for hand verification; the
  runbook above is self-contained for whoever runs it next.
- The pull request is open at [#691](https://github.com/BBx-Kitchen/bbj-language-server/pull/691); it should stay open until Block 1 and Block 2
  are both observed and answered.
- Phase 103 (diagnostic reconciliation) and Phase 104 (conformance measurement) can proceed once this
  phase's PR merges; neither depends on the two-block human UAT being run first, but shipping "behaves
  exactly like 0.16.x" as a real claim does.

## Self-Check: PASSED

Re-verified after the push/PR step:
- `102-04-SUMMARY.md` present on disk at its expected path.
- `/opt/bbx/.lib/bbjls/` holds exactly two files, `bbj-ls.jar` at 36620 bytes — environment left
  endpoint-present, as required.
- `gh pr view --json state,headRefName,url` reports `state: OPEN`,
  `headRefName: gsd/phase-102-live-compiler-diagnostics-with-backward-compatibility`,
  `url: https://github.com/BBx-Kitchen/bbj-language-server/pull/691`.
- The plan-level `<verification>` commands were all re-run in this plan's own execution and
  passed: whole suite (11 named failures, matching the documented baseline), the gated live test
  (5 passed), the register check (clean), and the jar/PR checks above.
- Both hand-verification blocks remain genuinely unobserved by this executor, honestly recorded as
  `pending` in the coverage block, not claimed as passed.
