---
phase: 60-baseline-resync-review-standards
verified: 2026-08-17T20:15:00Z
status: passed
score: 15/15 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 60: Baseline Resync & Review Standards Verification Report

**Phase Goal:** The planning baseline accurately reflects everything shipped in the 153-commit range
between v3.9 (`2194616`) and `v0.12.0`, and every subsequent review phase inherits a documented module
inventory plus a shared bar for what counts as a valid, non-duplicate finding.

**Verified:** 2026-08-17T20:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Method

This is a documentation/planning phase. "The codebase" verified against is the `.planning/` tree plus
the real repository facts the documents claim. Every commit count, file count, dependency version, and
issue snapshot cited below was independently re-derived by running the establishing command myself
(`git rev-list`, `git tag`, `ls`, `grep`, `gh issue list`, `git merge-base --is-ancestor`), not read off
the SUMMARY.md narration. Where a SUMMARY.md claim could not be independently reproduced with the exact
same number, that is called out explicitly.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `git rev-list --count 2194616..v0.12.0` is exactly 153, and the four per-release counts sum to it | ✓ VERIFIED | Ran independently: total=153; per-release 93+38+9+13=153. Both INVENTORY.md and MILESTONES.md quote these exact figures. |
| 2 | `.planning/reviews/INVENTORY.md` exists as the immutable authority on review scope/structure/file counts, no phase edits it after Phase 60 | ✓ VERIFIED | File exists, 1,255 lines, 15 top-level `## ` sections including Status & Authority declaring immutability and `{NN}-COVERAGE.md` recording protocol. |
| 3 | A reader can take one review unit and read its files, D1-D8 applicability with written n/a reasons, and finding-record shape in one place | ✓ VERIFIED | `RU-62-04` block: 4 files/1,533 LOC, 8 dimension cells (one `n/a — <reason>`), file-exception row, dedup neighbours (#475, #385), fully populated `P00-D1-001` template record. |
| 4 | Finding IDs allocatable by Phases 61-64 concurrently with zero collision, sweep+dimension readable from the ID | ✓ VERIFIED | `P{phase}-D{dimension}-{seq}` scheme documented in §3a with disjoint per-phase namespaces and reserved `P00`. |
| 5 | A reviewer can decide the evidence bar and easy-vs-major classification without asking | ✓ VERIFIED | §3b tier table (trace/repro/inherited) and §3c six numbered tests, both present verbatim. |
| 6 | The 15 GitHub issues open on 2026-08-17 are frozen as the authoritative dedup list | ✓ VERIFIED | `gh issue list --state open` returns exactly {33,65,83,90,108,231,381,385,410,466,472,475,476,485,486} — identical set and ascending order to INVENTORY.md's Frozen Open-Issue Snapshot table. |
| 7 | Measured test/build state frozen with environment-vs-genuine classification and D-06 routing | ✓ VERIFIED | Test & Build Baseline section present with per-failure classification, JDK 25.0.3-vs-17 build mismatch recorded, routing table naming target phase+dimension, `FIX-03`/`allowlist` language present. |
| 8 | Every stale planning-document claim corrected is logged with prior text, corrected text, command, output | ✓ VERIFIED | D-15 Correction Log has 17 data rows (19 lines incl. header/separator), covering all D-15 items plus the retroactively-added Langium/Chevrotain/Vitest rows. |
| 9 | Module inventory enumerates every file in scope for Phases 61-64, 8 dimensions, and every exclusion (BASE-03) | ✓ VERIFIED | 21 distinct `RU-*` units (18-24 range met); Applicability Grid with 0 blank cells; Surface Accounting covers all top-level entries with dispositions; cross-check against 7 REQUIREMENTS.md Out-of-Scope rows present. |
| 10 | PROJECT.md's Validated list names every shipped subsystem, labelled by release tag, traceable to the range (BASE-01) | ✓ VERIFIED | 17 entries matching `^- ✓ .+ — 0\.(9\|10\|11\|12)\.0$` (15-25 range met); all four release labels present; named subsystems (msgbox, addwindow, addchildwindow, SETOPTS, inlay hints, CompilerOptions, formatter, line numbering) all present — the latter two confirmed pre-dating `2194616` via `git merge-base --is-ancestor`, so their correct omission from new Validated rows is legitimate. |
| 11 | PROJECT.md's Context/Constraints/Key Decisions read as true today, not v3.9 (BASE-02) | ✓ VERIFIED | Stale `154`, `39 files`, `511 passed`, `bbx-config editor` all absent (0 matches); `153`, `a7e1b53`, INVENTORY.md cross-reference, corrected tech-stack versions (Langium 4.3.1/Chevrotain 12.0.0/Vitest 4.1.10) all present and match `package.json`/lockfile exactly; 7 new Key Decisions rows appended, none removed. |
| 12 | MILESTONES.md contains one entry for `2194616` → `v0.12.0`, 153 commits, four-release breakdown (BASE-04) | ✓ VERIFIED | New entry is the last `## ` heading; breakdown table has exactly the four release rows (93/38/9/13) plus a `**Total**` row of 153; both same-day releases (0.10.0/0.11.0) kept as separate rows; `**Phases completed:** None` correctly stated (verified this is the new entry's own line, not bleed-through from the prior v3.9 entry). |
| 13 | ROADMAP.md and REQUIREMENTS.md success criteria corrected in place, no scope weakened (D-15) | ✓ VERIFIED | `154`, `39 files`, `13 webview composer files`, `bbx-config[ -]editor` all absent from both files; `153`, `setopts-catalog.ts`, `setopts-composer-webview.ts` all present in both; all 10 `### Phase 6N` sections and 38 requirement rows survive; dated D-15 amendment notes present in both files. |
| 14 | Seven codebase maps carry dated, map-specific staleness banners naming INVENTORY.md as authority, additive-only (D-16) | ✓ VERIFIED | All 7 files carry `SUPERSEDED`/`2026-08-17`/`reviews/INVENTORY.md`; diff against pre-phase base (`ff35ceb`) is 95 insertions, 0 deletions; CONCERNS.md and STRUCTURE.md carry the required specific callouts (FIXME/Langium version, `bbj-intellij` omission). |
| 15 | Code review scoping (zero source files touched) is accurate | ✓ VERIFIED | `git diff --name-only ff35ceb..HEAD` returns 17 files, all under `.planning/` — matches 60-REVIEW.md's claimed file list exactly; skip is legitimate. |

**Score:** 15/15 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.planning/reviews/INVENTORY.md` | Immutable review-standard contract: authority statement, 15-issue snapshot, finding standard, template, 21 review units, applicability grid, surface accounting, pinned baseline range, test/build baseline, D-15 log | ✓ VERIFIED | 1,255 lines, all 15 sections present and internally consistent; independently re-derived figures match exactly. |
| `.planning/PROJECT.md` | Reconstructed Validated block + corrected Context/Constraints/Key Decisions | ✓ VERIFIED | 17 new Validated entries, 7 new Key Decisions rows, stale claims removed, corrections cross-referenced to the D-15 log. |
| `.planning/MILESTONES.md` | New entry for the 153-commit drift window with per-release breakdown | ✓ VERIFIED | Entry present, arithmetic checks out (93+38+9+13=153), no existing entry touched. |
| `.planning/ROADMAP.md` | Corrected Phase 60/61/62/65 success criteria | ✓ VERIFIED | All stale figures/subsystem name replaced; structural integrity (10 phase sections) preserved. |
| `.planning/REQUIREMENTS.md` | Corrected BASE-01/BASE-02/RVW-03/SEC-01 text; all 6 Phase-60-owned requirements marked Complete | ✓ VERIFIED | Traceability matrix shows BASE-01..04, RVW-06, RVW-07 all "Complete"; 38 requirement rows survive. |
| Seven `.planning/codebase/*.md` staleness banners | Dated, map-specific, additive-only | ✓ VERIFIED | All 7 present; diff confirms additive-only. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| INVENTORY.md finding-ID scheme | Phase 67/69 (future) | Documented convention, not yet consumed | N/A — future phase | Correctly scoped as forward-looking; nothing to verify yet in this phase. |
| INVENTORY.md D-15 Correction Log | plans 60-03/60-04 edits | Every corrected value has a matching logged row | ✓ WIRED | Cross-checked: all `PROJECT.md`, `ROADMAP.md`, `REQUIREMENTS.md` rows present; the 3 tech-stack rows initially missing from 60-03 were confirmed retroactively added by 60-04 (execution-notes concern #3 — resolved, not a gap). |
| Applicability Grid | 5 `{NN}-COVERAGE.md` filenames | Recording-protocol note | ✓ WIRED | All 5 filenames (`61`..`65`) named in the grid section. |
| Corrected ROADMAP §Phase 65 criterion 1 | Real SEC-01 target `setopts-composer-webview.ts` | In-place text correction | ✓ WIRED | Confirmed present in both ROADMAP.md and REQUIREMENTS.md. |

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| BASE-01 | 60-03 | ✓ SATISFIED | 17 Validated entries, all release-tag labelled, traceable to commits in range. |
| BASE-02 | 60-03 | ✓ SATISFIED | Context/Constraints/Key Decisions corrected; stale claims removed. |
| BASE-03 | 60-01 + 60-02 | ✓ SATISFIED | 21-unit inventory with full applicability grid and surface accounting. |
| BASE-04 | 60-03 | ✓ SATISFIED | MILESTONES.md entry with correct range and breakdown. |
| RVW-06 | 60-01 | ✓ SATISFIED | Tiered evidence bar, drop-vs-disposition rule stated. |
| RVW-07 | 60-01 | ✓ SATISFIED | 15-issue frozen snapshot, dedup rule, Phase 69 re-check stated. |

No orphaned requirements — all 6 phase-owned IDs appear in a plan's `requirements:` frontmatter and are
marked Complete in REQUIREMENTS.md's traceability matrix.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.planning/codebase/CONCERNS.md` | 12 | New line quoting `FIXME` text | ℹ️ Info | Intentional — the staleness banner documents that these FIXMEs are already resolved; not a live debt marker. Confirmed via `git diff ff35ceb` that no unresolved TBD/FIXME/XXX was newly introduced. |
| `.planning/PROJECT.md` | Known tech debt | "CPU stability mitigations documented but not yet implemented (#232) — DEBT-01" | ℹ️ Info | Pre-existing, retained per D-17; references a formal issue (#232) and carries a DEBT-NN identifier — passes the debt-marker gate. |

No blocking anti-patterns found. All `TBD` occurrences in `MILESTONES.md`/`ROADMAP.md` are pre-existing
(not added by this phase's diff against `ff35ceb`).

### Behavioral Spot-Checks

Not applicable in the strict sense (no runnable application code) — this phase's "runnable" claims are
its git/shell establishing commands, which were re-executed directly rather than spot-checked:

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Commit count matches claim | `git rev-list --count 2194616..v0.12.0` | `153` | ✓ PASS |
| Per-release counts match claim | `git rev-list --count` × 4 | `93, 38, 9, 13` (sum 153) | ✓ PASS |
| Open-issue snapshot matches claim | `gh issue list --state open --json number` | Exact 15-issue match, same set | ✓ PASS |
| Composer file count matches claim | `ls bbj-vscode/src/*composer*.ts \| wc -l` | `11` | ✓ PASS |
| `src/language/` file counts match claim | `ls` × 4 commands | `39`/`4`/`6`/`4` | ✓ PASS |
| No `customEditors` contribution | `grep -c customEditors package.json` | `0` | ✓ PASS |
| Dependency versions match claim | `grep` package.json + lockfile | Langium 4.3.1, Chevrotain 12.0.0, Vitest 4.1.10 | ✓ PASS |
| `CompilerOptions.ts`/`document-formatter.ts` predate range | `git merge-base --is-ancestor` | Both true | ✓ PASS |
| Codebase-map banner diff is additive-only | `git diff ff35ceb -- .planning/codebase/` | 95 insertions, 0 deletions | ✓ PASS |
| Code-review scoping is accurate | `git diff --name-only ff35ceb..HEAD` | 17 files, all `.planning/` | ✓ PASS |

### Human Verification Required

None. Every must-have in this phase is a documentation/data-integrity claim checkable by direct command
execution, and every one was independently re-derived and matched.

### Gaps Summary

No gaps found. All three previously-flagged execution-note "known issues" were independently checked and
resolved rather than being taken on trust:

1. Plan 60-01's stalled-then-closed-out summary: the committed INVENTORY.md content (finding-ID scheme,
   tiers, template, RU-62-04) matches the plan's task specifications exactly on re-run of the verify checks.
2. BASE-03's Partial→Complete correction: confirmed correct in the final REQUIREMENTS.md state (`[x] BASE-03`
   with the 60-01+60-02 combined satisfaction note).
3. The three Langium/Chevrotain/Vitest D-15 log rows: confirmed present in the current INVENTORY.md
   (added by 60-04 as claimed), and the corrected values in PROJECT.md match the installed package
   versions exactly.
4. The two miscalibrated verify-script assertions (60-03's MILESTONES.md heading count, 60-04's
   REQUIREMENTS.md row count): both confirmed to be script-only false negatives — the underlying prose
   criteria (new entry present, no requirement rows lost) are independently verified true.
5. The code-review skip: confirmed the diff scope is genuinely limited to `.planning/` (17 files, 0
   source files).

---

*Verified: 2026-08-17T20:15:00Z*
*Verifier: Claude (gsd-verifier)*
