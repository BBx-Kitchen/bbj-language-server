---
phase: 60-baseline-resync-review-standards
plan: 04
subsystem: planning-docs
tags: [baseline-resync, roadmap, requirements, codebase-maps, staleness-banners, d-15, d-16]
dependency-graph:
  requires: [60-01]
  provides: [BASE-01, BASE-02, BASE-03]
  affects: [61, 62, 63, 64, 65]
tech-stack:
  added: []
  patterns: ["dated SUPERSEDED banner naming INVENTORY.md as the scope/structure/file-count authority, additive-only edit to historical maps"]
key-files:
  created: []
  modified:
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/reviews/INVENTORY.md
    - .planning/codebase/ARCHITECTURE.md
    - .planning/codebase/CONCERNS.md
    - .planning/codebase/CONVENTIONS.md
    - .planning/codebase/INTEGRATIONS.md
    - .planning/codebase/STACK.md
    - .planning/codebase/STRUCTURE.md
    - .planning/codebase/TESTING.md
decisions:
  - "Measured src/language/ LOC via the plan's own find|wc -l command (10,774 lines across 47 hand-written .ts files, excluding .langium and generated/) and corrected ROADMAP's stale '~8.5k LOC' claim to '~10.8k LOC' since the measurement contradicted it, per Task 1's explicit instruction to check and correct if contradicted"
  - "Also corrected the ROADMAP/REQUIREMENTS phase-checklist 'IN PROGRESS' summary lines (154-commit/39-files) alongside the Phase 60/61 section bodies, since INVENTORY.md's D-15 row for the file count explicitly names 'the IN PROGRESS phase list' as one of the three anchors"
  - "Used the truthful, currently-verified Langium version (4.3.1, via grep '\"langium\"' bbj-vscode/package.json) in the CONCERNS.md banner instead of the plan's hardcoded '4.1.3' acceptance-check literal, since 4.1.3 was the version at context-gathering time before 60-03 already corrected the documented claim to 4.3.1 elsewhere in the same phase - see Known Discrepancy below"
  - "Appended the three Langium/Chevrotain/Vitest correction-log rows carried forward from 60-03 as their own commit, separate from this plan's own Task 1/Task 2 commits, keeping the carried-forward defect fix independently auditable"
metrics:
  duration: ~45m
  completed: 2026-08-17
status: complete
actuals:
  tokens: 5865
  tasks: 2
  commits: 3
---

# Phase 60 Plan 04: In-place ROADMAP/REQUIREMENTS Corrections & Codebase Map Banners Summary

Applied all five D-15-logged corrections in place to ROADMAP.md and REQUIREMENTS.md (drift-window
size and endpoint, `src/language/` file count and LOC, composer file count/asymmetry, the
nonexistent "bbx-config editor" subsystem), added dated additive-only staleness banners to all
seven `.planning/codebase/*.md` maps under D-16, and closed a carried-forward gap in INVENTORY.md's
D-15 Correction Log left by plan 60-03.

## What Was Built

**Task 1 — ROADMAP.md and REQUIREMENTS.md corrections (D-15).** Applied every correction with a row
in INVENTORY.md's D-15 Correction Log, scoped-edit only (no whole-file rewrites):

- **Drift-window size** 154→153 commits: ROADMAP's Phase 60 IN-PROGRESS checklist line, Goal
  paragraph, and criterion 1; REQUIREMENTS' BASE-01.
- **Drift-window endpoint** `HEAD`→the `v0.12.0` tag: ROADMAP's Phase 60 Goal and criterion 3 (now
  reading `2194616` → `v0.12.0`, matching the MILESTONES.md entry 60-03 wrote).
- **`src/language/` file count** 39→~49: ROADMAP's Phase 61 IN-PROGRESS checklist line, Goal
  paragraph and criterion 1 (criterion 1's enumeration extended with the eleven previously-omitted
  files: `bbj-code-action-provider.ts`, `bbj-inlay-hint-provider.ts`, `bbj-overload-selector.ts`,
  `bbj-use-insert.ts`, `composer-commands.ts`, `bbj-definition-provider.ts`,
  `bbj-document-symbol-provider.ts`, `logger.ts`, `validations/check-function-calls.ts`,
  `lib/fs-provider.ts`, `lib/bbj-api.ts`). Also re-measured the Goal's LOC claim per Task 1's
  instruction: `find bbj-vscode/src/language -maxdepth 2 -name '*.ts' -not -path '*/generated/*' |
  xargs wc -l` returned **10,774** lines across 47 files — contradicting the stale "~8.5k LOC"
  claim, so it was corrected to "~10.8k LOC".
