---
phase: 63-intellij-plugin-review
plan: 01
subsystem: review
tags: [intellij, node-download, security-audit, sec-03, java, gradle]

requires:
  - phase: 60-review-inventory
    provides: INVENTORY.md's Phase 63 review-unit definitions, applicability grid, finding standard, and frozen open-issue snapshot
provides:
  - .planning/reviews/63-COVERAGE.md — the phase's sole deliverable, created with its full frozen skeleton (header, applicability grid, cell-total gate, four-part stopping rule, both verbatim n/a markers, 8-row inherited-referral ledger, five stubbed unit sections, stubbed close-out)
  - RU-63-03 (Settings & runtime acquisition, 6 files / 1,097 LOC) fully swept across all 7 live dimensions, with the SEC-03 Integrity Posture narrative discharging ROADMAP Phase 63 criterion 2 in full
  - P63-D5-001, the systemic "bbj-intellij has no test source set" finding other Phase 63 plans cross-reference by ID
affects: [63-intellij-plugin-review, 65-cross-cutting-security-audit, 66-debt-retriage, 67-easy-fixes-major-refactors, 68-deliverable-documents]

actuals:
  tokens: 19515
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Phase 63 coverage recording shape (inherited unchanged from 62-COVERAGE.md, D-03) — 13-field fenced finding records, verbatim n/a exclusion carry-forwards, per-unit ### Cells/Findings/Not-reproducible dispositions/Cross-unit referrals sub-blocks"
    - "SEC-03 Integrity Posture narrative subsection (D-11) — numbered facts against the actual code, closing with a blast-radius statement, mirroring 62-COVERAGE.md's SEC-01/SEC-02 Surface Handoff and 61-COVERAGE.md's SEC-06 Trust Boundary"
    - "D-13 two-tier disclosure for critical/high D1 findings on a public-repo unfixed gap — surface/problem-class/impact only, no trigger sequence or payload"

key-files:
  created:
    - .planning/reviews/63-COVERAGE.md
  modified: []

key-decisions:
  - "Recorded the swept-tree SHA (c3b17838879422bf20b2bcf2bf909ee86341ee1a) once in the header per D-18, obtained live via git rev-parse HEAD at execution time rather than copied from any plan text"
  - "Node.js v20.18.1's LTS/EOL status verified live against nodejs.org/dist/index.json and nodejs/Release's schedule.json (network was available) rather than deferred to Not-reproducible — confirmed the v20 Iron line's own end-of-life (2026-04-30) has already passed and the pinned build is missing 5 later security releases"
  - "P63-D1-001 (no checksum/signature verification on the Node.js download/cache pipeline) rated high and rendered per D-13's two-tier disclosure rule — surface, problem class, impact only, no trigger sequence or PoC"
  - "extractZip's zip-slip risk assessed and found NOT exploitable — destDir.resolve() target is the hardcoded literal \"node.exe\", not entry.getName() — stated as a fact under SEC-03, not promoted as a finding"
  - "extractTarGz's delegation of entry-path safety to the system tar binary recorded as a Not-reproducible disposition — confirming actual exploitability would require constructing a malicious archive, which is itself the trigger-sequence/PoC D-13 prohibits publishing"
  - "P63-D5-001 (systemic no-test-source-set) allocated against RU-63-03 per the plan's D-08 routing, with the phase's other four units instructed to cross-reference it by ID rather than restate the enumeration"

requirements-completed: []  # RVW-04 and SEC-03 are phase-wide (span all 5 plans); not marked complete until 63-05 closes the phase

metrics:
  duration: ~15min (task commits only)
  completed: 2026-08-18
  status: complete
---

# Phase 63 Plan 01: Coverage Skeleton + RU-63-03 Tracer Summary

**Created `.planning/reviews/63-COVERAGE.md`'s frozen phase skeleton and swept the settings/Node.js-runtime-acquisition unit across all 7 live dimensions, recording 12 findings including the SEC-03 integrity posture and the phase's one live D6 cell.**

## Performance

- **Duration:** ~15 min (task commits only)
- **Started:** 2026-08-18T09:19:00Z (approx.)
- **Completed:** 2026-08-18T09:33:11Z
- **Tasks:** 2
- **Files modified:** 1 (created)

## Accomplishments

