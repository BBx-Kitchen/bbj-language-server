---
phase: 68-deliverable-documents
plan: 03
subsystem: docs
tags: [node, esm, markdown, derivation-script, review-findings, doc-04]

# Dependency graph
requires:
  - phase: 68-deliverable-documents
    provides: "68-02's complete EASY-FIXES.md/MAJOR-REFACTORS.md content and the derive-review-docs.mjs script's emit-easy/emit-major/check apparatus, plus its judgment-field scaffolding"
provides:
  - "MAJOR-REFACTORS.md's ## Other Dispositions section — DOC-04's whole 71-item population: the Category reconciliation table (3 wontfix + 24 not-reproducible + 0 duplicate + 14 already-covered, mapped against the corpus's three disposition: values), the 3 wontfix entries (verbatim), the 24 not-reproducible entries (grouped by phase, Phase 65/66 zeros explained), the stated-zero duplicate category with its RVW-07 reason, the 14 already-covered entries, and the 30 cross-unit referrals (grouped by phase, each with a source line anchor and an unfilled resolution: slot)"
  - "EASY-FIXES.md's D-06 pointer extended to state the section's population (3+24+0+14+30)"
  - "derive-review-docs.mjs's emit-other subcommand and extractProseSubBlocks (a line-walking extractor handling both Phase 64's numbered markers and Phases 61-63's dash markers)"
  - "check()'s DOC-04 assertion group (7 assertions): wontfix/already-covered ID-set equality, not-reproducible/referral count re-derivation, the duplicate heading's stated count, the referral resolution: key count, the category-reconciliation table's live-derived counts, and the EASY-FIXES.md no-second-copy check — each names the missing finding ID on failure rather than reporting a bare count mismatch"
affects: [68-04, 68-05, 68-06, 68-07, 69-github-issue-filing]

# Actuals (#2632)
actuals:
  tokens: 23789
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Line-walking prose-sub-block extraction with mode-tracking: a heading line opens a named mode (not-reproducible / referral), any other heading line at any level closes it, and both numbered (`\\d+.`) and dash/asterisk (`-`/`*`) list markers are matched by one regex — proven against the live corpus to produce the exact expected per-phase splits (61=11/12, 62=4/7, 63=2/1, 64=7/10, 65=0/0, 66=0/0) with zero manual tuning after the first correct implementation"
    - "Line-anchored heading search over indexOf: a document section whose own prose cites its heading name in backticks (e.g. the Reconciliation section's own \"`## Other Dispositions` section\" citation) makes a bare `indexOf` find the citation instead of the real heading — fixed by matching `/^heading$/m` and reading `.index`"
    - "Two-step subsection extraction over a combined regex with a `(?=\\n##|$)` lookahead: under the `m` flag `$` matches end-of-*line*, not end-of-string, so a lazy capture stops dead at the section's own first blank line — fixed by finding the heading's start with a small anchored regex, then locating the next `\\n##` in plain text from there"
    - "Set-comparison-with-named-IDs over bare-count assertions in check(): every DOC-04 hand-edit-detection check reports which finding ID is missing/extra, not just a wrong total, so a deleted item is traceable without re-deriving the corpus by hand (Task 3 requirement, T-68-11)"

key-files:
  created: []
  modified:
    - .planning/phases/68-deliverable-documents/derive-review-docs.mjs
    - .planning/reviews/MAJOR-REFACTORS.md
    - .planning/reviews/EASY-FIXES.md

key-decisions:
  - "Rendered all six Other Dispositions sub-sections (wontfix, not-reproducible, duplicate, already-covered, referrals) as plain prose/markdown with no triple-backtick fences — the corpus's own record-extraction regex (extractFencedBlocks) is blind to content and would pick up any fenced block as if it were a 144-count major record or a 77-count easy-fix row the moment it saw a fence, corrupting every count-based check() assertion. This was not stated explicitly in the plan text but follows directly from the existing extraction mechanism plan 68-01/68-02 already proved; verified by confirming majorBlocks.length stayed exactly 144 and easyBlocks.length stayed exactly 77 after the section was added."
  - "Split the three tasks' script code across commits following 68-02's own precedent (documented in its SUMMARY's 'Note on commit boundaries'): the extraction/rendering code for Tasks 1 and 2 was written as one coherent pass (extractProseSubBlocks pulls both not-reproducible and referral items in a single line-walk, so splitting it cleanly per task would mean parsing the same file twice for no benefit) and landed with Task 1's commit; MAJOR-REFACTORS.md was then regenerated twice — once with the referrals sub-section absent for Task 1's own scope, then again with it restored for Task 2 — so each document commit's diff matches its task's own stated files/verify boundary even though the script diff does not split that finely. Task 3's check() DOC-04 assertion group and its three helper functions (extractSubsection/extractEntryLeadIds/countNumberedItems) are a genuinely separate script commit, since check() could not validate the referrals sub-section until it existed in the document (landing it earlier would have failed Task 1's own <verify> call to check())."
  - "Rendered the not-reproducible and referral entries as one continuously-numbered list (1-24, 1-30) with bold per-phase group headers, rather than restarting numbering at 1 for each phase — matches the acceptance criteria's own phrasing ('exactly 24 numbered entries') and gives check()'s countNumberedItems a single, unambiguous total to re-derive against."

