---
phase: 100-parser-gaps-remaining-groups-long-tail-examples
plan: 06
subsystem: parser
tags: [conformance, measurement, closing-gate, bbj-corpus]

requires:
  - phase: 100-01
    provides: the array-bracket group and the opened 100-CONFORMANCE.md
  - phase: 100-02
    provides: the block-boundary comment and line-numbered-class groups
  - phase: 100-03
    provides: the oracle word sweep and its per-word fixes
  - phase: 100-04
    provides: the long-tail triage and the shape-level residue table this plan completes
  - phase: 100-05
    provides: the examples/ compile-clean state and its test infrastructure
provides:
  - "The phase's closing conformance measurement: A 9 (<=25 gate, PASS), A2 22 (<=23 gate, PASS), B 669 (+3 vs the Phase 99 close baseline of 666, recorded not gated, unchanged since plan 01)"
  - "A2 and B movement established by file-set difference against the Phase 99 close snapshot, not totals"
  - "The shape-level residue table plan 04 opened, completed to 8 of 9 filled rows; 1 row (a METHOD-declaration file) left genuinely pending, its cause probed but not isolated"
  - "Per-criterion closing attestation for all five Phase 100 roadmap success criteria, with a requirement-to-evidence chain for all six owned requirements"
  - "A redaction fix removing corpus file paths that had leaked into 100-CONFORMANCE.md across three earlier plans' 'orchestrator per-file look' tables"
  - "The conditional stop: this plan does not seal the phase autonomously -- it returns a blocking-human checkpoint"
affects: [104]

actuals:
  tokens: 15800
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Neutral per-row labels ('Residue file A'..'F') replacing corpus file paths in a per-file-look table, preserving all analytical content while removing the identifying column"

key-files:
  modified:
    - .planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-VALIDATION.md
    - .planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md

key-decisions:
  - "The 3 linking.test.ts BBjAPI-resolution test failures in the whole-suite run are treated as pre-existing, documented environment noise (live java-interop on :5008 triggering shouldRunBBjTests()'s bare-TCP gate against a backend whose getAllClassNames exposure has drifted since 2026-09-03), not a genuine failure this phase's diff caused -- consistent with how plans 04 and 05's own whole-suite runs, earlier in this same phase, classified the identical 3 failures. Recorded explicitly in 100-VALIDATION.md rather than silently passed over."
  - "Corpus file paths (samples/..., bbjllm-dataset/..., bbj-install/...) had leaked into 100-CONFORMANCE.md's 'orchestrator per-file look' tables added after plans 01, 02 and 04 -- a violation of this phase's own D-27 rule and T-100-06-01's mitigate disposition that predates this plan. Redacted to neutral per-row labels, keeping every other word of the original analysis; recorded as a Rule 2 deviation, not part of the plan's own task list."
  - "The A2 movement section for this closing run is built from a direct ID-level file-set diff against the Phase 99 close snapshot, not by repeating plan 01's own internal (different-window) diff claim -- ID-level checking showed the x[all]-message file was already present at the Phase 99 close (unmoved the whole phase), while the actually-new file (a parser-fix-unmasked 'clear' message) is a different file than plan 01's own prose named. Task 2 only required the Phase-99-close-vs-closing-run comparison, so this is reported as measured, not reconciled against plan 01's differently-scoped claim."
  - "Residue file F (a METHOD declaration whose own signature line parses cleanly in isolation) stays pending, not guessed into one of the four reason categories -- the plan explicitly forbids guessing a category to close a row, and this plan changes no source and reads no further corpus content."
  - "The plan's own Task 3 template sentence ('the call forms accepted on a false premise are recorded with a filed todo') does not match what actually happened in this phase -- plan 05 found the suspected false premise (fileopen/filesave's MODE= option) was never one, and filed no todo. Corrected in the attestation rather than repeated."

requirements-completed: [PARSE-04, PARSE-05, PARSE-06, PARSE-08, PARSE-09, EXMP-01]  # marked after the human accepted the recorded residue on 2026-09-22

