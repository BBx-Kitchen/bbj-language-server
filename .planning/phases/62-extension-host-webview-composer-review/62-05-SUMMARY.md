---
phase: 62-extension-host-webview-composer-review
plan: 05
subsystem: review
tags: [code-review, editor-features, phase-close-out, cross-ide-parity, test-coverage, dedup, d14-gate]

# Dependency graph
requires:
  - phase: 60-baseline-resync-review-standards
    provides: INVENTORY.md (immutable review contract), Finding Standard, Applicability Grid
  - phase: 62-extension-host-webview-composer-review
    plan: 04
    provides: RU-62-05 fully swept (wave-4 predecessor per depends_on), phase-wide verdict count 28/40
provides:
  - "RU-62-02 (editor feature modules: document-formatter.ts, line-numbering.ts, tokenized-bbj.ts, decompile-io.ts — 4 files / 268 LOC) fully swept across all 7 live dimensions, 8 findings recorded"
  - "P62-D1-006: document-formatter.ts's cp.spawn('java', ...) resolves the java binary via bare PATH lookup with no absolute-path pinning — argument-array confirmed safe from injection, explicitly distinguished from RU-62-01's P62-D1-003 exec()-shell-string pattern"
  - "P62-D1-007: decompile-io.ts's fs.promises.open/stat perform no path-containment/symlink/directory-type check, trusting the caller entirely — currently unreachable since both call sites pass only already-open-document or private-tmp-dir paths"
  - "P62-D2-010: document-formatter.ts's spawn 'error' handler only rejects for ENOENT — any other spawn-level error hangs the format request's promise forever"
  - "P62-D2-011: decompile-io.ts's waitForDecompileOutput size-settling heuristic has no start-time guard, so a coincidentally-matching pre-existing stale .lst can be returned as fresh output"
  - "P62-D3-001: document-formatter.ts spawns one JVM per format request with no in-flight lock/dedupe, so overlapping saves spawn unbounded concurrent JVMs"
  - "P62-D4-005: the same 7-byte tokenized-BBj magic constant is hand-typed independently in both tokenized-bbj.ts and decompile-io.ts with no shared import (a third independent copy exists outside this unit's scope in src/language/bbj-document-builder.ts, cited as corroborating evidence)"
  - "P62-D5-006: document-formatter.ts has zero test coverage, unlike the other three files in this unit which are all thoroughly tested (line-numbering.test.ts, tokenized-bbj.test.ts, decompile-io.test.ts)"
  - "P62-D8-002: document-formatter.ts's comment claims a fallback 'reads from the file system' when document.getText() actually always returns the live in-memory buffer, making the unsavedContentMap mechanism it describes redundant"
  - "D7: all four editor features (format, denumber/line-numbering, tokenized-BBj detection, decompile) confirmed to have zero IntelliJ counterpart via grep across bbj-intellij/src/main/java/ — one referral to RU-63-02 covering all four, with #65 checked explicitly by number as the tokenized-detection dedup neighbour"
  - "Phase 62 closed: both D-14 gates re-derived live and agree across all three sources (stated totals, INVENTORY re-derivation, this file's own content) at 35/5/40 with zero placeholders; 34 findings accounted for by dimension and disposition; 4 not-reproducible dispositions and 7 outstanding RU-63-* referrals accounted for; D-13 scope-fidelity note carried forward for RU-62-05 and Commands.cjs plus the syntaxes/ enumeration observation; all 4 ROADMAP Phase 62 success criteria answered Met with evidence"
affects: [63-01-plan, 63-02-plan, 63-04-plan, 65-sec-synthesis, 67-fix-phase, 68-doc-03, 69-issue-drafting]

