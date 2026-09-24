---
phase: 104-conformance-measurement-milestone-exit
plan: 04
subsystem: testing
tags: [conformance-harness, leak-guard, corpus-privacy]

requires:
  - phase: 104-conformance-measurement-milestone-exit
    provides: "the closing measurement (plan 03) and the code review / verification that found the leak-guard gap"
provides:
  - "leak-guard.mjs matches report-truncated, backtick-substituted and partly-quoted excerpts of a corpus source line, not just a byte-for-byte full-line copy"
  - "a self-test (leak-guard.test.mjs) that proves the guard catches those three shapes and stays silent on a clean file, without ever echoing the fixture text"
  - "the six *-CONFORMANCE.md / PROJECT.md records and the whole milestone's planning markdown re-swept with a stricter, independently-sourced prefix/exact scanner and rephrased in own words wherever it found real corpus-derived text"
affects: [104-VERIFICATION, PR-691]

actuals:
  tokens: 6700
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Leak-guard pattern candidates: whole normalized line, REPORT_TRUNCATE (110-char) prefix, QUOTED_PREFIX (30-char) prefix — normalized the same way run.mjs's own report helper normalizes an excerpt (trim, backtick to quote) before it can reach a public file."
    - "Wider-than-the-guard scanner: read every corpus/reject file's own line content (tagged by its real source id) plus every details.json revision/snapshot/reject-error source (tagged `(details)`), so the fix is judged by a pattern source independent of the tool being fixed."

key-files:
  created:
    - /home/coder/repos/bbj-corpus/conformance/leak-guard.test.mjs
    - /home/coder/repos/bbj-corpus/conformance/snapshots/phase-104-04-prefix-scan.mjs (ignored scratch, never committed)
  modified:
    - /home/coder/repos/bbj-corpus/conformance/leak-guard.mjs
    - .planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md
    - .planning/ROADMAP.md

key-decisions:
  - "The four verifier-flagged rows in 100-CONFORMANCE.md were all the same underlying leak (a message-table row quoting a real assignment's right-hand side, a multi-word identifier and a decimal literal), appearing once per plan-01..04 run table; rephrased identically in all four to a single own-words shape description."
  - "The prefix-scan scanner's own source-id tagging (real corpus category vs `(details)`) showed 100-05-SUMMARY.md line 175 — the planner's third expected private hit — is actually PUBLIC: its matching line also exists verbatim in this repository's own ls-examples content (it quotes examples/issue246.bbj, which this repo already ships). Left unedited per the plan's own public-hit rule; recorded below instead of the planner's stale prediction."
  - "ROADMAP.md's phase-99 criterion 2 (the fused LEN= combined-verb group) was the real line-373 leak, not criterion 3 (the `label` keyword group) as first assumed from a stale line-number read; both were rephrased anyway (373 as the required fix, 374 as a harmless precaution) and the re-scan confirms both are now clean."

requirements-completed: []

coverage: []

duration: ~70min
completed: 2026-09-23
status: complete
---

# Phase 104 Plan 04: Leak-Guard False-Negative Fix and Corpus-Text Sweep Summary

**Fixed leak-guard.mjs's truncation/backtick/partial-quote false negatives with a self-test, then swept and rephrased every corpus-derived excerpt a fixed guard and a wider, independently-sourced scanner could find across the milestone's public planning text.**

## Performance

- **Duration:** ~70 min
- **Tasks:** 3
- **Files modified:** 5 (2 bbj-corpus, 3 bbj-language-server)

## Accomplishments

- `leak-guard.mjs` now compares backtick-normalized text on both sides and checks three candidates per corpus source line (whole line, 110-char report-truncated prefix, 30-char quoted-leading-part prefix), closing the exact false-negative mechanism 104-REVIEW.md's CR-01 described and the verifier observed.
- A synthetic self-test (`leak-guard.test.mjs`) proves the fix: RED against the unfixed guard on three shapes (truncated, backtick-substituted, partly quoted), GREEN against the fixed guard, plus a clean-file case and a no-echo case that scans the guard's own stdout for any 15-character slice of the fixture text.
- The fixed guard, run over the pinned pre-fix revision of `100-CONFORMANCE.md` (`eb6faab6`), reports exactly the four rows the phase verification found (lines 76, 176, 279, 419) and nothing else.
- A separate, wider scanner (never committed, ignored scratch) built from the corpus's own file content plus every details-record source this repository has ever held — not from the guard's own pattern set — found 3 more hits in `100-CONFORMANCE.md` and 2 in `ROADMAP.md`, all now rephrased in own words. It confirmed 0 hits on the six `*-CONFORMANCE.md`/`PROJECT.md` records on both corpus builds, and 0 private hits across all 185 milestone-added/changed planning markdown files.

