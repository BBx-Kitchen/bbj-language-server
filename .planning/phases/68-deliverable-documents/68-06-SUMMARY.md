---
phase: 68-deliverable-documents
plan: 06
subsystem: docs
tags: [markdown, review-findings, doc-04, cross-unit-referrals, github-issue-filing-prep]

# Dependency graph
requires:
  - phase: 68-deliverable-documents
    provides: "68-03's 30 `resolution: PENDING-RESOLUTION` placeholder referral entries and 68-05's authored proposed_approach values, over the same MAJOR-REFACTORS.md corpus"
provides:
  - "All 30 cross-unit referrals in MAJOR-REFACTORS.md's `### Cross-unit referrals and their resolution` carry a non-empty, checkable resolution: 19 landed (naming a finding ID), 6 absorbed as observations (naming the section that answered them), 5 open gaps (naming why the receiving unit recorded nothing)"
  - "A resolution census in the section preamble stating the four counts and summing to 30, with the 5 open gaps listed by source anchor for the phase close-out to carry forward"
  - "A new check() assertion (5b) that re-derives the census's four counts from the document text and fails on any arithmetic drift, mirroring 68-05's precedent of hardening the standing gate as each plan's incremental authoring completes"
affects: [69-github-issue-filing]

# Actuals (#2632)
actuals:
  tokens: 10244
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Self-referential referral pairs: several of the 30 referral entries are themselves the answering entry for an earlier referral in the same list (e.g. RU-64-01's own outbound `### Cross-unit referrals` block contains the answer to RU-64-03's referral asking whether dependency automation could ever see the three vendored JARs). Recognizing these pairs — rather than treating each entry in isolation — was the key to resolving roughly a third of the 30 without any additional search."
    - "Unit-closure-order gap detection: three of the five open gaps (referrals 28, 29, 30) exist because the referring unit's own text targets a unit that had already closed by the time the referral was raised (confirmed by reading the closed unit's own `### Unit closure` part (iv), which explicitly lists only the inherited items it owns and does not retroactively claim later referrals). This is a structural, traceable reason for an open gap, not a search failure."

key-files:
  created: []
  modified:
    - .planning/reviews/MAJOR-REFACTORS.md
    - .planning/phases/68-deliverable-documents/derive-review-docs.mjs

key-decisions:
  - "The SETOPTS composer referral (#13, 62-COVERAGE.md:323) and its Phase-62 corroboration (#17, 62-COVERAGE.md:1078) both resolve to the same finding, P63-D7-005, not to the neighbouring #475 GitHub issue its own dedup: field names — P63-D7-005's evidence explicitly states its subject is porting the EXISTING #474 composer to IntelliJ, a different subject from #475's NEW tri-state composer request. Confirmed same-subject rather than assumed, per the plan's own instruction and T-68-21's mitigation."
  - "Two referral pairs are self-answering within the same 30-entry list: referral 1 (RU-61-06 -> RU-61-05) is answered by referral 9 (RU-61-05's own confirmation), and referrals 5/7/4 pair with 10/11/12 the same way for Phase 61; referral 22 (RU-64-03 -> RU-64-01) is answered by referral 26 (RU-64-01's own confirmation) for Phase 64. Each pair is cross-referenced by list position in its resolution text rather than resolved independently, so a reader does not have to re-derive the same finding twice."
  - "Five referrals are recorded as open gaps rather than rounded up to landed or absorbed: referral 21 (RU-64-02 never independently confirmed RU-64-03's undeclared-tsx-dependency referral anywhere in its own text — confirmed by a zero-hit search for `tsx`/`P64-D6-001` past RU-64-02's section header), referral 27 (targets Phase 69, which has not yet executed), and referrals 28/29/30 (each targets a unit — RU-64-01 or RU-62-01 — that had already closed before the referral was raised, confirmed by reading the closed unit's own `### Unit closure` part (iv), which does not retroactively claim them)."
  - "Added a new check() assertion (5b), following 68-05's precedent of hardening the standing gate mid-phase: the plan's own Task 3 acceptance criteria require `check` to re-add the census's four counts and fail on drift, so the assertion was added as a Rule 2 auto-fix (missing critical functionality — the plan explicitly specifies this behaviour) rather than left as a documentation-only claim."

