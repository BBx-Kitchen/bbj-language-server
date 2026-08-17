---
phase: 60-baseline-resync-review-standards
plan: 02
subsystem: planning/review-standards
tags: [review-inventory, applicability-grid, surface-accounting, base-03]

dependency-graph:
  requires:
    - "`.planning/reviews/INVENTORY.md` from plan 60-01 — locked finding-ID scheme, evidence tiers, easy-vs-major rule, finding record template, `RU-62-04` as the shape template"
  provides:
    - "20 additional review units (`RU-61-01`..`RU-61-07`, `RU-62-01`/`02`/`03`/`05`, `RU-63-01`..`RU-63-05`, `RU-64-01`..`RU-64-03`, `RU-D8-01`) — 21 total with `RU-62-04`"
    - "Applicability Grid — D1-D8 pre-assigned per unit (29 rows incl. 8 file-exception rows, 232 cells, all filled)"
    - "Surface Accounting & Named Exclusions — every top-level repository entry has a disposition"
  affects:
    - "Phases 61, 62, 63, 64, 65 — each now knows its exact file scope, its exact dimension obligations, and its `.planning/reviews/{NN}-COVERAGE.md` recording target"
    - "Phase 68 — DOC-03's coverage statement is now derivable mechanically from the grid + 5 coverage files, with no re-derivation of scope"
    - "REQUIREMENTS.md — BASE-03 traceability moves from Partial (60-01) to Complete"

tech-stack:
  added: []
  patterns:
    - "Review-unit ordering: ascending phase, then ascending risk rank within phase (D-07 edge probe); `RU-62-04` kept in its pre-existing position with a documented ordering-exception note since it predates this rule and must stay byte-identical"
    - "Applicability-grid n/a cells use short markers (`n/a — R-D6-CENTRAL`, etc.) resolved to full sentences in a keyed `### Exclusion reasons` list, avoiding a 232-cell table full of repeated prose"
    - "Coverage-denominator convention: generated TS excluded; vendored JARs in-scope for D1/D6 only; `.bbl` catalogs in-scope for D2/D4 only; `package-lock.json` in-scope for D6 only"

key-files:
  created: []
  modified:
    - .planning/reviews/INVENTORY.md

decisions:
  - "Risk ranking basis per phase stated as one line above each phase's units, per the plan's requirement: Phase 61 ranks by attack-surface/blast-radius through the pipeline (java-interop trust boundary first, builtin catalogs last despite highest LOC); Phase 62 keeps RU-62-04 at rank 1 (fixed) and ranks the rest by blast radius/parity; Phase 63 ranks by named security requirement (SEC-03 Node download first); Phase 64 ranks by named security requirement (SEC-08 vendored JARs first)."
  - "D1 (Security) marked `applies` for nearly every unit, including TextMate grammar files (ReDoS/catastrophic-backtracking risk on untrusted source) and CI-caching-adjacent D3, per the threat model's T-60-06 constraint against mechanically excluding a genuinely applicable dimension to reduce sweep cost."
  - "`RU-62-04`'s physical position (before Phase 61's units) is a documented exception to the D-07 edge-probe ordering rule, explained inline rather than silently violating it — the alternative (moving `RU-62-04`) was prohibited by this plan's explicit 'do not renumber or reword' instruction."
  - "`documentation/` is recorded as 'scoped, not excluded' (disposition column does not read `excluded`) to satisfy D-10's explicit instruction that it is a D8-only review surface, not an exclusion."
  - "`README.md` is recorded as excluded from `RU-D8-01`'s explicit file list (which is fixed to `CLAUDE.md`, `VERBs.md`, `documentation/` per the plan's seed) with a note flagging it as a candidate for a future D8 unit, rather than silently omitting it or silently expanding a unit whose files were already fixed by an earlier, already-verified task commit."

metrics:
  duration: "~1h across three task commits (2026-08-17T17:27Z read/gather to 2026-08-17T19:10Z final commit)"
  completed: 2026-08-17

actuals:
  tokens: 11000
  tasks: 3
  commits: 3

status: complete
---

# Phase 60 Plan 02: Baseline Resync & Review Standards Summary

