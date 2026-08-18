---
phase: 63-intellij-plugin-review
plan: 05
subsystem: review
tags: [intellij, textmate, lexer, psi, editor-notifications, code-review, static-analysis]

requires:
  - phase: 63-intellij-plugin-review (plans 01-04)
    provides: "RU-63-03, RU-63-01, RU-63-04, RU-63-05 swept; 63-COVERAGE.md header/grid/ledger scaffolded; 7 inherited Phase 62 referrals ledger + 1 routed INVENTORY item"
provides:
  - "RU-63-02 (language registration, editor support & notifications, 18 files/888 LOC) swept across all 7 live dimensions"
  - "9 new findings: P63-D2-015/016, P63-D3-006/007, P63-D4-012/013/014, P63-D7-006, P63-D8-008"
  - "2 inherited Phase 62 referrals dispositioned (#6 not-reproducible, #7 promoted -> P63-D7-006)"
  - "Phase 63 Close-Out (sections A-G) with both D-17 gates re-derived live: file gate 61/61, cell gate 35/5/40"
  - "RVW-04 and SEC-03 marked complete"
affects: [64-build-ci-review, 65-cross-cutting-security-audit, 66-known-debt-retriage, 67-easy-fixes, 68-deliverables-doc, 69-issue-filing]

actuals:
  tokens: 18080
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Trace-tier evidence (D-07): every D1/D2/D3 finding clears its repro tier via a line-by-line
       code trace naming concrete file:line, since the Gradle build cannot run in this sandbox"
    - "Cross-referencing by finding ID (D-08) rather than restating a systemic fact — D5 cell
       cross-references P63-D5-001 (RU-63-03) with this unit's own consequence appended"

key-files:
  created: []
  modified:
    - .planning/reviews/63-COVERAGE.md

key-decisions:
  - "Referral #6 (does IntelliJ's TextMate bundle importer honor `filenames`; does LSP4IJ registration
     independently cover `.bbl`) dispositioned not-reproducible: the confirmable half (plugin.xml's
     `<fileType>` omits `.bbl` while the TextMate bundle's own manifest includes it) is stated as
     established fact, but the runtime behavior both question-halves turn on cannot be confirmed
     without launching the IDE"
  - "Referral #7 (format/denumber/tokenized-detection/decompile absent on IntelliJ) promoted as ONE
     finding (P63-D7-006) for the categorical four-feature gap, dedup naming #65 as a partial-overlap
     covering only the tokenized-detection quarter"
  - "P63-D2-015 (bracket-matching doesn't exclude string-literal content) and P63-D2-016 (BbjCommenter's
     case-sensitive 'REM ' prefix doesn't match BBj's case-insensitive REM grammar terminal) are new,
     concretely-traced correctness findings — not inherited from Phase 62"
  - "P63-D4-014 (dead BbjIcons.CONFIG constant) and P63-D8-008 (BbjColorSettingsPage demo text uses
     the wrong docu-comment delimiter /@ instead of /@@) classified easy per D-09's vacuous-pass
     exception; all other 7 new findings classified major since bbj-intellij has no test source set"
  - "Both D-17 completion gates re-run live rather than restated: file gate enumerates 61
     bbj-intellij/src/main/java/ files with every basename confirmed present; cell gate's three-source
     awk re-derivation against INVENTORY.md agrees at 35/5/40"
  - "Header's Inherited referral ledger (D-06) disposition column resolved for all 8 rows in this
     close-out, per the plan's exclusive authorization for Task 3"

requirements-completed: [RVW-04, SEC-03]