requirements-completed: [DOC-04]

coverage:
  - id: D1
    description: "All 30 cross-unit referrals in MAJOR-REFACTORS.md carry a non-empty resolution: value; none carries the PENDING-RESOLUTION placeholder"
    requirement: "DOC-04"
    verification:
      - kind: other
        ref: "node derive-review-docs.mjs check — grep -c '^resolution:' outputs 30, grep -c PENDING-RESOLUTION outputs 0, grep -cE '^resolution: *$' outputs 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every referral whose receiving unit went on to record a finding names that finding ID (19 of 30, 'landed'); every referral answered inside a named section rather than as a finding names that section (6 of 30, 'absorbed as an observation'); every referral whose receiving unit recorded nothing is written as an open gap in those words (5 of 30), each with the structural reason traced (closed-unit-before-referral, or not-yet-executed Phase 69) rather than left unexplained"
    requirement: "DOC-04"
    verification:
      - kind: other
        ref: "Per-referral acceptance checks: referral 2/6 name P61-D5-001 and state the receiving unit correctly recorded nothing because the finding already had an owner (not an open gap); referral 13/17's SETOPTS resolution states explicitly that P63-D7-005 is the same subject as the referral, not #475; the SEC-04 EM-token referral (23) names the specific Phase 65 cross-reference paragraph that carries it, not a general 'Phase 65 covered it' statement"
        status: pass
    human_judgment: true
    rationale: "Whether each 'landed' resolution's cited finding ID genuinely shares the referral's subject (versus a nearby-but-different finding), and whether each 'absorbed as observation' resolution's named section genuinely answers the referral's question, is a same-subject-or-different judgment the grep/check assertions can confirm the citation exists for but cannot adjudicate the semantic match of."
  - id: D3
    description: "The resolution census states four counts (landed/absorbed/open-gap/untraceable) summing to 30, with the 5 open gaps listed by source anchor; check() re-derives the same four counts from the document text and fails on any drift"
    requirement: "DOC-04"
    verification:
      - kind: other
        ref: "node derive-review-docs.mjs check — 'PASS: DOC-04 referral census — landed=19 absorbed=6 openGap=5 untraceable=0, summing to 30'"
        status: pass
    human_judgment: false

# Metrics
duration: 9min
completed: 2026-08-19
status: complete
---

# Phase 68 Plan 06: The 30 Cross-Unit Referral Resolutions Summary

**Resolved all 30 MAJOR-REFACTORS.md cross-unit referrals (19 landed on a finding ID, 6 absorbed as observations, 5 open gaps traced to a structural cause) and added the resolution census plus a check() assertion that re-derives it, closing DOC-04.**

## Performance

- **Duration:** ~9 min (commit timestamps 18:55:24Z -> 19:03:50Z, plus read/search time before the first commit)
- **Tasks:** 3
- **Files modified:** 2 (`MAJOR-REFACTORS.md`, `derive-review-docs.mjs`)
- **Commits:** 3

## Accomplishments