Expanded `.planning/reviews/INVENTORY.md` from the one worked unit (`RU-62-04`) plan 60-01 proved
into the complete 21-unit review inventory: every hand-written file under `bbj-vscode/src/`
(excluding `generated/`), `bbj-intellij/src/`, `.github/workflows/`, and `bbj-vscode/tools/` is
now claimed by exactly one unit; every unit has all eight D1-D8 dimensions pre-decided with a
written reason for every exclusion; and every top-level repository surface has either a
review-unit assignment or a named exclusion, cross-checked against REQUIREMENTS.md's Out of Scope
table with no contradiction found.

## Task 1: Enumerate every review unit with files, LOC, risk rank and owning phase

Commit `3868644` (+515 lines). Added the `### What counts as an in-scope file` coverage-
denominator convention (generated TS excluded; vendored JARs D1/D6 only; `.bbl` catalogs D2/D4
only; `package-lock.json` D6 only), then 20 new review units grouped by phase:

- **Phase 61** (7 units, `bbj-vscode/src/language/`): `RU-61-06` java-interop client (rank 1,
  SEC-06 trust boundary), `RU-61-01` grammar & lexing, `RU-61-03` validation & BBjCPL, `RU-61-02`
  scope/linking/type inference, `RU-61-04` LSP providers, `RU-61-05` server lifecycle/DI,
  `RU-61-07` builtin catalogs (rank 7, largest LOC — 3,752 — but lowest behavioral risk).
- **Phase 62 remainder** (4 units): `RU-62-01` extension host & commands, `RU-62-03` composer
  logic & UI layer, `RU-62-05` TextMate grammar & language config, `RU-62-02` editor feature
  modules.
- **Phase 63** (5 units, 61 Java files accounted for as 11+18+6+13+13=61): `RU-63-03` settings &
  runtime acquisition (rank 1, SEC-03), `RU-63-01` run/compile/EM actions, `RU-63-04` composer
  dialogs & bridge, `RU-63-05` LSP wiring/server lifecycle/status UI, `RU-63-02` language
  registration & notifications.
- **Phase 64** (3 units): `RU-64-03` vendored JARs & interop harness (rank 1, SEC-08 — the three
  JARs named with `jcommander-1.71.jar` flagged as notably old and unpinned), `RU-64-01` GitHub
  Actions workflows (SEC-07), `RU-64-02` build/packaging manifests (largest LOC in the inventory
  at 9,208, dominated by `package-lock.json`'s 7,894 lines).
- **Cross-cutting**: `RU-D8-01`, scoped D8-only per the plan's explicit instruction.

Total: 21 units (18-24 required range). `RU-62-04` verified byte-identical (0 deletion lines in
the diff). All Task 1 automated verification and acceptance criteria re-ran clean.

## Task 2: Pre-assign D1-D8 applicability with a written reason for every exclusion

Commit `62b0558` (+136 lines). Added the `## Applicability Grid`: one row per unit (21) plus 8
file-exception rows (4 `.bbl` catalogs, `package-lock.json`, 3 vendored JARs) — 29 rows × 8
dimensions = 232 cells, all filled (`applies` or `n/a — <marker>`). Ten exclusion-reason markers
(`R-D6-CENTRAL`, `R-D7-SHARED-LS`, `R-D7-CI`, `R-D5-CI`, `R-VSCODE-NO-DOWNLOAD`, `R-D8-SCOPE`,
`R-BBL-STATIC`, `R-BBL-NODOC`, `R-LOCKFILE`, `R-JAR-BINARY`) resolve every `n/a` to a written
sentence tested against each dimension's own "what counts as a finding" wording, keyed to every
affected `{unit}/{dimension}` pair in `### Exclusion reasons`. Grid totals: 148 `applies` + 84
`n/a` = 232, matching (21 units + 8 exception rows) × 8. The `### Recording protocol (D-09)` names
the five `{NN}-COVERAGE.md` files Phases 61-65 will write into, and states DOC-03's mechanical
derivation from grid + coverage files.

**Mid-task fix:** this commit also restores the `## Pinned Baseline Range (D-01)` section header,
which Task 1's insertion accidentally dropped (the header text was present in the intended content
but was not carried through into the actual file write — caught by re-reading the file structure
before proceeding to Task 2, fixed inline as a Rule 1 auto-fix before the Task 2 content was
inserted at the correct location).

