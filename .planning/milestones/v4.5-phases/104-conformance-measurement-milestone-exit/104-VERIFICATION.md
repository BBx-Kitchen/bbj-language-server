---
phase: 104-conformance-measurement-milestone-exit
verified: 2026-09-23T23:10:00Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/4
  gaps_closed:
    - "The result and the residual list-A entries with reasons are recorded where the next milestone starts, with no corpus content or proprietary BBj source text in this repository (ROADMAP success criterion 4)."
  gaps_remaining: []
  regressions: []
---

# Phase 104: Conformance Measurement and Milestone Exit Verification Report

**Phase Goal:** The milestone's result is measured, reproducible and written down — the harness can run with the endpoint active, maintainers know how to run it, and the exit numbers are on record.
**Verified:** 2026-09-23
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 104-04)

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP success criterion) | Status | Evidence |
|---|---|---|---|
| 1 | The conformance run can be pointed at a BBjServices offering the endpoint, reports list B with its verdicts, and endpoint mode is documented for maintainers. | ✓ VERIFIED (regression) | No change under `bbj-vscode/`/`bbj-intellij/` since the prior pass (`git diff --quiet eb6faab6 HEAD -- bbj-vscode bbj-intellij` exits 0, re-run directly). `run.mjs` still carries `--endpoint` wiring (`grep -c endpoint run.mjs` = 50, unchanged file). Previously verified against committed `summary.json` (`endpoint: {..., calls:13108, failures:0}`) and both READMEs. |
| 2 | On the corpus build of the baseline the final run reports A ≤ 25, A2 ≤ 25, B ≤ 5 % of 1,210 with the endpoint active. | ✓ VERIFIED (regression) | `104-CONFORMANCE.md`'s exit-gate line is unchanged by plan 104-04 (only diagnostic-message table cells were rephrased, not the numeric gate): `A = 9 (≤ 25), A2 = 22 (≤ 25), B = 31 of 1,210 (2.6 %, ≤ 5 %), endpoint failures = 0 — passed.` Re-read directly at line 9. |
| 3 | Every existing test suite is green on the final tree (bbj-vscode vitest incl. 98-100 regression files and examples/ assertions, and the IntelliJ Gradle suite). | ✓ VERIFIED (regression) | No `bbj-vscode`/`bbj-intellij` change since the previously-measured tree (`git diff --quiet eb6faab6 HEAD -- bbj-vscode bbj-intellij` exits 0, re-confirmed). Prior pass's numbers (2570/2570 vitest CI-mode, 122/122 IntelliJ JUnit files with 0 failures) stand unchanged. |
| 4 | The result and residual list-A entries with reasons are recorded where the next milestone starts, with no corpus content or proprietary BBj source text in this repository. | ✓ VERIFIED | Gap closed by plan 104-04. See detailed independent checks below — all pass. |

**Score:** 4/4 truths verified (0 present, behavior-unverified)

### Truth 4 — Independent Re-Verification (not relying on the fixed tool alone)

**1. Leak-guard self-test.**
`node /home/coder/repos/bbj-corpus/conformance/leak-guard.test.mjs` → all 7 cases print `ok` (`load-transform`, `fixture-sanity`, `truncated`, `backtick`, `partial`, `clean`, `no-echo`). Exit 0.

**2. Fixed guard, both data roots, six records.**
Ran `node leak-guard.mjs <98,99,100,103,104-CONFORMANCE.md,PROJECT.md>` against the default (current) data root: `clean` for all 6, exit 0, `checked 6 file(s) against 70729 pattern(s)`.
The baseline worktree at commit `cdaf3761` (D-05) had been removed by plan 104-04's own cleanup, as expected; it was recreated for this check (`git -C /home/coder/repos/bbj-corpus worktree add --detach /home/coder/repos/bbj-corpus-baseline cdaf3761`), verified pristine and matching (`corpus_entries: 11898`, `reject_entries: 1210`, `compiler.build: "build on September 1 2026"`), then the same six-file guard run against `--data /home/coder/repos/bbj-corpus-baseline` also reported `clean` for all 6, exit 0, `checked 6 file(s) against 40017 pattern(s)`. The worktree was removed again afterward (`git worktree remove` + `prune`; `git -C bbj-corpus status --porcelain` = `?? eval/` only, confirmed).