- **Task 1 — the 12 Phase 61 referrals (all landed):** every referral resolves to a finding ID — `P61-D1-006`, `P61-D5-001` (x2), `P61-D1-002`, `P61-D5-013` (x2), `P61-D1-003` (x2), `P61-D1-008` (x2), `P61-D2-012`. Discovered that several entries are themselves the answering entry for an earlier referral in the same 30-entry list (RU-61-05's own outbound referral block, entries 9-12, confirms/promotes findings for referrals 1, 5, 7 and 4 respectively) — each pair is cross-referenced by list position rather than resolved twice. The `test/linking.test.ts` referral (2) resolves against `P61-D5-001` and states explicitly that the receiving unit correctly recorded nothing because the finding already had an owner per D-06's routing rule — not an open gap.
- **Task 2 — the 8 Phase 62/63 referrals (6 landed, 2 absorbed):** landed — `P63-D7-005` (SETOPTS composer port, x2 referrals, confirmed same-subject against the neighbouring `#475` issue rather than assumed), `P63-D7-001` (compile action stub), `P63-D7-002` (5 missing IntelliJ commands), `P63-D7-003` (refresh-classes restart-vs-targeted-request), `P63-D7-006` (4 missing editor features). Absorbed — the TextMate `filenames`/`.bbl` follow-up (answered in RU-63-02's own referral-triage note, part confirmed by trace and part recorded not-reproducible), and the refreshJavaClasses mechanism side (answered in RU-63-05's own D7 cell, which cross-references `P63-D7-003` by ID rather than filing a second finding).
- **Task 3 — the 10 Phase 64 referrals (1 landed, 4 absorbed, 5 open gap) and the census:** landed — `P64-D4-005` confirms lint runs only via `vscode:prepublish`, not as an explicit workflow gate. Absorbed — the Gradle-half SEC-08 composition (RU-64-02's own D6 cell explicitly composes `P64-D6-005` with its own Gradle-unenumerability finding into one stronger statement), the vendored-JAR-ecosystem answer (a self-referential pair: referral 22 asks, referral 26 — RU-64-01's own text — answers "no" with the dependabot.yml trace), and Phase 65's SEC-04 confirmation of `P64-D1-002` as the correct, unmodified EM-token-lifecycle owner. Open gap — 5 referrals traced to a structural cause rather than left as bare "recorded nothing": referral 21 (RU-64-02 never independently confirmed the undeclared-`tsx` claim anywhere in its own text, confirmed by a zero-hit search), referral 27 (targets Phase 69, which has not yet executed), and referrals 28/29/30 (each targets a unit — `RU-64-01` or `RU-62-01` — that had already closed before the referral was raised, confirmed by reading the closed unit's own `### Unit closure` part (iv)). Wrote the resolution census into the section preamble (19 + 6 + 5 + 0 = 30, open gaps listed by source anchor) and added `check()` assertion 5b, which re-derives the same four counts from the document text and fails on drift — required by the plan's own Task 3 acceptance criteria and added as a Rule 2 auto-fix.
- Final state: `grep -c '^resolution:'` = 30; `grep -c PENDING-RESOLUTION` = 0; `grep -cE '^resolution: *$'` = 0; `node derive-review-docs.mjs check` exits 0 with every assertion group PASS, including the new census assertion and the pre-existing field-drift re-derivation (no `classification:`, `severity:`, `effort:`, `dedup:`, `disposition:` or `proposed_approach:` value changed).

## Task Commits

1. **Task 1: The 12 Phase 61 referral resolutions** - `e160349` (docs)
2. **Task 2: The 8 referral resolutions from Phases 62 and 63** - `e5df895` (docs)
3. **Task 3: The 10 Phase 64 referral resolutions and the resolution census** - `0a7a1ba` (docs)

**Plan metadata:** _pending — this commit_

## Files Created/Modified

- `.planning/reviews/MAJOR-REFACTORS.md` - all 30 `resolution: PENDING-RESOLUTION` placeholders replaced with a landed/absorbed/open-gap resolution; resolution census added to the referral sub-section preamble; no finding record, `dedup:` value or disposition touched
- `.planning/phases/68-deliverable-documents/derive-review-docs.mjs` - added `check()` assertion 5b, re-deriving the resolution census's four counts from the document text and failing on drift

## Decisions Made

