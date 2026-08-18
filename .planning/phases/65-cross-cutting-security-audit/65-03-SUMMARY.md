---
phase: 65-cross-cutting-security-audit
plan: 03
subsystem: security-review
tags: [process-spawn, command-injection, cross-ide-comparison, child_process, GeneralCommandLine, security-audit, phase-close-out]

# Dependency graph
requires:
  - phase: 65-01
    provides: "the frozen 65-COVERAGE.md skeleton, all four closed surface enumerations, the 30-row Inherited Findings Ledger, the four-part stopping rule, and the P65-D1-nnn sequence starting at P65-D1-001"
  - phase: 65-02
    provides: "SEC-04 closed (28/28 items), and the explicit D-07 handoff naming the five [SEC-04][exposure] verdict lines and their two discharging IDs (P63-D1-003, P62-D1-004) for this plan's SEC-05 cross-references"
  - phase: 62-vscode-extension-review
    provides: "P62-D1-003 (the milestone's highest-severity open finding — unescaped child_process.exec() interpolation) and P62-D7-001 (the cross-IDE shell-vs-argv construction divergence)"
  - phase: 63-intellij-plugin-review
    provides: "P63-D1-003/007, P63-D1-002 (IntelliJ's argv-based spawn construction and node-path provenance findings)"
provides:
  - ".planning/reviews/65-COVERAGE.md §## SEC-05 — closed: 36/36 candidates verdicted (18 n/a, 14 fail, 4 pass), zero new findings, cross-IDE comparison confirming P62-D7-001's asymmetry, the P62-D1-003 shape question answered (5 of 15 real spawn sites share it, 10 do not, 0 unsettled)"
  - ".planning/reviews/65-COVERAGE.md §## Phase 65 Close-Out — all seven lettered sections (A-G), all three D-16 gates re-derived live: surface gate (120/120 items verdicted across 4 surfaces), criterion gate (all 5 ROADMAP criteria Met), requirement gate (SEC-01/02/04/05 closed — the milestone's last open SEC-* requirements)"
  - "Phase 65 closed in the milestone record: zero cells recorded against INVENTORY's grid, Phase 64's 147-of-148 position untouched, RU-D8-01 still the one unrecorded row"
affects: [66-known-debt-retriage, 67-apply-easy-fixes, 68-deliverable-documents, 69-github-issue-filing]

actuals:
  tokens: 20713
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: [cross-reference-inherited-owner-over-new-id, cross-ide-comparison-as-first-class-record, anchored-self-reference-hazard-substitution]

key-files:
  created: []
  modified:
    - .planning/reviews/65-COVERAGE.md

key-decisions:
  - "SEC-05 closed with zero new P65-D1-* findings: every one of the 15 real process-spawn sites (7 VS Code + 8 IntelliJ) traces its shape to an inherited owner already recorded by Phase 61, 62 or 63 (P61-D1-003, P62-D1-003, P62-D1-004, P62-D1-006, P63-D1-002, P63-D1-003, P63-D1-007, P64-D1-001/002/003), including the cross-IDE shell-vs-argv asymmetry itself, which Phase 62's own P62-D7-001 (D7 cross-IDE parity, secondary D1) already established — confirmed by this sweep's own independent trace rather than re-derived as a new finding, per D-04's rule against re-recording"
  - "The P62-D1-003 shape question answered explicitly across the whole surface with counts derived from the verdict lines: 5 of 15 real spawn sites share the shape (the five VS Code child_process.exec() shell-string sinks), 10 do not (2 VS Code + 8 IntelliJ argv-based spawn()/GeneralCommandLine/ProcessBuilder sites), 0 unsettled"
  - "Commands.cjs:31's shared execWithProgress sink (used by both compile and decompileReadonly) traced as covering both invocations under P62-D1-003, since that finding's own evidence states it checked 'all six call sites' of child_process.exec() in the unit — decompileReadonly's tmpInput-based construction shares the identical unescaped-quoting shape via a different value channel (the open file's basename) than P62-D1-003's own workspace-settings-focused prose, stated explicitly rather than silently assumed"
  - "Documented and resolved a second self-reference hazard in the close-out's own placeholder gate, analogous to the header's already-documented D-14 marker hazard: the frozen enumerated-line grammar block (65-01's, unmodifiable) illustrates the placeholder form literally ('- [SURFACE][kind] <anchor> — pending'), so the plan's own unanchored 'grep -cE \"— pending[[:space:]]*$\"' finds that one illustrative line (count 1, not 0); resolved by using the header's own documented anchored form ('^- \\[SEC-0[1245]\\]\\[[a-z-]+\\] .* — pending$') as the authoritative gate, exactly as the header's 'Two self-reference hazards' section already directs"
  - "Substituted the anchored D-14 disclosure-marker gate for the plan's own unanchored literal in this task's own self-verification, per the same precedent 65-01 and 65-02 each established explicitly for the identical hazard (0 critical/high findings in this plan, so both forms happen to agree at 0=0, but the anchored form is the one the header licenses)"