**3. Guard has teeth — flags the pre-fix revision.**
Extracted `git show eb6faab6:.../100-CONFORMANCE.md` to a scratch file and ran the fixed guard over it: exit 1, with exactly
`LEAK … line 76: corpus source line`, `line 176`, `line 279`, `line 419` — the same four rows the original verification found, and nothing else. Confirms the fixed tool is not silently permissive.

**4. Independent 30-char-prefix, backtick-normalized scan (own scanner, not the phase's tool).**
Wrote a standalone Node scanner (scratch, `/home/coder/.claude-shared/dot-claude/jobs/d04ed82b/tmp/verifier-scan.mjs`) that:
- builds a private-line-prefix set (30-char leading prefix, backtick-normalized) from `rejects.jsonl` `errors[].source` on both the current and the recreated baseline corpus roots, every committed revision of `bbj-corpus/conformance/details.json` (3 revisions), and every `conformance/snapshots/*details*.json` file;
- builds a public-line-window set (sliding 30-char windows, same normalization) from this repository's own `examples/` and `bbj-vscode/test/test-data/`;
- slides a 30-char window across every line of the 186 `.planning/**/*.md` files this milestone branch adds/changes (`git diff --name-only --diff-filter=AM origin/main...HEAD -- ':(glob).planning/**/*.md'`), classifying any hit as PUBLIC (also present in this repo's own examples/test-data) or PRIVATE.

Result: **private prefix set size 3602, public prefix set size 30052 (sliding). 0 PRIVATE hits, 1 PUBLIC hit** — `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-05-SUMMARY.md:175`. Verified directly: that line quotes `fileopen("Open Server File", "", "", "", "", MODE="CLIENT")`, which is verbatim present in this repository's own `examples/issue246.bbj` (line 6: `path$ = fileopen(...)`) — the same conclusion 104-04-SUMMARY.md records (it also identified this as the planner's stale third prediction, actually public). Confirms both this scan's classification and the SUMMARY's claim independently.

**5. Supplementary whole-line (≥15 char) exact scan, for thoroughness.**
Also ran an exact-containment scan (same private-line set, no 30-char restriction) over the same 186 files. This found 24 "PRIVATE-EXACT" hits and 1 "PUBLIC-EXACT" hit, all with match lengths 15-23 characters. Spot-checking the actual matched lines (already-public repository text, not corpus text) showed these are exactly the kind of short-generic-string false positives 104-04-PLAN.md itself predicted and excluded from the broad sweep ("the whole-line family is too noisy here... matches short generic statements and markdown table rules"): one hit is `.planning/REQUIREMENTS.md:86`, a markdown table separator row (`|---|---|---|`, pure punctuation) coincidentally matching a punctuation-only corpus line; others are ordinary English/Java prose about `ServiceLoader`, Maven/Surefire, and interop internals with no BBj code content. This scan is not part of the required 30-char-prefix method (item 4 above is), and its noise does not change the truth-4 verdict — it corroborates the plan's own design rationale for using prefix-only matching on the broad sweep.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `/home/coder/repos/bbj-corpus/conformance/leak-guard.mjs` | Fixed: normalized, 3-candidate (whole/110-char/30-char) matching | ✓ VERIFIED | Read in full: `REPORT_TRUNCATE=110`, `QUOTED_PREFIX=30`, `MIN_PATTERN=15`, `normalize()` applied both sides, `quotedPrefixes` sliding-window scan present. Matches 104-04-PLAN.md's design and 104-REVIEW.md's CR-01 resolution evidence. |
| `/home/coder/repos/bbj-corpus/conformance/leak-guard.test.mjs` | Self-test, RED against old guard, GREEN against new | ✓ VERIFIED | Exists, run directly, all 7 cases `ok`. 104-REVIEW.md independently reproduced RED against the pre-fix guard at `16a9e746`. |
| `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md` | Rephrased, clean per both guard and independent scan | ✓ VERIFIED | Fixed guard: clean (both roots). Independent 30-char scanner: 0 private hits. Pre-fix revision confirmed still flagged (teeth check above). |
| `.planning/ROADMAP.md`, `100-05-SUMMARY.md` | Milestone-wide sweep, rephrased where private | ✓ VERIFIED | Included in the 186-file independent scan; 0 private hits across the whole set. |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| CONF-02 | 01, 02, 03 | Conformance run can include the `bbj-ls` endpoint, reports list B with it, documented for maintainers | ✓ SATISFIED | Unchanged since prior pass (regression-checked). |
| CONF-03 | 02, 03, 04 | On the corpus build of the baseline, milestone ends A ≤ 25, A2 ≤ 25, B ≤ 5 % with endpoint active, all suites passing | ✓ SATISFIED | Gate numbers unchanged and regression-confirmed; plan 04 also declares `requirements: [CONF-03]` for the leak-guard/privacy fix, which is now closed. |

REQUIREMENTS.md still lists both `CONF-02` and `CONF-03` as "Pending" (`| CONF-02 | Phase 104 | Pending |`, `| CONF-03 | Phase 104 | Pending |`). Per this task's instructions and the plans' own executor-shell-rules, this verification does not mark them — that is the orchestrator's `phase.complete` step.

No orphaned requirements: ROADMAP maps only CONF-02/CONF-03 to Phase 104, both declared across plans 01-04.

### Anti-Patterns Found

No blocker anti-patterns. 104-REVIEW.md's re-review (2026-09-23) confirms **CR-01 is resolved** (0 critical findings) and carries forward the three pre-existing warnings (WR-01 endpoint retry, WR-02 reconciled-field conflation, WR-03 duplicated error-code table) and three info items (IN-01 lowercase-hex ID_SHAPE, IN-02 missing `--data` doc, IN-03 guard's threat-model scope note) — all pre-existing, none touched by plan 04, none blocking the phase goal. These were already recorded as non-blocking warnings/info in the prior verification pass and are unchanged.