requirements-completed: [DOC-04]

coverage:
  - id: D1
    description: "MAJOR-REFACTORS.md's ## Other Dispositions holds DOC-04's whole 71-item population (3 wontfix + 24 not-reproducible + 0 duplicate + 14 already-covered + 30 referrals) in one place, reconciled against the corpus's actual three-value disposition: field in a stated table including the genuinely-zero duplicate category"
    requirement: "DOC-04"
    verification:
      - kind: other
        ref: "node derive-review-docs.mjs check (exit 0, 25 assertion groups incl. the 7-assertion DOC-04 group); grep -c '^## Other Dispositions' MAJOR-REFACTORS.md == 1; grep -c '^## Other Dispositions' EASY-FIXES.md == 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "All 30 cross-unit referrals transcribed verbatim with a source phase/line anchor and an unfilled resolution: slot each (no resolution guessed) — Phase 65's four Cross-references blocks and Phase 66's absent block both stated as explained zeros"
    requirement: "DOC-04"
    verification:
      - kind: other
        ref: "grep -c '^resolution:' MAJOR-REFACTORS.md == 30; grep -c 'PENDING-RESOLUTION' MAJOR-REFACTORS.md == 30; node derive-review-docs.mjs check's DOC-04 referrals assertion, PASS"
        status: pass
    human_judgment: false
  - id: D3
    description: "check()'s standing gate re-derives DOC-04's population from the live corpus at every run and fails loudly, naming the missing finding ID, if a hand edit shrinks any category"
    requirement: "DOC-04"
    verification:
      - kind: other
        ref: "Live sanity test: deleting one resolution: line makes check() report '29 !== expected 30' and exit 1; deleting one already-covered entry (P66-D4-001) makes check() report the missing ID by name and exit 1; both restored and check() returns to exit 0 with output identical to before the deletion"
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-08-19
status: complete
---

# Phase 68 Plan 03: Other Dispositions (DOC-04) Summary

