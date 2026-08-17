---
phase: 60-baseline-resync-review-standards
plan: 01
subsystem: planning/review-standards
tags: [review-inventory, finding-standard, baseline-freeze, d15-corrections]

dependency-graph:
  requires: []
  provides:
    - "`.planning/reviews/INVENTORY.md` — immutable finding-ID scheme, evidence tiers, easy-vs-major rule, finding record template, frozen 15-issue dedup snapshot, pinned baseline range, test/build baseline, D-15 correction log"
    - "Finding-ID scheme `P{phase}-D{dimension}-{seq}` (D-11) locked and available to Phases 61-64"
    - "D-15 correction log rows for plans 60-03 (PROJECT.md) and 60-04 (ROADMAP.md, REQUIREMENTS.md) to apply"
  affects:
    - "Phases 61, 62, 63, 64, 65 — inherit the finding standard and dedup list this plan freezes"
    - "Phase 67 — FIX-03's `npm test` clean gate is unreachable until the D-06 routing table's items are dispositioned"
    - "Phase 68 — assembles DOC-03 from `{NN}-COVERAGE.md` files this document's Status & Authority section establishes as the per-phase record location"

tech-stack:
  added: []
  patterns:
    - "Finding IDs: `P{phase}-D{dimension}-{seq}`, phase `00` reserved for non-allocatable template illustrations"
    - "Evidence tiers: D4/D8 -> trace, D1/D2/D3 -> repro, D5/D6/D7 -> inherited; stricter tier wins on dimension overlap"
    - "Easy-vs-major: six-test gate, test (6) forces `major` for any critical/high severity or D1 finding regardless of edit size"
    - "D-15 correction rows: prior text, corrected text, verification command, observed output — no correction applied outside the logged table"

key-files:
  created:
    - .planning/reviews/INVENTORY.md
  modified: []

decisions:
  - "Task 1 checkpoint: finding-ID scheme locked as `phase-dimension-seq` (`P{phase}-D{dimension}-{seq}`, e.g. `P62-D1-003`) over the `global-counter` and `module-seq` alternatives — confirms D-11 from 60-CONTEXT.md. This is a one-way decision (Phase 67 commit messages, Phase 69 GitHub issue bodies reference it)."
  - "RU-62-04 (Composer webview HTML generators) chosen as the one review unit worked end-to-end, per plan: largest LOC in Phase 62 and the entire SEC-01 attack surface."
  - "Baseline range pinned to `2194616..v0.12.0` (153 commits), not to `HEAD`, because `HEAD` moves with every v4.0 planning commit landing on `issue494-cyclic-inheritance-hang`."
  - "`a7e1b53` (cyclic-inheritance fix) recorded as an unreleased, in-flight code-fix outside the baseline so Phase 61 does not re-report it as a live finding."
  - "11 `test/linking.test.ts` failures classified `environment` (java-interop unreachable, port-5008 already ruled out) rather than `genuine`; routed to Phase 61/D5 for triage, not accepted as a known-failing allowlist."

metrics:
  duration: "~34s across three task commits (2026-08-17T16:57:52Z to 16:58:26Z); Task 1 checkpoint wait time not tracked by this close-out agent"
  completed: 2026-08-17

actuals:
  tokens: 9551
  tasks: 4
  commits: 3

status: complete
---

# Phase 60 Plan 01: Baseline Resync & Review Standards Summary

Created `.planning/reviews/INVENTORY.md` (502 lines), the single immutable document Phases 61-69
inherit: the locked finding-ID scheme, tiered evidence bar, easy-vs-major classification rule, finding
record template, one review unit (RU-62-04) worked in full, the pinned 153-commit baseline range, the
measured test/build state, and the D-15 correction log with evidence for every stale planning-document
claim this phase corrects.

**Note on this summary's provenance:** the four implementation tasks were fully executed and committed
by a prior executor agent, which stalled immediately after the final task commit (`13890dc`) without
writing this SUMMARY.md. This close-out agent did not re-execute any task or modify
`.planning/reviews/INVENTORY.md` — it read the committed artifact, re-ran the plan's automated
`<verify>` and acceptance-criteria checks against it, and produced the closing artifacts (this file,
STATE.md, ROADMAP.md updates).

## Task 1: Lock the finding-ID scheme (D-11) — checkpoint:decision

**Resolved by the user:** `phase-dimension-seq` — `P{phase}-D{dimension}-{seq}`, e.g. `P62-D1-003`.
This is recorded verbatim in INVENTORY.md §3a ("Locked at the Task 1 checkpoint of this plan") and
confirms D-11 from `60-CONTEXT.md`. Rejected alternatives: `global-counter` (collision risk across
concurrently-running Phases 61-64) and `module-seq` (unstable module names, no dimension encoded).

## Task 2: Create INVENTORY.md and carry one review unit through the whole contract

