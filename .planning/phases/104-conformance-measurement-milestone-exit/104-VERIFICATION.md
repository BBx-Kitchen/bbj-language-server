---
phase: 104-conformance-measurement-milestone-exit
verified: 2026-09-23T22:15:00Z
status: gaps_found
score: 3/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "The result and the residual list-A entries with reasons are recorded where the next milestone starts, with no corpus content or proprietary BBj source text in this repository (ROADMAP success criterion 4)."
    status: failed
    reason: >
      104-CONFORMANCE.md and PROJECT.md themselves pass leak-guard.mjs on both data roots and hold
      no corpus content. But the repository as a whole still does: an independent, stricter
      prefix-based scan (30-char prefixes, backticks normalized) found 4 table rows in
      .planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md
      (a file phase 104 explicitly re-audited and edited in plan 03 Task 3 Step 4, whose SUMMARY
      claims "now clean") that quote a fragment matching a corpus source line prefix -- diagnostic
      messages carrying real variable-name/expression text, not synthetic examples. leak-guard.mjs's
      own containment-based matching has a confirmed, unfixed Critical defect (104-REVIEW.md CR-01):
      it compares full-length stored source patterns against report text that run.mjs's own `code()`
      helper truncates to 110 characters and backtick-substitutes, so a truncated or backtick-altered
      leak never matches and the tool reports the file clean when it is not. No commit after the
      code-review commit (6ff424c3) touches leak-guard.mjs, so the defect is still live in the
      committed tool at HEAD.
    artifacts:
      - path: ".planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md"
        issue: "Contains diagnostic-message table rows quoting real corpus-derived source-code fragments that leak-guard.mjs did not flag; phase 104's own leak-guard audit/fix pass (plan 01 Task 2 Part E, plan 03 Task 3 Step 4) reported this file clean, which codebase evidence contradicts."
      - path: "/home/coder/repos/bbj-corpus/conformance/leak-guard.mjs"
        issue: "Pattern matching compares untruncated, un-backtick-normalized stored patterns against report text that is truncated to 110 chars and backtick-substituted before it reaches any public file (104-REVIEW.md CR-01); produces false negatives (reports 'clean' for a file that actually leaked)."
    missing:
      - "Fix leak-guard.mjs per CR-01 (normalize backticks on both sides; match against both the full pattern and its 110-char report-truncated prefix)."
      - "Re-run the fixed leak-guard over 100-CONFORMANCE.md (and, for safety, 98/99/103-CONFORMANCE.md) and rephrase every newly-flagged row in own words, the same way the two earlier hits were fixed in commit 5633abf7."
---

# Phase 104: Conformance Measurement and Milestone Exit Verification Report

