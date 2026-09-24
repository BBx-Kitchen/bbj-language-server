---
phase: 104-conformance-measurement-milestone-exit
plan: 01
subsystem: testing
tags: [conformance, bbj-ls, parseProgram, harness, bbj-corpus]

requires:
  - phase: 103-one-set-of-errors-diagnostic-reconciliation
    provides: reconcileWithVerdict / applyDiagnosticHierarchy / parseErrorsToDiagnostics, the reconciliation product code this plan's harness calls (never reimplements)
  - phase: 101-bbj-parser-endpoint-in-bbj-ls
    provides: the parseProgram JSON-RPC endpoint in bbj-ls behind BBjServices :5008
provides:
  - "conformance/run.mjs and worker.mts in the private bbj-corpus repo gain an --endpoint <host>:<port> flag: every corpus and reject file is additionally sent to the real BBj parser, and list B is reported both raw (Langium alone) and reconciled (with the endpoint's verdict applied)"
  - "conformance/run.mjs gains a --data <dir> flag to read the corpus/reject data from another checkout root while still writing REPORT/summary/details/history next to run.mjs"
  - "conformance/leak-guard.mjs (new): scans any file bound for the public repository for corpus ids, file names, origin names and source lines before it is committed"
  - "bbj-corpus README's conformance section documents endpoint mode for maintainers"
  - "a detached bbj-corpus worktree at commit cdaf3761 (the pinned Sept-1-2026 build, 11,898 accepted / 1,210 rejected) left in place at /home/coder/repos/bbj-corpus-baseline for plans 02 and 03"
affects: [104-02-test-gate, 104-03-closing-measurement]

actuals:
  tokens: 10340
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "harness endpoint branch guarded by a 5th argv, byte-identical flag-off path (D-01)"
    - "one dedicated JavaInteropService connection per shard, strictly sequential per-shard dispatch, never Promise.all over a shard's job list"
    - "raw (Langium) view and reconciled (endpoint-verdict) view reported side by side; gate reads A/A2 raw, B reconciled (D-03)"
    - "leak-guard.mjs: exact-substring pattern set collected from manifest/rejects/details.json, applied to any file before it leaves the private repo"

key-files:
  created:
    - /home/coder/repos/bbj-corpus/conformance/leak-guard.mjs
  modified:
    - /home/coder/repos/bbj-corpus/conformance/run.mjs
    - /home/coder/repos/bbj-corpus/conformance/worker.mts
    - /home/coder/repos/bbj-corpus/conformance/.gitignore
    - /home/coder/repos/bbj-corpus/README.md
    - /home/coder/repos/bbj-corpus/conformance/REPORT.md (rewritten by the closing run, left uncommitted for plan 03)
    - /home/coder/repos/bbj-corpus/conformance/summary.json (rewritten by the closing run, left uncommitted for plan 03)
    - /home/coder/repos/bbj-corpus/conformance/details.json (rewritten by the closing run, left uncommitted for plan 03)
    - /home/coder/repos/bbj-corpus/conformance/history.jsonl (appended by the closing run, left uncommitted for plan 03)

key-decisions:
  - "leak-guard.mjs applies the same 15+ character floor to reject errors[].source patterns as it does to details.json source fields -- an unfiltered 1-4 character source fragment is common English text, not a leak, and produced false positives on ordinary sentences during verification (found and fixed within this plan, not a deviation requiring approval)"
  - "checkExceptions detail-entry message text is derived from the already-available firstValidation/reconciled.first fields (matched against the check-exception message pattern) rather than adding a new worker.mts per-diagnostic export, since worker.mts's own per-job contract exposes only a count for this field"
  - "missedReconciled is 'reconciled verdict is not error' (not 'missed or warning-only' as first drafted in Task 1) -- matches the plan text literally and keeps a crashed reject counted as missed, the same way the raw (flag-off) view already treats a crash"

requirements-completed: []

coverage:
  - id: D1
    description: "--endpoint flag added to run.mjs/worker.mts; a sampled endpoint run reports calls>0, 0 failures, and a 'with the BBj verdict' list-B row"
    requirement: CONF-02
    verification:
      - kind: other
        ref: "node run.mjs --ls <repo> --endpoint 127.0.0.1:5008 --limit 20 --shards 2 (tracer verify)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Flag-off harness output is byte-identical before and after the endpoint-mode edits (REPORT-sample.md diff empty, summary fields equal apart from date/seconds/commit)"
    verification:
      - kind: other
        ref: "diff of phase-104-flagoff-before/after REPORT-sample.md and summary.json (Task 2 verify)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A full endpoint-on run over the pinned Sept-1-2026 baseline build (11,898/1,210) completes with 0 endpoint failures and reproduces the Phase 103 probe's list-B file set exactly"
    requirement: CONF-02
    verification:
      - kind: other
        ref: "full baseline run (13,108 calls, 0 failures, gate A=9/A2=22/B=31) + missedReconciled-vs-probe set comparison (Task 3 Step 4)"
        status: pass
    human_judgment: false
  - id: D4
    description: "leak-guard.mjs correctly distinguishes ordinary text from corpus-derived content"
    verification:
      - kind: other
        ref: "leak-guard.mjs run against a clean scratch file (exit 0) and a dirty scratch file naming a real reject id (exit 1) -- Task 2 verify"
        status: pass
    human_judgment: false
  - id: D5
    description: "bbj-corpus README documents endpoint mode for maintainers (flag, BBj version prerequisite, raw/reconciled columns, zero-failure gate rule)"
    requirement: CONF-02
    verification:
      - kind: other
        ref: "grep checks for --endpoint, --data, 26.03, 'zero endpoint failures', 'validation always runs' in README.md"
        status: pass
    human_judgment: false

