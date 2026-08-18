---
phase: 64-build-ci-dependency-review
plan: 01
subsystem: review
tags: [build-ci, vendored-binaries, sec-08, supply-chain, bbj-tools, interop-harness, file-exception-rows]

requires:
  - phase: 60-review-inventory
    provides: INVENTORY.md's Phase 64 review-unit definitions, applicability grid, file-exception rows, exclusion-reason texts, finding standard and frozen open-issue snapshot
  - phase: 62-extension-host-composer-review
    provides: the two body-level deferrals addressed to RU-64-03 at 62-COVERAGE.md:1489 and :1833
  - phase: 63-intellij-plugin-review
    provides: the frozen coverage-document shape copied unchanged (D-05) and the P63-D6-002 routed item that seeds the inherited-item ledger
provides:
  - .planning/reviews/64-COVERAGE.md — the phase's sole deliverable, created with its complete frozen skeleton (header with swept-tree SHA, 8-row applicability grid including all 5 file-exception rows, two-part cell gate, 29-file gate, four-part stopping rule, 4 verbatim n/a markers, one-row inherited ledger, 3 stubbed unit sections, stubbed 8-part close-out)
  - RU-64-03 (BBj tool scripts, vendored JARs & interop test harness, 7 files) fully swept across all 7 live unit-row dimensions and the 6 live cells of its 3 JAR file-exception rows
  - "### Vendored Binary Provenance — the vendored-binary half of SEC-08, which plan 64-03's SEC-08 Dependency Triage consolidates by reference rather than re-auditing"
  - P64-D6-002 — BBjCodeFomatter.jar's unidentifiability recorded as the finding it is, triage file-issue, asking for provenance rather than a version bump
  - P64-D1-003 — the three-JAR distribution-integrity gap the whole formatter path rests on
affects: [64-build-ci-dependency-review, 65-cross-cutting-security-audit, 66-debt-retriage, 67-easy-fixes-major-refactors, 68-deliverable-documents, 69-issue-filing]

actuals:
  tokens: 68000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Phase 64 coverage recording shape — inherited unchanged from 63-COVERAGE.md (D-05), with file-exception cell rendering inherited from 61-COVERAGE.md, the only prior sweep with live file-exception rows"
    - "Two-part cell gate — an INVENTORY-derivable part (`7 27 29 56`, row count first) plus a hand-added adopted row, summing to the phase gate `8 29 35 64`, with `grep -c 'gradle-wrapper.jar' INVENTORY.md` printing 0 as the evidence that part 2 cannot come from the pipeline"
    - "### Vendored Binary Provenance narrative subsection (D-06/D-11) — five numbered facts against the actual artifacts, a blast-radius statement, and a what-was-read-versus-what-was-asserted disclaimer; the direct analogue of 63-COVERAGE.md's ### SEC-03 Integrity Posture"
    - "D-09's dual triage:/classification: fields rendered for the first time, with the D-09-vs-INVENTORY-3c interaction reconciled explicitly inside P64-D6-001 rather than left as a silent contradiction"

key-files:
  created:
    - .planning/reviews/64-COVERAGE.md
  modified: []