## Task Commits

1. **Task 1 (RED/GREEN self-test + guard fix + rephrase)**:
   - `218b96f5` (bbj-corpus) — test: a self-test for the leak guard
   - `54e63667` (bbj-corpus) — conformance: leak guard catches truncated, backtick-substituted and partly quoted excerpts
   - `0cc4d6fd` (bbj-language-server) — docs(104-04): replace corpus-derived diagnostic text in the phase 100 conformance record
2. **Task 2 (six-record measurement + rephrase)**:
   - `191b7668` (bbj-language-server) — docs(104-04): replace the remaining corpus-derived text in the conformance records
3. **Task 3 (milestone-wide sweep + rephrase)**:
   - `6df717cd` (bbj-language-server) — docs(104-04): replace corpus-derived text in the roadmap and a phase 100 summary

**Plan metadata:** (this commit) — docs(104-04): complete gap closure plan

## Files Created/Modified

- `/home/coder/repos/bbj-corpus/conformance/leak-guard.mjs` — three-candidate, backtick-normalized pattern matching (`REPORT_TRUNCATE`, `QUOTED_PREFIX`, `MIN_PATTERN`); CLI, output format and exit codes unchanged.
- `/home/coder/repos/bbj-corpus/conformance/leak-guard.test.mjs` — self-test loading `run.mjs`'s own `code()` transform via a `data:` URL import (never copies it), five leak-shape cases plus a no-echo check.
- `/home/coder/repos/bbj-corpus/conformance/snapshots/phase-104-04-prefix-scan.mjs` — ignored scratch scanner: prefix family (corpus/reject file lines + details-derived strings) and exact family (details-derived strings only), with a `--broad` public/private triage mode.
- `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md` — 7 rows/cells rephrased in own words across two commits (4 identical message-table rows, plus 3 more found by the wider scanner).
- `.planning/ROADMAP.md` — 3 lines rephrased in own words (phase 99 criteria 2 and 3, phase 100 criterion 1).

## RED/GREEN Self-Test Results

Against the **unfixed** guard (RED):
```
ok load-transform
ok fixture-sanity
SELF-TEST FAIL truncated: expected exit 1 with a 'corpus source line' LEAK on line 3, got exit 0
SELF-TEST FAIL backtick: expected exit 1 with a 'corpus source line' LEAK on line 3, got exit 0
SELF-TEST FAIL partial: expected exit 1 with a 'corpus source line' LEAK on line 1, got exit 0
ok clean
ok no-echo
```

Against the **fixed** guard (GREEN): all 7 cases print `ok`.

Fixed guard against the pinned pre-fix `100-CONFORMANCE.md` (`eb6faab6`): exit 1, `LEAK … line 76/176/279/419: corpus source line` — exactly the verifier's four rows, nothing else.

## Per-File Hit Counts (before → after)

**Task 2 — fixed guard (both corpus builds) + scanner default mode, six records:**

| File | Guard (default root) | Guard (`--data` baseline) | Scanner default (prefix + exact) |
|---|---|---|---|
| 98-CONFORMANCE.md | clean → clean | clean → clean | 0 → 0 |
| 99-CONFORMANCE.md | clean → clean | clean → clean | 0 → 0 |
| 100-CONFORMANCE.md | clean → clean | clean → clean | 3 → 0 (line 252 exact, line 479 prefix, line 671 exact) |
| 103-CONFORMANCE.md | clean → clean | clean → clean | 0 → 0 |
| 104-CONFORMANCE.md | clean → clean | clean → clean | 0 → 0 |
| PROJECT.md | clean → clean | clean → clean | 0 → 0 |

Scanner fired on the pinned pre-fix `100-CONFORMANCE.md` before any of this plan's edits: `HIT line 76/176/279/419: prefix`, `HIT line 479: prefix`, `HIT line 252: exact`, `HIT line 671: exact` — confirming the scanner is not merely silent by construction.

**Task 3 — `--broad` sweep, 185 milestone-added/changed planning markdown files:**

