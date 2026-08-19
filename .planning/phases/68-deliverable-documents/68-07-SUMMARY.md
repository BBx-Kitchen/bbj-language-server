---
phase: 68-deliverable-documents
plan: 07
subsystem: docs
tags: [markdown, review-findings, doc-close-out, requirements-discharge, standing-gate]

# Dependency graph
requires:
  - phase: 68-deliverable-documents
    provides: "68-06's fully-resolved 30 cross-unit referrals and the fully-authored 144 proposed_approach values, over the corpus every prior 68-0N plan assembled"
provides:
  - "EASY-FIXES.md `## Close-out`: the FIX-04 discharge statement (29/77 user_facing rows, Phase 67 named as the deferring phase), a 4-entry Discrepancy Register, and the Write-boundary check"
  - "MAJOR-REFACTORS.md `## Close-out`: the Phase 69 handoff (field-by-field for ISSUE-02/03/04/05, FUT-04 out-of-scope statement), the regeneration hazard (naming --force and what must be preserved first), a 6-entry Discrepancy Register (the shared 4 plus 2 document-specific), and the Write-boundary check"
  - "derive-review-docs.mjs check(): the placeholder census is now a hard gate (any family, either document, names the marker/document/enclosing block); a DOC-completeness assertion group (one assertion per DOC-01..DOC-04, each re-deriving from the corpus and naming its satisfying section); a read-only D-12 write-boundary assertion (git status --porcelain, deliberately 'at most 2, allowed pair only' so the gate survives past phase close)"
affects: [69-github-issue-filing]

# Actuals (#2632)
actuals:
  tokens: 7482
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "The honesty-pattern close-out, applied a third time this phase: FIX-04's discharge names the requirement, the phase that deferred it, and the rows that now carry it, rather than restating the requirement as if it had always been true (Phase 66 D-02 / Phase 67 D-07/D-14 precedent)."
    - "'At most N, allowed set only' beats 'exactly N forever' for a standing gate that has a phase-close moment baked into its acceptance criteria: the D-12 write-boundary assertion is designed to pass both while this phase's own edits are still uncommitted (2 dirty entries) and permanently afterward (0 dirty entries) — the same class of fix plan 68-05 applied to the placeholder-subset check."

key-files:
  created: []
  modified:
    - .planning/reviews/EASY-FIXES.md
    - .planning/reviews/MAJOR-REFACTORS.md
    - .planning/phases/68-deliverable-documents/derive-review-docs.mjs

key-decisions:
  - "The write-boundary assertion added to check() is 'fail only if more than 2 entries appear under .planning/reviews/, or any entry names a path outside {EASY-FIXES.md, MAJOR-REFACTORS.md}, or a protected path shows a modification' — not the plan action text's literal 'fails if the output is anything other than exactly two entries'. A permanent exactly-2 requirement would make check() fail forever the instant this phase's own commits land, since git status then reports zero dirty entries. The weaker 'at most 2, allowed pair only' preserves the identical guarantee (T-68-01: nothing outside the two files was ever touched) while remaining usable as a standing gate after phase close, matching D-12's own text ('at phase close' — one moment, not a permanent property) and plan 68-05's precedent for the same class of bug in the same script."
  - "The Write-boundary check prose in both documents' Close-out sections could not literally spell out the three forbidden gh issue subcommands (create/edit/comment) — doing so made the sentence itself match Task 3's own grep-for-zero-tracker-writes verify command, since the sentence describing their absence contains the very strings being searched for. Reworded to describe the three subcommands by name (create, edit, comment) without the `gh issue <verb>` string shape, breaking the self-match while keeping the same claim checkable by the grep."

requirements-completed: [DOC-01, DOC-02, DOC-03, DOC-04]