coverage:
  - id: D1
    description: "Closing conformance run executed once on the final tree, snapshot taken first, reporting A 9, A2 22, B 669 -- gate table with each value against its threshold"
    requirement: PARSE-09
    verification:
      - kind: other
        ref: "node /home/coder/repos/bbj-corpus/conformance/run.mjs --ls /home/coder/repos/bbj-language-server (A 9<=25 PASS, A2 22<=23 PASS, B 669 recorded)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A2 and B movement established by file-set difference against the Phase 99 close snapshot; the shape-level residue table completed to 8 of 9 filled rows"
    requirement: PARSE-09
    verification: []
    human_judgment: true
    rationale: "The residue table's 9th row is explicitly left pending (cause not isolated) -- this is a genuine, unresolved gap requiring a human decision (accept as residue vs. hand to a later phase), not something a test can auto-pass."
  - id: D3
    description: "Per-criterion closing attestation for all five Phase 100 roadmap success criteria with named evidence and a requirement-to-evidence chain for PARSE-04, -05, -06, -08, -09 and EXMP-01"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/parser-keyword-statements.test.ts, test/conformance-regressions.test.ts, test/examples-compile.test.ts, test/example-files.test.ts"
        status: pass
    human_judgment: true
    rationale: "Criterion 4 is recorded as 'partially holds' (the residue list has 1 unclosed row) -- a human must decide whether to accept the shortfall or hand it to a later phase before the phase can be considered sealed."

duration: 27min
completed: 2026-09-21
status: complete
---

# Phase 100 Plan 06: Closing Conformance Measurement Summary

