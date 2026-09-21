---
phase: 98-line-break-validation-false-alarms-a2
plan: 09
subsystem: testing
tags: [conformance, langium, bbj, gap-closure, evidence]

# Dependency graph
requires:
  - phase: 98-06
    provides: "the phase-boundary conformance measurement (details.json/summary.json/history.jsonl) and its 'plausible, not corpus-verified' B-regression attribution this plan tests"
  - phase: 98-07
    provides: "the tree state this plan measures against (RESTORE lexer fix)"
  - phase: 98-08
    provides: "the tree state this plan measures against (ELSE/FI balance fix)"
provides:
  - "98-CONFORMANCE.md section 9: per-file evidence that all seven B-regressed files are REFUTED against the originally claimed keyword-branch-target mechanism, with a corrected per-file root cause and disposition"
  - "A synthetic reproduction confirming the originally claimed mechanism is real in isolation, even though it explains none of the seven actual regressed files"
affects: ["98-10 (the phase's final gap plan, whose human checkpoint decides whether to accept the corrected B-regression evidence)"]

actuals:
  tokens: 2200
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Evidence-gathering gap-closure plan: replay a recorded measurement's not-caught set through the harness worker directly (never the full harness entry point) against a scratch baseline checkout, to convert a plausible narrative into a per-file, directly-observed verdict."

key-files:
  created: []
  modified:
    - .planning/phases/98-line-break-validation-false-alarms-a2/98-CONFORMANCE.md

key-decisions:
  - "All seven B-regressed files are REFUTED against the originally claimed 'keyword-named GOTO/GOSUB branch target' mechanism: none of the seven baseline diagnostics sat on a branch statement at all. Five trace to the RESTORE line-break fix (plan 02), one to the METHODRET severity downgrade (plan 03), one to the DEF-FN unclosed-body grammar fix (plan 05) — each a different, already-shipped fix that legitimately stopped flagging valid code, and in each of these seven files that removed false alarm happened to be the only thing catching a file the compiler independently rejects for an unrelated reason."
  - "A synthetic reproduction (a branch statement to a keyword-standalone-named, undeclared label) confirms the originally claimed mechanism is real and reproducible in isolation — baseline tree flags it with two line-break errors, current tree produces a linking-category diagnostic the harness excludes by design — but it explains none of the seven files that actually regressed in the corpus this run."
  - "All seven refuted files are routed to the same destination (Phases 101-103, the bbj-ls compiler-parser endpoint), not fixed in this plan: two have a confirmed real defect (an ordinary, non-keyword undefined label — linking-only by harness design) and five have a real compiler complaint whose message text is not recorded anywhere this executor can read, so it cannot be reproduced by a hand-written check without adding a new, architecturally significant validation this phase's own threat model forbids."
  - "No fix was made in this plan: none of the seven refuted files' real cause is a bug in a line-break mask, the conflicting-DECLARE check, or a METHODRET check that this phase's tools could correct without widening an existing check into an unrelated new validation."

requirements-completed: [CONF-01]

coverage:
  - id: D1
    description: "The newly-uncaught set (7 files) is identified by direct replay against a baseline checkout, not inferred from the +7 count alone, and matches the recorded delta exactly"
    requirement: CONF-01
    verification:
      - kind: other
        ref: "worker run against baseline-tree: probed=665, crashed=0, newly_uncaught=7"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every one of the seven files carries a CONFIRMED/REFUTED verdict grounded in its own text, not the diagnostic message alone"
    requirement: CONF-01
    verification:
      - kind: other
        ref: ".planning/phases/98-line-break-validation-false-alarms-a2/98-CONFORMANCE.md section 9's table (7 REFUTED rows)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both halves of the originally claimed mechanism are observed: the pre-phase line-break false alarm on a keyword-named branch target, and the current tree's linking-category diagnostic for the same shape"
    requirement: CONF-01
    verification:
      - kind: other
        ref: "synthetic probe run against baseline-tree (two line-break errors) and the current tree (one linking-category diagnostic, excluded by worker.mts's NOT_VALIDATION filter)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every refuted file has an explicit disposition (handed to Phases 101-103) with a stated reason, and the acceptance decision is explicitly deferred to the phase's final gap plan"
    verification:
      - kind: other
        ref: "section 9's disposition table and closing paragraph"
        status: pass
    human_judgment: true
    rationale: "Whether the corrected evidence changes the human's willingness to accept the B regression is a judgment call for the phase's final gap plan checkpoint, not something this plan's own tests can resolve."

duration: 20min
completed: 2026-09-21
status: complete
---

# Phase 98 Plan 09: B-Regression Root-Cause Evidence Summary

**All seven files behind Phase 98's B-regression (658 -> 665) are REFUTED against the originally claimed keyword-branch-target mechanism — each traces instead to a different, already-shipped fix (RESTORE, METHODRET, or DEF-FN) unmasking an unrelated real defect, all now handed to Phases 101-103.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-21T05:56:00Z (approx.)
- **Completed:** 2026-09-21T06:14:04Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- Snapshotted the recorded phase-boundary conformance measurement (`missed=665 falseAlarms=22 falseRejects=167`) before touching anything, and stood up a runnable baseline language-server checkout at commit `d8071b24` (regenerated with Node 22) under a scratch worktree.
- Replayed the phase-boundary not-caught set (665 files) through the harness worker directly against that baseline checkout: exactly 7 files came back newly-uncaught, matching the recorded +7 delta exactly, with zero crashes.
- Classified all 7 against the plan's strict CONFIRMED test (a line-break message, on a branch statement, targeting an undeclared keyword-named label): all 7 are REFUTED — none of the seven baseline diagnostics sat on a `GOTO`/`GOSUB` statement at all.
- Traced each REFUTED file to its real proximate cause: 5 to the RESTORE line-break fix (plan 02), 1 to the METHODRET severity downgrade (plan 03), 1 to the DEF-FN unclosed-body grammar fix (plan 05) — each a legitimate, already-shipped fix that stopped flagging valid code, which in each of these files also happened to be the only thing flagging a file the compiler independently rejects for a different, unrelated reason.
- Built a synthetic reproduction (a branch to a keyword-standalone-named, undeclared label) and confirmed the originally claimed mechanism IS real: the baseline tree produces two line-break errors on it; the current tree produces a linking-category diagnostic the harness excludes by design. This mechanism is genuine but explains none of the seven actual regressed files.
- Appended section 9 to `98-CONFORMANCE.md` with the per-file evidence table, the corrected root-cause narrative, and a disposition (handed to Phases 101-103) for every refuted file — no corpus file name, path, or source line written anywhere in the tracked file.
- Tore down the baseline worktree and confirmed the repository's worktree list, `git status`, and the recorded measurement files (`details.json`, `history.jsonl`) are exactly as found.