requirements-completed: [SEC-05]

duration: ~30min
completed: 2026-08-18
status: complete
---

# Phase 65 Plan 03: SEC-05 Process-Spawn Sweep + Phase Close-Out Summary

**Closed SEC-05 (process-spawn argument/command injection) across all 36 enumerated candidates spanning both IDEs and the three BBj tool scripts with zero new findings — every real spawn site's shape traces to an inherited owner, including the cross-IDE shell-vs-argv asymmetry Phase 62's own P62-D7-001 already established — then closed Phase 65 itself: all three D-16 gates (surface, criterion, requirement) re-derived live, closing the milestone's last four open SEC-* requirements.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-08-18T18:24:00Z (approx.)
- **Completed:** 2026-08-18T18:53:00Z
- **Tasks:** 3
- **Files modified:** 1 (`.planning/reviews/65-COVERAGE.md`)

## Accomplishments

- Swept SEC-05's VS Code leg (25 candidates): 18 `n/a` (RegExp.prototype.exec calls, child_process import/require declarations, illustrative comments) and 7 `fail` against real spawn sites — 5 `child_process.exec()` shell-string sinks sharing P62-D1-003's shape (Commands.cjs:31/117/271, extension.ts:426/645), 2 argv-based `spawn()` sites that do not (bbj-cpl-service.ts:140 owned by P61-D1-003, document-formatter.ts:59 owned by P62-D1-006/P64-D1-003)
- Swept SEC-05's IntelliJ leg (8 candidates) and tool-script leg (3 candidates): 5 IntelliJ `fail` verdicts cross-referencing the D-07-owned token/password-argv exposures and the node-path provenance chain, 3 `pass` verdicts on clean argv constructions, and all three `.bbj` scripts resolved stating their role as spawned receivers (never a second spawner)
- Ran a broader spawn-API pattern check confirming zero real spawn sites sit outside the three legs' own regex output — zero `[extra]` lines needed anywhere on the surface
- Wrote the cross-IDE comparison as a comparison — construction mechanism, injection consequence, exposed value sets, verdict — confirming rather than re-deriving the categorical shell-vs-argv divergence P62-D7-001 already records
- Closed Phase 65: re-derived all four surface denominators live (120 enumerated items total across SEC-01/02/04/05, zero placeholders, zero extras), answered all five ROADMAP criteria Met with the D-11 evidence audit re-reading all three finding records' evidence fields, closed the requirement gate (SEC-01/02/04/05 — the milestone's last open `SEC-*` items), disposed all 30 inherited-ledger rows, and stated the scope-fidelity boundary (zero cells against INVENTORY's 232-cell grid)

## Task Commits

Each task was committed atomically:

1. **Task 1: SEC-05 — resolve every VS Code spawn-site candidate for argument and command injection** - `9647593` (feat)
2. **Task 2: SEC-05 — resolve the IntelliJ and tool-script candidates, answer the cross-IDE comparison, and close the surface** - `dd67263` (feat)
3. **Task 3: Close Phase 65 — the three D-16 gates re-derived live, the accounting, and what each downstream phase inherits** - `d1a80d4` (docs)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS update)