**The phase's final gate table passes both numeric thresholds (A 9 ≤ 25, A2 22 ≤ 23), but the shape-level residue list has one genuinely unresolved row and B rose above the Phase 99 close baseline — so this plan's own conditional stop fires and it returns a blocking-human checkpoint instead of sealing the phase.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-09-21T23:26:00Z (approx, session start after 100-05's close)
- **Completed:** 2026-09-21T23:52:42Z
- **Tasks:** 3
- **Files modified:** 2 (`100-VALIDATION.md`, `100-CONFORMANCE.md`)

## Accomplishments

- Confirmed the final tree is coherent before measuring anything: generated parser no older than the grammar or token-builder, `bbj-vscode/src` and `examples` clean, whole vitest suite green on failed-test count (0 beyond two documented environment exceptions — hook-timeout contention and 3 pre-existing `linking.test.ts` BBjAPI failures from live java-interop backend drift, both unrelated to this phase's diff and already classified out-of-scope by plans 04 and 05), all 19 conformance fixtures and the examples-compile test/invalid folder present, register check clean over the phase's whole source diff. `100-VALIDATION.md`'s Per-Task Verification Map, Wave 0 checklist and sign-off reconciled to the finished state.
- **Found and fixed a real information-disclosure gap** (not part of the plan's own task list): three earlier "orchestrator per-file look" tables in `100-CONFORMANCE.md` (added after plans 01, 02 and 04) named corpus files directly by their private-repository paths, violating this phase's own D-27 rule and the threat register's T-100-06-01 mitigation. Redacted every path to a neutral per-row label, preserving all analytical content.
- Ran the closing conformance harness once on the final tree (commit `72d0d3a1`, snapshot taken first): **A 9** (≤25 gate, PASS, well below), **A2 22** (≤23 gate, PASS), **B 669** (+3 vs the Phase 99 close baseline of 666, recorded not gated). Identical to plan 04's own run — 0 files moved on any list since then (D-26 backstop).
- A2 movement against the Phase 99 close snapshot: 2 message groups cleared (`endif`, `log.DURATION = log.END-log.`), 1 new (`clear` — a parser fix from plan 01 unmasking a validator false alarm on the same file it had previously blocked on `dread x![]`). B movement: the same 3 files that entered at plan 01, unchanged since, carried forward with their existing classification (2 lost accidental catches, 1 out-of-scope typed validation rule).
- Completed the shape-level residue table plan 04 opened: filled the line-start `::`-continuation row (valid but disproportionate to fix now — a lexer-level line-continuation-splitter change). Left the `METHOD`-declaration row (a file whose header, fields and signature line all parse cleanly in isolation) genuinely pending — its cause was probed but not isolated in the time allowed, and no category was guessed to close it. Row counts sum to the measured list-A total of 9 (8 filled + 1 pending).
- Wrote a per-criterion closing attestation for all five Phase 100 roadmap success criteria (4 hold, 1 partially holds) and a requirement-to-evidence chain for all six owned requirements (PARSE-04, -05, -06, -08, -09, EXMP-01), plus the two deliberate non-goals (confirmed by a 4-file diff stat: only `bbj.langium`, `bbj-token-builder.ts`, `check-classes.ts` and `line-break-validation.ts` changed across the whole phase) and the grammar rule deliberately not tightened (the 34-word record-only list, deferred to STRICT-01/02).
- Corrected a factual mismatch in the plan's own template language: Task 3's action text anticipated a filed false-premise todo that plan 05 never actually filed (the suspected false premise turned out not to be one). Recorded accurately rather than repeated.
- **The conditional stop fired.** Two of the plan's three autonomous-close conditions are unmet (1 residue row still pending; B rose above the Phase 99 close baseline, though unchanged and already classified since plan 01) — this plan does not seal the phase; it returns a blocking-human checkpoint.

## Task Commits

Each task was committed atomically:

1. **Task 1: Prove the final tree is the tree being measured** - `72d0d3a1` (docs)
2. **[deviation] Redact corpus file paths leaked into 100-CONFORMANCE.md** - `4cfdfd26` (fix)
3. **Task 2: Closing harness run, the gate table, and the completed residue list** - `cde2ae3d` (docs)
4. **Task 3: Criterion-by-criterion closing attestation, and the conditional stop** - `5babc56e` (docs)

_Phase base commit (recorded in 100-01-SUMMARY.md): `9cc8bffe7bc9079df86ec1ea6d5897b038b7c98a`._

## Files Created/Modified

- `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-VALIDATION.md` - Per-Task Verification Map, Wave 0 checklist and Validation Sign-Off reconciled to the finished state; `wave_0_complete`/`nyquist_compliant` set true
- `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md` - Corpus-path redaction across three earlier plans' tables; the Closing run, Gate table, A2 movement, B movement, completed residue list, Closing attestation, Developer verification block and Task 3 conditional-stop sections

## Decisions Made

See `key-decisions` in the frontmatter for the full, precise record. In prose: the whole-suite `linking.test.ts` BBjAPI failures are treated as pre-existing environment noise, consistent with plans 04 and 05's own classification of the identical failures within this same phase; the corpus-path leak found in earlier plans' tables was redacted as a Rule 2 security deviation; the A2 movement section reports a direct ID-level file-set diff against the Phase 99 close snapshot (Task 2's own stated comparison window), which is not the same window plan 01's own internal diff used, and the two do not need to reconcile; Residue file F stays genuinely pending rather than guessed into a category; and the plan's own template sentence about a filed false-premise todo was corrected against 100-05's actual, established finding.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical / security] Redacted corpus file paths leaked into 100-CONFORMANCE.md**

- **Found during:** Task 2, while gathering evidence for the closing gate table and re-reading the file's existing "orchestrator per-file look" tables
- **Issue:** Three tables added after plans 01, 02 and 04 named corpus files directly by their private-repository path (`samples/...`, `bbjllm-dataset/...`, `bbj-install/...`), violating this phase's own D-27 rule ("no corpus file name, path or source line reaches tracked files") and the threat register's T-100-06-01 mitigation, which this plan's own Task 2 and Task 3 acceptance criteria require to hold over the WHOLE file, not just newly-added content
- **Fix:** Replaced every path with a neutral per-row label (`Residue file A`–`F`); every other word of the original analysis (shapes, line numbers, compiler verdicts, classifications) is unchanged
- **Files modified:** `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md`
- **Verification:** `grep -nE '\.bbj[`| ]|samples/|bbjllm-dataset/|bbj-install/'` over the file returns nothing after the fix; the plan's own corpus-path verify command (`! grep -qniE 'bbj-corpus/corpus|/corpus/'`) passes both before and after (it does not catch this narrower pattern, which is why the leak went undetected until a manual re-read)
- **Committed in:** `4cfdfd26`

---

**Total deviations:** 1 auto-fixed (Rule 2, security — information disclosure).
**Impact on plan:** Necessary for correctness against this plan's own acceptance criteria and threat model. No scope creep — the fix stayed within `100-CONFORMANCE.md`, the file this plan is already responsible for closing.

## Issues Encountered

- **`linking.test.ts` BBjAPI-resolution test failures (3) during the whole-suite run.** Not a new issue — pre-existing, documented environment drift (live java-interop on `:5008` plus a `getAllClassNames` backend change since 2026-09-03), independently reproduced and classified out-of-scope by plans 04 and 05's own whole-suite runs earlier in this same phase. Recorded explicitly in `100-VALIDATION.md` rather than silently treated as passing.
- **Hook-timeout flakiness on the Task 3 verify command's first run** (2 of 4 test files timed out in their `beforeAll` under contention). Re-ran in isolation immediately after: all 4 files passed (344 passed, 2 skipped, 0 failed) — confirmed transient contention, not a regression, matching this project's own standing memory about hook-timeout flakiness under `--maxWorkers` load.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**This phase does not seal here.** The closing gate table's two numeric gates both pass (A 9 ≤ 25, A2 22 ≤ 23), but the plan's own third autonomous-close condition set is not met: 1 shape-level residue row is genuinely pending (a `METHOD`-declaration file whose cause was probed but not isolated), and B rose above the Phase 99 close baseline (666 → 669, though unchanged and already classified since plan 01). Per the plan's own Task 3 instruction, no rule, check, fixture or example was adjusted to convert either open item into a clean pass.

A human decision is needed between two options, per the checkpoint returned alongside this SUMMARY:

1. **Accept the shortfall as recorded residue** — both open items already carry full evidence and a neutral classification; the numeric gates both pass, and neither item blocks Phases 101-104, which do not depend on this file's exact cause or on B returning to 666 before the compiler-parser endpoint lands.
2. **Hand a named shape to a later phase** — a dedicated investigation could isolate Residue file F's cause (bisecting lines 1-188 of that one file), the same way Phase 99 closed its own two open gates with a dedicated gap plan (99-06) rather than accepting them as residue.

`REQUIREMENTS.md` is **not** updated by this plan (working rule #4) — none of the six requirements this phase owns (PARSE-04, -05, -06, -08, -09, EXMP-01) are marked complete, pending this decision and the phase-transition step that follows it.

---
*Phase: 100-parser-gaps-remaining-groups-long-tail-examples*
*Completed: 2026-09-21*

## Self-Check: PASSED

- `100-VALIDATION.md` and `100-CONFORMANCE.md` confirmed present and modified on disk.
- All four commit hashes (`72d0d3a1`, `4cfdfd26`, `cde2ae3d`, `5babc56e`) confirmed present in `git log --oneline --all`.
- `/home/coder/repos/bbj-corpus/conformance/snapshots/details-100-06-before.json` confirmed present, written before the closing run.
- Corpus-path scan (`samples/|bbjllm-dataset/|bbj-install/`) over `100-CONFORMANCE.md` returns nothing.
- Register check over the phase's whole source diff (`bbj-vscode`, `examples`) produces no match.
- `git status --porcelain -- bbj-vscode examples` prints nothing — no source file touched by this plan.

## Checkpoint Resolution (2026-09-22)

The human chose **accept**: the B rise (666 → 669, three accidental catches lost, evidence in
`100-CONFORMANCE.md`) and the residue list stand as recorded. The one row that was still open at this
plan's close was isolated afterwards by the orchestrator (a `DEF FN` body without `FNEND` followed by a
`class` block) and filled in, so every list-A file now has a shape. All six owned requirements are
marked complete, with the residue noted against PARSE-08 and PARSE-09 in `REQUIREMENTS.md`.
