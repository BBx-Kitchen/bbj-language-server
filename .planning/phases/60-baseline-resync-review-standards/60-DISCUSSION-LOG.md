# Phase 60: Baseline Resync & Review Standards - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-17
**Phase:** 60-Baseline Resync & Review Standards
**Areas discussed:** Baseline range & labelling, Inventory granularity, Finding standard, Fixing the stale numbers

---

## Baseline range & labelling

### Q1 — What endpoint should the resync baseline be pinned to?

| Option | Description | Selected |
|--------|-------------|----------|
| v0.12.0 tag | Range `2194616..v0.12.0` = exactly 153 commits. Reproducible, matches a real shipped release. The 4 post-tag commits (3 v4.0 planning docs + unreleased `a7e1b53 fix(#494)`) sit outside; the #494 fix called out explicitly as in-flight so Phase 61 doesn't re-report it. | ✓ |
| Current HEAD | Covers everything incl. the unreleased fix, but HEAD is on branch `issue494-cyclic-inheritance-hang` and moves with every v4.0 planning commit — the exact drift this phase exists to fix. | |
| v0.12.0, plus an in-flight section | Same range plus a separate "unreleased / in-flight" subsection in PROJECT.md. More bookkeeping. | |

**User's choice:** v0.12.0 tag
**Notes:** Commit counts verified live — `2194616..v0.12.0` = 153, `v0.12.0..HEAD` = 4.

### Q2 — How should reconstructed entries be labelled in PROJECT.md's Validated list?

| Option | Description | Selected |
|--------|-------------|----------|
| Per release tag | `— 0.9.0` / `— 0.10.0` / `— 0.11.0` / `— 0.12.0`, attributed by which tag first contains the commit. Traceable to a real release; honestly signals these bypassed GSD. | ✓ |
| Synthetic milestone label | One `— v3.10 (untracked)` label. Keeps the vN.M convention but invents a milestone and loses per-release attribution. | |
| Uniform drift range | `— 0.9.0–0.12.0 (pre-GSD)` everywhere. Cheapest, but gives up traceability needed for bisecting a regression to a release. | |

**User's choice:** Per release tag

### Q3 — What shape should the MILESTONES.md entry take?

| Option | Description | Selected |
|--------|-------------|----------|
| One entry, per-release breakdown inside | Single entry for `2194616` → `v0.12.0` (153 commits) satisfying roadmap criterion #3 verbatim, containing a table of the four releases with dates, commit counts, headline features. | ✓ |
| Four per-release entries | Reconstruct v0.9.0–v0.12.0 as separate entries. Richest history, but three of four shipped within 48 hours and it overshoots criterion #3. | |
| One entry, prose only | Narrative summary, no tables. Fastest, but leaves the "what shipped when" question unanswered at finer resolution. | |

**User's choice:** One entry, per-release breakdown inside

### Q4 — How should the 11 test failures and 79 skips be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Snapshot + route both as findings | Phase 60 records the full baseline (4 failing files, 11 failures, 79 skips, lint, gradle); the failures and the 4→79 skip jump enter Phases 61-64 as pre-identified D5/D2 findings so FIX-03 becomes reachable. | ✓ |
| Snapshot as known-failing allowlist | Redefine FIX-03's "clean" as "no new failures vs. baseline". Immediately satisfiable, but 11 red tests survive a milestone named *Stability and Quality*. | |
| Snapshot + fix in Phase 67 | Make the 11 an explicit Phase 67 obligation. Strongest end state, but some failures look environmental (java-interop peer on :5008) rather than code defects. | |

**User's choice:** Snapshot + route both as findings
**Notes:** Measured live during the discussion — `4 test files failed | 46 passed (50)`, `11 failed | 796 passed | 79 skipped (886)`. MILESTONES.md records v3.9 as 511 passed / 4 skipped / 0 failures, so the drift window added ~375 tests, 11 failures, and took skips from 4 → 79.

---

## Inventory granularity

### Q1 — What is the recording unit for D1-D8 in Phases 61-64?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-module rows, per-file exceptions | ~15-20 review units, one pass/fail per dimension per unit; any file with a finding or a deliberate n/a gets its own row. ~160 cells vs ~1,040, every file still named. | ✓ |
| Per-file × 8 dimensions | Literal ~1,040-cell grid matching the roadmap wording. Maximally auditable, but most cells are mechanical n/a (D6/D7 meaningless for `lib/labels.ts`) — effort goes into filling cells, not finding defects. | |
| Per-dimension sweeps, files listed once | 8 sweeps per phase, inventory records which files each touched. Cheapest and matches how reviewers work, but coverage evidence weakens to module level, hurting DOC-03. | |

**User's choice:** Per-module rows, per-file exceptions

### Q2 — Should dimensions be marked not-applicable per review unit, and who decides?