## Files Created/Modified

- `.planning/reviews/65-COVERAGE.md` - `## SEC-05` fully closed (`### Enumeration`, `### Verdicts`, cross-IDE comparison, `### Findings` [empty], `### Not-reproducible dispositions` [empty], `### Cross-references` [9 ledger rows disposed], `### Surface closure`); `## Phase 65 Close-Out` fully filled (seven lettered sections A-G)

## Decisions Made

See `key-decisions` in frontmatter. In brief: (1) zero new SEC-05 findings — every real spawn site's shape, including the cross-IDE asymmetry, was already owned by an inherited finding; (2) the `P62-D1-003` shape question answered with live-derived counts (5 yes, 10 no, 0 unsettled); (3) `Commands.cjs:31`'s shared sink traced as covering both its `compile` and `decompileReadonly` invocations under `P62-D1-003`'s own "all six call sites" evidence; (4) documented and resolved a second self-reference hazard in the close-out's placeholder gate, mirroring the header's already-documented D-14 hazard resolution; (5) applied the same anchored-D-14-marker substitution precedent `65-01`/`65-02` established.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Substituted the anchored D-14 disclosure-marker gate for the plan's own unanchored literal**
- **Found during:** Task 1's acceptance-criteria verification pass
- **Issue:** Task 1's (and Task 2's, and Task 3's) plan-specified automated verify script computes the `critical`/`high` severity vs. `Disclosure-limited per D-14` marker identity using the unanchored `grep -cF "Disclosure-limited per D-14" "$f"` form. `65-COVERAGE.md`'s own header (`## Stopping Rule & Write Contract` § "Two self-reference hazards") explicitly documents that this unanchored form is inflated by the header's own prose (which quotes the marker three times for illustration) and states "all three plans use the anchored form" — the file's own committed content anticipates and licenses exactly this substitution, and `65-01`/`65-02` each made the identical substitution explicitly in their own self-verification.
- **Fix:** Ran the anchored comparison (`^severity:[[:space:]]+(critical|high)` vs. `^evidence:[[:space:]]+Disclosure-limited per D-14`) in place of the plan's literal unanchored one when self-verifying all three tasks; both are `0 = 0` for this plan (no `critical`/`high` findings were recorded anywhere in the phase). No edit to the coverage file was needed — this was purely a verification-script substitution.
- **Files modified:** None (verification-only; no content change).
- **Verification:** All three tasks' full acceptance-criteria scripts pass with the anchored substitution.
- **Committed in:** N/A (no content change to commit).

