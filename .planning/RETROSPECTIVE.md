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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v4.0 | n/a | 10 | Review-and-hardening pass; artifacts held off `main` for the first time |
| v4.1 | n/a | 8 | Advisory remediation under an embargo; override closeout with explicit Known Gaps |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v4.1 | ~1,127 vitest + 96 JUnit | not measured at close | 0 new runtime dependencies |

### Top Lessons (Verified Across Milestones)

1. Keep unpublished-advisory detail off `main` by mechanism (exclude + hook), not by
   convention — v4.0 and v4.1 both needed it.
2. Human gates on merge and release actions are cheap; an unauthorized retry is not.