**Phase Goal:** The milestone's result is measured, reproducible and written down — the harness can run with the endpoint active, maintainers know how to run it, and the exit numbers are on record.
**Verified:** 2026-09-23
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP success criterion) | Status | Evidence |
|---|---|---|---|
| 1 | The conformance run can be pointed at a BBjServices offering the endpoint, reports list B with its verdicts, and endpoint mode is documented for maintainers. | ✓ VERIFIED | `run.mjs`/`worker.mts` carry the `--endpoint`/`--data` flags and `reconcileFile` (grep confirmed: `reconcileWithVerdict` present, `process.exit(0)` present); committed `summary.json` at HEAD (`bbj-corpus` commit `16a9e746`) shows `endpoint: {host:"127.0.0.1", port:5008, calls:13108, failures:0, bbjVersion:null}` and `gate` keys; `bbj-corpus/README.md` and `bbj-vscode/test/test-data/conformance/README.md` both document the flag, the BBj 26.03+ prerequisite and the never-in-CI rule. |
| 2 | On the corpus build of the baseline the final run reports A ≤ 25, A2 ≤ 25, B ≤ 5 % of 1,210 with the endpoint active. | ✓ VERIFIED | Committed `bbj-corpus/conformance/summary.json` (HEAD, `bbj-corpus` commit `16a9e746`): `gate: {A:9, A2:22, B:31, endpointFailures:0}` on `corpus.files:11898`, `rejects.files:1210`, `compiler.build:"build on September 1 2026"`, `sampled:false`, `sourceModified:false` — 31/1,210 = 2.6 %, well inside all three targets, matching 104-CONFORMANCE.md's exit-gate line exactly. |
| 3 | Every existing test suite is green on the final tree (bbj-vscode vitest incl. 98-100 regression files and examples/ assertions, and the IntelliJ Gradle suite). | ✓ VERIFIED | Orchestrator-supplied final CI-mode run (`RUN_BBJ_TESTS=0`, cwd `bbj-vscode`): `numTotalTests 2570`, `numFailedTests 0`. Interop-up run per 104-02-SUMMARY: 11 failures, all in `linking.test.ts`'s "Interop related tests" block, matched name-for-name against `origin/main`. IntelliJ: re-checked directly — `bbj-intellij/build/test-results/test/` holds 122 JUnit XML files (timestamped 20:31, matching the plan's execution window), 0 report a `failures="`/`errors="` count ≥ 1. No `bbj-vscode`/`bbj-intellij` change since the measured commit (`git diff --quiet fde1bca9 HEAD -- bbj-vscode bbj-intellij` exits 0, re-run directly). |
| 4 | The result and residual list-A entries with reasons are recorded where the next milestone starts, with no corpus content or proprietary BBj source text in this repository. | ✗ FAILED | `104-CONFORMANCE.md` and the `PROJECT.md` pointer exist, hold the required sections and residual detail, and are individually leak-guard clean. **But** an independent stricter scan found 4 rows of real corpus-derived diagnostic text still present in `100-CONFORMANCE.md` — a file phase 104 specifically re-audited and edited, and whose SUMMARY claims is now clean. See Gaps Summary. |

