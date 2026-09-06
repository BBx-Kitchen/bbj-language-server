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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v4.0 | n/a | 10 | Review-and-hardening pass; artifacts held off `main` for the first time |
| v4.1 | n/a | 8 | Advisory remediation under an embargo; override closeout with explicit Known Gaps |
| v4.2 | n/a | 6 | Seam-plus-source-guard testing pattern; in-phase UAT gap-closure plans; fastest milestone (3 days) |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v4.1 | ~1,127 vitest + 96 JUnit | not measured at close | 0 new runtime dependencies |
| v4.2 | ~1,127 vitest + 504 JUnit | not measured at close | 0 new runtime dependencies (LSP4IJ pin 0.19.0 → 0.21.0, Gradle 8.14.5) |

### Top Lessons (Verified Across Milestones)

1. Keep unpublished-advisory detail off `main` by mechanism (exclude + hook), not by
   convention — v4.0 and v4.1 both needed it.
2. Human gates on merge and release actions are cheap; an unauthorized retry is not.
3. Hand UAT in a running IDE finds the gaps unit tests structurally cannot (v4.1 CR-02,
   v4.2 G-80-1/G-81-4/G-81-5/G-82-6); budget a UAT round per phase and close gaps in-phase.
4. Rules for subagents (shell hygiene, identifier prohibitions, disclosure) must be in the
   prompt or a hook — v4.1 and v4.2 both paid for relying on memory notes.