coverage:
  - id: D1
    description: "EASY-FIXES.md's Close-out discharges FIX-04 by name, states which phase deferred it (Phase 67), and states the 29 user_facing:yes rows / 48 internal-only rows split that carries it, without editing REQUIREMENTS.md"
    requirement: "DOC-01"
    verification:
      - kind: other
        ref: "grep -q '^## Close-out'/'^### FIX-04 verdict' EASY-FIXES.md, grep -Fq 'P61-D4-010'/'29' EASY-FIXES.md, git diff --quiet .planning/REQUIREMENTS.md, node derive-review-docs.mjs check"
        status: pass
    human_judgment: false
  - id: D2
    description: "MAJOR-REFACTORS.md's Close-out names, field by field, what ISSUE-02/03/04/05 each read or write from this document, states FUT-04's 144-refactor out-of-scope statement, names the --force override flag and what must be preserved before using it, and carries the Discrepancy Register plus the 5 open-gap referrals by source anchor"
    requirement: "DOC-02"
    verification:
      - kind: other
        ref: "grep -q '^## Close-out'/'^### Phase 69 handoff'/'^### Regeneration hazard' MAJOR-REFACTORS.md, grep -Fq ISSUE-02/03/04/05/FUT-04/--force MAJOR-REFACTORS.md, node derive-review-docs.mjs check"
        status: pass
    human_judgment: false
  - id: D3
    description: "check()'s placeholder census is a hard gate (any non-zero count in either document fails the run and names the marker/document/enclosing block), verified by a live insert-then-revert round trip"
    requirement: "DOC-03"
    verification:
      - kind: other
        ref: "manual round trip: inserted PENDING-APPROACH into EASY-FIXES.md, check exited 1 and printed 'EASY-FIXES.md line 1645: marker \"PENDING-APPROACH\" in block \"P66-D2-001\"'; reverted, check returned to exit 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "A DOC-completeness assertion group (one assertion per DOC-01..DOC-04, each naming its satisfying section) and a read-only D-12 write-boundary assertion were added to check(), and the phase's final verification (check, git status --porcelain .planning/reviews/ = 2 lines, git diff --quiet over INVENTORY.md/six COVERAGE files/REQUIREMENTS.md, git status --porcelain over the five source dirs = empty, zero-result tracker grep) was run and its output recorded in both documents' Write-boundary check sub-sections"
    requirement: "DOC-04"
    verification:
      - kind: other
        ref: "node derive-review-docs.mjs check (exit 0, includes 'PASS: DOC-01' through 'PASS: DOC-04' and 'PASS: write-boundary (D-12)'); full Task 3 <verify> chain (check=0 status2=0 diffquiet=0 sourcedirs=0 tracker=0)"
        status: pass
    human_judgment: false

# Metrics
duration: ~12min
completed: 2026-08-19
status: complete
---

# Phase 68 Plan 07: Close-out — FIX-04 Discharged, Phase 69 Handoff, Placeholder Census Hardened Summary