**Score:** 3/4 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `/home/coder/repos/bbj-corpus/conformance/run.mjs` | `--endpoint`/`--data` flags, reconciled classification, gate key | ✓ VERIFIED | Committed (`16a9e746`); `summary.json`'s `endpoint`/`gate` keys are produced by this file per plan 01's design and match observed output. |
| `/home/coder/repos/bbj-corpus/conformance/worker.mts` | Endpoint branch: per-file real parse verdict, reconciliation | ✓ VERIFIED | `grep -c 'reconcileWithVerdict'` ≥ 1, `grep -c 'process.exit(0)'` ≥ 1 (re-checked). |
| `/home/coder/repos/bbj-corpus/conformance/leak-guard.mjs` | Scans public-bound files for corpus content | ⚠️ VERIFIED-BUT-DEFECTIVE | Exists, exits 0/1 correctly on its own clean/dirty self-test, but has a confirmed unfixed Critical false-negative defect (104-REVIEW.md CR-01) — see gap above. It does what it was built to do, but does not fully do what it needs to do. |
| `/home/coder/repos/bbj-corpus/README.md` | Endpoint-mode procedure for maintainers | ✓ VERIFIED | `--endpoint`, `--data`, `26.03`, zero-failure gate rule all present (grep-confirmed by plan 01's own verify, evidence consistent with file mtime/size). |
| `bbj-vscode/test/test-data/conformance/README.md` | Maintainer pointer, no corpus content | ✓ VERIFIED | Read directly: names `test/conformance-regressions.test.ts` as the covering test, the private `bbj-corpus` repo, `--endpoint`, BBj 26.03+, never-in-CI. No corpus figures or planning identifiers. |
| `.planning/todos/pending/2026-09-23-use-before-assignment-check-throws-on-a-reference-without-a-symbol.md` | D-11 caveat as a pending todo | ✓ VERIFIED | Read directly: substantive Problem/Investigation/Reproduction/Fix-options sections, a confirmed synthetic repro (`## = 1`), no corpus content. |
| `.planning/phases/104-conformance-measurement-milestone-exit/104-CONFORMANCE.md` | The v4.5 exit record | ✓ VERIFIED | Read directly: exit-gate line matches committed `summary.json` exactly (A=9, A2=22, B=31 of 1,210, 2.6 %, 0 endpoint failures); all 11 required section headings present; residual A/A2/B sections in own words; no corpus figures found in this file itself. |
| `.planning/PROJECT.md` | Pointer to the exit record | ✓ VERIFIED | `grep -c 'Conformance starting point.*104-CONFORMANCE.md'` = 1. |
| `.planning/phases/100-parser-gaps-remaining-groups-long-tail-examples/100-CONFORMANCE.md` | Public record, no corpus content (claimed re-cleaned by this phase) | ✗ STILL LEAKING | 4 table rows contain diagnostic-message text quoting real corpus source-line fragments; not caught by the phase's own leak-guard tool (CR-01). |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `bbj-vscode/test/test-data/conformance/README.md` | `bbj-corpus/README.md` | names the private repository and run command | ✓ WIRED | `grep -q 'bbj-corpus'` and the endpoint/version text both present. |
| `bbj-vscode/test/conformance-regressions.test.ts` | `bbj-vscode/test/test-data/conformance/README.md` | test collects only `.bbj` files, never parses the README | ✓ WIRED | `.filter(file => file.endsWith('.bbj'))` confirmed at 3 call sites in the test file — README is safely excluded. |
| `bbj-corpus/conformance/snapshots/phase-104-gate-summary.json` (evidence) | `104-CONFORMANCE.md` | exit-gate line carries exactly the gate run's A/A2/B | ✓ WIRED | Line-for-line equality confirmed against the currently-committed `bbj-corpus/conformance/summary.json` (which the SUMMARY states equals the gate snapshot; the private snapshot itself was not independently re-read here, per the "no full harness re-run" constraint, but the committed file it was copied from was). |
| `.planning/PROJECT.md` | `104-CONFORMANCE.md` | one-line pointer under Next Milestone Goals | ✓ WIRED | Confirmed present, exactly once. |
| local HEAD | PR #691 head ref | fast-forward push | ✓ WIRED | `gh pr view 691`: `state: OPEN`, `headRefName: gsd/phase-102-live-compiler-diagnostics-with-backward-compatibility`, title contains "98-105" — re-checked directly, matches SUMMARY claim. |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| CONF-02 | 01, 02, 03 | Conformance run can include the `bbj-ls` endpoint, reports list B with it, documented for maintainers | ✓ SATISFIED | Endpoint mode exists, committed, exercised (0 failures on the full baseline run); both READMEs document it. |
| CONF-03 | 02, 03 | On the corpus build of the baseline, milestone ends A ≤ 25, A2 ≤ 25, B ≤ 5 % with endpoint active, all suites passing | ✓ SATISFIED | Gate numbers and suite results both verified above. |

REQUIREMENTS.md still lists both as "Pending" — per the plans' own executor-shell-rules ("Do not mark CONF-02/CONF-03 complete in REQUIREMENTS.md; the phase verification does that"), marking them is deferred to this verification step; given the phase's overall status is `gaps_found` (unrelated to these two IDs' own text), that update is left for after the gap is closed rather than done here.

No orphaned requirements: ROADMAP maps only CONF-02/CONF-03 to Phase 104, both declared across the three plans.

### Anti-Patterns Found

| File | Line(s) | Pattern | Severity | Impact |
|---|---|---|---|---|
| `/home/coder/repos/bbj-corpus/conformance/leak-guard.mjs` | 60-69, 81-95, 107-121 (per 104-REVIEW.md CR-01) | Substring-containment matching against untruncated/un-normalized patterns vs. truncated/backtick-substituted report text | 🛑 Blocker | Confirmed exploited: real corpus-derived text is currently sitting, undetected, in a public `.planning` file (see Gaps). |
| `/home/coder/repos/bbj-corpus/conformance/worker.mts` | 79-130 (per 104-REVIEW.md WR-01) | Retry issues a second `parseProgram` call before confirming the first's request is settled on the shared per-shard connection | ⚠️ Warning | Did not manifest in this phase's runs (0 retries recorded in the committed gate summary), but unverified against `java-interop.ts`'s connection semantics; a future run with retries could silently misattribute a response. |
| `/home/coder/repos/bbj-corpus/conformance/run.mjs` + `worker.mts` | 122-125, 272-280 / 132-150 (per 104-REVIEW.md WR-02) | Per-file `reconciled` fields don't distinguish a real endpoint verdict from a Langium-only fallback under the same field name | ⚠️ Warning | Doesn't affect this phase's own numbers (0 endpoint failures in both closing runs, so no fallback occurred), but would obscure investigation in a future run with failures. |
| `bbj-vscode/test/test-data/conformance/README.md` | whole file (per 104-REVIEW.md IN-02) | `--data` flag not documented in the public pointer README | ℹ️ Info | Minor — a maintainer reproducing a historical/pinned measurement would need to read the private README to learn about `--data`. |

## Human Verification Required

None — the outstanding item (the leak-guard gap) is directly observable in the codebase (both the tool's code and the leaked text in `100-CONFORMANCE.md`), not something requiring subjective human judgment.

## Gaps Summary

Three of the four ROADMAP success criteria for this phase are solidly met: the harness's endpoint
mode works end to end and is documented, the exit-gate numbers (A=9, A2=22, B=31 of 1,210 = 2.6%,
0 endpoint failures) are real, committed, and reproduced across three independent runs (plan 01's
reproduction, plan 03's closing endpoint-on run, and the numbers embedded in `104-CONFORMANCE.md`
all agree), and every existing test suite is green by the phase's own "no new failures vs. base"
definition — independently re-confirmed here for the IntelliJ suite (122 result files, 0 failures)
and the CI-mode vitest run (0/2570 failed).

The fourth criterion — "no corpus content or proprietary BBj source text in this repository" — is
not met. `104-CONFORMANCE.md` and `PROJECT.md` themselves are clean. But this phase's own tasks
(plan 01 Task 2 Part E's audit, plan 03 Task 3 Step 4's fix pass) took on responsibility for
scanning and cleaning the four earlier `*-CONFORMANCE.md` records for exactly this kind of leak,
found and fixed some hits, and reported the result as clean. An independent, stricter check (prefix-
based rather than full-pattern, with backticks normalized — precisely the transform `run.mjs`'s own
`code()` helper applies before text reaches any report) found that `100-CONFORMANCE.md` still
carries 4 table rows quoting real corpus source-line fragments (recognizable as real, not synthetic,
by their variable/expression content). This is a direct, live instance of exactly the false-negative
mechanism 104-REVIEW.md's Critical finding (CR-01) already described in `leak-guard.mjs` — a
mismatch between what the tool checks (full-length, unmodified patterns) and what a public file can
actually carry (a truncated, backtick-substituted excerpt). No commit since the code-review report
was added (`6ff424c3`) touches `leak-guard.mjs`, so the defect — and its consequence — are both
still present at HEAD.

Per this task's own instructions, the leaked fragment is not reproduced here; see the artifact/issue
description above and 104-REVIEW.md's CR-01 for the mechanism and a concrete fix.

**This looks like it needs closure, not an override.** The fix is bounded and already scoped by
104-REVIEW.md CR-01: patch `leak-guard.mjs`'s pattern matching (normalize backticks on both sides;
match against both the full pattern and its 110-char truncated prefix), re-run it over
`100-CONFORMANCE.md` (and, for safety, `98-`/`99-`/`103-CONFORMANCE.md`), and rephrase whatever it
newly flags in own words, the same way commit `5633abf7` fixed the earlier round of hits.

---

*Verified: 2026-09-23*
*Verifier: Claude (gsd-verifier)*
