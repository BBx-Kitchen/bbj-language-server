---
phase: 63-intellij-plugin-review
plan: 04
subsystem: review
tags: [lsp4ij, intellij, lsp, code-review, static-analysis, debt-retriage]

# Dependency graph
requires:
  - phase: 63-intellij-plugin-review (plans 63-01..63-03)
    provides: RU-63-03/RU-63-01/RU-63-04's frozen 63-COVERAGE.md shape, P63-D5-001 (systemic no-test-source-set finding), P63-D7-003 (referral #3's client-side disposition)
provides:
  - "RU-63-05 (LSP wiring, server lifecycle & status UI, 13 files / 1,297 LOC) swept across all 7 live dimensions in .planning/reviews/63-COVERAGE.md"
  - "11 new findings: P63-D1-007/008, P63-D2-011..014, P63-D3-005, P63-D4-010/011, P63-D8-006/007"
  - "DEBT-05 evidence record with a measured count basis (0 own-source @ApiStatus.Experimental annotations; 20 lsp4ij references across 11 files, correcting the phase's carried '10 files' figure)"
  - "Referral #3's mechanism side (BbjServerService.restart()) re-triaged by cross-reference to P63-D7-003, not re-filed"
  - "One VS Code-side cross-phase observation appended to the Phase 63 close-out (no LS/interop status surfaces in extension.ts)"
affects: [63-05, 65-cross-cutting-security-audit, 66-debt-retriage, 67-fix-phase, 68-docs, 69-issue-filing]

actuals:
  tokens: 15047
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: [static-trace evidence tier via line-by-line code reading (no Gradle build available), mechanical git diff --no-index --numstat for structural-duplication findings, measured-not-assumed count basis for DEBT re-triage records]

key-files:
  created: []
  modified:
    - .planning/reviews/63-COVERAGE.md

key-decisions:
  - "DEBT-05's count basis corrected from PROJECT.md's carried '10 files' to the measured '11 files' (20 com.redhat.devtools.lsp4ij references, grep-verified) while explicitly declining to confirm/refute PROJECT.md's '19 experimental API usages' figure, which counts LSP4IJ's own internal annotations and is not greppable from this tree"
  - "Referral #3's mechanism side (BbjServerService.restart()'s full stop/start cycle) re-triaged by cross-reference to RU-63-01's P63-D7-003 rather than a new finding, with concrete supporting evidence that this same plugin already has the @JsonRequest machinery (BbjComposerServer.java) a narrower refresh request would need"
  - "IntelliJ's status/crash/log/java-interop surfaces (BbjServerService, both status-bar widgets, crash notification, restart action) found to have no VS Code counterpart at all — recorded as a Cross-phase observation (VS Code side) bullet per D-05, not a P63 finding, since the direction favors IntelliJ"
  - "P63-D1-007 (unqualified 'node' PATH/CWD-hijack fallback) rated severity high per D-13's disclosure tier, matching the plan's own threat-register T-63-P04-S1 entry — no trigger sequence or PoC stated"

requirements-completed: [RVW-04]

coverage: []

duration: ~20min
completed: 2026-08-18
status: complete
---

# Phase 63 Plan 04: RU-63-05 LSP Wiring, Server Lifecycle & Status UI Summary

