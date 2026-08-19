---
phase: 68-deliverable-documents
plan: 05
subsystem: docs
tags: [markdown, review-findings, doc-02, github-issue-filing-prep]

# Dependency graph
requires:
  - phase: 68-deliverable-documents
    provides: "68-01's 144-block MAJOR-REFACTORS.md scaffold, 68-02's proposed_approach/proposed_labels/issue fields (118 of 144 already lifted from a named classification-clause edit), and 68-04's shared ## Coverage preamble"
provides:
  - "The 26 proposed_approach values MAJOR-REFACTORS.md's reviewers could not name a single edit for: all 144 blocks now carry a non-empty proposed_approach, and the approach-placeholder census is zero"
  - "For each of the 26: the shape of the real work (an environment dependency to provision, an investigation to run, a choice between named options, or a documentation-or-enablement decision) rather than a fabricated single-edit substitute, with the record's own owner named where another unit owns the resolution (RU-64-02 for P63-D6-002, P66-D4-001 for P63-D4-010)"
  - "derive-review-docs.mjs's check() 7c assertion changed from exact-equality-with-26 to subset-of-26, so the standing gate can verify each of this plan's three tasks incrementally as the placeholder census drains 26 -> 18 -> 10 -> 0, instead of only ever being satisfiable before any authoring began"
affects: [69-github-issue-filing]

# Actuals (#2632)
actuals:
  tokens: 10302
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Subset check over exact-equality check for a draining set: check()'s 7c assertion originally required the proposed_approach placeholder ID set to equal the full 26-ID no-named-edit set exactly, which can only ever pass before any authoring begins — changed to fail only on an ID outside the known 26 (a rogue/new placeholder), so the same standing gate remains meaningful as this plan's three tasks drain the census from 26 toward 0, matching each task's own <verify> block calling `check` after a partial (18, then 10, then 0) count"

key-files:
  created: []
  modified:
    - .planning/reviews/MAJOR-REFACTORS.md
    - .planning/phases/68-deliverable-documents/derive-review-docs.mjs

key-decisions:
  - "P61-D5-014's clause shape differs from its siblings and is recorded here as a discrepancy, not a silent reclassification: unlike the other seven Task-1 records, its classification clause's test (5) reads `pass` — it names a concrete edit (extract the bbj/refreshJavaClasses and onDidChangeConfiguration handler bodies out of main.ts into named, exported functions) rather than FAIL/n/a/moot. Per the plan's own instruction, the named edit was lifted as the approach verbatim rather than authored fresh, and the shape difference is flagged here rather than silently treated as one more n/a case."
  - "DEBT-07 (P66-D2-003, major-refactor) and DEBT-08 (P66-D5-003, wontfix) remain Pending in REQUIREMENTS.md's traceability matrix while being covered by findings that flow through this phase (P66-D2-003 sits in MAJOR-REFACTORS.md; P66-D5-003 sits in MAJOR-REFACTORS.md's Other Dispositions section as a wontfix). Ticking those two matrix rows is Phase 66's close-out, not this phase's — flagged as an observation, nothing edited here."
  - "Fixed a pre-existing bug in derive-review-docs.mjs's check() 7c assertion (Rule 1/3 auto-fix): it required the placeholder ID set to equal the full 26-ID set exactly, which cannot pass once even one approach is authored — yet each of this plan's three task <verify> blocks calls `check` after a partial count (18, 10, 0). Changed the assertion to a subset check (fails only if a placeholder appears outside the known 26, or the set grows) so the gate proves the same guarantee — no rogue placeholder, no field drift — at every stage of authoring rather than only at the start or the very end."

requirements-completed: [DOC-02]

coverage:
  - id: D1
    description: "All 144 MAJOR-REFACTORS.md blocks carry a non-empty proposed_approach and none carries an approach placeholder marker"
    requirement: "DOC-02"
    verification:
      - kind: other
        ref: "node derive-review-docs.mjs check — grep -c '^proposed_approach:' outputs 144, grep -c PENDING-APPROACH outputs 0, grep -cE '^proposed_approach: *$' outputs 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each of the 26 authored approaches names concrete files/subsystems, states what finishing looks like, and — where the record's own classification clause names no single edit — says so and names what blocks a single-edit answer, or names the owner where another unit owns it, rather than inventing a plausible-sounding edit"
    requirement: "DOC-02"
    verification:
      - kind: other
        ref: "Per-record acceptance checks: P61-D5-013 names both options and states the choice is the implementer's first decision; P61-D5-001 names port 5008 and Phase 64 D-06's already-tried bare listener; P64-D6-002 states the provenance question rather than a version-pin edit (verified by direct read — no pin instruction present); P64-D1-002/003 propose no decompilation or execution of a vendored JAR; P63-D6-002 names RU-64-02 as owner; P63-D4-010 names P66-D4-001 as the superseding record"
        status: pass
    human_judgment: true
    rationale: "Whether each authored approach reads as honest (describing real unknowns) versus inventing a plausible-sounding edit the record's own reviewer could not name is a prose-quality judgment the grep/check assertions can confirm presence and absence of specific literals for, but cannot adjudicate the overall honesty of framing."