| Result | Before | After |
|---|---|---|
| Counted (private) HIT | 2 (`ROADMAP.md` line 373, line 415) | 0 |
| PUBLIC (left as is) | 6 | 6 (unchanged — correctly identified as public both times) |

## PUBLIC Lines (left as is, not leaks)

| File | Line | Public source id(s) |
|---|---|---|
| `100-05-SUMMARY.md` | 143 | ls-examples |
| `100-05-SUMMARY.md` | 175 | (details), ls-examples |
| `100-05-SUMMARY.md` | 189 | ls-examples |
| `101-PATTERNS.md` | 190 | docs-samples |
| `102-RESEARCH.md` | 170 | bbj-install, docs-samples, samples |
| `102-RESEARCH.md` | 188 | bbj-install, docs-samples, samples |

`100-05-SUMMARY.md` line 175 was the planner's third expected private hit (`100-05-SUMMARY.md line 175: a quoted call in a bullet`); the wider scanner's own source-id tagging shows it also exists verbatim in this repository's own `ls-examples` content (it quotes `examples/issue246.bbj`, which the phase 100 plan itself already committed publicly), so it is correctly public and was left unedited, per the plan's own re-derive-don't-trust-the-probe instruction.

## Corpus Housekeeping

- `bbj-corpus` has exactly two new commits: `218b96f5` (self-test) then `54e63667` (guard fix). `eval/` untouched throughout (`git status --porcelain` = `?? eval/` before, during and after).
- Scanner kept as ignored scratch at `bbj-corpus/conformance/snapshots/phase-104-04-prefix-scan.mjs` (confirmed via `git check-ignore`), never committed, for re-verification.
- Baseline worktree `/home/coder/repos/bbj-corpus-baseline`, detached at `cdaf3761` (`corpus_entries: 11898`, `reject_entries: 1210`, `build: "build on September 1 2026"`), created for task 2's dual-build measurement and removed after this SUMMARY's own leak-guard/scanner check (see below).

## Decisions Made

See `key-decisions` in frontmatter. In short: the four verifier rows were one repeated leak shape, rephrased once and applied identically across all four occurrences; `100-05-SUMMARY.md` line 175 turned out public rather than private on re-derivation with the wider scanner, and was left alone accordingly; the `ROADMAP.md` line-373 leak was actually the phase-99 LEN= criterion (not the `label` criterion first assumed from a stale line-number read) — both were rephrased, the extra one as a harmless precaution.

## Deviations from Plan

### Auto-fixed Issues

None beyond the plan's own scope — every edit in this plan is a text rephrase of a hit the guard or scanner itself reported, exactly as the plan's tasks specify. No Rule 1-4 deviation applied.

## Issues Encountered

An initial manual line-number read of `ROADMAP.md` around the phase-99 success criteria mis-identified which criterion sat at line 373 before any edits were made. This led to a first-pass rephrase of the `label` criterion (line 374), which the scanner had not actually flagged, while the real hit (line 373, the LEN= combined-verb criterion) was still present at the following re-scan. A second edit fixed the actual leak; the `label` edit was left in place as a harmless precaution and does not change that criterion's meaning. Both are confirmed clean by the final broad sweep.

## User Setup Required

None.

## Next Phase Readiness

- The leak-guard's false-negative gap (104-REVIEW.md CR-01, 104-VERIFICATION.md's one failed truth) is closed and covered by a regression self-test.
- All six `*-CONFORMANCE.md`/`PROJECT.md` records and the milestone's own planning markdown are clean per both the fixed guard (on both corpus builds) and the wider scanner (`--broad`, 0 counted).
- **Next steps (user decisions, not taken here):** pushing these commits to PR #691, and deciding whether to rewrite that PR's already-pushed history (the text this plan removes is still present in earlier pushed commits; a squash merge keeps it off `main`, but GitHub retains the PR's individual commits), are the user's calls. The phase needs re-verification (`/gsd-plan-phase 104` follow-up or a direct re-run of `/gsd-verify-work`-equivalent verification) to close out `104-VERIFICATION.md`'s one open gap. `CONF-02`/`CONF-03` remain intentionally unmarked in `REQUIREMENTS.md`, left for the re-verification step per the plans' own executor-shell-rules.

---
*Phase: 104-conformance-measurement-milestone-exit*
*Completed: 2026-09-23*

## Self-Check: PASSED

All created/modified files and all task commit hashes (`218b96f5`, `54e63667`, `0cc4d6fd`, `191b7668`, `6df717cd`) confirmed present on disk / in `git log --all`.