duration: 30min
completed: 2026-09-23
status: complete
---

# Phase 104 Plan 1: Conformance Harness Endpoint Mode Summary

**Added `--endpoint`/`--data` flags and a `leak-guard.mjs` scanner to the private `bbj-corpus` conformance harness, promoting Phase 103's scratch probe into the harness proper, and reproduced the probe's baseline measurement (B = 31 of 1,210, 0 endpoint failures) from a pinned worktree of the milestone's own corpus build.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 3
- **Files modified:** 8 in `bbj-corpus` (1 created: `leak-guard.mjs`); 0 in `bbj-language-server` other than this SUMMARY

## Accomplishments

- `run.mjs`/`worker.mts` gained `--endpoint <host>:<port>`: every corpus and reject file is additionally sent through the real `bbj-ls` `parseProgram` endpoint (one dedicated connection per shard, strictly sequential dispatch, bounded retries for transient failures), and the product's own `reconcileWithVerdict` + `applyDiagnosticHierarchy` decide the reconciled verdict — none of that reconciliation was reimplemented.
- The harness now reports both views: the raw (Langium-only) A/A2/B numbers stay byte-identical to the flag-off run, and a parallel reconciled view (including a "valid code that drew a BBj Parser error" disagreement row, a reconciled reject table, and endpoint failure/check-exception tallies) appears only when `--endpoint` is given.
- `--data <dir>` lets the harness read another corpus checkout's data while still writing its own reports next to `run.mjs`, which is what let this plan measure against a pinned worktree of the exact milestone-baseline build (11,898 accepted / 1,210 rejected, compiler build of September 1 2026) rather than the private repo's current, larger, rebuilt `main`.
- `leak-guard.mjs` (new) scans a target file for corpus ids, file names, origin names and source-line content before it leaves this repository, never printing the matched text itself.
- A full endpoint-on run against the pinned baseline: 13,108 calls, **0 failures**, gate numbers **A = 9, A2 = 22, B = 31 of 1,210 (2.6 %)** — reproducing the Phase 103 probe's exact missed-file set (31 = 31, no set difference either direction).
- The Phase 103 scratch probe (`snapshots/phase-103-endpoint-probe.mts`/`.json`) is retired; its method now lives in the tracked harness.
- A detached worktree at `bbj-corpus` commit `cdaf3761` (the pinned baseline build) is left at `/home/coder/repos/bbj-corpus-baseline` for plans 02 and 03.

## Task Commits

All commits are in the private `bbj-corpus` repository (this plan makes no source changes in `bbj-language-server`):

1. **Task 1, Step 0: preserve the 98-103 conformance results** — `9cf78ccb` (conformance: record the language-server runs through Phase 103) — commits `conformance/REPORT.md`, `details.json`, `history.jsonl`, `summary.json` as they stood (corpus 11,898/1,210, compiler build of September 1 2026).
2. **Task 2, Part F: endpoint mode, --data and leak-guard** — `ebcb461f` (conformance: endpoint mode, --data and a leak guard) — `conformance/run.mjs`, `worker.mts`, `leak-guard.mjs` (new), `.gitignore`.
3. **Task 3, Step 7: README** — `380f38bb` (README: conformance endpoint mode) — `README.md` only; the closing run's result files are intentionally left uncommitted for plan 03.

**Plan metadata:** committed separately after this SUMMARY (see below).

## Files Created/Modified

- `bbj-corpus/conformance/run.mjs` — `--endpoint`/`--data` flags, raw+reconciled classification, extended REPORT/summary/details/history output, all additive and guarded by `endpoint` so the flag-off path is unchanged
- `bbj-corpus/conformance/worker.mts` — endpoint branch (5th argv): dedicated per-shard connection, sequential `parseProgram` calls with a 60 s watchdog and bounded retries, reconciliation via the language server's own exported functions, per-job `reconciled`/`checkExceptions` result keys
- `bbj-corpus/conformance/leak-guard.mjs` (new) — corpus-content scanner for any file bound for the public repository
- `bbj-corpus/conformance/.gitignore` — added `snapshots/` and `REPORT-sample.md`
- `bbj-corpus/README.md` — new "Endpoint mode" subsection under "Conformance of the language server"
- `bbj-corpus/conformance/{REPORT.md,summary.json,details.json,history.jsonl}` — rewritten/appended by the Task 3 closing run against the pinned baseline; left uncommitted intentionally (plan 03 commits the phase's actual closing run's results)