# Metrics
duration: 4min
completed: 2026-08-19
status: complete
---

# Phase 68 Plan 05: The 26 Authored Approaches Summary

**Authored proposed_approach for the 26 MAJOR-REFACTORS.md records whose reviewer could name no single edit (8 from Phases 61/66, 8 from Phase 63, 10 from Phase 64), bringing all 144 blocks to a non-empty approach and the placeholder census to zero.**

## Performance

- **Duration:** ~4 min (commit timestamps 18:45:22Z -> 18:48:55Z, plus read/authoring time before the first commit)
- **Tasks:** 3
- **Files modified:** 2 (`MAJOR-REFACTORS.md`, `derive-review-docs.mjs`)
- **Commits:** 3

## Accomplishments

- **Task 1 — Phases 61 and 66 (8 records):** `P61-D5-001/002/003` (environment-dependency group: a java-interop peer answering on port 5008 with a loaded classpath is what's missing; a bare listener has already been tried under Phase 64 D-06 and does not fix them; the stated alternative is making the 11 `test/linking.test.ts` Interop-related cases skip explicitly rather than fail), `P61-D5-010`/`P66-D5-002` (`moot, already failing` — the completion-provider suite in `test/completion-test.test.ts` cannot be observed green today, so establishing a passing baseline for `MethodDecl.body` completion positions comes before this record's own defect is separable), `P61-D5-013` (both options — parallelize or raise `hookTimeout` — recorded with trade-offs, choice left to the implementer), `P61-D5-014` (its clause names an edit; lifted verbatim — see Decisions), `P66-D5-001` (documentation-or-enablement choice mirroring `P61-D5-003`'s own shape).
- **Task 2 — Phase 63 (8 records):** the five D7 cross-IDE parity records (`P63-D7-001/002/003/005/006`) each name which side is missing the capability (IntelliJ throughout), which shared surface the work would travel through (a new `bbj/compile` or `bbj/composer/setopts/*` LS command, the vendored `BBjCFCli.jar`'s missing bundling task, or an IDE-native action class with no shared path), and — where `dedup:` names a partially overlapping issue (`#65` for `P63-D7-002`/`006`, `#475` for `P63-D7-005`) — what this record adds beyond it. `P63-D2-010` names the shared re-decode-and-validate helper `ComposerLauncher.java`'s three apply paths need and the mismatch-UX decision an implementer needs first. `P63-D6-002` names `RU-64-02` as owner; `P63-D4-010` names `P66-D4-001` as the superseding record per its own `dedup:`.
- **Task 3 — Phase 64 (10 records):** `P64-D1-002`/`003` (EM token ARGV exposure, unverified vendored-JAR spawn) name concrete files and closing evidence without proposing to decompile or execute any vendored JAR. `P64-D2-005`/`006` and `P64-D3-002` name the CI/release workflow files and the design decisions each turns on; `P64-D3-002` additionally states that its paired `P64-D4-004` `on:`-block change already landed in Phase 67 (D-06 departure), so an implementer starts from that state. `P64-D4-003` names the six-workflow preamble-duplication decision and the drift axes it resolves. `P64-D5-001` names `run-tests.ts`'s tsconfig/lint-scope gap. `P64-D6-002` — the hardest, left unsoftened — states the provenance question that has to be answered before `BBjCodeFomatter.jar` becomes triageable at all, without substituting a version-pin edit for the record's own `FAIL` verdict. `P64-D6-003`/`005` name the manifest edited and the tool-native check that proves the result, with `P64-D6-005` referring the Gradle-tree decision to `RU-64-02` rather than pre-empting it.
- Fixed a blocking bug in `check()`'s 7c assertion (see Deviations) so the standing gate verifies each task's partial completion instead of only the fully-authored or fully-placeholder states.
- Final state: `grep -c '^proposed_approach:' MAJOR-REFACTORS.md` = 144; `grep -c PENDING-APPROACH` = 0; `node derive-review-docs.mjs check` exits 0 with every assertion group passing, including the field-drift re-derivation (no `classification:`, `severity:`, `effort:`, `dedup:` or `disposition:` value changed).

## Task Commits

1. **Task 1: The 8 approaches from Phases 61 and 66** - `c48a3a0` (docs) — includes the `check()` 7c subset-check fix, required for this task's own `<verify>` block to pass
2. **Task 2: The 8 approaches from Phase 63** - `55fba07` (docs)
3. **Task 3: The 10 approaches from Phase 64** - `47cb504` (docs)

**Plan metadata:** _pending — this commit_

## Files Created/Modified

- `.planning/reviews/MAJOR-REFACTORS.md` - all 26 `proposed_approach: PENDING-APPROACH` placeholders replaced with authored approach prose; no other field touched
- `.planning/phases/68-deliverable-documents/derive-review-docs.mjs` - `check()`'s 7c assertion changed from exact-equality to subset-of-the-26-ID-set, so the gate remains satisfiable at every stage of this plan's incremental authoring

## Decisions Made

See `key-decisions` in frontmatter:
1. `P61-D5-014`'s classification clause names a concrete edit (unlike its seven Task-1 siblings, whose test (5) reads FAIL/n/a/moot) — the named edit was lifted verbatim as the approach, and the clause-shape discrepancy is recorded here per the plan's own instruction rather than silently treated as one more no-named-edit case.
2. DEBT-07 (`P66-D2-003`) and DEBT-08 (`P66-D5-003`) remain `Pending` in `REQUIREMENTS.md`'s traceability matrix while being covered by findings flowing through this phase — flagged as an observation for Phase 66's close-out; nothing edited here.
3. Fixed `check()`'s 7c assertion bug (Rule 1/3 auto-fix, documented fully in Deviations below) — required for every task's own `<verify>` block, as written in the plan, to be satisfiable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1/3 - Blocking bug] `check()`'s proposed_approach placeholder assertion required exact equality with the full 26-ID set**
- **Found during:** Task 1, running `node derive-review-docs.mjs check` per the task's own `<verify>` block after authoring the first 8 approaches
- **Issue:** The 7c assertion (added in an earlier plan, before this plan's authoring work existed) compared the placeholder ID set to `EXPECTED_NO_NAMED_EDIT_IDS` with strict `JSON.stringify` equality. This can only ever pass in two states: before any approach is authored (all 26 present) or — never, since once all 26 are authored the set is empty and no longer equals a 26-element array either. Every one of this plan's three tasks calls `check` inside its own `<verify>` block expecting it to pass after a partial count (18, then 10, then 0), which the original assertion could never satisfy.
- **Fix:** Changed the assertion to a subset check: it now fails only if a placeholder ID appears that is *not* in the known 26 (a rogue or newly-introduced placeholder), and reports the current count as informational progress rather than requiring the full set. The guarantee the assertion existed to provide — no unexpected record loses its approach, no record outside the known 26 goes unauthored — is preserved; only the "must equal 26 forever" requirement, which contradicted the workflow this very plan performs, was removed.
- **Files modified:** `.planning/phases/68-deliverable-documents/derive-review-docs.mjs`
- **Commit:** `c48a3a0`

None of Task 2's or Task 3's `<verify>` blocks required further changes to `derive-review-docs.mjs`; the subset-check fix from Task 1 covered both.

## Issues Encountered

None beyond the `check()` bug above, which was auto-fixed under Rule 3 (blocking issue) since it prevented every task's own `<verify>` block, as written in the plan, from passing.

## User Setup Required

None - no external service configuration required.

## Verification

- `node derive-review-docs.mjs check` exits 0 from `.planning/phases/68-deliverable-documents/` — all assertion groups PASS, including the field-drift re-derivation of `classification:`, `severity:`, `effort:`, `dedup:` and `disposition:` (none changed).
- `git diff --stat .planning/reviews/` (against the pre-plan baseline) shows only `MAJOR-REFACTORS.md` changed across the whole plan — confirmed after each task's commit.
- `git status --porcelain` shows no modification to any COVERAGE file, `INVENTORY.md`, `REQUIREMENTS.md`, or any `bbj-vscode/`/`bbj-intellij/`/`java-interop/` source file (the only unrelated pending change in the working tree, `.planning/config.json`'s `_auto_chain_active` flag, predates this plan and was left untouched).
- `grep -c '^proposed_approach:' MAJOR-REFACTORS.md` = `144`; `grep -cE '^proposed_approach: *$'` = `0`; `grep -c PENDING-APPROACH` = `0`.

## Next Phase Readiness

All 144 major findings now carry an actionable `proposed_approach`, closing DOC-02. `MAJOR-REFACTORS.md` is ready for the remaining `<phase_conventions>` sections (`## Close-out`) in later 68-0N plans and for Phase 69's issue-filing pass under ISSUE-02 — every `failure_scenario:`/`proposed_approach:` pair now stands alone without requiring a reader to open a COVERAGE file, including the 26 records this plan authored, which say plainly where the real work is an environment dependency, an open investigation, a choice between named options, or another unit's ownership rather than inventing a single edit the original reviewer could not name.

---
*Phase: 68-deliverable-documents*
*Completed: 2026-08-19*

## Self-Check: PASSED

- FOUND: `.planning/reviews/MAJOR-REFACTORS.md`
- FOUND: `.planning/phases/68-deliverable-documents/derive-review-docs.mjs`
- FOUND: `.planning/phases/68-deliverable-documents/68-05-SUMMARY.md`
- FOUND commit `c48a3a0` (Task 1)
- FOUND commit `55fba07` (Task 2)
- FOUND commit `47cb504` (Task 3)
