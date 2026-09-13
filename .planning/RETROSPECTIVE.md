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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v4.0 | n/a | 10 | Review-and-hardening pass; artifacts held off `main` for the first time |
| v4.1 | n/a | 8 | Advisory remediation under an embargo; override closeout with explicit Known Gaps |
| v4.2 | n/a | 6 | Seam-plus-source-guard testing pattern; in-phase UAT gap-closure plans; fastest milestone (3 days) |
| v4.3 | n/a | 9 | Shared-server-first composer layers; installed-artifact proof before UAT; milestone audit run again (no gaps) |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v4.1 | ~1,127 vitest + 96 JUnit | not measured at close | 0 new runtime dependencies |
| v4.2 | ~1,127 vitest + 504 JUnit | not measured at close | 0 new runtime dependencies (LSP4IJ pin 0.19.0 → 0.21.0, Gradle 8.14.5) |
| v4.3 | 1,873 vitest + 865 JUnit | not measured at close | 0 new runtime dependencies |

### Top Lessons (Verified Across Milestones)

1. Keep unpublished-advisory detail off `main` by mechanism (exclude + hook), not by
   convention — v4.0 and v4.1 both needed it.
2. Human gates on merge and release actions are cheap; an unauthorized retry is not.
3. Hand UAT in a running IDE finds the gaps unit tests structurally cannot (v4.1 CR-02,
   v4.2 G-80-1/G-81-4/G-81-5/G-82-6); budget a UAT round per phase and close gaps in-phase.
4. Rules for subagents (shell hygiene, identifier prohibitions, disclosure) must be in the
   prompt or a hook — v4.1, v4.2 and v4.3 all paid for relying on memory notes.
5. When a live UAT result contradicts the source, verify the installed artifact before
   changing code — v4.3 Phase 88 spent two gap-closure rounds on a stale install.