key-decisions:
  - "Recorded the swept-tree SHA (446c53c2ae9fe0533ece792f9acb0bcc54b6a9bb) once in the header per D-18, obtained live via git rev-parse HEAD at execution time rather than copied from plan text"
  - "All 5 file-exception rows written into the skeleton at first commit — the 3 tools/formatter JARs recorded cell-by-cell here, package-lock.json and D-20's adopted gradle-wrapper.jar stubbed for 64-03 — because omitting one is the single most likely way this phase under-counts (D-17)"
  - "jcommander 1.71 checked against a resolvable advisory reference (OSV, com.beust:jcommander at 1.71 and unpinned, plus the relocated org.jcommander coordinate) and recorded as a finding-free pass with source and date; the query mechanism was sanity-checked against log4j-core 2.14.1 so the empty result is a real negative rather than a broken call"
  - "INVENTORY's 'notably old' risk-rank note verified from the artifact itself — Bnd-LastModified: 1493325683414 converts to 2017-04-27 — and the distance to the current line established from Maven Central (com.beust ends at 1.82, the project relocated to org.jcommander whose latest is 2.0)"
  - "BBjCFCli.jar's D6 recorded as pass, not fail — it is first-party and declares no third-party dependency of its own beyond the two separately-assessed Class-Path rows; its unversioned, unreproducible build is an integrity gap that bites inside P64-D1-003 rather than a second D6 finding on the same fact"
  - "P64-D6-001 (undeclared tsx) triaged file-issue rather than fix-now, because the fix adds a dependency declaration, which INVENTORY 3c test (3) makes major by construction — stated in the record so D-09's fix-now→easy mapping is honoured rather than contradicted"
  - "The em-login.bbj missing-outputFile abort recorded as a Not-reproducible disposition rather than a finding — the control-flow shape is verifiable but the BBj runtime semantics it depends on are not, and asserting them would be the plausible-but-false claim the standard exists to prevent"
  - "62-COVERAGE.md:1489's 'java'-from-PATH boundary dispositioned as addressed (promoted into provenance fact (4) and cited inside P64-D1-003's evidence) rather than allocated a second finding against document-formatter.ts, which is RU-62-02's file and closed"
  - "62-COVERAGE.md:1833's -i-versus-stdin precedence question dispositioned as not-reproducible, after checking that BBjCFCli.jar's six-line manifest carries no argument metadata rather than assuming it"
  - "CLAUDE.md:92's incomplete run-tool list (it omits em-validate-token.bbj, which build.gradle.kts:100-107 and :123-128 do bundle) recorded as a written observation naming RU-D8-01 as the owning row, never as a P64-* finding (D-18)"
  - "Several observations deliberately not inflated into findings — the .bbj output-idiom duplication, web.bbj's missing use statement, the em-login.bbj header imprecision, and the latent division at run-tests.ts:966-968 — each with the judgement stated in the check line rather than hidden"

requirements-completed: []  # RVW-05, SEC-07 and SEC-08 are phase-wide (span all 3 plans); not marked complete until 64-03 closes the phase

metrics:
  duration: ~50min
  completed: 2026-08-18
  status: complete
---

# Phase 64 Plan 01: Coverage Skeleton + RU-64-03 Tracer Summary

**Created `.planning/reviews/64-COVERAGE.md` with its complete frozen skeleton — including all five file-exception rows and both completion gates at their D-20 values — and swept the BBj tool scripts, vendored JARs and interop test harness across all 13 live cells it owns, recording 12 findings and discharging the vendored-binary half of SEC-08.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 2 (both `type="auto"`, no checkpoint reached)
- **Files modified:** 1 (created); **0 source files touched**

## What Was Built

### The skeleton (contract for plans `64-02` and `64-03`)

`.planning/reviews/64-COVERAGE.md` now carries, frozen at first commit:

- **Header** — swept-tree SHA recorded once (`446c53c…`, obtained live), governing standard, dedup source with the neighbour analysis re-derived (**0 of 15** open issues carry the `dependencies` area label; **0 of 15** name CI, a workflow, build configuration or a vendored binary), the slice size, and the **29-file gate with both adoptions justified at the point of the count** — `.github/dependabot.yml` (D-19) and `gradle-wrapper.jar` (D-20) — under the stated principle that *the gate follows the scope, not the other way round*.
- **Applicability grid** — 3 unit rows plus a `### File-exception rows` sub-table carrying **all five** rows, four transcribed verbatim from INVENTORY and D-20's adopted row flagged as an adoption in the row itself.
- **Cell-Total Gate** — re-derived live in two parts: INVENTORY's pipeline printing `7 27 29 56` (with the leading row count called out as part of the gate — **7, not 3**), plus D-20's row adding `1 2 6 8` by hand, with `grep -c 'gradle-wrapper.jar' INVENTORY.md` printing `0` recorded as the evidence that part 2 *cannot* come from the pipeline. Sum: **`8 29 35 64`**.
- **File Gate** — the enumeration command and its literal output, `29`.
- **Stopping Rule & Write Contract** — four-part rule, the wave-chain ordering argument, the `pending` placeholder convention, and the four environment constraints.
- **Exclusion reasons carried forward** — four verbatim blocks (**R-D7-CI** 7 cells, **R-D5-CI** 1, **R-LOCKFILE** 7, **R-JAR-BINARY** 20), identity check 7+1+7+20 = 35, and the **`R-D6-CENTRAL` non-carry stated as a fact** with its reason (its own text says vendored-binary provenance is assessed at `RU-64-03`, and this is that phase).
- **Inherited item ledger** — exactly one row (`P63-D6-002`), with the three "why exactly one" facts each verified now; plus a clearly-labelled second block holding the **two Phase 62 body-level deferrals** as sweep inputs, not ledger rows, so D-18's arithmetic is unchanged.
- **Three stubbed unit sections and an 8-part stubbed close-out**, including `### Milestone coverage position (last sweep phase)`.

### `RU-64-03`, swept end to end

13 live cells recorded — 7 unit-row (D1 fail, D2 fail, D3 pass, D4 fail, D5 fail, D6 fail, D8 fail) and 6 file-exception (D1 fail ×3, D6 pass/fail/pass) — each with a written check line phrased against that dimension's own REQUIREMENTS.md wording. All 7 files named inside the section.

**`### Vendored Binary Provenance`** states what ships (three JARs, 112,361 bytes, SHA-256 each, `.vscodeignore` verified not to exclude `tools/`), provenance per artifact in three distinct categories, pinning (**nothing** — no checksum, signature, lockfile entry, `build.xml`, `pom.xml`, Gradle task, npm script or CI step, established by search rather than inferred), reachability (`Class-Path` loads all three through the one call site), and what the method deliberately left unknowable — closing with a blast-radius statement and a read-versus-asserted disclaimer.

### Findings

12 records, all `unit: RU-64-03`, all with `path:line`, a primary dimension, tier-clearing evidence, a verified failure scenario and a non-blank `dedup:`.

| ID | Location | Sev | Effort |
|---|---|---|---|
| `P64-D1-001` | `web.bbj:30-31` — silent fallback to `admin`/`admin123` | medium | 4 |
| `P64-D1-002` | `em-login.bbj:10-13,41-43` — credentials and token via process arguments, token written to disk unguarded | high | 8 |
| `P64-D1-003` | `tools/formatter/BBjCFCli.jar` — three JARs shipped in the `.vsix` and executed with no existence, hash or signature check | high | 8 |
| `P64-D2-001` | `run-tests.ts:510,579,584` — hardcoded `status: 'pass'` makes the report and the exit code disagree | medium | 2 |
| `P64-D2-002` | `run-tests.ts:706-708` — escape-then-highlight ordering makes two regexes permanently dead (**reproduced**) | low | 2 |
| `P64-D2-003` | `web.bbj:34,54,70,87,90,91` — six post-login calls with no `err=`, so the only failure message is unreachable from them | medium | 4 |
| `P64-D4-001` | `run-tests.ts:256-592,651-979` — two god functions holding 63% of the file; cases 12-17 duplicate the scaffold cases 1-11 share | low | 8 |
| `P64-D4-002` | `run-tests.ts:659` — `criticalFields` declared and never read | low | 2 |
| `P64-D5-001` | `run-tests.ts:1-1058` — `tools/` is outside every test, type-check and lint boundary; a CI trigger, the subject of nothing | medium | 8 |
| `P64-D6-001` | `run-tests.ts:1,11-13` — `npx tsx` resolves an undeclared, unpinned, unlockfiled package at run time (`triage: file-issue`) | medium | 2 |
| `P64-D6-002` | `lib/BBjCodeFomatter.jar` — manifest is `Manifest-Version: 1.0` and nothing else; unidentifiable, therefore untriageable (`triage: file-issue`) | high | 8 |
| `P64-D8-001` | `run-tests.ts:2-14` — "validates every critical field" vs the 3-field gate at `:1045`; undocumented `--timeout` | low | 2 |

