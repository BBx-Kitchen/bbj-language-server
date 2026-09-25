---
phase: 107-validation-false-alarms-silent-skips
plan: 06
subsystem: validation
tags: [conformance-harness, private-corpus, leak-guard, todos, requirements]

requires:
  - phase: 107-validation-false-alarms-silent-skips
    provides: "107-01/107-04's VAL-01 line-break fix, 107-02's VAL-02 symbol-less-reference guard, and 107-03/107-05's VAL-03 unknown-Java-member check plus its live-backend review"
provides:
  - "A final private-corpus measurement of the whole phase against its own base, compared by file set rather than totals, with a full classification of every one of the 7,383 newly-entered A2 files"
  - "Confirmation that checkExceptions falls to 0 (VAL-02) and the VAL-01 target set stays fully cleared"
  - "The three folded todos closed out and one new pending todo recording VAL-03's deferred extras"
affects: []

actuals:
  tokens: 7500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Full-corpus file-set classification: probe every newly-entered/still-present A2 id with the harness's own per-file test-double services, then classify each file's Error diagnostics against the live-backend findings file to separate fake-classpath noise from genuinely-accepted findings and true regressions"

key-files:
  created:
    - .planning/todos/pending/2026-09-24-unknown-java-member-linking-warning-extras.md
  modified:
    - .planning/phases/107-validation-false-alarms-silent-skips/107-CONFORMANCE.md
    - .planning/phases/107-validation-false-alarms-silent-skips/107-03-SUMMARY.md
    - .planning/STATE.md
    - .planning/REQUIREMENTS.md
    - bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts
    - bbj-vscode/test/variable-scoping.test.ts

key-decisions:
  - "A cold-start artifact in the per-file probe pattern (the very first document built in a fresh createBBjTestServices process links differently than every document after it) was found, reproduced, and worked around with a one-document warm-up build before every real probe run -- unrelated to any of this phase's three fixes, but it would otherwise have misclassified the very first id in any batch as a false 'no errors found' mismatch"
  - "Comparable A2 is reported as 25 (harness-artifact and accepted-genuine-member files removed), a strict subset of this phase's own same-corpus base A2 (33) with zero new files -- 3 above the historical <=22 number from the v4.5 exit gate, which was measured on a roughly 3-4x smaller corpus checkout and is not directly comparable in raw magnitude; recorded as an open human-check item rather than silently resolved either way"
  - "VAL-03 is left Pending in REQUIREMENTS.md (VAL-01 and VAL-02 marked Complete) because the comparable-A2 gate is not cleanly confirmed by this plan's own measurement -- per the instruction to mark complete only when confirmed"
  - "Four leak-guard hits were investigated individually rather than dismissed: one (a live-backend test fixture) and one (a decorative comment divider) were coincidental generic-BBj-idiom collisions with the harness's own local details.json/manifest.jsonl content, fixed by a variable rename and a shorter divider with no test-behavior change; two more (in an earlier plan's SUMMARY and in STATE.md) quoted the literal path of a real example file that already ships under this repository's own examples/ tree, which the private corpus's own origin metadata happens to also record -- reworded to describe the file without repeating its path, since quoting a path already public in this repo is not a confidentiality violation but the wording still removed the ambiguity"

patterns-established:
  - "A generic decorative divider or common-idiom test fixture can coincidentally match >=15 contiguous characters of real corpus text once the harness's own local details.json holds a fresh full-corpus run -- treat a leak-guard hit the same way regardless of whether the match traces to the stable manifest/rejects ground truth or the transient details.json, since either can recur on the next full run"

requirements-completed: [VAL-01, VAL-02]