coverage:
  - id: D1
    description: "RU-63-02 (language registration, editor support & notifications) swept across all
      7 live dimensions with 9 new findings and a written check line per cell"
    requirement: RVW-04
    verification:
      - kind: other
        ref: "grep -cE '^- D[1-8] .* — (pass|fail) — ' .planning/reviews/63-COVERAGE.md == 35 (phase-wide, includes this unit's 7)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both inherited Phase 62 referrals (#6, #7) addressed to RU-63-02 dispositioned in
      ### Inherited referral triage"
    verification:
      - kind: other
        ref: "grep -c '^- \\*\\*Referral' within the RU-63-02 section == 2"
        status: pass
    human_judgment: false
  - id: D3
    description: "Phase 63 Close-Out (sections A-G plus Cross-phase observations) filled, both D-17
      gates re-derived live and agreeing with stated totals"
    requirement: RVW-04
    verification:
      - kind: other
        ref: "find bbj-intellij/src/main/java -name '*.java' | wc -l == 61; awk over INVENTORY RU-63-0[1-5] rows == '35 5 40'"
        status: pass
    human_judgment: false
  - id: D4
    description: "SEC-03 (Node.js download integrity) confirmed complete via RU-63-03's Integrity
      Posture subsection, cited in the close-out's criterion 2 answer"
    requirement: SEC-03
    verification: []
    human_judgment: true
    rationale: "SEC-03's substance was recorded by plan 63-01 (RU-63-03); this plan only confirms and
      cites it in the close-out. No independent code verification performed in this plan beyond the
      citation check."

duration: ~48min
completed: 2026-08-18
status: complete
---

# Phase 63 Plan 05: RU-63-02 sweep and Phase 63 close-out Summary

**Swept the 18-file language-registration/editor-support/notification unit (9 new findings,
including a bracket-matching-inside-strings bug and a case-sensitive REM-comment toggle bug), then
closed Phase 63 with both completion gates re-derived live — 61 files, 35/5/40 cells, 62 findings,
8 referrals accounted for.**

## Performance

- **Duration:** ~48 min
- **Started:** 2026-08-18T10:40:08Z (immediately after plan 63-04's completion)
- **Completed:** 2026-08-18T11:08:01Z
- **Tasks:** 3
- **Files modified:** 1 (`.planning/reviews/63-COVERAGE.md`)

## Accomplishments

- Swept `RU-63-02` (language registration, editor support & notifications — 18 files, 888 LOC, the
  phase's largest file count at smallest average LOC) across all 7 live dimensions in three named
  sub-clusters (registration & file type; lexer & editor plumbing; notification providers &
  presentation), recording 9 new findings
- Dispositioned both of this unit's inherited Phase 62 referrals: #6 (TextMate `filenames`
  honoring / `.bbl` LSP4IJ coverage) as not-reproducible, with the confirmable `plugin.xml`
  fact (its `<fileType>` extension list omits `.bbl` while the TextMate bundle's own manifest
  includes it) recorded as established context; #7 (format/denumber/tokenized-detection/decompile
  absence) promoted as one categorical finding, `P63-D7-006`
- Closed Phase 63: filled `## Phase 63 Close-Out` sections A-G plus confirmed
  `### Cross-phase observations (VS Code side)`, re-running all three D-17 completion gates live
  rather than restating stated numbers — file gate (61 files, all basenames present), cell gate
  (35/5/40 across three independent sources), and referral gate (all 8 ledger rows resolved to 7
  distinct dispositions)
- Marked `RVW-04` and `SEC-03` complete; phase-wide totals now stand at 62 findings (10 easy-fix,
  52 major-refactor) across all 5 review units

## Task Commits

Each task was committed atomically:

1. **Task 1: Sweep RU-63-02 at evidence tier `repro` — D1, D2, D3, D7 — and triage the 2 inherited
   referrals** - `80cefed` (docs)
2. **Task 2: Complete RU-63-02 at evidence tier `trace` — D4, D5, D8** - `075e420` (docs)
3. **Task 3: Close Phase 63 — fill the seven close-out sections, record the cross-phase
   observations, and re-run all three D-17 gates live** - `4f44942` (docs)

_No TDD tasks; this plan writes exactly one planning-review markdown file, no source code._

## Files Created/Modified

