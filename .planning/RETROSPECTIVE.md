# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v4.1 — Security Advisory Remediation

**Shipped:** 2026-09-03
**Phases:** 8 (70-77; 76 closed by 75) | **Plans:** 37 | **Sessions:** not tracked

### What Was Built
- Eight high-severity advisories remediated one phase each, every fix merged to `main`
  through a human-gated public PR (#638-#647) with regression coverage observed red before
  the fix and green after it.
- Preview releases up to 0.12.27 on both marketplaces; 0.12.23/0.12.24 manually QA'd on
  macOS and Windows.
- Durable per-phase records (waivers, residual risk, deferred items, publication readiness)
  archived off `main` under an embargo until each advisory is published.

### What Worked
- One phase per advisory with a fixed 1:1 requirement mapping kept scope from drifting.
- Blocking-human checkpoints for every merge and every release action; nothing outward-facing
  ran autonomously, and the one publish failure (a marketplace timeout) was recorded rather
  than retried without authorization.
- Standing decisions taken once (no-CVE during implementation, the whole-suite gate
  substitution, the public-PR landing shape) stopped later phases re-asking the same question.

### What Was Inefficient
- The private-fork PR flow (PROC-01) failed on the first attempt in Phase 70 because a fork
  PR resolves its base to the public repo; every later phase carried a waiver instead. The
  requirement should have been validated against GitHub's behaviour before the roadmap fixed it.
- Executors wrote fix-mechanism detail into the tracked STATE.md decisions list across
  phases 72-77; it had to be scrubbed at close. The disclosure constraint needs a
  pre-commit register check, not a memory note.
- Phase 77's plan 02 was written on an unchecked premise about an upstream artifact's
  availability and had to be reworked mid-phase.
- The whole-suite failure count is unstable in this environment (DEBT.md item 5), so four
  Phase 71 plans each escalated the same sign-off request before it was answered once.

### Patterns Established
- Override closeout with explicit Known Gaps and a maintainer-owned post-release checklist,
  rather than pretending a release-gated requirement is satisfied.
- Embargoed archive path (`milestones/v4.x-phases/`) protected by both `.git/info/exclude`
  and the `pre-push` hook pattern.
- Human attestation recorded verbatim in UAT for anything CI cannot exercise (packaged-build
  QA, provenance cross-checks behind an egress limit).

### Key Lessons
1. Check external premises (repo topology, artifact availability) before a roadmap or plan
   depends on them.
2. Tracked planning files need an automated disclosure check whenever embargoed work is in
   flight; prose discipline alone did not hold across 37 plans.
3. Release actions are never autonomous: a retry is its own authorization event.

### Cost Observations
- Model mix: not tracked
- Sessions: not tracked
- Notable: seven of eight phases closed within three days once the landing shape was settled; the remaining phase (77) took a further twelve days, most of it waiting on human QA and merge gates.

---

## Milestone: v4.2 — IntelliJ Burn-down

**Shipped:** 2026-09-06
**Phases:** 6 (78-83) | **Plans:** 25 (74 tasks) | **Sessions:** not tracked

### What Was Built
- Every open PRIO 1/2 IntelliJ issue from the v4.0 audit (22 issues) closed in code: EDT
  responsiveness (restart gate, scheduler seam, keystroke debouncer, node-version cache,
  atomic download guard), fail-closed EM JWT handling with owner-only temp files on POSIX
  and Windows, a non-keychain backend warning and a validation trust window.
- A `bbj/compile` request on the shared language server (vscode-free option table), driven
  from IntelliJ off the EDT; string/comment-aware bracket lexing; case-insensitive REM toggle.
- Composer chains with one terminal handler and reason-keyed balloons, a stale-edit guard
  that re-decodes and re-checks the modification stamp inside the write command, and
  intention description resources.
- JDK 17 daemon/toolchain pin, checksum-pinned Gradle 8.14.5 wrapper, fail-fast bundle
  guard; IntelliJ JUnit suite 96 → 504 tests including a fixture-driven Node install
  pipeline and an asserted LSP4IJ coupling inventory.

### What Worked
- Plain-Java seams (`Scheduler`, `RestartGate`, `JwtValidity`, `RemToggleSeam`,
  `ComposerFlow`, `StaleEditGuard`, `NodeInstallPipeline`, …) made IDE-coupled behaviour
  testable on plain JUnit in a module with no platform test harness; the same pattern
  carried across all six phases without a new abstraction per phase.
- Hand UAT in a running IDE after every phase caught four real gaps (Windows `!ERROR=18`,
  LSP `uinteger` overflow, `Diagnostic.getMessage()` signature skew, lightbulb-preview
  `PluginException`) that no unit test could have, and each was closed in-phase by an
  inserted gap-closure plan rather than deferred.
- Red-then-green regression tests before each production change (D-02 in Phase 80) and
  reason-keyed presenters (never message-prose matching) kept fixes verifiable.
- Six phases in three days: the milestone-wide standing decisions from v4.1 (whole-suite
  gate, no re-asking answered questions) transferred cleanly.

### What Was Inefficient
- Executors kept writing planning identifiers (plan numbers, D-xx, CR-xx, COMP-xx) into
  source and test comments; the register-check had to be repeated at every phase close
  (memory note, not a hook).
- Background executors stalled silently several times (Phases 79, 80) on unanswered
  permission prompts from `cd …; git diff`-style commands; each needed a continuation
  executor with explicit state.
- Live-interop drift (`getAllClassNames` on the :5008 backend since 2026-09-03) makes the
  local whole-suite count unstable; the gate substitution decision absorbed it but the
  root cause (DEBT.md item 5, #587) is still open.
- A Marketplace auto-update silently replaced a local 0.1.0 dev build mid-UAT (Phase 81),
  withdrawing one UAT result; interim builds need a version that outranks published ones.
- The v4.2 code was never pushed during the milestone, so landing it is now a single
  256-commit cherry-pick and register-check rather than six small PRs.

### Patterns Established
- Seam-plus-source-guard: logic in a plain-Java seam under JUnit, wiring fenced by a
  scoped method-body-window source guard, live behaviour attested at UAT.
- Gap-closure plans inserted into the phase (80-05, 81-06, 81-07, 82-04) instead of
  carrying UAT gaps to the next milestone.
- Measured facts win over plan wording (LSP4IJ `ServerStatus` constant count, icon
  heuristic): tests pin what the jar and code actually do.
- Committed fixture archives with digests transcribed from a provenance README, never
  computed at test time, so verification cannot be vacuous.

### Key Lessons
1. In a module without a platform test harness, extract a seam first and test the seam;
   guard the wiring with text, and accept that hand UAT is the only live check.
2. Put the shell and identifier rules (no `cd` chains, absolute paths, no planning ids in
   source) into every executor prompt; memory notes do not reach subagents.
3. Push code incrementally through PRs during the milestone; a close-time bulk landing
   multiplies the register-check and review burden.

### Cost Observations
- Model mix: not tracked
- Sessions: not tracked
- Notable: 25 plans in 3 days (~8 plans/day) — the fastest milestone on record; plan
  durations 10-70 min, gap-closure plans 10-15 min.

---

## Milestone: v4.3 — Polish & Quality

**Shipped:** 2026-09-13
**Phases:** 9 (84-92) | **Plans:** 70 (174 tasks) | **Sessions:** not tracked

### What Was Built
- The configured config file, of any name and location, honored by every consumer through
  one server-side resolver, treated as a config file in both IDEs, and hot-reloaded on a
  relevant change without a manual restart (#485, #486).
- IntelliJ's Refresh Java Classes as a targeted request instead of a restart, and
  java-interop port auto-detection for every settings reader (#632, #608).
- Composer discoverability and coverage: one server-side cue for all five composer kinds
  (Code Vision in IntelliJ), a shared SETOPTS layer with an IntelliJ dialog, SETOPTS-in-code
  hovers and a tri-state composer, a CVS() composer, MSGBOX expression options, and in-place
  completion of unfinished calls (#650, #633, #475, #649, #648).
- Composer robustness on both hosts: validated inserts, span-exact re-resolution,
  stale-edit guards, panel listener disposal, debounced IntelliJ previews and a per-project
  handle cache (#623, #532, #530, #611, #612).
- Language-server responsiveness (path-keyed class index, interop circuit breaker, in-flight
  registry beside the LRU, per-request completion cancellation) and host-side hygiene
  (target resolver, decompile freshness, format race, activation disposal, status-bar tab
  switches) (#505, #504, #497, #498, #500, #499, #512, #531, #610).

### What Worked
- Shared-server-first design: every new composer, decode and cue landed as a host-neutral
  language-server request both IDEs consume, so VS Code and IntelliJ cannot disagree on
  what is editable or how a mask is written; IntelliJ work stayed wire DTOs, dialogs and
  contract tests.
- Structural guarantees instead of timing windows: consumed-content relevance makes a
  SETOPTS write unable to restart the server, an `incomplete` decode outcome makes a nested
  call impossible, and bounded handlers gated at a document state replaced unbounded defaults.
- Every phase ran the full gate set — verification, hand UAT in both IDEs, code review,
  Nyquist validation and a security audit — and the milestone audit, skipped at the v4.1
  and v4.2 closes, ran this time and found no gaps.
- In-phase gap closure again: G-86-1, G-88-1/2/3 and G-89-3, plus a verifier-found
  edit-range defect and a review-found stale-edit defect, all closed before their phases
  were marked complete.

### What Was Inefficient
- Phase 88 took 15 plans across five gap-closure rounds for two requirements. Two rounds
  traced to a stale, un-rebuilt VS Code extension install that shipped a pre-phase bundle
  into UAT, which no source change could fix; `vscode:prepublish` now rebuilds `out/`, and
  installed-bundle e2e tests plus a standing pre-UAT rebuild step guard against it.
- Planning identifiers leaked into source and test comments again (53 added lines across 21
  files, concentrated in phases 87-88) despite the v4.2 lesson; a prompt rule alone did not
  stop it.
- Bookkeeping drifted and only the milestone audit caught it: ROADMAP.md's progress table
  and current-milestone block went stale, debug sessions stayed at `diagnosed` after their
  gaps closed, and plan SUMMARY frontmatter never recorded RESP-01..04.
- Code again reached `origin/main` late: Phases 84-91 were pushed during the milestone, but
  Phase 92 and the late validation/security docs (31 commits) were still local at close.

### Patterns Established
- Installed-artifact proof before UAT: rebuild both distributables from the final tree,
  assert the fixes from inside the shipped VSIX and zip (marker counts, sha256 digests), then
  run hand UAT.
- Decode verdicts shared over the wire (`incomplete`, not-editable with a named reason),
  with the server as the sole authority on editability and every write re-checked against
  the live document.
- Bounded LSP handlers (`codeAction`, `codeLens`) with an explicit budget and the lowest
  sufficient `DocumentState` gate instead of Langium's unbounded defaults.
- Source-discovered lifecycle tests (scan for `createWebviewPanel(`) so a future composer is
  covered without editing the test.

### Key Lessons
1. When a live UAT result contradicts the source, verify the installed artifact first; a
   stale install cost Phase 88 two gap-closure rounds.
2. A rule that recurs across milestones (no planning ids in source) needs a mechanical check
   at commit or phase close; two milestones of prompt and memory rules did not hold.
3. Keep ROADMAP, debug-session and SUMMARY bookkeeping current at each phase transition, or
   run the milestone audit early enough to fix drift before the close.

### Cost Observations
- Model mix: not tracked
- Sessions: not tracked
- Notable: 70 plans in 8 days (~9 plans/day), the largest milestone by plan count on record;
  Phase 88 alone was 15 plans (21% of the milestone).

---

## Milestone: v4.4 — IntelliJ Focus

**Shipped:** 2026-09-20
**Phases:** 5 (93-97) | **Plans:** 36 (101 tasks) | **Sessions:** not tracked

### What Was Built
- Composer robustness and four consolidations in the IntelliJ plugin: bounded
  language-server-supplied ranges and line numbers before every write, a graceful notice for
  a malformed catalogs payload, OK gated on the server's `valid` verdict, and one shared
  shape each for Swing helpers, intentions, launch actions and the addWindow-family dialogs
  (#609, #607, #591, #630, #619, #618, #616).
- EM login and run actions: one tool-script resolver, token validation beside the token
  lifecycle, login enablement on a background thread, temp-file cleanup pinned by an ordering
  guard (#590, #589, #617, #615, #614).
- Honest java-interop status: protocol round trip instead of a TCP handshake with a distinct
  wrong-peer state, selection-gated polling, disposal guards, one port constant, one widget
  base (#592, #593, #587, #594, #620).
- Platform integration: cached TextMate bundle, the inert Color Scheme page removed, one
  notification-provider base, and a single Node.js decision engine attested by hand on real
  Windows (#613, #621, #622, #588, two carried todos).
- Release 0.16.0 on both marketplaces through the verify-before-publish gate, with all 21
  milestone issues closed by maintainer-approved comments.

### What Worked
- Grouping by subsystem so a behaviour fix and the consolidation over the same files rode in
  one phase, ordered inside the phase (home first, or shape-changing fix first): each file
  edited once per concern, one hand UAT round per phase.
- Closing requirements "on cited reasoning, not as written" when the issue's literal wording
  was wrong for the platform (#618, #616, #620, #594, #593), with the reasoning recorded in
  the requirement, the decision log and the issue's closing comment.
- The release was rehearsed before it was cut: a Preview build approved in both IDEs, a
  reconciliation runbook written for every red-job path, assets re-hashed against the run's
  own artifacts afterwards. The runbook was never opened.
- The real-Windows attestation was allowed to fail honestly — it surfaced two root causes no
  Linux-hosted test could (Node floor pin, version-cache null poisoning) and a UAT gap
  (G-96-2), all closed in-phase, then passed on re-UAT.
- Falsify-then-restore for source guards: each new guard was proven to fail on the exact
  regression it protects against before being trusted.

### What Was Inefficient
- The crash-detection rework (97-01, 97-02) was approved at a checkpoint on a hand-derived
  LSP4IJ status trace that a real `idea.log` later contradicted; it failed hand UAT on macOS
  and was reverted on release day, costing two plans, a second UAT round and a narrowed
  release-notes pass.
- The squash merge of PR #679 concatenated 135 commit bodies, and old `Closes #…` lines
  closed #621 and #594 before the closing pass; the closing pass had to comment in place.
- Background executors stalled repeatedly on unanswered permission prompts (`cd …; git diff`),
  and a second still-running agent overwrote a plan file mid-execution; most of phase 97's
  plans finished as continuations.
- A plain `./gradlew test` reported UP-TO-DATE and would have passed a stale green as a
  whole-suite gate; caught in Phase 94 and replaced by `--rerun-tasks`.
- The published release notes misfile #622 under "no observable change"; found only during
  the closing pass, not corrected.
- No milestone audit again, after v4.3 had shown what it catches; `state.json` and the debug
  session status drifted and were only reconciled at the close.

### Patterns Established
- One decision engine, many surfaces: a resolver returns a typed rejection reason, and a
  presentation seam maps reason → sentence and action set for every surface (banner,
  startup notification, settings label), so no surface can offer a doomed action.
- Abstract base plus thin no-arg subclasses as the consolidation shape for IntelliJ
  extension points — per-kind differences stay compile-time checked.
- Peer identity by protocol round trip, never by TCP connect.
- Release evidence file: workflow run, job ordering by timestamp, asset digests re-hashed
  independently, smoke verdict tied to those digests.
- Maintainer-approved closing comments: draft all, check each against the shipped code,
  approve as a batch, post byte-for-byte, close the milestone only after a read-back.

### Key Lessons
1. A runtime sequence used as checkpoint evidence must be read from a real log, and the code
   behind every UAT "expected" must be read too — a plausible hand-derived trace got a wrong
   lifecycle change approved.
2. Do not land a lifecycle rework in the release phase; a change that needs its own UAT round
   belongs in a phase before the release gate, where a failure costs a gap-closure plan, not
   a revert under deadline.
3. Before a squash merge, scan the branch's commit bodies for closing keywords.
4. Put shell rules (absolute paths, `git -C`, no `cd` chains) in every subagent prompt and
   watch tool-use counts; a silent executor is usually waiting on a permission prompt.
5. Force test re-execution for any gate run (`--rerun-tasks`); incremental build caches turn
   "green" into "unchanged since last green".

### Cost Observations
- Model mix: not tracked
- Sessions: not tracked
- Notable: 36 plans in 4 phase-work days (~9 plans/day, matching v4.3); phase 97 alone was
  11 plans (31% of the milestone), two of them reverted.

---

## Milestone: v4.5 — Compiler Conformance

**Shipped:** 2026-09-24
**Phases:** 8 (98-105) | **Plans:** 44 (124 tasks) | **Sessions:** not tracked

### What Was Built
- Line-break and validation false alarms fixed at the lexer and validator (A2 267 → 22), with
  a conformance-regression test harness and a synthetic fixture for every fixed construct.
- Parser gaps closed at the grammar root (A 168 → 9): FIELD as a verb, `LEN=` split, `label`
  as a name, IOLIST, empty-bracket whole arrays, comments after block terminators, keyword
  names probed against `bbjcpl`, and all 92 `examples/` programs compile.
- A `parseProgram` endpoint in the separate `bbj-ls` repository that runs BBj's own parser on
  unsaved text, and a client that shows its errors live and falls back to 0.16.x behaviour.
- Verdict reconciliation, so the compiler's errors and Langium's own checks give one set of
  errors (B 658 → 31 of 1,210 with the endpoint).
- Large-workspace responsiveness (issue #692, added mid-milestone): live diagnostics in 5-6 s
  instead of about 60 s in both IDEs.
- Exit measurement with the endpoint active, plus a leak guard over the public planning text.

### What Worked
- A numeric, corpus-based definition of done (A / A2 / B with gates) measured at every
  phase boundary. Each phase knew whether it was finished, and regressions showed up per file.
- Letting the compiler's own parser decide invalid code instead of hand-writing strict checks:
  one endpoint moved B from 54 % to 2.6 %, which no amount of grammar tightening could have done.
- Probing `bbjcpl` directly for keyword-as-name behaviour instead of guessing. It found `next`
  broken despite the roadmap's claim, and it turned two risky mechanisms into evidence-backed
  reverts.
- Adding Phase 105 mid-milestone once live UAT exposed the large-workspace stall. The feature
  shipped usable instead of shipping with a caveat.
- Holding PR #691 until the whole milestone was done kept `main` free of a half-reconciled
  diagnostics pipeline.

### What Was Inefficient
- Totals hid per-file churn: a parser fix unmasked validator A2 hits (99-02), and a custom
  token swallowing its terminator produced new A2 flags (99-06). Only file-set diffs caught
  them, and Phase 98's first B attribution was refuted per file.
- The conformance harness overwrote `details.json` on every run, so before/after comparisons
  needed a manual snapshot first.
- Executors labelled three real BBjAPI test failures as "env noise" across three plans, and
  only a run on the phase base in a scratch worktree settled it.
- A lexer lookbehind (TABLE_DATA) matched inside identifiers while the suite stayed green.
  Only a before/after parse probe found it.
- The corpus-text leak guard had false negatives (truncated, backticked and partly quoted
  excerpts), which needed a gap-closure plan (104-04) and a sweep of the whole milestone's
  planning text.
- Cross-repo work (`bbj-ls`) depended on a forwarded VS Code agent for GitLab pushes and a
  hand-opened MR. It worked, but it was fragile.

### Patterns Established
- Conformance lists A / A2 / B with per-phase gates, measured locally against a private
  corpus and never in CI. CI is protected by synthetic regression fixtures.
- Judge conformance changes by file-set diff, never by totals; snapshot `details.json`
  before every full run.
- Lexer token lookbehinds are anchored to statement starts, and every lexer change is tested
  with keyword-as-identifier cases.
- Verdict-first reconciliation: an external authority's diagnostics win, overlapping local
  complaints are downgraded to warnings rather than hidden, and a missing authority falls
  back to the exact old behaviour, pinned by an equality test.
- Regression gates compare against the phase base commit, not against a remembered baseline.

### Key Lessons
1. When an external authority exists (the compiler), put it in the loop instead of imitating
   it. The imitation plateaus and the authority does not.
2. Aggregate numbers hide opposite-signed per-file moves. Every measurement step needs a
   file-level diff.
3. A leak guard has to be tested against the ways text actually gets copied (truncated,
   reformatted, partly quoted), not only against exact matches.
4. "Environment noise" is a claim that needs the same evidence as a fix: reproduce it on the
   base commit or treat it as a regression.

### Cost Observations
- Model mix: not tracked
- Sessions: not tracked
- Notable: 44 plans in 4 days (~11 plans/day), the fastest plan throughput so far. Phase 98
  alone needed 10 plans because of gap-closure rounds driven by per-file conformance findings.

## Milestone: v4.6 — User-Facing Bug Burn-down

**Shipped:** 2026-09-26
**Phases:** 4 (106-109) | **Plans:** 25 (60 tasks) | **Sessions:** not tracked

### What Was Built
- A real `on-save` compiler trigger in both IDEs (#696): reason-aware live-parse arming, a
  kept save verdict that stays on its line while you type, a check-sequence counter so only
  a newer save replaces it, and an IntelliJ "Compiler check" setting on the same init option.
- One error per finding on the bbjcpl fallback (#522), and a live parse that uses its own
  connection before the shared breaker.
- Validation fixes: nested single-line IF/ELSE/FI balance, a use-before-assignment check that
  no longer throws on a symbol-less reference, and a new unknown-Java-member Error for fully
  resolved classes.
- IntelliJ crash detection on LSP4IJ's unexpected-stop hook, with the real previous status in
  the transition log. This redoes the rework reverted in v4.4 Phase 97.
- Completion and Java class resolution: FQN statics (#577), matching-overload return types
  (#556), method-body completion pinned and program variables kept out of method scope
  (#561), no backend lookups for primitives or arrays (#660), one cache key for nested classes
  (#659).

### What Worked
- Grounding Phase 108 in a real macOS `idea.log` from a probe build before designing anything.
  v4.4's lesson held: the hook fires only on `kill -9`, and the design built on that passed
  hand UAT the first time.
- Measuring before fixing in 109-01. Every method-body completion position already worked, so
  COMP-03 became tests plus an issue comment instead of a grammar change.
- Reviewing the new unknown-member check against the real java-interop backend over the full
  corpus (107-05). It found five false-positive receiver shapes the unit suite could not.
- Hand UAT per phase again caught what verification missed: 109's G-109-1 (program variables
  visible in class methods) became a same-phase gap plan (109-08) backed by the BBj METHOD docs.
- A small, lean milestone: four phases in three days, no scope growth beyond VAL-03.

### What Was Inefficient
- Phase 106 grew to seven plans. The kept-check and supersession work (106-05/-06) took about
  100 minutes each because the on-save diagnostics lifecycle was not fully drawn out at
  planning time.
- 107's A2 comparison against an older, smaller-corpus number could not be met as written.
  7,383 newly entered files had to be classified before the gate was accepted on a file-set
  reading.
- Phase 108's final 7-scenario UAT ran on the pre-review-fix build, so the post-fix build
  only got a cursory re-check.
- The Phase 105 timing re-sample planned for 106 was skipped, so there is no before/after
  timing evidence for the on-save path.

### Patterns Established
- Crash and lifecycle signals come from an explicit platform hook, never from inferring the
  status sequence.
- A measurement plan comes first when a requirement's breadth is unknown ("measure, then fix
  or record"), and the measurement's matrix becomes the regression tests.
- New Error-severity checks are reviewed against the live backend over the corpus before they
  ship, not only against guard-case fixtures.
- Scope fixes follow the language's documented visibility rules (METHOD scope), and the
  reference is cited in the gap diagnosis.

### Key Lessons
1. A design that rests on observed runtime evidence passes UAT; the same feature derived from
   reasoning failed a milestone earlier.
2. Measure before you build: COMP-03 needed no production change at all.
3. A gate stated against a number from a different corpus build cannot be judged fairly.
   Restate it against the phase's own base before execution.
4. Re-run the final UAT on the post-review build, or plan review fixes before the UAT.

### Cost Observations
- Model mix: not tracked
- Sessions: not tracked
- Notable: 25 plans in 3 days (~8 plans/day). Phase 108-01 spent almost 4 hours waiting at a
  human checkpoint for the macOS `idea.log`, which was worth it.

## Milestone: v4.7 — Audit Hygiene Burn-down

**Shipped:** 2026-09-29
**Phases:** 13 | **Plans:** 80

### What Was Built
- Security hardening of every untrusted input the audit named: workspace settings and file
  probes (110), Java class data from the interop peer (111), EM login and web launch (112) and
  composer webview messages (113).
- Lint, test-tree type-check and explicit test discovery as CI gates, hermetic test services,
  an interop harness that reports real results, and interop connection code under test
  (114-116).
- Dependency hygiene with Dependabot on every tree and langium 4.4 held and reported upstream
  (117); four no-behaviour-change refactors (118-121).
- A least-privilege, SHA-pinned, cached release and CI pipeline with a permanent pin/permission
  gate and a minified VSIX (122).

### What Worked
- One milestone PR (#708) for 13 phases kept `main` to a single preview publish; rolling the 13
  pending Dependabot PRs into one PR (#719) did the same for dependencies.
- Re-running the verifier after code-review fixes found a second fail-open shape in the new
  checker (a trailing comment on a job id) that the review had missed.
- PR CI caught what local phase gates did not: the IntelliJ contract test that reads TS paths
  failed on #708 because `buildPlugin` depends on `test`.

### What Was Inefficient
- `phase.complete` again moved STATE.md to an already-done phase (118 after 117) and had to be
  corrected by hand; the milestone-close archive left stale STATE fields too.
- Phase gates ran vitest only, so a handler move in 116 broke the IntelliJ contract test and was
  found only on the milestone PR.
- Dependabot PR checks never build the docs site, so the Docusaurus 3.10 PR looked green while it
  would have broken the docs deploy (`@docusaurus/faster` missing).

### Patterns Established
- Pre-push register scan per push: embargoed paths, planning identifiers in added source lines,
  and closing keywords in commit bodies.
- Checker hardening: every YAML-shape checker gets fixtures for comments in every position, and
  fails closed when a structural key yields nothing.
- Dependabot cleanup as one roll-up PR, closing unneeded majors with "@dependabot ignore this
  major version" (no push to `main`) and recording the migrations as todos.

### Key Lessons
- When a phase moves a file another language reads by path, run that language's tests before
  closing the phase.
- Green checks on a dependency PR only cover what CI builds; build the affected tree locally
  (docs, java-interop) before merging.
- Every push to `main` publishes, so batch: milestone PR, dependency roll-up, closeout PR.

### Cost Observations
- Model mix: mostly opus orchestration with subagent verifier, integration checker and executors
- Sessions: several over four days (2026-09-26 → 2026-09-29)
- Notable: 506 commits and 272 files changed outside `.planning/` in four days

## Milestone: v4.8 — Documentation Drift

**Shipped:** 2026-09-30
**Phases:** 1 | **Plans:** 8

### What Was Built
- Build instructions that build again: a "build bbj-vscode" pre-launch task for "Run Extension",
  `npm run build` in Gitpod's `init`, and root and docs READMEs matching the real workflow.
- QA checklists without the removed EM settings, with one row per v4.7 behaviour and the real run
  menus in both IDEs.
- Both user guides brought up to date (settings, EM login, commands, compiler settings, interop
  fallback), plus a new Composers page in each.
- CLAUDE.md and the browser-editor concepts page matching the architecture, test pattern and CI
  gates.

### What Worked
- A drift scan with file:line on both sides stood in for research, so plans could re-read the
  cited code and describe behaviour from source rather than from the scan.
- One doc set per wave-1 plan kept five plans parallel with no file overlap; the Composers pages
  waited a wave so they could link to the corrected command titles.
- The docs build (`onBrokenLinks: 'throw'`) doubled as the link check, and a final cross-check plan
  recorded evidence for every drift item.

### What Was Inefficient
- The first verification pass found a stale "complete settings example" (formatter defaults) that
  the code review had also flagged; a per-key diff against `package.json` in the plan would have
  caught it before verification.
- The shared-ID requirement gate held COMP-01 open across two plans until the last plan, which
  looked like a missing mark in the 06/07 summaries.

### Patterns Established
- For docs that restate code (settings, defaults, command titles), verify with a script that
  diffs the doc against the source file in both directions, not with greps for keywords.
- Docs-only milestones still get a milestone audit; the integration check becomes a cross-document
  link and consistency check.

### Key Lessons
- Example blocks drift separately from the per-item reference above them; check both.
- Docs reach users only when the PR lands on `main` and `deploy-docs.yml` runs; closing the
  milestone does not publish anything.

### Cost Observations
- Model mix: opus orchestration; haiku integration checker; subagent executors and verifier
- Sessions: a few, all on 2026-09-30
- Notable: 45 commits, 20 files outside `.planning/`, one day

## Milestone: v4.9 — bbj-ls DENUM & Format Migration

**Shipped:** 2026-10-05
**Phases:** 8 | **Plans:** 53

### What Was Built
- A dedicated interop lane for bbj-ls `formatProgram` / `denumProgram` with a strict answer guard,
  typed outcomes for every bbj-ls error code, per-method latching and a 15 s cancel-always backstop.
- Server-side formatting (document, selection, on save) in both IDEs with 15 normalized settings,
  replacing the 2021 formatter jar, its Java resolver and `bbj.formatter.javaPath`.
- `bbj/denum` for both IDEs: one undoable versioned edit, diagnostics in Problems or the IntelliJ
  console, and a Denumber offer when formatting a numbered program.
- IntelliJ: Denumber action and banner, and LSP formatting switched on after a hands-on evaluation.
- Tokenized programs (130.1): one hardened detection rule, in-place decompile fixed in VS Code and
  added to IntelliJ, no diagnostic noise for tokenized or line-numbered programs, lazy server start.
- Formatting pages in both guides, a release-notes draft built from real output, and QA rows.

### What Worked
- Putting the interop client first, with a real-socket proof and a scriptable double, let every
  later phase test against typed outcomes without a live BBj.
- Hand checks in both IDEs from the built distributables found what unit tests could not: the
  in-place decompile failure (127 step 15), the per-version offer dedupe silencing repeats (126
  round 1), and four 130.1 findings (lazy start, Explorer entries, `-l`, placeholder tab).
- A recorded evidence file (`130-FORMAT-EVIDENCE.md`) kept the release notes honest: it disproved
  the research's assumption that the old jar normalized IF closers.
- Inserting a tech-debt phase (130.1) after the first audit, instead of closing with open review
  warnings, cleared every high-priority item before the release.

### What Was Inefficient
- Phase 127's four review warnings never got a fix pass and waited for 130.1.
- The 127 decision to keep bbjlst `-l` was reversed in 130.1 after the hand check showed it leaves
  `GOSUB 0100` dangling; testing against the real bbjlst earlier would have caught it.
- The milestone was audited three times (before 130.1, a re-audit, after 130.1).

### Patterns Established
- New external RPC methods get their own lazily opened connection when they can block, so they
  never contend with the live parse or the circuit breaker.
- Cross-IDE wire names are pinned by IntelliJ contract tests that read the TypeScript literals.
- Decompile and other external-tool flows are tested against the real tool (`decompile-real-bbjlst`),
  not only against argv builders.
- A user verdict can override a recommendation (129: `supported` over `disabled`); record the known
  issue (CRLF, LSP4IJ #381) on the settings page instead of blocking.

### Key Lessons
- Run external tools for real before deciding their flags; argv-only tests hid the `-l` naming bug.
- Release notes must quote recorded output, not research summaries.
- A failed lazy start must reject, or every later command hits a dead client (130.1 WR-01).

### Cost Observations
- Model mix: opus orchestration and executors; haiku integration checker; sonnet/opus verifiers and reviewers
- Sessions: many over five days (2026-10-01 → 2026-10-05)
- Notable: 405 commits, 168 files in source, tests and docs (+24,073 / −2,725)

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v4.0 | n/a | 10 | Review-and-hardening pass; artifacts held off `main` for the first time |
| v4.1 | n/a | 8 | Advisory remediation under an embargo; override closeout with explicit Known Gaps |
| v4.2 | n/a | 6 | Seam-plus-source-guard testing pattern; in-phase UAT gap-closure plans; fastest milestone (3 days) |
| v4.3 | n/a | 9 | Shared-server-first composer layers; installed-artifact proof before UAT; milestone audit run again (no gaps) |
| v4.4 | n/a | 5 | Fixes and consolidations grouped by subsystem; first tagged release through the verify-before-publish gate; a release-phase rework reverted after failing hand UAT; no milestone audit |
| v4.5 | n/a | 8 | Corpus-measured conformance gates (A / A2 / B); the compiler's own parser in the loop via a cross-repo endpoint; a phase added mid-milestone; milestone audit run (no gaps) |
| v4.6 | n/a | 4 | Lean user-facing bug burn-down; measure-first plans; crash detection redone on real-log evidence; milestone audit run (no gaps) |
| v4.7 | n/a | 13 | Audit backlog burn-down in one milestone PR; permanent CI hygiene gates; Dependabot roll-up; milestone audit run (no gaps, `tech_debt`) |
| v4.8 | n/a | 1 | Docs-only drift fix from a file:line drift scan; script-diffed settings against `package.json`; milestone audit run (no gaps, `tech_debt`) |
| v4.9 | n/a | 8 | Feature migration onto an external RPC (bbj-ls); dedicated interop lane; a tech-debt phase inserted after the first audit; three audit passes (no gaps, `tech_debt`) |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v4.1 | ~1,127 vitest + 96 JUnit | not measured at close | 0 new runtime dependencies |
| v4.2 | ~1,127 vitest + 504 JUnit | not measured at close | 0 new runtime dependencies (LSP4IJ pin 0.19.0 → 0.21.0, Gradle 8.14.5) |
| v4.3 | 1,873 vitest + 865 JUnit | not measured at close | 0 new runtime dependencies |
| v4.4 | 1,895 vitest + 1,101 JUnit | not measured at close | 0 new runtime dependencies (Gradle 9.7.1, IntelliJ Platform plugin 2.18.1, bundled Node.js v22.23.2) |
| v4.5 | 2,507 vitest (63 skipped) + IntelliJ suite green | not measured at close | 0 new runtime dependencies |
| v4.6 | 2,854 vitest (whole suite at 109-08) + IntelliJ suite green | not measured at close | 0 new runtime dependencies |
| v4.7 | 3,715 vitest (0 failed) + 1,160 JUnit | not measured at close | 0 new runtime dependencies (Guava 33.7.1, vsce moved to dev) |
| v4.8 | unchanged (docs only) | not measured at close | 0 new runtime dependencies |
| v4.9 | 4,659 vitest (0 failed) + 1,367 JUnit | not measured at close | 0 new runtime dependencies (formatter jar removed) |

### Top Lessons (Verified Across Milestones)

1. Keep unpublished-advisory detail off `main` by mechanism (exclude + hook), not by
   convention — v4.0 and v4.1 both needed it.
2. Human gates on merge and release actions are cheap; an unauthorized retry is not.
3. Hand UAT in a running IDE finds the gaps unit tests structurally cannot (v4.1 CR-02,
   v4.2 G-80-1/G-81-4/G-81-5/G-82-6, v4.4 G-96-2 and the reverted crash-detection rework);
   budget a UAT round per phase and close gaps in-phase.
4. Rules for subagents (shell hygiene, identifier prohibitions, disclosure) must be in the
   prompt or a hook — v4.1, v4.2, v4.3 and v4.4 all paid for relying on memory notes.
5. When a live UAT result contradicts the source, verify the installed artifact before
   changing code — v4.3 Phase 88 spent two gap-closure rounds on a stale install.
6. Evidence for an approval must be observed, not derived — v4.3's stale install and v4.4's
   hand-derived status trace both got a wrong conclusion approved by a human. v4.6 Phase 108
   confirmed the converse: the same feature built on a real `idea.log` passed first time.
7. Judge by per-item diffs, not totals — v4.5's conformance totals hid validator A2 hits
   unmasked by parser fixes and a lexer token that swallowed its terminator.
8. Test against the real external tool, not only its argv — v4.9's bbjlst `-l` naming bug
   survived two phases of argv tests and failed in the first hand check.