## Decisions Made

- Within-plan bug fix: `leak-guard.mjs`'s reject `errors[].source` patterns needed the same 15+ character floor already used for `details.json` source fields — an unfiltered short fragment ("m", ".", a 4-letter word) is ordinary English text and produced false positives on a clean scratch sentence during the plan's own verify step. Fixed before the Task 2 commit; verified via the plan's own clean/dirty leak-guard test.
- `missedReconciled`'s definition settled on "reconciled verdict is not `'error'`" (matching the plan text literally), which also makes a crashed reject count as missed in the reconciled view — the same treatment a crash already gets in the raw (flag-off) view's `caughtBy`.
- The `checkExceptions` details-entry message text is derived from the already-computed `firstValidation`/`reconciled.first` fields rather than adding a new worker.mts export solely for message capture, since CONTEXT.md's Claude's-Discretion item explicitly leaves exact field shapes to discretion and the frontmatter pins `worker.mts`'s own per-job `checkExceptions` key to a count only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] leak-guard.mjs false-positived on ordinary text via unfiltered short reject source fragments**
- **Found during:** Task 2's own leak-guard verify step (the "clean" scratch file test)
- **Issue:** Reject records' `errors[].source` strings were added as exact-match patterns with no minimum length, so a 1-4 character fragment (a stray punctuation character, a short common word) matched substrings of unrelated, non-corpus text
- **Fix:** Applied the same 15+ character minimum already specified for `details.json`'s `source` fields to `errors[].source` too
- **Files modified:** `bbj-corpus/conformance/leak-guard.mjs`
- **Verification:** Re-ran the plan's own clean/dirty leak-guard verify pair — clean file now exits 0, dirty file (naming a real reject id) still correctly exits 1 with 3 real hit kinds
- **Committed in:** `ebcb461f` (Task 2's commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for the leak guard to do its actual job (distinguish real leaks from ordinary text) without also blocking every future SUMMARY on false positives. No scope creep.

## Issues Encountered

- The Phase 103-era corpus rebuild flagged by 104-RESEARCH.md as a blocking finding (`bbj-corpus`'s shared `main` was rebuilt mid-milestone to 16,884/4,615 files under a newer compiler build) was already resolved by this plan's own Task 3 design: the closing measurement in this plan reads from a detached worktree pinned to commit `cdaf3761` (the exact 11,898/1,210, September-1-2026 baseline) via `--data`, never touching or depending on `main`'s current state. No user checkpoint was needed — the plan's own task text already specified the worktree mitigation as the resolution.
- The leak-guard audit (Task 2, Part E) over the four earlier `*-CONFORMANCE.md` files in this repository found hits, recorded here by file/line/kind only per the audit's own no-edit rule (plan 03 handles them before its push):
  - `98-CONFORMANCE.md` line 185: origin name
  - `99-CONFORMANCE.md`: clean
  - `100-CONFORMANCE.md` line 118: corpus source line; line 731: origin name; line 745: origin name
  - `103-CONFORMANCE.md`: clean

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- CONF-02's harness half is done: `--endpoint` reports list B with the real endpoint's verdict, `--data` measures a pinned corpus build, and the corpus repo's README documents the procedure for maintainers.
- The pinned baseline worktree (`/home/coder/repos/bbj-corpus-baseline` at `cdaf3761`) is in place and verified pristine, ready for plans 02 and 03 to reuse without re-creating it.
- Evidence snapshots (`conformance/snapshots/phase-104-01-endpoint-{summary,details}.json`) are saved for plan 03's closing-measurement comparison.
- `conformance/{REPORT.md,summary.json,details.json,history.jsonl}` in `bbj-corpus` currently hold this plan's own closing-run numbers (uncommitted) — plan 03's actual closing run will overwrite them again with the phase's final numbers before committing.
- No blockers for plan 02 (test gate).

## Self-Check: PASSED

- `/home/coder/repos/bbj-corpus/conformance/leak-guard.mjs` exists on disk — confirmed.
- `/home/coder/repos/bbj-corpus-baseline` exists, is a git worktree at `cdaf3761`, and is pristine — confirmed.
- `git -C /home/coder/repos/bbj-corpus log --oneline --all` contains `9cf78ccb`, `ebcb461f`, `380f38bb` — confirmed.
- `bbj-vscode/src` in this repository is unmodified (`sourceModified: false` in every run's summary) — confirmed.
- `git -C /home/coder/repos/bbj-corpus status --porcelain -- eval` prints `?? eval/` (never touched) — confirmed.

---
*Phase: 104-conformance-measurement-milestone-exit*
*Completed: 2026-09-23*