**MAJOR-REFACTORS.md's `## Other Dispositions` section now carries DOC-04's whole 71-item population — 3 wontfix + 24 not-reproducible + 0 duplicate + 14 already-covered + 30 cross-unit referrals — extracted mechanically from the six COVERAGE files' own disposition field and prose sub-blocks by a new `extractProseSubBlocks` line-walker, with a 7-assertion standing `check()` gate that names the missing finding ID if a hand edit ever shrinks the count.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3
- **Files modified:** 3 (1 script, 2 generated documents — EASY-FIXES.md's change is a single pointer-line extension)

## Accomplishments

- `extractProseSubBlocks` walks a COVERAGE file line by line, opening a not-reproducible or referral "mode" on the matching heading and closing it on any other heading, matching both Phase 64's numbered (`\d+.`) markers and Phases 61-63's dash (`-`) markers with one regex — verified against the live corpus to produce the exact expected per-phase splits (not-reproducible 61=11/62=4/63=2/64=7/65=0/66=0=24; referrals 61=12/62=7/63=1/64=10/65=0/66=0=30) with no tuning needed after the first correct pass
- `## Other Dispositions` rendered into `MAJOR-REFACTORS.md` with six sub-sections: `### Category reconciliation` (the table mapping DOC-04's four names onto the corpus's actual three `disposition:` values plus the two prose-sub-block categories, with counts 3/24/0/14), `### wontfix` (3 entries, `P64-D6-012`'s own "documented in Phase 68's output" wording carried verbatim), `### not-reproducible` (24 entries, continuously numbered, grouped by phase with Phase 65's "None" and Phase 66's absent block each stated as an explained zero), `### duplicate` (the stated zero with the RVW-07 reason), `### already-covered` (14 entries naming each finding's own disposition and its `dedup:` text verbatim, with the 11/2/1 major/easy/wontfix split stated), and `### Cross-unit referrals and their resolution` (30 entries, continuously numbered, each with a `[from PP-COVERAGE.md:LINE]` source anchor and a `resolution:        PENDING-RESOLUTION` slot for plan `68-06`)
- `EASY-FIXES.md`'s existing D-06 pointer extended to state the section's full population inline (`3 wontfix + 24 not-reproducible + 0 duplicate + 14 already-covered + 30 cross-unit referrals = 71 items`) rather than naming only the section
- `check()` extended with a 7-assertion DOC-04 group that re-derives every count from the live corpus at check time: wontfix and already-covered are compared as ID sets (missing/extra IDs named on failure, not a bare count); not-reproducible and referral counts are re-derived via a fresh `extractProseSubBlocks` pass; the duplicate heading and its stated `0` are asserted present; the category-reconciliation table's four cells are parsed and compared against the live 3/24/0/14; and EASY-FIXES.md is checked for the pointer phrase with no second `## Other Dispositions` heading of its own
- `check()`'s placeholder census already reported `PENDING-APPROACH` and `PENDING-RESOLUTION` as separate per-marker counts (26 and 30 respectively) with no code change needed — the existing per-marker `PLACEHOLDER_MARKERS` loop from plan 68-01/68-02 already satisfied Task 3's stated requirement

## Task Commits

Each task was committed atomically:

1. **Task 1: Category reconciliation, the 3 wontfix, the 24 not-reproducible, the 14 already-covered, and the stated zero** - `35f09c7` (docs)
2. **Task 2: The 30 cross-unit referrals transcribed with resolution slots** - `f656152` (docs)
3. **Task 3: DOC-04 population gates added to the standing check** - `63411a2` (docs)

_Note on commit boundaries: following 68-02's own documented precedent, `derive-review-docs.mjs`'s Task 1 + Task 2 code (`extractProseSubBlocks`, `loadProseSubBlocks`, `assertProseSubBlockCounts`, all six section-render functions, `emit-other`, `composeMajorWithOtherDispositions`) was written as one coherent pass — the extractor pulls both the not-reproducible and referral items from the same line-walk over each COVERAGE file, so there is no clean seam to split it across two commits without parsing the corpus twice. That combined code landed in commit 1 alongside `EASY-FIXES.md`'s pointer update, and `MAJOR-REFACTORS.md` was regenerated twice — once with the `### Cross-unit referrals and their resolution` sub-section absent (Task 1's own `<files>`/`<verify>` scope), then again with it restored (Task 2's scope) — so each `MAJOR-REFACTORS.md` commit's diff matches its task's own stated boundary even though the script diff does not split that finely. Task 3's `check()` DOC-04 assertion group and its three helper functions are a genuinely distinct, separately-committed script change: they could not land any earlier, because `check()` cannot validate the referrals sub-section's presence/count until that sub-section exists in the document, and landing the assertion group before Task 2's commit would have made Task 1's own `<verify>` (which ends by calling `check()`) fail on a section that task hadn't written yet._

## Files Modified

- `.planning/phases/68-deliverable-documents/derive-review-docs.mjs` — `extractProseSubBlocks`/`loadProseSubBlocks`/`assertProseSubBlockCounts` (the prose-sub-block extraction and its hard-fail gate), `alreadyCoveredRecords`, six `render*Section` functions plus `renderOtherDispositions`, `composeMajorWithOtherDispositions`, the `emit-other` subcommand and its `runEmitOther` handler, and `check()`'s 7-assertion DOC-04 group with its three helper functions
- `.planning/reviews/MAJOR-REFACTORS.md` — `## Other Dispositions` section appended (six sub-sections, 220 lines)
- `.planning/reviews/EASY-FIXES.md` — one line extended (the D-06 pointer now states the section's population)

## Decisions Made

See `key-decisions` in frontmatter for the four substantive ones. In short: rendered every Other Dispositions entry as plain prose (no fences) so the existing 144/77-count assertions in `check()` could not be corrupted by an incidental fence; followed 68-02's own precedent for splitting one coherent script pass across per-task document commits rather than parsing the corpus twice to force a cleaner script-level split; and numbered the not-reproducible/referral lists continuously (not restarting per phase) to match the acceptance criteria's own "24 numbered entries" phrasing and give `check()` one unambiguous total to re-derive.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - bug in `extractSubsection`'s heading search] Line-anchored heading match instead of a bare `indexOf`**
- **Found during:** Task 3, while first running `check()`'s new DOC-04 group
- **Issue:** The Reconciliation section's own prose cites the target section by name in backticks (`this document's \`## Other Dispositions\` section`), which appears earlier in the file than the real heading. A bare `majorText.indexOf('## Other Dispositions')` matched that citation instead of the actual heading line, making every DOC-04 sub-section extraction start from the wrong offset and report every category as empty.
- **Fix:** Replaced the bare `indexOf` with a line-anchored `/^## Other Dispositions$/m` match, using its `.index`.
- **Files modified:** `.planning/phases/68-deliverable-documents/derive-review-docs.mjs`
- **Verification:** `check()`'s DOC-04 group went from reporting all 6 sub-assertions FAIL (0 found for every category) to all 7 PASS; re-ran the full `check()` and the sanity-deletion tests afterward to confirm.
- **Committed in:** `63411a2`

**2. [Rule 1 - bug in `extractSubsection`'s end-of-section boundary] Two-step plain-text search instead of a `$`-in-lookahead regex**
- **Found during:** Task 3, immediately after fixing deviation 1, when every sub-section still extracted as empty
- **Issue:** `extractSubsection`'s original single regex used `(?=\n##|$)` as a non-consuming end boundary with the `m` (multiline) flag active on the whole pattern. Under `m`, `$` matches end-of-*line*, not end-of-string — so the lazy `[\s\S]*?` capture stopped at the section's own first blank line (every rendered sub-section opens with a blank line after its heading), returning an empty string for every extraction regardless of content.
- **Fix:** Rewrote `extractSubsection` as two steps: find the heading's own start with a small anchored regex, then search the remaining plain text for the next literal `\n##` substring (or end of string if none), avoiding the `$`-under-`m` ambiguity entirely.
- **Files modified:** `.planning/phases/68-deliverable-documents/derive-review-docs.mjs`
- **Verification:** Isolated node-e reproduction confirmed the exact failure mode before the fix and its absence after; `check()`'s DOC-04 group then passed all 7 assertions against the real document.
- **Files modified:** `.planning/phases/68-deliverable-documents/derive-review-docs.mjs`
- **Committed in:** `63411a2`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs discovered and fixed while building and testing Task 3's own `check()` extension against the live document, before that task's commit; neither required an architectural decision or user input)
**Impact on plan:** No scope creep. Both fixes were necessary for `check()`'s DOC-04 group to actually validate anything rather than silently reporting every category as empty — a defect that would have made the standing gate report false negatives (every hand-edit-loses-an-item scenario would have looked identical to the correct state, since every category already read "0 found").

## Issues Encountered

None beyond the two deviations above, both caught and resolved before Task 3's commit via direct `node -e` isolation before touching the real document.

## Known Stubs

None. The 30 `resolution:` fields carry the `PENDING-RESOLUTION` placeholder by explicit phase design (plan `68-06`'s own stated scope: "plan `68-06` fills all 30") — this is documented, load-bearing incompleteness, not a silently-introduced gap. The placeholder count (30) is asserted by `check()`'s existing determinism/census reporting and by the DOC-04 group's own referral-count assertion, so a resolution accidentally dropped or fabricated would be caught either as a count mismatch or (per D-07's own stated prohibition) never guessed in the first place.

`.planning/WINDOWS.md` was checked (`gsd_run windows append` not invoked) — the 30 `PENDING-RESOLUTION` placeholders are a named, explicitly-designed placeholder class with their exact count recorded both in this plan's own action text and in `check()`'s live census, so recording them to the cross-phase defect ledger would duplicate information already load-bearing in the deliverable itself, matching 68-02's own precedent for its 26 `PENDING-APPROACH` placeholders.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `node derive-review-docs.mjs check` exits 0 from `.planning/phases/68-deliverable-documents/`, all 25 assertion groups PASS, and the placeholder census reads exactly `{"PENDING-APPROACH": 26, "PENDING-AREA": 0, "PENDING-RESOLUTION": 30}` for `MAJOR-REFACTORS.md` and all-zero for `EASY-FIXES.md`.
- `git status --porcelain .planning/reviews/` is clean (both files' changes committed across the three task commits above); no `6N-COVERAGE.md` or `INVENTORY.md` was touched.
- `.planning/config.json`'s `_auto_chain_active` flag and the untracked `.planning/phases/68-deliverable-documents/68-PATTERNS.md` were present before this plan started (noted in `68-02-SUMMARY.md`'s own "Next Phase Readiness" as outside this phase's write boundary, D-12) — left untouched, noted here again so a later `git status` check is not mistaken for this plan's own residue.
- Remaining Phase 68 scope (per `68-02-SUMMARY.md`'s "Next Phase Readiness"): the DOC-03 coverage preamble (D-08) and the FIX-04 close-out statement (D-11) are still open for later plans (`68-04` onward); the 30 `resolution:` placeholders this plan left open are explicitly plan `68-06`'s scope.

---
*Phase: 68-deliverable-documents*
*Completed: 2026-08-19*