**Both deliverable documents close out honestly (FIX-04 discharged by name, Phase 69's field-by-field handoff and regeneration hazard stated, a 6-entry Discrepancy Register carried), and `check()`'s placeholder census is promoted from an informational count to a hard gate alongside a new DOC-completeness assertion group and a read-only D-12 write-boundary check.**

## Performance

- **Duration:** ~12 min (commit timestamps 19:10:35Z → 19:16:23Z for the three task commits, plus read/context-gathering time before the first)
- **Tasks:** 3
- **Files modified:** 3 (`EASY-FIXES.md`, `MAJOR-REFACTORS.md`, `derive-review-docs.mjs`)
- **Commits:** 3

## Accomplishments

- **Task 1 — EASY-FIXES.md `## Close-out`:** the FIX-04 verdict states the requirement became true here — quoting FIX-04's exact wording once, naming Phase 67 as the phase that deferred it (its own `67-APPLY-SET.md` §"FIX-04 verdict" recorded the document as absent and stated it "becomes true when Phase 68 assembles the document"), and naming the `29`/`77` `user_facing: yes` split that discharges it, with the remaining `48` rows named as internal-only edits. No `REQUIREMENTS.md` edit. The Discrepancy Register carries 4 departures with both the claimed and derived value each: the `68-CONTEXT.md` D-02 `effort: 1` annotation claim (neither `P61-D4-010` nor `P61-D8-005` carries the claimed in-record annotation), the `67-CONTEXT.md` per-phase finding-count claim (73/34/65/45/37/18 claimed vs. 73/34/62/44/3/8 derived `disposition:` record counts), plan `68-05`'s `P61-D5-014` classification-clause shape discrepancy, and plan `68-06`'s SETOPTS-referral `dedup:` field discrepancy (`#475` named, `P63-D7-005` the confirmed same-subject match).
- **Task 2 — MAJOR-REFACTORS.md `## Close-out`:** the Phase 69 handoff names, field by field, what ISSUE-02 (`failure_scenario:`/`proposed_approach:`/`location:`), ISSUE-03 (`proposed_labels:`, area/PRIO/effort provenance), ISSUE-04 (`dedup:`, 210 `none` / 14 named) and ISSUE-05 (the empty `issue:` slot) each read or write, points Phase 69 at the severity-sorted index as its filing order, and states plainly that the 144 proposed refactors are `FUT-04` — out of this milestone's scope. The regeneration hazard names `--force` as the override flag and states that a maintainer must preserve every filed `issue:` value before using it, since `runEmit`'s `--write` path always emits an empty `issue:` field with no merge-back step. The Discrepancy Register carries the shared 4 plus 2 document-specific: the `68-CONTEXT.md` D-09 appended-field-count discrepancy (four claimed, `effort:` already in INVENTORY's frozen 13-field order so only three — `proposed_approach:`, `proposed_labels:`, `issue:` — are genuinely appended, confirmed against the live record blocks), and the 5 open-gap referrals from plan `68-06`'s census, each by source anchor (`64-COVERAGE.md:881`, `:1747`, `:3365`, `:3372`, `:3378`).
- **Task 3 — placeholder census hardened, DOC-completeness group added, final verification run:** `placeholderCensus`'s zero-count moved from an `INFO:` line to a hard `FAIL`/`PASS` gate; a new `placeholderOccurrences` helper names each stray marker's line number and nearest enclosing `id:`/`finding_id:` block on failure. Verified live: inserted `PENDING-APPROACH` into a `fix_applied:` field, `check` exited `1` and printed `EASY-FIXES.md line 1645: marker "PENDING-APPROACH" in block "P66-D2-001"`; reverted, `check` returned to exit `0`. Added a DOC-completeness group re-deriving DOC-01 (77 easy rows' 6 required non-empty fields), DOC-02 (144 major blocks' 7 required non-empty fields), DOC-03 (`## Coverage` byte-identity + `### Scope`/`### Gaps`) and DOC-04 (`## Other Dispositions`'s 3+24+0+14 populations and 30 referrals) independently of the existing detailed groups, each naming its satisfying section. Added a read-only `checkWriteBoundary()` (`git status --porcelain .planning/reviews/` plus the five source dirs and three protected planning paths) as the phase's D-12 write-boundary assertion — verified live: appended a blank line to `INVENTORY.md`, `check` exited `1` and named the unexpected modification; reverted, `check` returned to exit `0`. Recorded the final `check` output, the final `git status --porcelain .planning/reviews/` (2 lines, both documents), and the zero-result tracker grep in both documents' `### Write-boundary check` sub-sections. Confirmed no `gh issue create`/`edit`/`comment` invocation exists anywhere in the phase directory's script, SUMMARY files, or either document (the sole hit anywhere in the phase directory is `68-07-PLAN.md`'s own authored prohibition naming those three strings).
- Final state: `node derive-review-docs.mjs check` exits `0` — every assertion group PASSes, including the two new hard gates, with `write-boundary (D-12)` reporting `0 entries currently dirty` after this plan's own commits landed (confirming the "at most 2" design choice keeps the gate usable past phase close rather than permanently broken).

## Task Commits

1. **Task 1: EASY-FIXES.md close-out — FIX-04 discharged and said so** - `143fcfa` (docs)
2. **Task 2: MAJOR-REFACTORS.md close-out — the Phase 69 handoff and the regeneration hazard** - `60e9110` (docs)
3. **Task 3: Placeholder census promoted to a hard gate and the phase's final verification run** - `5630168` (docs)

**Plan metadata:** _pending — this commit_

## Files Created/Modified

- `.planning/reviews/EASY-FIXES.md` - added `## Close-out` (FIX-04 verdict, 4-entry Discrepancy Register, Write-boundary check); no record row, index, or Reconciliation content touched
- `.planning/reviews/MAJOR-REFACTORS.md` - added `## Close-out` (Phase 69 handoff, regeneration hazard, 6-entry Discrepancy Register, Write-boundary check); no record row, index, `## Other Dispositions`, or Reconciliation content touched
- `.planning/phases/68-deliverable-documents/derive-review-docs.mjs` - `placeholderCensus` promoted to a hard gate with `nearestPrecedingId`/`placeholderOccurrences` helpers naming the offending marker/document/block; added a DOC-completeness assertion group (DOC-01..DOC-04); added `REPO_ROOT` and `checkWriteBoundary()` for a read-only D-12 write-boundary assertion

## Decisions Made

See `key-decisions` in frontmatter:
1. The write-boundary assertion implements "at most 2, allowed pair only" rather than the plan action text's literal "exactly 2 forever" — a permanent exactly-2 requirement would make `check()` fail the instant this phase's own commits land (git status then reports 0 dirty entries), the same class of bug plan 68-05 fixed in the placeholder-subset assertion. The identical guarantee (nothing outside the two files was ever touched) holds under the weaker form.
2. The Write-boundary check prose was reworded to avoid literally spelling `gh issue create`/`edit`/`comment` — the sentence asserting their absence otherwise matches its own grep-for-zero-tracker-writes check, a self-reference bug caught and fixed during Task 3's own verification.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Write-boundary assertion would permanently break `check()` after this phase's own commits landed**
- **Found during:** Task 3, while designing the `check()` write-boundary assertion the plan's action text specifies
- **Issue:** The plan's action text reads "fails if the output is anything other than exactly two entries naming EASY-FIXES.md and MAJOR-REFACTORS.md." Implemented literally, `check()` would pass only in the narrow window while this phase's own edits are uncommitted, and fail forever afterward — the moment Task 3 commits, `git status --porcelain .planning/reviews/` reports 0 entries, not 2, and the standing gate would report a false FAIL on every future invocation (including Phase 69's own use of `check` before ISSUE-05).
- **Fix:** Implemented the assertion as "at most 2 entries under `.planning/reviews/`, and every entry present names either `EASY-FIXES.md` or `MAJOR-REFACTORS.md`" plus the unconditional protected-path check (five source dirs, INVENTORY.md, six COVERAGE files, REQUIREMENTS.md). This satisfies Task 3's own `<verify>` (exactly 2 entries at that specific moment, which is `<=2` and `allowed-only`) and preserves the T-68-01 guarantee permanently rather than only transiently.
- **Files modified:** `.planning/phases/68-deliverable-documents/derive-review-docs.mjs`
- **Verification:** `node derive-review-docs.mjs check` exits `0` both mid-Task-3 (2 dirty entries) and after this plan's commits landed (0 dirty entries); a live round trip (dirtying `INVENTORY.md`, then reverting) confirmed the assertion still fires on any out-of-boundary modification.
- **Commit:** `5630168`

**2. [Rule 1 - Bug] Write-boundary check prose self-matched its own zero-tracker-write grep**
- **Found during:** Task 3, running the full `<verify>` chain including `grep -rc 'gh issue create' EASY-FIXES.md MAJOR-REFACTORS.md`
- **Issue:** The first draft of both documents' `### Write-boundary check` sub-sections stated, in prose, that `gh issue create`, `gh issue edit` and `gh issue comment` "appear nowhere in this document" — but writing that sentence made the literal string `gh issue create` appear in the document, so the grep count came back `1`, not `0`, and the plan's own zero-tracker-write acceptance criterion failed against the very sentence asserting it was met.
- **Fix:** Reworded both sub-sections to name the three forbidden subcommands (create, edit, comment) without reproducing the `gh issue <verb>` string shape, keeping the same claim checkable by the grep without matching it.
- **Files modified:** `.planning/reviews/EASY-FIXES.md`, `.planning/reviews/MAJOR-REFACTORS.md`
- **Verification:** `grep -rc 'gh issue create' .planning/reviews/EASY-FIXES.md .planning/reviews/MAJOR-REFACTORS.md` reports `0` for both after the reword.
- **Commit:** `5630168`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs discovered while building and testing Task 3's own additions against the live documents and corpus, before that task's commit; neither required an architectural decision or user input)
**Impact on plan:** No scope creep. Both fixes were necessary for the write-boundary assertion and the tracker-write claim to actually hold rather than silently reading as satisfied by construction.

## Issues Encountered

- **Local environment quirk, not a code defect:** in this shell session, `grep` is a wrapped function (backed by `ugrep`) that treats a bare `--force` token as an option rather than a literal search pattern when passed without a `--` separator — `for s in ... --force; do grep -Fq "$s" file; done` fails with "invalid option --force" here, even though the string is genuinely present in the file (confirmed via `grep -F -- "--force" file`, which returns it). This affected only my own manual confirmation of Task 2's acceptance criteria (the loop form in the plan's `<verify>` block), not the documents or the script; every criterion was independently confirmed present. No file was changed to work around this — it is the same class of local-shell-tooling quirk already tracked in this project's environment notes (BBj LS test environment quirks memory), extended here to cover `grep`/`ugrep` option-parsing of `--`-prefixed literal patterns.

## User Setup Required

None - no external service configuration required.

## Verification

- `node derive-review-docs.mjs check` exits `0` from `.planning/phases/68-deliverable-documents/` — every assertion group PASSes, including the two new hard gates (placeholder census, D-12 write-boundary) and the new DOC-completeness group (DOC-01 through DOC-04, each naming its satisfying section).
- `git status --porcelain .planning/reviews/` showed exactly 2 lines (`EASY-FIXES.md`, `MAJOR-REFACTORS.md`) at the moment Task 3's own `<verify>` ran, immediately before this plan's final commit; 0 lines afterward, confirming the write-boundary assertion holds in both states.
- `git diff --quiet` over `INVENTORY.md`, all six `6N-COVERAGE.md` files and `REQUIREMENTS.md` exits `0` — untouched throughout the plan.
- `git status --porcelain bbj-vscode bbj-intellij java-interop documentation examples` is empty — no source-tree write anywhere in this plan.
- `grep -rc 'gh issue create' .planning/reviews/EASY-FIXES.md .planning/reviews/MAJOR-REFACTORS.md` reports `0` for both; the only occurrence of the three forbidden `gh issue` subcommand strings anywhere in the phase directory is `68-07-PLAN.md`'s own authored prohibition naming them.
- Live round-trip verification (not merely asserted): a placeholder insert-then-revert into `EASY-FIXES.md` and an out-of-boundary `INVENTORY.md` edit-then-revert both drove `check` to exit `1` with a message naming the specific problem, then back to exit `0` once reverted.

## Next Phase Readiness

Both deliverable documents are complete and closed out: `EASY-FIXES.md` discharges FIX-04 by name, and `MAJOR-REFACTORS.md` carries the Phase 69 handoff naming exactly which field each of ISSUE-02/03/04/05 reads or writes, the regeneration hazard and its `--force` guard, and the full Discrepancy Register. All four of this phase's requirements — DOC-01 through DOC-04 — are met, each provable by a named `check()` assertion rather than only by prose. `derive-review-docs.mjs check` is a durable standing gate: it passes now (0 dirty entries) and will continue to correctly gate any future hand-edit (the placeholder census and write-boundary assertion are both hard failures, not informational counts). Phase 69 can proceed directly to filing: `## Index (severity-sorted, for Phase 69 filing order)` is its filing order, `proposed_labels:`/`dedup:`/`failure_scenario:`/`proposed_approach:` are its per-issue content, and the empty `issue:` slot on each of the 144 blocks is where ISSUE-05 writes back — but Phase 69 must snapshot the current `issue:` values (all empty, so this is a no-op today) before ever passing `--force` to `derive-review-docs.mjs` in the future, per the regeneration hazard this plan documents.

---
*Phase: 68-deliverable-documents*
*Completed: 2026-08-19*

## Self-Check: PASSED

- FOUND: `.planning/phases/68-deliverable-documents/68-07-SUMMARY.md`
- FOUND: `143fcfa` (Task 1 commit)
- FOUND: `60e9110` (Task 2 commit)
- FOUND: `5630168` (Task 3 commit)
- FOUND: `da74635` (this summary's own commit)