**Swept RU-63-05's 13 LSP/UI files across all 7 live dimensions, recording 11 findings including an untrusted-search-path Node.js launch fallback (P63-D1-007), an EDT-blocking crash-recovery sleep (P63-D2-012), dead debounce infrastructure behind an unguarded restart() race (P63-D2-013), and the phase's DEBT-05 LSP4IJ-coupling evidence record with a measured (not assumed) count basis.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-18T10:21:45Z (per STATE.md's prior session marker)
- **Completed:** 2026-08-18T10:38:23Z
- **Tasks:** 2
- **Files modified:** 1 (`.planning/reviews/63-COVERAGE.md`)

## Accomplishments
- Recorded all 7 live-dimension cells for `RU-63-05` (D1, D2, D3, D4, D5, D7, D8) with written check lines, plus the carried-forward `D6 — n/a — R-D6-CENTRAL` left untouched
- 11 new findings recorded (`P63-D1-007`, `P63-D1-008`, `P63-D2-011` through `P63-D2-014`, `P63-D3-005`, `P63-D4-010`, `P63-D4-011`, `P63-D8-006`, `P63-D8-007`), each with the full 13-field template, a verified evidence trail, and a non-blank `dedup:` explicitly checking #410 and #231
- Established DEBT-05's evidence with a measured count basis: `grep -rn "ApiStatus.Experimental\|@Experimental" bbj-intellij/src/main/java` → zero matches (this repo's own source); `grep -rln "com.redhat.devtools.lsp4ij" bbj-intellij/src/main/java` → 20 references across **11** files (correcting the phase-planning-carried "10 files" figure) — PROJECT.md's "19 experimental API usages" figure counts LSP4IJ's own internal annotations, stated as not greppable from this tree rather than confirmed/refuted
- Re-triaged referral #3's mechanism side (`BbjServerService.restart()`) by cross-reference to `RU-63-01`'s `P63-D7-003` — found this same plugin already demonstrates the exact `@JsonRequest`-based typed-request machinery (`BbjComposerServer.java`) a narrower `bbj/refreshJavaClasses` request would need, so the full-restart mechanism is an implementation choice, not an LSP4IJ limitation
- Appended one bullet to the Phase 63 close-out's `### Cross-phase observations (VS Code side)` documenting that `extension.ts` has no status-bar/crash-recovery/java-interop-status surfaces at all — an IntelliJ-ahead-of-VS-Code asymmetry, not a Phase 63 finding, per D-05
- Closed the unit against the four-part stopping rule with an explicit "zero inherited referrals" statement and a D-16 scope-fidelity note

## Task Commits

Each task was committed atomically:

1. **Task 1: Sweep RU-63-05 at evidence tier `repro` — D1, D2, D3, D7** - `a4b611c` (feat)
2. **Task 2: Complete RU-63-05 at evidence tier `trace` — D4, D5, D8 — including the bounded DEBT-05 record** - `f4d4867` (feat)

## Files Created/Modified
- `.planning/reviews/63-COVERAGE.md` - Filled the `## RU-63-05` section (Cells, Findings, Not-reproducible dispositions, Cross-unit referrals, Unit closure); appended one bullet to the shared close-out's Cross-phase observations (VS Code side) sub-section

## Decisions Made
- DEBT-05's count basis corrected to the measured "20 references / 11 files" rather than restating the carried "10 files" figure, while leaving PROJECT.md's LSP4IJ-internal "19 experimental API usages" figure explicitly unconfirmed (not greppable from this tree)
- Referral #3's mechanism side dispositioned by cross-reference to `P63-D7-003`, not a duplicate finding, per D-06
- IntelliJ's status/crash/log/interop UI surfaces recorded as a VS Code-side observation (D-05), not an IntelliJ-side D7 finding, since IntelliJ has strictly more capability here than `extension.ts`
- `P63-D1-007` (unqualified `"node"` search-path fallback combined with `cmd.setWorkDirectory(project.getBasePath())`) rated severity `high` per the plan's own T-63-P04-S1 threat-register entry, disclosed per D-13's two-tier rule (surface/problem-class/impact only, no trigger sequence or PoC)

## Deviations from Plan

None — plan executed exactly as written. Both tasks' automated `<verify>` scripts passed on the first run after one correction (a markdown bold-marker split the required literal substring `zero inherited` across two `**...**` spans; fixed with two targeted `sed` edits to the exact wording, confirmed via `git diff --stat` that only `RU-63-05`'s own section and the designated close-out exception were touched).

## Issues Encountered

None beyond the cosmetic wording fix noted above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `RU-63-05` is fully closed: all 7 live cells recorded, all 13 files named, DEBT-05 evidenced and bounded for Phase 66, referral #3 fully dispositioned across both `RU-63-01` (client side) and `RU-63-05` (mechanism side)
- Phase-wide accounting after this plan: 28 of 40 cell lines recorded (23 verdicts + 5 `n/a`), 7 `pending` remaining for `RU-63-02` (plan `63-05`, the final wave)
- 53 total findings now recorded across the phase (42 prior + 11 from this plan); finding-ID sequences continue monotonically per dimension, ready for `63-05` to allocate its own next sequence numbers
- No blockers for `63-05` — it depends on this plan's commit, which is complete

---
*Phase: 63-intellij-plugin-review*
*Completed: 2026-08-18*