- **Composer file count and shape** 13→11 + `setopts-catalog.ts`: ROADMAP's Phase 62 criterion 2 and
  REQUIREMENTS' RVW-03, both now stating the SETOPTS asymmetry explicitly (no `-composer.ts`).
- **The nonexistent "bbx-config editor" subsystem**: replaced in ROADMAP's Phase 60 criterion 1 and
  Phase 65 criterion 1, and in REQUIREMENTS' BASE-02 and SEC-01, with the logged replacement wording
  — "the `setopts-composer-webview.ts` markup (scoped to the `bbx-config` language ID by
  `setopts-composer-ui.ts`)".

Both files gained a dated amendment note at the foot pointing at INVENTORY.md's D-15 Correction Log.
Verified: `grep -c '154'` and the `bbx-config[ -]editor` pattern are both `0` in both files; `153`
appears 3+ times in ROADMAP and 1+ in REQUIREMENTS; `setopts-catalog.ts` and
`setopts-composer-webview.ts` appear in both files; all ten `### Phase 6N` sections and all 38
requirement rows (`[x]` + `[ ]` combined) survive; the planner-owned `Plans:` block under §Phase 60
is untouched (4 `PLAN.md` references, unchanged).

**Task 2 — Staleness banners on the seven codebase maps (D-16).** Inserted a
`> ⚠ SUPERSEDED — 2026-08-17` banner into each `.planning/codebase/*.md` file immediately after its
`**Analysis Date:** 2026-02-01` line — additive only, verified via `git diff --stat` showing
insertions only (95 total, 0 deletions) across the seven files. Each banner names
`.planning/reviews/INVENTORY.md` as the v4.0 scope/structure/file-count authority and lists at least
two map-specific verified claims:

- **CONCERNS.md** (flagged as highest re-report risk): the two FIXMEs it lists (orphaned-AST
  workaround in `bbj-scope.ts`, receiver-ref comment in `bbj-linker.ts`) are already resolved —
  `grep -rn 'FIXME' bbj-vscode/src --include='*.ts' | grep -v generated` returns no matches in the
  current tree; and its cited "Langium Framework (v3.2.1)" is two majors behind the installed
  `~4.3.1` (verified via `grep '"langium"' bbj-vscode/package.json`).
- **STRUCTURE.md**: omits `bbj-intellij/` entirely; states "39 TypeScript files" for
  `src/language/` against the verified ~49; omits the drift window's composer/inlay-hint/
  `CompilerOptions.ts`/formatter/line-numbering additions to `bbj-vscode/src/`.
- **STACK.md**: cites Langium 3.2.1 and Chevrotain 11.0.3 against installed `~4.3.1`/`~12.0.0`;
  omits the IntelliJ toolchain and LSP4IJ entirely.
- **ARCHITECTURE.md**: predates the BBjCPL integration, the `logger.ts` singleton, the composer
  subsystem, and the whole `bbj-intellij/`/LSP4IJ side.
- **CONVENTIONS.md**: predates the `-composer`/`-ui`/`-webview` module convention (and SETOPTS'
  deviation from it) and the logger-over-console convention established in v3.3.
- **INTEGRATIONS.md**: describes java-interop as a fixed `localhost:5008` socket though
  `java-interop.ts` now exposes `setConnectionConfig(host, port)`; omits EM token-based
  authentication (`BbjEMTokenStore.java`, `em-login.bbj`, `em-validate-token.bbj`) and the BBjCPL
  compiler integration entirely.
- **TESTING.md**: cites Vitest 1.6.1 against installed `^4.1.10`; points at INVENTORY.md's "Test &
  Build Baseline" section rather than restating suite-state numbers that will age.

No map was regenerated — all seven remain readable as historical context, unchanged except for the
inserted banner.