## Task Commits

Each task was committed atomically:

1. **Task 1: Snapshot the phase-boundary measurement and stand up a baseline language-server tree** - no commit (produced only scratch files and a git worktree outside the repository's tracked tree; no tracked file changed).
2. **Task 2: Identify the newly-uncaught files and confirm or refute the claimed mechanism** - no commit (all evidence gathering stayed in the scratch working note; no tracked file changed).
3. **Task 3: Record the evidence, dispose of anything refuted, and tear the baseline tree down** - `03d9af98` (docs)

_No plan-metadata commit yet — this SUMMARY and STATE/ROADMAP updates are committed separately per the sequential-executor protocol._

## Files Created/Modified
- `.planning/phases/98-line-break-validation-false-alarms-a2/98-CONFORMANCE.md` - New section 9: method, numbers (665 probed / 7 newly-uncaught, matching the recorded +7), a per-file CONFIRMED/REFUTED table (all 7 REFUTED), the synthetic-reproduction evidence for the mechanism's second half, and a disposition table routing all 7 to Phases 101-103.

## Decisions Made
See `key-decisions` in the frontmatter above for the full rationale on: why all seven files are REFUTED, what each one's actual proximate cause is, why the synthetic reproduction still matters even though it explains none of the seven, and why the disposition is "handed to Phases 101-103" rather than a fix in this plan.

## Deviations from Plan

None - plan executed exactly as written. The evidence turned out to refute the previously-recorded (honestly labeled "plausible, not corpus-verified") attribution for all seven files rather than confirming it for some — this is exactly the outcome the plan's own objective anticipated ("if any of the seven turns out to be a different mechanism, that is a real unfixed defect this phase introduced and it gets a disposition here, not a shrug"), not a deviation from the plan's instructions.

## Known Stubs

None.

## Threat Flags

None — no new network endpoint, auth path, file-access pattern, or schema change at a trust boundary was introduced. This plan only appended evidence to a planning document; no source file was touched.

## Issues Encountered
- Two of the compiler's own recorded complaints (for rows 2, 3, 4, 6, 7 in section 9's table) carry no message text at all in the source manifest this executor can read — only a line number and source snippet. This limited how precisely the real defect for those five files could be characterized beyond "an opaque compile-stage rejection elsewhere in the file, now uncaught by any check at error severity." Recorded honestly in the working note and in section 9 rather than guessed at.
- The originally claimed mechanism (keyword-named branch target -> linking exclusion) turned out to be real but irrelevant to this specific regression — a result the plan's acceptance criteria anticipated by requiring the "second half" of the mechanism to be checked independently of which files actually matched it.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The B-regression root cause is now on record per file, corrected from the prior plausible-but-unverified attribution. All seven files are routed to Phases 101-103 (the bbj-ls compiler-parser endpoint), not fixed here.
- The acceptance decision for the B regression (whether +7 is acceptable to close Phase 98 as-is) is unchanged in kind — still belongs to a human checkpoint — but is now grounded in accurate, per-file evidence instead of an unverified narrative. This is exactly the input the phase's final gap plan (98-10) needs for that checkpoint.
- The recorded phase-boundary measurement files (`details.json`, `history.jsonl`) and the repository's git worktree list were confirmed unchanged at the end of this plan; the scratch JSON files this plan produced remain at `/tmp/claude-1000/-home-coder-repos-bbj-language-server/4c7a6bad-4edc-40f9-978d-7447c6e90bf6/scratchpad/` (`probe-jobs.json`, `probe-baseline.json`, `regression-working-note.md`, `probe-synthetic.mts`) for 98-10 to reuse if needed, outside the repository.

---
*Phase: 98-line-break-validation-false-alarms-a2*
*Completed: 2026-09-21*

## Self-Check: PASSED

- FOUND: .planning/phases/98-line-break-validation-false-alarms-a2/98-CONFORMANCE.md
- FOUND commit: 03d9af98 (docs(98-09): record per-file evidence for the B-regression cause)
- Re-ran plan `<verification>` block 1: `history.jsonl` and `details.json` byte-identical to the task-1 snapshots (confirmed via `diff`, no output).
- Re-ran plan `<verification>` block 2: `git worktree list` prints exactly one line (the main checkout).
- Re-ran plan `<verification>` block 3: `git status --porcelain` shows only the pre-existing untracked `.planning/milestone.lock`; no scratch file inside the repository.
- Re-ran plan `<verification>` block 4: the corpus-path grep prints nothing.
- Re-ran plan `<verification>` block 5 (whole suite, `--maxWorkers=2`): `numFailedTests: 0` (1992 passed, 2059 total).
- Re-ran plan `<verification>` block 6: `.planning/REQUIREMENTS.md` not present in the diff or in `git status`.