- Created `.planning/reviews/63-COVERAGE.md` with the complete Phase 63 skeleton: header (swept-tree SHA per D-18), 5-row applicability grid, cell-total gate re-derived live from INVENTORY (`35 5 40`), four-part stopping rule, both `R-D6-CENTRAL`/`R-VSCODE-NO-DOWNLOAD` markers carried forward verbatim, an 8-row inherited-referral ledger (7 Phase 62 rows + the 1 routed toolchain item), five stubbed `## RU-63-0N` sections, and a stubbed `## Phase 63 Close-Out`.
- Swept `RU-63-03` (Settings & runtime acquisition, 6 files / 1,097 LOC, INVENTORY risk rank 1) end to end across all 7 live dimensions — D1, D2, D3, D6 at `repro`/repro-equivalent tier; D4, D5, D8 at `trace` tier.
- Wrote `### SEC-03 Integrity Posture`, discharging ROADMAP Phase 63 criterion 2 in full: transport security (HTTPS, fixed host, no cert-override found), checksum/signature verification (confirmed absent entirely), archive extraction path safety (the ZIP path is not zip-slip-vulnerable due to a hardcoded target name; the tar.gz path delegates entirely to the system `tar` binary), cache trust (any executable file at the cache path is trusted with no re-verification), and the extracted-binary/`setExecutable` landmark.
- Recorded 12 findings across all 7 live dimensions: 2 D1 (checksum/signature absence — high, and symlink-following copy — low), 3 D2 (swallowed cache-check exception, java-interop port auto-detect asymmetry, download-in-progress TOCTOU race), 1 D3 (EDT-blocking subprocess spawn on every settings-field keystroke), 2 D4 (platform-branch duplication + god function, and triplicated default-port literal), 1 D5 (`P63-D5-001`, the phase's systemic no-test-source-set finding), 2 D6 (Node v20.18.1 past its own EOL and missing 5 flagged security releases; the routed Gradle JDK 17-vs-25.0.3 toolchain mismatch with its location exception), and 1 D8 (a Javadoc/side-effect mismatch).
- Verified live against nodejs.org's own release index and the official `nodejs/Release` schedule that the pinned Node.js `v20.18.1` "Iron" LTS line reached end-of-life on 2026-04-30 (already past at sweep time) and has 5 subsequent security releases the plugin never picks up.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 63-COVERAGE.md and sweep RU-63-03 at evidence tier `repro` — D1, D2, D3, D6 — including the SEC-03 Integrity Posture** - `ac1a6c2` (feat)
2. **Task 2: Complete RU-63-03 at evidence tier `trace` — D4, D5, D8 — including the systemic P63-D5-001 test-infrastructure absence** - `c1c4106` (feat)

_No TDD tasks in this plan — it is a review-recording plan that modifies no source file._

## Files Created/Modified

- `.planning/reviews/63-COVERAGE.md` - The phase's sole deliverable: full frozen skeleton plus `RU-63-03`'s complete 7-dimension sweep, SEC-03 narrative, and 12 finding records.

## Decisions Made

- Recorded the swept-tree SHA (`c3b17838879422bf20b2bcf2bf909ee86341ee1a`) once in the header per D-18, obtained live via `git rev-parse HEAD` at execution time.
- Verified Node.js `v20.18.1`'s LTS/EOL status live against `nodejs.org/dist/index.json` and `nodejs/Release`'s `schedule.json` (network access was available in this environment) rather than deferring to a Not-reproducible disposition — confirmed the v20 "Iron" line's own end-of-life (2026-04-30) has passed and the pinned build is missing 5 later releases nodejs.org itself flags as security releases.
- Rated `P63-D1-001` (no checksum/signature verification anywhere in the download→extract→cache→execute pipeline) `high` severity and rendered it per D-13's two-tier disclosure rule — surface, problem class, and impact stated; no trigger sequence or proof-of-concept published, since this is an unfixed gap in a public repository.
- Confirmed `extractZip`'s ZIP-path extraction is **not** zip-slip-vulnerable: `destDir.resolve(...)`'s argument is the hardcoded literal `"node.exe"`, not the untrusted `entry.getName()` — stated as a fact under SEC-03 rather than promoted as a finding.
- Recorded `extractTarGz`'s delegation of entry-path safety to the system `tar` binary as a `### Not-reproducible disposition` rather than a finding — confirming actual exploitability would require constructing and running a malicious archive, which is itself the trigger-sequence/PoC D-13 prohibits publishing regardless of severity.
- Allocated `P63-D5-001` (the systemic "no `src/test/` source set exists in `bbj-intellij`" finding) against `RU-63-03` per the plan's D-08 routing; the other four Phase 63 units' own D5 cells are instructed to cross-reference this ID rather than restate the enumeration.
- Classified `P63-D4-001` (platform-branch duplication + god-function shape, confined to one file, pure refactor) and `P63-D8-001` (Javadoc-only fix) as `easy` — the only two `easy` findings in this unit — because a behaviour-preserving fix satisfies INVENTORY 3c test (4) vacuously per D-09, even though `bbj-intellij` has no test harness at all. Every other finding in the unit is `major`, either because any D1 finding is major regardless of severity (D-13's safety gate) or because a behaviour-changing fix fails test (4) via the missing test source set (`P63-D5-001`).

## Deviations from Plan

None - plan executed exactly as written. All checks the plan's `<action>` text specified were performed; all findings the checks surfaced were recorded at their appropriate evidence tier, and the one candidate that could not clear its tier without constructing an exploit archive was written to `### Not-reproducible dispositions` instead.

## Known Stubs

None — this plan's deliverable is a review-coverage document, not application code; there is no data-rendering surface to stub. The other four `## RU-63-0N` unit sections and the `## Phase 63 Close-Out` section remain intentionally stubbed with the literal placeholder `pending` on every unrecorded cell — this is the plan's designed handoff shape for plans `63-02`..`63-05`, not an unintentional gap.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `RU-63-03`'s SEC-03 Integrity Posture and D1 findings are ready for Phase 65's SEC-03/SEC-04/SEC-05 synthesis (per the plan's `key_links`).
- `P63-D6-002` (routed Gradle JDK 17-vs-25.0.3 toolchain mismatch, `location: bbj-intellij/build.gradle.kts:12-13`) is ready for Phase 64's `RU-64-02` to re-triage with full evidence already established.
- The coverage-file recording shape is proven on real content (12 findings, all 13 fields, all evidence tiers cleared or dispositioned) — plans `63-02`..`63-05` can append into the frozen skeleton without a further format checkpoint (D-03).
- Plan `63-02` (`RU-63-01`, run/compile & EM actions) is next in the wave chain and should triage ledger rows 1-3 (the `BbjCompileAction.java` stub, the 6 no-counterpart VS Code commands, and `bbj.refreshJavaClasses`'s full-LS-restart behaviour).

---
*Phase: 63-intellij-plugin-review*
*Completed: 2026-08-18*