actuals:
  tokens: 15000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Combined Tasks 1+2 into a single commit (RU-62-02's full 7-cell sweep) rather than two separate atomic commits, since both were authored and verified together in one pass before either was staged — documented as a process deviation below"
    - "D-14 gates re-derived by running the exact commands the plan specifies against the live tree and INVENTORY.md, then cross-checked against this file's own grep-derived counts, rather than trusting any single source"
    - "Close-out finding-accounting tables built entirely from re-run grep/awk commands over the finished file, never from a running tally kept across the five plans"

key-files:
  created:
    - .planning/phases/62-extension-host-webview-composer-review/62-05-SUMMARY.md
  modified:
    - .planning/reviews/62-COVERAGE.md
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md

key-decisions:
  - "document-formatter.ts's cp.spawn('java', formatFlags) explicitly assessed as a DIFFERENT pattern from RU-62-01's P62-D1-003 exec()-shell-string finding (argument array, no shell:true) rather than cross-referenced as a duplicate, per this plan's own instruction to say so explicitly when the pattern differs"
  - "P62-D1-006/007 both rated low severity (hardening gaps, no currently-reachable exploit path) but forced to major classification per D-13's D1-primary safety gate, matching every other D1 finding's precedent in this phase"
  - "P62-D5-006 classified easy (not major, unlike this phase's other four D5 findings) because it needs exactly one new test file, not two-or-more, changing the D-13 test-(1) outcome — explicitly justified in the finding's own classification text so the divergence from precedent reads as deliberate"
  - "All four RU-62-02 D7 IntelliJ-absences (format, denumber, tokenized-detection, decompile) routed to a single RU-63-02 referral rather than four separate ones, since none has any counterpart anywhere in bbj-intellij/ and RU-63-02 (language registration & editor support) is the unit that would own all four if implemented"
  - "A stdin-vs--i precedence question for the vendored BBjCFCli.jar was NOT promoted to a finding — confirming it needs the jar's own Java source or a live run, both out of scope for a static bbj-vscode/src/ review — recorded under Not-reproducible dispositions instead (RVW-06)"
  - "Cross-unit referral Group 1 (intra-Phase-62) confirmed at 0 across all five plans, matching INVENTORY's stated fact that the Routing table (D-06) has no Phase 62 rows"

patterns-established:
  - "For a small, narrow-blast-radius unit (268 LOC, 4 independent files), the same 7-dimension depth as a 1,500+ LOC unit is achievable without inflating finding count artificially — 8 genuine findings recorded here vs. 5-9 in the phase's larger units, each backed by a concrete file:line trace, not padding"

requirements-completed: [RVW-02]

coverage:
  - id: D1
    description: "RU-62-02 (document-formatter.ts, line-numbering.ts, tokenized-bbj.ts, decompile-io.ts — 4 files, 268 LOC) swept across all 7 live dimensions with 8 findings recorded (P62-D1-006/007, P62-D2-010/011, P62-D3-001, P62-D4-005, P62-D5-006, P62-D8-002), 1 not-reproducible disposition, 1 cross-unit referral (covering all 4 features) to RU-63-02"
    requirement: "RVW-02"
    verification:
      - kind: other
        ref: "manual re-run of both tasks' automated <verify> patterns (grep/awk counts) against the committed file: 7/7 live cells verdicted, phase-wide 35/5/40 with 0 pending, all 12 required finding fields at equal count 34, 0 blank dedup, 0 bbj-intellij/ locations, 0 vendored-jar locations"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both D-14 gates re-derived live at phase close and agree across all three sources (stated totals, INVENTORY awk re-derivation, this file's own grep-derived content)"
    requirement: "RVW-02"
    verification:
      - kind: other
        ref: "Gate 2: ls ... | wc -l -> 22, all 22 basenames confirmed present via loop; Gate 1: awk over INVENTORY's RU-62-0[1-5] rows -> 35 5 40, matching this file's own 35/5/40/0-pending counts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every recorded finding across the whole phase carries file:line, dimension, a verified failure scenario, and a non-blank dedup checked against the 15 frozen open issues"
    requirement: "RVW-06, RVW-07"
    verification:
      - kind: other
        ref: "field-count parity check (34 findings phase-wide x 12 required fields, all equal counts = 34); grep -c for blank dedup -> 0; 7 distinct issue numbers (#231,#381,#385,#475,#485,#486,#65) confirmed checked by name across dedup fields"
        status: pass
    human_judgment: false
  - id: D4
    description: "RVW-02 marked complete in REQUIREMENTS.md following the RVW-01 precedent, once this plan's sweep landed"
    requirement: "RVW-02"
    verification:
      - kind: other
        ref: "gsd-tools query requirements.mark-complete RVW-02 -> updated:true, checkbox + traceability surfaces both applied"
        status: pass
    human_judgment: false

duration: ~40min (session clock; substantial live code-reading and cross-referencing across all 5 plan sections preceded each commit)
completed: 2026-08-18
status: complete
---

# Phase 62 Plan 05: RU-62-02 (Editor Feature Modules) + Phase Close-Out Summary

**Swept the phase's smallest unit — `document-formatter.ts`, `line-numbering.ts`, `tokenized-bbj.ts`, `decompile-io.ts` (268 LOC, 4 independent editor-feature modules) — across all 7 live dimensions, then closed Phase 62: re-derived both D-14 gates live (22-file tree enumeration, 35/5/40 INVENTORY re-derivation) and confirmed all three sources agree, accounted for all 34 findings by dimension and disposition, confirmed 0 intra-phase referrals and 7 outstanding Phase 63 referrals, carried forward the D-13 scope-fidelity discrepancy, and answered all four ROADMAP Phase 62 success criteria as Met with cited evidence.**

## Performance

- **Duration:** ~40 min (session clock)
- **Tasks:** 3
- **Files modified:** 4 (`.planning/reviews/62-COVERAGE.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`)

## Accomplishments

- Swept `RU-62-02` at evidence tier `repro` across D1, D2, D3, D7, then at tier `trace` across D4, D5, D8 — all 7 live cells filled with a verdict and a written check line naming the concrete checks applied; the D6 cell's verbatim `n/a` carry-forward was left untouched.
- **D1 (fail, 2 findings):** confirmed `document-formatter.ts`'s `cp.spawn('java', formatFlags)` uses an argument array with no `shell: true` — categorically safer than `RU-62-01`'s `exec()`-shell-string pattern (`P62-D1-003`), stated explicitly rather than cross-referenced as a duplicate — but flagged the unpinned PATH-based `java` resolution as a hardening gap (`P62-D1-006`). Confirmed `decompile-io.ts`'s `fs.promises.open`/`stat` perform no path-containment check, trusted entirely to the caller, currently unreachable since both call sites in `Commands.cjs` pass only already-open-document or private-tmp-dir paths (`P62-D1-007`).
- **D2 (fail, 2 findings):** traced `document-formatter.ts`'s `p.on('error')` handler and found it only rejects for `ENOENT` — any other spawn error leaves the format-request promise permanently unresolved, a silent hang (`P62-D2-010`). Traced `decompile-io.ts`'s `waitForDecompileOutput` size-settling loop and found no start-time guard, so a pre-existing stale `.lst` of coincidentally matching size could be returned as fresh decompiled output on a retry (`P62-D2-011`) — confirmed untested even within `decompile-io.test.ts`'s otherwise-strong 8-case suite.
- **D3 (fail, 1 finding):** confirmed no in-flight-request lock, queue, or debounce exists anywhere in `document-formatter.ts`, so concurrent format-on-save triggers across several open documents spawn unbounded concurrent JVMs, each with the file's own acknowledged ~750ms+ startup cost (`P62-D3-001`). Confirmed `decompile-io.ts`, `tokenized-bbj.ts`, and `line-numbering.ts` are all bounded/infrequent by inspection — no defect.
- **D4 (fail, 1 finding):** found the tokenized-BBj magic-byte constant independently hand-typed in both `tokenized-bbj.ts` and `decompile-io.ts` with no shared import — a third independent copy exists outside this unit in `bbj-document-builder.ts`, cited as corroborating context (`P62-D4-005`). Confirmed the unit's three different child-process-invocation shapes across the phase (`exec()`, `execWithProgress()`, this unit's `spawn`+streams) as cross-unit context, not a fourth finding.
- **D5 (fail, 1 finding):** enumerated `bbj-vscode/test/` and found `document-formatter.ts` has zero test coverage while the other three files in this same unit are all thoroughly tested — `P62-D5-006`, classified `easy` rather than `major` (unlike this phase's other four D5 findings), since it needs exactly one new test file, explicitly justified inline.
- **D7 (pass, 0 findings, 1 referral):** grepped `bbj-intellij/src/main/java/` per feature and confirmed all four (format, denumber, tokenized-detection, decompile) have zero IntelliJ counterpart — routed as one referral to `RU-63-02`, checking `tokenized-bbj.ts` against open issue **#65** by number as this unit's dedup neighbour, confirming the VS Code side already implements what #65 requests and IntelliJ's absence is #65's remaining half.
- **D8 (fail, 1 finding):** verified `tokenized-bbj.ts`'s `hexdump`-anchored header docstring byte-for-byte against its exported constant (accurate). Found `document-formatter.ts`'s comment claiming a fallback "reads from the file system" is factually wrong — `document.getText()` always returns the live buffer, never a disk read — making the `unsavedContentMap` mechanism the comment justifies effectively redundant (`P62-D8-002`, D4-secondary).
- Recorded 1 not-reproducible disposition (whether the vendored `BBjCFCli.jar` honors `-i <path>` or piped stdin when they diverge — confirming it needs the jar's Java source or a live run, out of scope here).
- **Closed the phase:** Task 3 re-derived Gate 2 (22-file tree enumeration, all basenames confirmed present) and Gate 1 (`35 5 40` INVENTORY re-derivation) live and confirmed all three sources agree with zero disagreement. Built the finding-accounting tables (34 findings: 7/D1, 11/D2, 1/D3, 5/D4, 6/D5, 2/D7, 2/D8; 14 `easy-fix`, 20 `major-refactor`), confirmed 0 intra-phase referrals and 7 outstanding `RU-63-*` referrals, carried forward the D-13 note (`RU-62-05` and `Commands.cjs` swept despite not being named in ROADMAP's criteria, plus `62-04`'s `syntaxes/` enumeration observation), and answered all 4 ROADMAP Phase 62 success criteria as Met, citing `P62-D4-001`/`P62-D4-004` for criterion 2's duplication callout.

## Task Commits

Each task was committed atomically, with Tasks 1 and 2 combined into one commit (see Deviations):

1. **Tasks 1+2: Sweep RU-62-02 across all 7 live dimensions (D1,D2,D3,D4,D5,D7,D8)** - `554fdb3` (docs)
2. **Task 3: Close Phase 62 — re-derive both D-14 gates, account for findings/referrals** - `c8603a3` (docs)

**Plan metadata:** commit created by this SUMMARY step (docs: complete plan)

## Files Created/Modified

- `.planning/reviews/62-COVERAGE.md` - `## RU-62-02 — Editor feature modules` section (all 7 live cells verdicted, 8 finding records, 1 not-reproducible disposition, 1 cross-unit referral) and `## Phase 62 Close-Out` (both D-14 gates re-derived, finding/referral accounting, D-13 note, ROADMAP criteria answered, closing confirmations). No other section touched.
- `.planning/REQUIREMENTS.md` - `RVW-02` marked complete (checkbox + traceability table), following the `RVW-01` precedent.
- `.planning/ROADMAP.md` - Phase 62 plan-progress table updated to reflect plan `62-05` complete.
- `.planning/STATE.md` - position, decisions, and session updated for this plan.

## Decisions Made

- `document-formatter.ts`'s `cp.spawn` explicitly distinguished from `RU-62-01`'s `exec()` shell-string pattern rather than cross-referenced as a duplicate, per this plan's own instruction — the two share no root cause.
- `P62-D1-006`/`P62-D1-007` rated low severity (no currently-reachable exploit path) but forced `major` classification by D-13's D1-primary safety gate, matching every other D1 finding's precedent in this phase.
- `P62-D5-006` classified `easy` — a deliberate divergence from this phase's other four D5 findings (all `major`), justified inline: it needs exactly one new test file, not two-or-more.
- All four D7 IntelliJ-absences routed to a single `RU-63-02` referral rather than four separate ones.
- The `BBjCFCli.jar` `-i`-vs-stdin precedence question left as a not-reproducible disposition rather than promoted to a finding — it needs the vendored jar's Java source or a live run.

## Deviations from Plan

### Process deviation: Tasks 1 and 2 committed together

**Both tasks' cell content (D1/D2/D3/D7 at tier `repro`, D4/D5/D8 at tier `trace`) were authored and internally verified together before either was staged**, resulting in one commit (`554fdb3`) covering both tasks rather than two separate atomic commits. This was a sequencing choice made during drafting, not a discovered blocker — both tasks' automated `<verify>` patterns were independently re-run against the final committed state and both pass (Task 1's 4-cell/32-total intermediate gate and Task 2's 7-cell/35-total terminal gate are both satisfiable from the single commit's end state, since the end state is a superset of each). No task was skipped, reordered, or weakened; this is a commit-granularity deviation, not a content or verification deviation. Documented per the plan's own atomicity expectation rather than left silent.

### Auto-fixed Issues

None — plan executed exactly as written otherwise; both the RU-62-02 sweep and the phase close-out actions were followed without deviation.

## Issues Encountered

None beyond the commit-granularity deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `62-COVERAGE.md` now has all 5 Phase 62 units fully swept; phase-wide verdict count is terminal at 35/40 pass/fail, 0/40 pending, 5/40 `n/a` — matching the D-14 gate's re-derived totals (35/5/40) from three independent sources.
- `RVW-02` and `RVW-03` are both complete in `REQUIREMENTS.md`.
- Phase 63 inherits 7 outstanding `RU-63-*` referrals (3 to `RU-63-01`, 2 to `RU-63-02`, 2 to `RU-63-04`), including this plan's own single `RU-63-02` referral covering all four of `RU-62-02`'s IntelliJ-absent editor features.
- Phase 65 inherits `### SEC-01/SEC-02 Surface Handoff` (`RU-62-04`) and all 7 `P62-D1-*` records across the phase, including this plan's `P62-D1-006`/`P62-D1-007`, for the SEC-01/SEC-02/SEC-05 synthesis.
- Phase 67 inherits 34 classified findings (14 `easy-fix`, 20 `major-refactor`) ready to apply, all with exact `file:line` anchors and named edits.
- Phase 68 can assemble DOC-03 by concatenating all five `{NN}-COVERAGE.md` files against INVENTORY's grid with no re-derivation of scope — this plan's close-out already closes that gate.
- Phase 69 inherits decided `dedup:` verdicts on all 34 findings (7 issue numbers checked by name: #231, #381, #385, #475, #485, #486, #65) for ISSUE-03 drafting.
- Phase 62 is fully closed — no further plans remain in this phase.

---
*Phase: 62-extension-host-webview-composer-review*
*Completed: 2026-08-18*

## Self-Check: PASSED

- FOUND: `.planning/reviews/62-COVERAGE.md`
- FOUND: `.planning/phases/62-extension-host-webview-composer-review/62-05-SUMMARY.md`
- FOUND: `554fdb3` (Tasks 1+2 commit)
- FOUND: `c8603a3` (Task 3 commit)
- Both tasks' automated `<verify>` patterns re-run clean against the final committed state:
  7/7 live cells verdicted, phase-wide 35/5/40 with 0 pending, all 12 required finding fields
  at equal count 34, 0 blank `dedup:`, 0 `bbj-intellij/` locations, 0 vendored-jar locations,
  D-14 gates re-derived `22` (files) and `35 5 40` (INVENTORY), no source-file modification,
  `.planning/reviews/INVENTORY.md` unchanged.