- `.planning/reviews/63-COVERAGE.md` - Filled `## RU-63-02` section (7 cells, 9 new finding
  records, referral triage, unit closure) and `## Phase 63 Close-Out` (sections A-G, resolved the
  header's `## Inherited referral ledger (D-06)` disposition column for all 8 rows)

## Decisions Made

- Referral #6 dispositioned not-reproducible rather than promoted or dismissed: the confirmable
  half (`plugin.xml`'s `<fileType extensions="bbj;bbjt;src;bbx"/>` omits `.bbl` while the TextMate
  bundle's own hand-authored `package.json` includes it) is stated as established fact, but whether
  a `.bbl` file opened in IntelliJ actually renders via the TextMate bundle's independently-declared
  extension path — and whether the bundle importer honors `filenames` for `"BBx Config"` at all —
  both require launching the IDE, which is unavailable in this sandbox
- Referral #7 promoted as exactly one finding (`P63-D7-006`) covering all four absent features
  (format/denumber/tokenized-detection/decompile), not four separate findings, per the plan's own
  "four features in one bullet" framing; `dedup:` names #65 as a partial-overlap for only the
  tokenized-detection quarter
- Two new, concretely-traced correctness bugs found independent of the inherited referrals:
  `P63-D2-015` (bracket-matching doesn't exclude BBj string-literal content, since `BbjWordLexer`
  tokenizes brackets inside strings identically to structural brackets) and `P63-D2-016`
  (`BbjCommenter`'s fixed-case `"REM "` prefix doesn't match `bbj.langium`'s case-insensitive REM
  comment terminal, breaking toggle-comment on lowercase/mixed-case REM lines) — both classified
  `major` since no test harness exists in `bbj-intellij`
- `P63-D4-014` (dead `BbjIcons.CONFIG` constant) and `P63-D8-008` (wrong docu-comment delimiter `/@`
  instead of `/@@` in `BbjColorSettingsPage`'s demo text) classified `easy` per D-09's vacuous-pass
  exception (dead-code removal / doc-only fix change zero runtime behavior)
- Both D-17 completion gates re-run live in the close-out rather than restated: `find
  bbj-intellij/src/main/java -name '*.java' | wc -l` re-confirmed `61` with every basename present
  in the coverage file; the `awk` re-derivation against `INVENTORY.md`'s `RU-63-0[1-5]` grid rows
  re-confirmed `35 5 40`, agreeing with the stated totals and this file's own grep-counted content
- The header's `## Inherited referral ledger (D-06)` disposition column resolved for all 8 rows in
  this plan's Task 3, per the plan's explicit statement that Task 3 is the one plan authorized to
  write outside a unit section

## Deviations from Plan

None - plan executed exactly as written. All 9 findings, both referral dispositions, and the
7-section close-out follow the plan's `<action>` text and acceptance criteria directly; no Rule
1-4 auto-fixes were needed since this plan produces no source-code change.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 63 is fully closed: `RU-63-02` is the fifth and final review unit, all 35 live cells across
  the 5 units carry a verdict, 62 findings recorded (10 `easy-fix`, 52 `major-refactor`), all 8
  inherited/routed referral rows carry a written disposition
- `RVW-04` and `SEC-03` both complete — nothing on SEC-03 flows forward as open work
- Downstream phases inherit: Phase 64 gets the routed toolchain item (`P63-D6-002`,
  `build.gradle.kts:12-13`) to re-triage; Phase 65 gets `RU-63-01`'s D1 records for the
  SEC-04/SEC-05 synthesis; Phase 66 gets `P63-D4-010`'s DEBT-05 evidence; Phase 67 gets the
  `easy`/`major` split for its apply path; Phase 68 gets this whole file for DOC-03; Phase 69 gets
  the promoted findings for issue drafting, gated on ISSUE-01
- No blockers

---
*Phase: 63-intellij-plugin-review*
*Completed: 2026-08-18*

## Self-Check: PASSED
- FOUND: .planning/phases/63-intellij-plugin-review/63-05-SUMMARY.md
- FOUND: commit 80cefed (Task 1)
- FOUND: commit 075e420 (Task 2)
- FOUND: commit 4f44942 (Task 3)
