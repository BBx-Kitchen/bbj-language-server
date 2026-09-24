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

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v4.1 | ~1,127 vitest + 96 JUnit | not measured at close | 0 new runtime dependencies |
| v4.2 | ~1,127 vitest + 504 JUnit | not measured at close | 0 new runtime dependencies (LSP4IJ pin 0.19.0 → 0.21.0, Gradle 8.14.5) |
| v4.3 | 1,873 vitest + 865 JUnit | not measured at close | 0 new runtime dependencies |
| v4.4 | 1,895 vitest + 1,101 JUnit | not measured at close | 0 new runtime dependencies (Gradle 9.7.1, IntelliJ Platform plugin 2.18.1, bundled Node.js v22.23.2) |
| v4.5 | 2,507 vitest (63 skipped) + IntelliJ suite green | not measured at close | 0 new runtime dependencies |

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
   hand-derived status trace both got a wrong conclusion approved by a human.
7. Judge by per-item diffs, not totals — v4.5's conformance totals hid validator A2 hits
   unmasked by parser fixes and a lexer token that swallowed its terminator.