Plus **2 not-reproducible dispositions** (the `em-login.bbj` missing-argument abort; the inherited `-i`-versus-stdin question) and **3 cross-unit referrals** (→ `RU-64-02` for the `tsx` declaration, → `RU-64-01` for the Dependabot boundary, → Phase 65 for the SEC-04/SEC-05 leg).

## Notable Result Worth Flagging

**All 12 findings classify as `major`, and none is `easy`.** This is not an artifact of over-caution — it falls out of two independent INVENTORY 3c tests. Test (6) forces `major` for every D1-primary finding and every `high` severity. Test (4) fails for *everything* under `bbj-vscode/tools/`, because that tree is reached by no tsconfig (`src/**/*.ts` and `test/**/*` only), no lint script (`eslint src test`) and no vitest pattern, so nothing in the repository can regression-test a fix there. Phase 67's `easy` apply path therefore receives **nothing** from this unit, and `P64-D5-001` is the finding that explains why — closing it is what would make the rest of this unit's findings cheaply fixable.

## Deviations from Plan

**None affecting output.** One plan-internal numeric discrepancy was noticed and resolved in favour of the arithmetically consistent value, recorded here rather than silently absorbed:

- Task 2's `<precondition>` prose says "exactly 10 with **17** placeholders remaining", and the `<threat_model>` T-64-P01-10 row says "10/17, then 13/14". Both are stale pre-D-20 numbers. The plan's own `<acceptance_criteria>`, `<verify>` blocks and `<verification>` section all say **19** then **16**, and only those satisfy 13 + 16 + 35 = 64 with D-20's row present. Executed against 19/16; both `<verify>` blocks pass.

No auto-fix rule was invoked. No source file was modified: `git status --porcelain` over `bbj-vscode`, `bbj-intellij`, `java-interop`, `.github` and all four `.planning/reviews/` records was empty before and after each task, asserted by both `<verify>` blocks.

## Authentication Gates

None.

## Verification

Both `<verify>` blocks pass:

- Task 1 → `P64_01_SKELETON_AND_RU03_REPRO_OK`
- Task 2 → `P64_01_RU03_COMPLETE`

Independently confirmed: 24 unit-row cell lines + 40 file-exception cell lines = 64; 35 `n/a`; 13 verdicts; 16 `pending`; all effort values on INVENTORY §3d's `{2,4,8}` scale (5×2, 2×4, 5×8); no duplicate, `P00-` or `P64-D7-` ID; every finding field count equals the `^id:` count (12); `^triage:` count equals `^dimension: D6` count (2); zero `location:` lines in `bbj-vscode/src/`, `bbj-intellij/src/`, `CLAUDE.md`, `VERBs.md` or `documentation/`.

## Commits

- `9eeed2a` — `docs(64-01): create 64-COVERAGE.md skeleton and sweep RU-64-03 at tier repro`
- `392424b` — `docs(64-01): complete RU-64-03 at tier trace — D4, D5, D8 — and close the unit`

## What `64-02` and `64-03` Inherit

A frozen skeleton carrying both gates at their D-20 values, all four `n/a` markers, all five file-exception rows, and 16 mechanically countable `pending` placeholders. `64-02` fills `## RU-64-01` (6 cells). `64-03` fills `## RU-64-02` (10 cells, including both remaining file-exception rows), the inherited-item ledger's disposition column, and the close-out — where the two-part cell gate and the file gate are both re-derived live as the phase's hard gates.

## Self-Check: PASSED

- `.planning/reviews/64-COVERAGE.md` — FOUND
- `.planning/phases/64-build-ci-dependency-review/64-01-SUMMARY.md` — FOUND
- Commit `9eeed2a` — FOUND
- Commit `392424b` — FOUND