| Option | Description | Selected |
|--------|-------------|----------|
| Inventory pre-assigns applicable dimensions | Phase 60 decides which of D1-D8 apply per unit and records a reason for every exclusion. Review phases can't silently skip; DOC-03 derives from the inventory. | ✓ |
| All 8 apply, reviewers mark n/a with reason | Less Phase 60 work, keeps the bar high — but pushes the judgement into four phases where it'll be applied inconsistently, and an inconsistent n/a is indistinguishable from an oversight. | |

**User's choice:** Inventory pre-assigns applicable dimensions

### Q3 — Shared living document or per-phase coverage files?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-phase coverage files, inventory read-only | INVENTORY.md written once as an immutable contract; each phase writes `{NN}-COVERAGE.md`. No write contention when 61-64 run in parallel; Phase 68 assembles DOC-03 from the set. | ✓ |
| One shared living checklist | All phases tick cells in INVENTORY.md. Single source of truth, but 61-64 depend only on 60 so they can run concurrently and would collide — and a mutable inventory lets a phase edit the standard it's held to. | |

**User's choice:** Per-phase coverage files, inventory stays read-only

### Q4 — How should surfaces RVW-01..05 never names be treated?

| Option | Description | Selected |
|--------|-------------|----------|
| Assign each to a phase or an explicit exclusion | Vendored JARs + `run-tests.ts` → Phase 64 (D6/SEC-08); TextMate grammar → Phase 62; `documentation/` → D8 only; `QA/`, `examples/`, `snippets/` → named exclusions with reasons. Nothing unaccounted for. | ✓ |
| Inventory covers only what RVW-01..05 names | Cleanest boundary, zero scope growth — but three unscanned third-party JARs shipping in the extension is exactly what SEC-08/D6 exists to catch. | |
| Assign the security-relevant ones only | Fold in the JARs and TextMate grammar, exclude the rest. Middle path. | |

**User's choice:** Assign each to a phase or an explicit exclusion
**Notes:** Surfaces surfaced by scouting: `tools/formatter/BBjCFCli.jar`, `tools/formatter/lib/BBjCodeFomatter.jar`, `tools/formatter/lib/jcommander-1.71.jar`, `tools/interop-test-harness/run-tests.ts`, `syntaxes/bbj.tmLanguage.json`, `snippets/`, `eslint.config.js`, `vitest.config.ts`, `esbuild.mjs`, `documentation/`, `QA/`, `examples/`.

---

## Finding standard

### Q1 — What finding ID scheme should the standard mandate?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase-dimension-sequence (`P61-D2-003`) | Self-describing in commit messages and issue titles; collision-free when 61-64 run in parallel. A two-dimension finding declares a primary. | ✓ |
| Global sequence (`F-001`) | Short, but needs a central allocator (61-64 may run concurrently) and carries no information. | |
| Module-prefixed (`LANG-003`) | Reads well in issue titles, groups by area label — but drops the dimension, so D1-D8 traceability moves to a separate column. | |

**User's choice:** Phase-dimension-sequence, e.g. P61-D2-003

### Q2 — What bar must a "verified failure scenario" clear?

| Option | Description | Selected |
|--------|-------------|----------|
| Tiered by severity | Trace-only for D4/D8; D1/D2/D3 need a runnable repro or a line-by-line trace naming concrete inputs/state and the exact diverging line. Matches the real cost curve. | ✓ |
| Written trace always sufficient | Uniform and fast, but unreproduced D1/D2 claims are how plausible-but-wrong findings reach a public issue (ISSUE-02). | |
| Runnable repro for everything | Highest confidence, feeds FIX-02 — but roughly doubles four sweep phases and is unfollowable for D4/D8 where there's nothing to run. | |

**User's choice:** Tiered by severity

### Q3 — Should Phase 60 define the easy-vs-major classification rule?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — define it here with concrete tests | Measurable criteria (≤1 file, no public API/grammar change, no new dependency, regression-testable with the existing harness, exact edit nameable). Written once, four phases classify consistently. | ✓ |
| Yes, but as guidance not a rule | Heuristics + worked examples. Flexible, but four phases judging independently hand Phase 67 an inconsistent queue. | |
| No — leave classification to Phase 67 | One phase decides everything, guaranteeing consistency — but Phase 67 is scoped to *apply* fixes, and DOC-02 wants estimates the sweeping reviewer is best placed to write. | |

**User's choice:** Yes — define it here with concrete tests
**Notes:** Closes a genuine gap — no roadmap success criterion currently covers this split, despite Phases 67/68 depending on it.

### Q4 — How should the RVW-07 dedup check work?

| Option | Description | Selected |
|--------|-------------|----------|
| Frozen snapshot + live re-check at filing | Phase 60 snapshots the 15 open issues as the frozen dedup list; Phase 69 re-queries immediately before filing to catch anything opened mid-milestone. | ✓ |
| Frozen snapshot only | Fully reproducible and literally satisfies the criterion, but anything filed mid-milestone gets duplicated. | |
| Live query at each phase | Always current, but results shift between phases, the "15" in four criteria stops matching, and nothing is auditable afterwards. | |