coverage:
  - id: D1
    description: "The VAL-01 target set (7 files re-flagged at the Phase 98 close) carries zero bbj-line-break Errors on the final tree, and no file newly enters the reconciled B gate"
    requirement: "VAL-01"
    verification:
      - kind: other
        ref: "phase-107-file-probe.mts run against the 7-file target set on the final commit -- 0 of 7 carry a bbj-line-break Error (local output, not committed)"
        status: pass
      - kind: other
        ref: "file-set diff of missedReconciled, base vs final details.json -- 0 newly entered"
        status: pass
    human_judgment: false
  - id: D2
    description: "checkExceptions (the VAL-02 corroboration on the private corpus) falls from 6 to 0"
    requirement: "VAL-02"
    verification:
      - kind: other
        ref: "phase-107-final-details.json checkExceptions.rejects = 0 (base: 6, all the same getSymbolRefName crash message 107-02 fixed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every one of the 7,383 newly-entered A2 files is accounted for as unknown-Java-member harness artifact, accepted genuinely-unknown member, or both -- zero unclassified regressions among newly-entered files"
    requirement: "VAL-03"
    verification:
      - kind: other
        ref: "full classification of all 7,383 newly-entered A2 ids against phase-107-live-member-probe.jsonl -- 7,372 harness-artifact + 8 accepted + 3 both, 0 regression (local output, not committed)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Comparable A2 (25) is a strict subset of this phase's own same-corpus base A2 (33) with zero new entries, though 3 above the historical <=22 number measured on an older, smaller corpus"
    requirement: "VAL-03"
    verification:
      - kind: other
        ref: "full classification of all 28 still-present A2 ids -- 3 pure-harness-artifact (excluded), 22 unrelated pre-existing, 3 unrelated-plus-harness-noise (both kept); comparable A2 = 22+3 = 25, all pre-existing"
        status: pass
    human_judgment: true
    rationale: "Whether the file-set-comparison reading (zero new files, net improvement) or the raw <=22 number from an older, smaller corpus should govern this gate is a judgment call the plan explicitly routes to the human check at phase end, matching the precedent already set at the Phase 98 close."
  - id: D5
    description: "The whole vitest suite is green, the three live-gated files fail on no name that does not also fail on the phase base, the source/test diff carries no planning identifiers, and every tracked file the phase changed passes the leak guard"
    requirement: null
    verification:
      - kind: other
        ref: "RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2 -- numFailedTests=0, numTotalTests=2728"
        status: pass
      - kind: integration
        ref: "test/linking.test.ts, RUN_BBJ_TESTS=1 -- 11 failed/30 passed/1 skipped on HEAD and on a scratch worktree pinned to the base commit, identical failing names on both"
        status: pass
      - kind: integration
        ref: "test/functional/unknown-java-member-real-interop.test.ts, RUN_BBJ_TESTS=1 -- 5/5 passed"
        status: pass
      - kind: integration
        ref: "test/functional/issue440-real-interop.test.ts, RUN_BBJ_TESTS=1 -- 1/1 passed"
        status: pass
      - kind: other
        ref: "register check over bbj-vscode/src and bbj-vscode/test, base..HEAD -- register-clean"
        status: pass
      - kind: other
        ref: "leak guard over every line the phase added to a tracked file, base..HEAD (including this plan's own edits) -- exit 0, all files clean"
        status: pass
    human_judgment: false

duration: 59min
completed: 2026-09-25
status: complete
---

# Phase 107 Plan 06: Final private-corpus measurement, register/leak-guard clean-up, and todo close-out Summary

**Measured the finished phase against its own private-corpus base by file set (not totals): the VAL-01 target set is fully cleared, checkExceptions falls to 0 (VAL-02), and every one of the 7,383 newly-entered A2 files traces to fake-classpath harness noise, an already-accepted genuine finding, or both — zero unclassified regressions — while the raw comparable-A2 gate against an older, smaller-corpus number stays an open human-check item.**

## Performance

- **Duration:** 59 min
- **Started:** 2026-09-25T00:42:00Z (approx)
- **Completed:** 2026-09-25T01:41:00Z
- **Tasks:** 2
- **Files modified:** 8 (1 created, 7 modified, including REQUIREMENTS.md and the 3 todo renames)