## Task 3: Account for every repository surface — assignment or named exclusion

Commit `03bebcf` (+95 lines). Added `## Surface Accounting & Named Exclusions`: all 18 top-level
repository entries (`ls -A` minus `.git`) each given exactly one disposition, with one-level
breakdowns for the three mixed surfaces (`bbj-vscode/`, `bbj-intellij/`, `.github/`). Named
exclusions recorded with stated reasons: `generated/`, `java-interop/` (with the SEC-08
dependency-tree-source carve-out for its Gradle files, narrower than a code review),
`bbj-vscode-deprecated/`, `QA/`, `examples/`, `snippets/`, `test/`+`test-data/` (explicitly not an
implementation surface — D5 findings recorded against the units they cover). `documentation/` is
recorded as "scoped, not excluded" (`RU-D8-01`). The `### Re-report risk` section flags
`.planning/codebase/CONCERNS.md` as citing Langium 3.2.1 against the installed 4.1.3. The
`### Cross-check against REQUIREMENTS.md Out of Scope` subsection asserts all seven existing rows
row-by-row with no contradiction found.

## Self-Check / Verification

Re-ran every automated `<verify>` block and the plan's key acceptance criteria against the
committed file after each task, and again holistically after all three commits:

- Task 1 `UNITS_OK`: unit count 21 (in 18-24 range), every hand-written `src/language/` file,
  every non-`language/` `src/` file, every workflow, every tools file present by basename, 61
  IntelliJ Java files confirmed — **PASS**
- Task 2 `GRID_OK`: Applicability Grid section present, all 5 `{NN}-COVERAGE.md` names present,
  `DOC-03` present, `package-lock.json`/`jcommander-1.71.jar`/`events.bbl` present, grid row count
  (21) matches distinct unit count (21) — **PASS**
- Task 3 `SURFACE_OK`: Surface Accounting section present, all named-exclusion keywords present,
  every one of the 18 top-level `ls -A` entries present in the document — **PASS**
- Zero blank cells in the Applicability Grid (`grep -cE '\|\s*\|'` = 0) — **PASS**
- `documentation/` disposition column reads "scoped, not excluded", not `excluded` — **PASS**
- Cross-check subsection contains exactly 7 numbered assertion lines (one per Out-of-Scope row) —
  **PASS**
- `git diff 13890dc..HEAD` confirms zero `RU-62-04` deletion lines across all three commits —
  **PASS**

All checked must-haves and acceptance criteria are honestly met.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `## Pinned Baseline Range (D-01)` header dropped during Task 1's insertion**
- **Found during:** Pre-Task-2 structure check (`grep -n "^## "`)
- **Issue:** Task 1's `Edit` call, despite the intended new_string content ending with the
  `## Pinned Baseline Range (D-01)` header line, produced a file where that header line was
  missing — the section's body content followed directly with no header, confirmed via
  `git show 3868644 -- INVENTORY.md` showing a `-## Pinned Baseline Range (D-01)` removal with no
  corresponding `+` re-addition.
- **Fix:** Re-inserted the exact header line at the correct position before proceeding with
  Task 2's content insertion.
- **Files modified:** `.planning/reviews/INVENTORY.md`
- **Commit:** Folded into `62b0558` (Task 2's commit) since it was caught and fixed immediately
  before that task's content was written, in the same edit pass.

No other deviations — the remaining plan content was executed exactly as specified.

## Requirements Impact

**BASE-03** moves from `Partial (60-01)` to **Complete**: the module inventory now enumerates
every file in scope for Phases 61-64 across the 8 dimensions, plus every explicit exclusion
(`java-interop/`, `generated/`, `bbj-vscode-deprecated/`), matching ROADMAP.md's Phase 60
criterion 4 verbatim.

## Self-Check: PASSED

- FOUND: `.planning/reviews/INVENTORY.md` (1,247 lines, +746 lines across 3 commits this plan)
- FOUND: commit `3868644` in `git log --oneline`
- FOUND: commit `62b0558` in `git log --oneline`
- FOUND: commit `03bebcf` in `git log --oneline`
- All automated `<verify>` blocks for Tasks 1, 2, 3 re-run clean against the committed file