See `key-decisions` in frontmatter:
1. The SETOPTS composer referrals (13, 17) resolve to `P63-D7-005`, confirmed same-subject against the neighbouring `#475` issue its own `dedup:` names, rather than assumed or treated as an open gap on the strength of the neighbouring issue existing.
2. Two self-answering referral pairs were recognized within the same 30-entry list (referrals 1/9, 5/10, 7/11, 4/12 for Phase 61; referrals 22/26 for Phase 64) and cross-referenced by list position rather than resolved independently.
3. Five referrals are recorded as open gaps with a traced structural cause (closed-unit-before-referral for three of them, not-yet-executed Phase 69 for two), rather than left as bare "recorded nothing" or rounded up to a nearby finding.
4. Added `check()` assertion 5b (Rule 2 auto-fix) so the standing gate verifies the census arithmetic the plan's own Task 3 acceptance criteria require, rather than leaving it as a documentation-only claim.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] `check()` had no assertion verifying the resolution census sums to 30**
- **Found during:** Task 3, after writing the resolution census into the section preamble
- **Issue:** The plan's own Task 3 acceptance criteria state "The census states four counts that sum to `30`, and `check` re-adds them and fails if they do not" — but no such assertion existed in `derive-review-docs.mjs` before this task; the census was documentation-only and could silently drift from the actual 30 resolutions on a future hand-edit.
- **Fix:** Added assertion 5b, which extracts the census sentence from the referral sub-section, parses its four counts and its restated arithmetic (`N + M + K + J = 30`), and fails if either the parsed counts don't sum to 30 or the restated arithmetic disagrees with the leading counts.
- **Files modified:** `.planning/phases/68-deliverable-documents/derive-review-docs.mjs`
- **Verification:** `node derive-review-docs.mjs check` reports `PASS: DOC-04 referral census — landed=19 absorbed=6 openGap=5 untraceable=0, summing to 30`.
- **Commit:** `0a7a1ba`

## Issues Encountered

None beyond the missing `check()` assertion above, auto-fixed under Rule 2 since the plan's own acceptance criteria required it.

## User Setup Required

None - no external service configuration required.

## Verification

- `node derive-review-docs.mjs check` exits 0 from `.planning/phases/68-deliverable-documents/` — every assertion group PASSes, including the new census assertion and the field-drift re-derivation of `classification:`, `severity:`, `effort:`, `dedup:`, `disposition:` and `proposed_approach:` (none changed).
- `git diff --stat .planning/reviews/` (against the pre-plan baseline) shows only `MAJOR-REFACTORS.md` changed across the whole plan — confirmed after each task's commit.
- `grep -c '^resolution:' MAJOR-REFACTORS.md` = `30`; `grep -c PENDING-RESOLUTION` = `0`; `grep -cE '^resolution: *$'` = `0`.
- The corpus still derives `224` records (`derived: total=224 major=144 easy=77 wontfix=3`); no 225th record was written.

## Next Phase Readiness

All 30 cross-unit referrals now carry a checkable resolution, closing DOC-04. The 5 open gaps this plan surfaced — referral 21 (RU-64-02 never independently confirmed the undeclared `tsx` dependency), referral 27 (Phase 69 has not yet executed to receive the `P64-D1-004` issue-drafting instruction), and referrals 28/29/30 (each targets a unit that had already closed before the referral was raised: the stale `vsce` devDependencies comment, `pr-validation.yml` running no test, and the `brace-expansion` reachability question) — are reported here for the phase close-out to carry forward; none was written into the corpus as a new finding. `MAJOR-REFACTORS.md` is ready for the remaining `<phase_conventions>` `## Close-out` section in later `68-0N` plans and for Phase 69's issue-filing pass under ISSUE-02.

---
*Phase: 68-deliverable-documents*
*Completed: 2026-08-19*

## Self-Check: PASSED

- FOUND: `.planning/reviews/MAJOR-REFACTORS.md`
- FOUND: `.planning/phases/68-deliverable-documents/derive-review-docs.mjs`
- FOUND: `.planning/phases/68-deliverable-documents/68-06-SUMMARY.md`
- FOUND commit `e160349` (Task 1)
- FOUND commit `e5df895` (Task 2)
- FOUND commit `0a7a1ba` (Task 3)