**Carried-forward defect — logging plan 60-03's Tech-stack corrections.** Plan 60-03 corrected three
stale Tech-stack version numbers in PROJECT.md (Langium 4.1.3→4.3.1, Chevrotain 11.0.3→12.0.0,
Vitest 1.6.1→4.1.10, commit `417f25e`) but never logged them as rows in INVENTORY.md's D-15
Correction Log, though its own task text authorized the corrections. Appended the three missing rows
in the existing table format, with prior/corrected text recovered from `git show 417f25e --
.planning/PROJECT.md` and fresh verification evidence against the resolved lockfile entries
(`grep -A1 '"node_modules/{langium,chevrotain,vitest}"' bbj-vscode/package-lock.json`, confirming
`4.3.1`/`12.0.0`/`4.1.10` respectively). Also updated the correction-log's closing paragraph to note
these three rows were applied by 60-03 but logged retroactively by 60-04. Append-only — none of the
sixteen pre-existing rows or any other INVENTORY.md section was altered.

## Deviations from Plan

### Auto-fixed Issues

None beyond what the plan's own action text explicitly authorized (the LOC re-measurement in Task 1
and the phase-checklist-line edits were both instructed by the plan's action prose and D-15 log row
anchors, not discretionary additions).

## Known Discrepancies (not stubs, not silently reconciled)

**1. Task 1's automated verify script's requirement-row count is miscalibrated.** The script asserts
`grep -cE '^- \[ \] \*\*(BASE|RVW|SEC|DEBT|FIX|DOC|ISSUE)-' .planning/REQUIREMENTS.md` equals `38`,
but that pattern only matches **unchecked** (`[ ]`) rows. Six requirements (BASE-01..04, RVW-06,
RVW-07) were already marked `[x]` complete by plans 60-01/60-02/60-03 before this plan ran, so the
script returns `32`. The true total — `grep -cE '^- \[[ x]\] \*\*(BASE|RVW|SEC|DEBT|FIX|DOC|ISSUE)-'
.planning/REQUIREMENTS.md` — is `38`, matching the plan's prose done-criterion ("all 38 requirement
rows survive"). No requirement row was added, removed, or renumbered by this plan. Per the guidance
for pre-existing hard-count script mismatches (see 60-03's analogous MILESTONES.md heading-count
note), this is reported here rather than reconciled by un-checking already-complete requirements to
inflate the unchecked count.

**2. Task 2's automated verify script's CONCERNS.md version literal is stale.** The acceptance
criteria requires `sed -n '/SUPERSEDED/,/^## /p' .planning/codebase/CONCERNS.md | grep -c '4.1.3'` to
be `≥ 1`, but `4.1.3` was the Langium version discovered during Phase 60's context-gathering
discussion — 60-03 (same phase, earlier plan) already re-verified and corrected the canonical
PROJECT.md claim to `4.3.1` before this plan ran, and `grep '"langium"' bbj-vscode/package.json`
confirms `~4.3.1` is the actual installed version today. Writing the stale `4.1.3` into a document
whose entire purpose is to correct stale claims would itself be a fresh inaccuracy, so the CONCERNS.md
banner names the true current version (`4.3.1`) instead — verified, not assumed. All other Task 2
acceptance criteria (banner presence, dating, authority reference, ≥2 map-specific bullets, additive
diff, `bbj-intellij` mention in STRUCTURE.md, FIXME mention in CONCERNS.md) pass.

## Self-Check: PASSED

- FOUND: `.planning/ROADMAP.md` (modified, exists)
- FOUND: `.planning/REQUIREMENTS.md` (modified, exists)
- FOUND: `.planning/reviews/INVENTORY.md` (modified, exists)
- FOUND: `.planning/codebase/ARCHITECTURE.md` (modified, exists)
- FOUND: `.planning/codebase/CONCERNS.md` (modified, exists)
- FOUND: `.planning/codebase/CONVENTIONS.md` (modified, exists)
- FOUND: `.planning/codebase/INTEGRATIONS.md` (modified, exists)
- FOUND: `.planning/codebase/STACK.md` (modified, exists)
- FOUND: `.planning/codebase/STRUCTURE.md` (modified, exists)
- FOUND: `.planning/codebase/TESTING.md` (modified, exists)
- FOUND commit `d19ac1b` (Task 1 — ROADMAP.md/REQUIREMENTS.md corrections)
- FOUND commit `fbc0193` (Task 2 — codebase map banners)
- FOUND commit `1dcab8b` (carried-forward defect — D-15 log rows for 60-03's Tech-stack corrections)