## Accomplishments
- Ran the harness on the final tree in the same `--endpoint 127.0.0.1:5008` mode and same corpus checkout as the phase's own base, snapshotting `phase-107-final-details.json`/`-summary.json`/`-run.log` outside the repository
- Confirmed the VAL-01 target set (7 files) is still fully cleared of `bbj-line-break` Errors, and the reconciled B gate has zero new entries
- Found and worked around a probe-methodology cold-start artifact (the first document built in a fresh test-double process links differently than every one after it), unrelated to any of this phase's fixes, then classified all 7,383 newly-entered A2 files and all 28 still-present A2 files against the live-backend's own accepted-findings file
- Confirmed `checkExceptions` falls from 6 (all the same VAL-02 crash message) to 0
- Investigated and resolved 4 leak-guard hits (2 coincidental generic-idiom collisions fixed with no test-behavior change, 2 wording changes removing an ambiguous-but-legitimate public-path reference), leaving the guard clean over every line this phase added
- Closed the three folded todos (VAL-01 balance-rule residue, VAL-02 symbol-less-reference crash, VAL-03 unknown-method-as-warning) into `completed/`, and recorded VAL-03's deferred extras as one new pending todo
- Marked VAL-01 and VAL-02 Complete in REQUIREMENTS.md (both cleanly confirmed by this plan's own measurement); left VAL-03 Pending, since the comparable-A2 gate is a recorded human-check item rather than a clean pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Final measurement against the base, suites and diff checks, end to end** - `090230c1` (docs)
2. **Task 2: Close the folded todos and record the deferred extras** - `fb3f1e63` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified
- `.planning/phases/107-validation-false-alarms-silent-skips/107-CONFORMANCE.md` - added `## 4. Final measurement` with the base→final gate table, the full A2/B file-set classification, the checkExceptions and suite results, and one verdict line per criterion-3 clause
- `.planning/phases/107-validation-false-alarms-silent-skips/107-03-SUMMARY.md` - reworded 3 lines that quoted this repo's own public example-file path, to remove an ambiguous coincidental match with the private corpus's origin metadata
- `.planning/STATE.md` - reworded the same reference in its Phase 107 decision log entry
- `.planning/REQUIREMENTS.md` - VAL-01 and VAL-02 marked Complete; VAL-03 left Pending
- `bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts` - renamed two local variables in one test fixture to remove a coincidental leak-guard match; no behavior change (5/5 tests still pass)
- `bbj-vscode/test/variable-scoping.test.ts` - shortened one phase-added decorative comment divider to remove a coincidental leak-guard match; no behavior change (49/49 tests still pass)
- `.planning/todos/completed/2026-09-21-loosen-single-line-if-balance-rule-a2-residue.md` - moved from `pending/`, unchanged
- `.planning/todos/completed/2026-09-23-use-before-assignment-check-throws-on-a-reference-without-a-symbol.md` - moved from `pending/`, unchanged
- `.planning/todos/completed/2026-09-24-flag-unknown-method-on-java-object-as-error.md` - moved from `pending/`, unchanged
- `.planning/todos/pending/2026-09-24-unknown-java-member-linking-warning-extras.md` - new todo recording VAL-03's two deferred extras and the standing note on the unbuilt severity-downgrade setting

## Decisions Made
See `key-decisions` in the frontmatter. In addition:
- Ran a comprehensive classification pass over ALL 7,411 final A2 files (not just the 7,383 newly-entered ones), so the "still present" base files could also be correctly reclassified when their own reason changed (2 target-set files that cleared their line-break issue picked up an unrelated harness-artifact unknown-member Error instead, which the file-set comparison needed to attribute correctly rather than count as either a fresh regression or a silent improvement)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Probe cold-start artifact misclassified the first newly-entered A2 id**
- **Found during:** Task 1, classifying the 7,383 newly-entered A2 files
- **Issue:** The very first document built in a fresh `createBBjTestServices(EmptyFileSystem)` process links differently than every document built afterward in the same process (confirmed directly: the same file, probed alone, produces 0 Error diagnostics cold and 2 correct ones once a throwaway document is built first) -- a probe-methodology artifact, not a check bug, and not something either `phase-107-file-probe.mts` or the harness's own non-`--endpoint` worker path (which has no equivalent warm-up) is immune to.
- **Fix:** Added a one-document warm-up build (mirroring the harness's own `--endpoint`-mode sanity check) at the start of the classification probe script (a local scratch script, never committed) before processing any real id.
- **Files modified:** none in the repository (scratch probe script only)
- **Verification:** Re-ran the classification with the warm-up in place; the previously-anomalous id now correctly reports 2 harness-artifact Errors, and the "0 relevant errors found" bucket dropped from 1 to 0.
- **Committed in:** not applicable (scratch-only; the resulting classification numbers are recorded in `107-CONFORMANCE.md` §4, committed in `090230c1`)

**2. [Rule 3 - Blocking] Two coincidental leak-guard false positives on generic BBj/formatting idioms**
- **Found during:** Task 1's own leak-guard verify step
- **Issue:** A live-backend test fixture calling a real `BBjAPI().getSysGui()` (a common, independently-named BBj idiom, already named in this phase's own planning discussion before any of this measurement ran) and a pre-existing 72-character `=` decorative comment divider (added at one point by an earlier plan in this phase) each coincidentally overlapped >=15 contiguous characters with real corpus text now cached in the harness's own local `details.json`/`manifest.jsonl`.
- **Fix:** Renamed the fixture's two local variables to less generic names (no change to the method under test or its assertions); shortened the one phase-added divider occurrence (the file's other, pre-existing occurrences of the same convention are outside this phase's diff and untouched).
- **Files modified:** `bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts`, `bbj-vscode/test/variable-scoping.test.ts`
- **Verification:** Both files' full test suites re-run and pass unchanged (5/5 and 49/49); leak guard re-run clean on both.
- **Committed in:** `090230c1`

**3. [Rule 3 - Blocking] Two leak-guard hits quoting this repo's own public example-file path**
- **Found during:** Task 1's own leak-guard verify step
- **Issue:** Three lines in `107-03-SUMMARY.md` and one in `STATE.md` quoted the literal path of a real, already-public example file that ships in this same repository's own `examples/` tree (verified directly against the checkout). The private corpus's own bookkeeping happens to record that same public path as one of its "origin" metadata values, which is what the guard matched -- not an actual confidentiality violation, since the referenced content is already public in this repo, but the exact match made the ambiguity worth removing.
- **Fix:** Reworded all 4 lines to describe the file ("a real example file under this repo's own examples/ tree") without repeating its literal path.
- **Files modified:** `.planning/phases/107-validation-false-alarms-silent-skips/107-03-SUMMARY.md`, `.planning/STATE.md`
- **Verification:** Leak guard re-run clean on both files; no information was removed, only the literal path string.
- **Committed in:** `090230c1`

---

**Total deviations:** 3 auto-fixed (all Rule 3 - blocking issues discovered by this plan's own acceptance criteria, none a production-code regression).
**Impact on plan:** All three were necessary to satisfy this task's own "leak guard exits 0" acceptance criterion. No scope creep: the cold-start fix touched only a scratch probe script; the two test-file edits are purely cosmetic (variable names, comment length) with zero behavior change, confirmed by re-running both files' full suites; the two SUMMARY/STATE wording edits removed a literal path string with no information loss.

## Issues Encountered
- The raw comparable-A2 number (25) is 3 above the historical <=22 gate from the v4.5 exit, which was measured on a roughly 3-4x smaller corpus checkout. Resolved by reporting both readings transparently in `107-CONFORMANCE.md` §4 and recording it as an explicit human-check item, per the plan's own instruction and the precedent already set at the Phase 98 close (`98-VERIFICATION.md`'s `overrides:` block) -- not silently resolved either way.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 107 (VAL-01, VAL-02, VAL-03) is fully executed; VAL-01 and VAL-02 are Complete in REQUIREMENTS.md, VAL-03 is Pending pending the human check on the comparable-A2 clause recorded in `107-CONFORMANCE.md` §4.
- All 6 plans in this phase now have a SUMMARY.md; the whole-suite baseline (11 known interop-backend-drift failures, `numFailedTests=0` otherwise) is unchanged from the phase base.
- No blockers for the next phase (108, IntelliJ Crash Detection).

## Self-Check: PASSED

Both commit hashes (`090230c1`, `fb3f1e63`) verified present in `git log`. All modified/created files verified present on disk: `107-CONFORMANCE.md` contains `## 4. Final measurement` (grep count 1); the three todo files exist under `completed/` and are absent from `pending/`; the new todo exists under `pending/` and contains "NamedElement" (grep count 4); `bbj-corpus/conformance/snapshots/phase-107-final-details.json` is non-empty. Re-ran the acceptance-criteria gates one final time against committed HEAD: whole suite `numFailedTests=0`/`numTotalTests=2728`; register check `register-clean`; leak guard exit 0 over every line the phase added (22 files checked).