## Human Verification Required

None. The previously outstanding item (leak-guard false negative) was directly observable in the codebase and is now directly observable as fixed — confirmed via this verification's own independent tooling (a scanner built fresh, not reusing the phase's fixed guard as the sole check) plus the phase's own self-test and the code reviewer's independent reproduction.

## Gaps Summary

None. All four ROADMAP success criteria for Phase 104 are now met:

1. Endpoint mode works end-to-end and is documented (regression-verified, no source change since prior pass).
2. Exit-gate numbers (A=9, A2=22, B=31 of 1,210 = 2.6%, 0 endpoint failures) are unchanged and still on record in `104-CONFORMANCE.md`.
3. All existing test suites are green (regression-verified via `bbj-vscode`/`bbj-intellij` no-change confirmation).
4. **Closed this round:** no corpus content or proprietary BBj source text remains in the repository. The leak-guard's false-negative defect (104-REVIEW.md CR-01) is fixed and covered by a regression self-test; the fixed guard is proven to have teeth against the pinned pre-fix record; the six conformance records are clean on both corpus data builds; and an independently-written 30-char-prefix scanner — built fresh for this verification, not reusing the phase's own fixed tool — found 0 private hits across all 186 milestone-added/changed planning markdown files (1 hit correctly classified as public, matching this repository's own `examples/issue246.bbj`).

Phase 104's goal — a measured, reproducible, documented, and privacy-clean milestone exit record — is achieved.

---

*Verified: 2026-09-23*
*Verifier: Claude (gsd-verifier)*