**User's choice:** Frozen snapshot + live re-check at filing
**Notes:** Open-issue count verified as exactly 15 via `gh issue list`.

---

## Fixing the stale numbers

### Q1 — What should Phase 60 do about figures the code contradicts?

| Option | Description | Selected |
|--------|-------------|----------|
| Amend both docs, log every correction | Correct ROADMAP.md and REQUIREMENTS.md in place, recording each change with evidence in the inventory. Later phases' criteria then reference reality and can be verified. | ✓ |
| Inventory is sole authority, docs untouched | Avoids editing an approved roadmap mid-milestone — but Phase 62's criterion literally reads "All 13 webview composer files … each split across -composer/-ui/-webview", which can never be satisfied. | |
| Amend the counts, keep the criteria wording | Cheapest, but the bbx-config editor and the SETOPTS `-composer.ts` claims are wording, so the two hardest inaccuracies survive. | |

**User's choice:** Amend both docs, log every correction
**Notes:** Verified discrepancies — 154→153 commits; `src/language/` 39→~49 hand-written files; "13 composer files each split across three" → 11 files + `setopts-catalog.ts`, SETOPTS having no `-composer.ts`; and no "bbx-config editor" exists at all (`bbx-config` is a language ID; SEC-01's target is `setopts-composer-webview.ts`).

### Q2 — What happens to the seven `.planning/codebase/*.md` maps?

| Option | Description | Selected |
|--------|-------------|----------|
| Mark superseded, point at the inventory | Dated staleness banner on each naming what's known-wrong; INVENTORY.md becomes the authority on scope/structure/counts. Removes the trap of re-reporting v3.8-resolved FIXMEs. | ✓ |
| Regenerate all seven | Most accurate, maps useful again — but a substantial extra deliverable, and Phases 61-64 read every one of these files directly anyway. | |
| Regenerate STRUCTURE and CONCERNS only | Refresh the two that actively mislead, banner the rest. Targeted, but still adds a mapping deliverable. | |

**User's choice:** Mark superseded, point at the inventory
**Notes:** All seven dated 2026-02-01 — predate `bbj-intellij/` entirely, cite Langium 3.2.1 (actual 4.1.3), and CONCERNS.md lists FIXMEs resolved in v3.8.

### Q3 — How should PROJECT.md's ~110-row Key Decisions table be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Append new rows, correct only what's now false | Add rows reconstructed from the 153-commit range; edit only demonstrably-wrong entries (Context still claims "511 passed, 4 skipped"; debt list carries v3.8-resolved FIXMEs). Historical record intact. | ✓ |
| Rewrite Context, append to Key Decisions | Cleanest-reading Context — but rewriting loses the drift note, useful evidence of how this milestone arose. | |
| Full audit of every row | Most rigorous, would surface reversed decisions — but it's a review sweep in its own right, duplicating Phases 61-64. | |

**User's choice:** Append new rows, correct only what's now false

### Q4 — How granular should the 153-commit reconstruction be?

| Option | Description | Selected |
|--------|-------------|----------|
| One entry per user-visible capability, issue refs inline | ~15-25 entries in the existing style, e.g. `✓ MSGBOX composer webview with live preview (#474) — 0.10.0`. Traceability without inflating the list. | ✓ |
| One entry per referenced issue number | 40+ entries, maximum tracker traceability — but fragments single capabilities (composers span #474/#483) and nearly doubles the list. | |
| One block per release | Four grouped bullet blocks. Readable as history, but breaks the flat format and makes BASE-01 coverage hard to check claim by claim. | |

**User's choice:** One entry per user-visible capability, issue refs inline

---

## Claude's Discretion

- Exact drawing of the ~15-20 review-unit boundaries within each module.
- The finding record's precise field list, severity scale, and effort units (DOC-02 requires an effort estimate; ISSUE-03 requires `2`/`4`/`8` labels — these should align).
- How DOC-04 dispositions (duplicate / wontfix / already-covered / not-reproducible) are captured at sweep time vs. assembled in Phase 68.
- Whether INVENTORY.md carries LOC and a risk ranking per unit to order the sweeps.

## Deferred Ideas

- Regenerating the seven `.planning/codebase/*.md` maps — rejected for this phase; better done after v4.0 ships, when Phases 61-64 will have produced better material than a fresh mapping pass.
- Editorial review of `documentation/` — already FUT-02; only D8 code-accuracy checks are in scope.
- `java-interop/` Java service review — already FUT-01 and an explicit Out-of-Scope entry.
- Two gray areas raised but not explored (user was ready for context): how the ~15-20 review-unit boundaries are drawn and whether the inventory carries LOC/risk ranking; and the exact finding record template including DOC-04 disposition capture. Both recorded under Claude's Discretion.