**2. [Rule 1 - Bug] Discovered and resolved a second, previously-undocumented self-reference hazard in the close-out's own "nothing left outstanding" gate**
- **Found during:** Task 3's acceptance-criteria verification pass
- **Issue:** Task 3's plan-specified verify script asserts `grep -cE '— pending[[:space:]]*$' .planning/reviews/65-COVERAGE.md` prints `0`. `## Stopping Rule & Write Contract`'s frozen enumerated-line grammar block (written by `65-01`, unmodifiable by this plan) necessarily illustrates the placeholder form literally — `- [SURFACE][kind] <anchor> — pending` — so this unanchored pattern matches that one illustrative line and returns `1`, not `0`. This is the identical class of self-invalidating gate the header's own "Two self-reference hazards" paragraph already documents for the D-14 marker, and that same paragraph (item 1, "The placeholder token") already states the resolution: "Every placeholder gate is therefore anchored on the **line shape** `^- \[SEC-0[1245]\]\[[a-z-]+\] .* — pending$` and not on a bare substring count of the word."
- **Fix:** Used the header's own documented anchored form as the authoritative gate (confirmed `0`) and added an explicit paragraph to `## Phase 65 Close-Out` §G stating the hazard and its resolution in the file itself, so a future reader running the plan's literal unanchored command is not surprised by the mismatch — the same discipline `65-01`/`65-02` applied to the D-14 hazard, extended here to the pending-token hazard the header had already implicitly licensed but not yet needed to explicitly resolve in prose.
- **Files modified:** `.planning/reviews/65-COVERAGE.md` (§G paragraph added, explaining rather than silently working around the hazard).
- **Verification:** The anchored form (`^- \[SEC-0[1245]\]\[[a-z-]+\] .* — pending$`) returns `0`; the ledger-shape form (`\|[[:space:]]*pending[[:space:]]*\|`) also returns `0`. Both are the "two line shapes that can carry a placeholder" the acceptance criterion's own prose already names as authoritative over "a bare substring count."
- **Committed in:** `d1a80d4` (Task 3 commit).

---

**Total deviations:** 2 auto-fixed (both Rule 1 — verification-script/documentation fixes for self-referential text the file's own header structure produces, not production-code or content-correctness bugs).
**Impact on plan:** Both fixes were necessary for the plan's own arithmetic gates to hold and for D-13's "state precisely" requirement to be honored. No scope creep — both stayed within `.planning/reviews/65-COVERAGE.md`, the plan's sole permitted output file, and neither altered any frozen section (header, register, ledger, stopping rule, SEC-01/02/04).

## Issues Encountered

**Shell/grep performance:** Several `grep -E` invocations against very long lines (verdict entries running 800+ characters, containing em-dashes and other multi-byte characters) hung under the default locale when combined with `.{120,}` / `.{40,}` quantifier patterns. Setting `LC_ALL=C` before running the acceptance-criteria checks resolved this immediately (each check completing in well under a second) — a locale/multi-byte-regex interaction, not a content or logic issue, consistent with `65-02`'s own noted "isolate each sub-check individually" precedent for a similar shell-quoting hang.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `## SEC-05` is closed: 36/36 enumerated items verdicted, cross-IDE comparison and `P62-D1-003` shape question both answered, four-part stopping rule discharged, zero new findings.
- `## Phase 65 Close-Out` is complete: surface gate (120/120 items, zero placeholders, zero extras), criterion gate (all 5 Met, evidence audit clean), requirement gate (SEC-01/02/04/05 closed — the milestone's last open `SEC-*` requirements), finding accounting (3 total findings phase-wide, all `major`, zero `easy`, zero `critical`/`high`), inherited-item accounting (30/30 ledger rows disposed), scope-fidelity note (zero grid cells recorded, Phase 64's 147-of-148 position untouched), closing confirmations and downstream-inheritance table for Phases 66-69.
- `P65-D1-004` is the phase's next available allocation, though this plan allocated none — the phase closes with exactly 3 findings (`P65-D1-001` from `65-01`, `P65-D1-002`/`003` from `65-02`).
- Phase 67 inherits nothing from this phase's apply path (0 `easy` findings, per INVENTORY 3c test (6) forcing `major` for every D1-primary finding); all 3 findings route to Phase 68's `MAJOR-REFACTORS.md` instead.
- No blockers. `git status --porcelain` over every reviewed tree and all five immutable planning records is empty.

---
*Phase: 65-cross-cutting-security-audit*
*Completed: 2026-08-18*

## Self-Check: PASSED

- FOUND: `.planning/reviews/65-COVERAGE.md`
- FOUND: `.planning/phases/65-cross-cutting-security-audit/65-03-SUMMARY.md`
- FOUND: commit `9647593` (Task 1)
- FOUND: commit `dd67263` (Task 2)
- FOUND: commit `d1a80d4` (Task 3)