Commit `2b05189` (+264 lines). Wrote Status & Authority, the Frozen Open-Issue Snapshot (15 issues,
`gh issue list` output transcribed 2026-08-17), the four-part Finding Standard (3a IDs, 3b evidence
tiers, 3c easy-vs-major six-test rule, 3d severity/effort scales), the Finding Record Template (13
fields), and `RU-62-04` (Composer webview HTML generators) worked end-to-end: 4 files / 1,533 LOC,
eight D1-D8 applicability cells with a written n/a reason for D6, one file-exception row for
`setopts-composer-webview.ts`, two dedup neighbours (#475, #385), and the `P00-D1-001` template
illustration finding record.

## Task 3: Freeze the baseline range and the measured test/build state

Commit `9015ce5` (+186 lines). Pinned Baseline Range: `2194616..v0.12.0`, verified size 153, four
per-release counts (93+38+9+13=153) checked as an arithmetic identity, excluded tail named with
`a7e1b53` called out as an unreleased in-flight fix. Test & Build Baseline: `npm test` run twice
(11 identical/deterministic `test/linking.test.ts` failures both runs, all classified `environment`
— java-interop unreachable, port-5008 already ruled out); flaky `beforeAll` hook-timeout suite
failures documented separately; `npm run lint` clean (0 errors, 2 warnings); `bbj-intellij` Gradle
build fails on a JDK 17-vs-25.0.3 toolchain mismatch, classified `environment`; v3.9 contrast
(511 passed/4 skipped) recorded; D-06 routing table assigns every failure/skip-group to a target
phase and dimension.

## Task 4: Log every planning-document correction with its evidence

Commit `13890dc` (+52 lines). D-15 Correction Log: 10 correction rows plus 2 additional rows (12
data rows over the required minimum of 7) covering drift-window size (154→153), drift-window
endpoint (`HEAD`→`v0.12.0` tag), `src/language/` file count (39→~49 hand-written), webview composer
file count/shape (13 uniform→11 non-uniform, SETOPTS has no `-composer.ts`), the non-existent
`bbx-config` editor (replaced with the real `setopts-composer-webview.ts`/`setopts-composer-ui.ts`
target), the PROJECT.md test-suite currency caveat, and the PROJECT.md carried-debt count (8 prose
bullets vs. 6 `DEBT-*` requirements). Each row carries its verification command and observed output.
The 11 map-absent files list is included and all 11 confirmed present via `ls`.

## Self-Check / Verification

Re-ran the plan's automated `<verify>` blocks and key acceptance criteria against the committed
`.planning/reviews/INVENTORY.md` (not re-executed, read-only):

- Task 2 tracer verify (`TRACER_OK`): all 15 frozen issue numbers present, all 13 finding-record
  fields present, all 6 DOC-04 dispositions present, `RU-62-04` and `P00-D1-001` present,
  `COVERAGE.md` convention stated, zero credential-shaped strings — **PASS**
- Task 3 baseline verify (`BASELINE_OK`): `git rev-list --count 2194616..v0.12.0` = 153 (matches
  document), all four release tags present, `a7e1b53`, the measuring branch, `gradlew build`,
  `npm run lint`, `511`, `FIX-03` all present — **PASS**
- Task 4 correction-log verify (`CORRECTION_LOG_OK`): `D-15 Correction Log` section present, all
  three target documents named, `setopts-composer-webview.ts`/`setopts-composer-ui.ts` named,
  `customEditors` count in `bbj-vscode/package.json` = 0, all 11 map-absent files listed, `DEBT-`
  row present — **PASS**
- Snapshot table data-row count: 15 (exact match, plan requires exactly 15) — **PASS**
- `src/language/` counts: 39 top-level `.ts`+`.langium`, 4 `validations/`, 6 `lib/*.ts` — matches
  the numbers recorded in the correction log — **PASS**
- `DEBT-*` requirement count: `grep -c '^- \[ \] \*\*DEBT-' .planning/REQUIREMENTS.md` = 6, matches
  the log row — **PASS**
- Composer file count: `ls bbj-vscode/src/*composer*.ts | wc -l` = 11, matches — **PASS**

All checked must-haves and acceptance criteria are honestly met. No discrepancy found between the
plan's promised artifact and the committed one.

## Deviations from Plan

None — plan executed exactly as written by the prior executor agent. The only deviation in this
close-out pass is procedural: SUMMARY.md, STATE.md and ROADMAP.md updates were produced by a
separate close-out agent after the original executor stalled post-commit, rather than by the
original executing agent in the same session. No code or planning-document content was altered.

## Self-Check: PASSED

- FOUND: `.planning/reviews/INVENTORY.md` (502 lines, committed across 3 commits)
- FOUND: commit `2b05189` in `git log --oneline`
- FOUND: commit `9015ce5` in `git log --oneline`
- FOUND: commit `13890dc` in `git log --oneline`
- All automated `<verify>` blocks for Tasks 2, 3, 4 re-run clean against the committed file
