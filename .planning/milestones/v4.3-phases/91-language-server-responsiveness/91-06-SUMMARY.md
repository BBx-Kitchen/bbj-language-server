---
phase: 91-language-server-responsiveness
plan: 06
subsystem: language-server
tags: [build, vsix, intellij-plugin, vitest, release-evidence]

# Dependency graph
requires:
  - phase: 91-language-server-responsiveness
    provides: "91-01 lazy prefix loading + path index, 91-02 per-request completion tokens, 91-03 java-interop circuit breaker, 91-04 in-flight Phase-2 registry / LRU-eviction guard, 91-05 interop recovery document re-check"
provides:
  - "Build evidence that both distributables (VS Code VSIX, IntelliJ plugin zip), rebuilt from the phase's final tree, carry the phase's rebuilt language server bundle (breaker marker present in both, count 1 each)"
  - "Whole-suite, lint, register-check, gated-test-check and IntelliJ-diff-check evidence that every automated gate for RESP-01..04 is green on the final tree"
  - "D-14's live outage-and-recovery human check, staged verbatim for phase-verification harvest into 91-UAT.md"
affects: []

actuals:
  tokens: 950
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Phase closeout as a build-and-prove plan: no tracked source/test file is touched; the plan's only artifacts are two rebuilt distributables plus SUMMARY evidence (BASE sha, both sha256 digests, both bundle marker counts, whole-suite counts)"

key-files:
  created: []
  modified: []

key-decisions:
  - "No tracked file changed in this plan (bbj-vscode/src, bbj-vscode/test, bbj-intellij/src all confirmed clean via git status --porcelain before and after every build step), so neither task produced a per-task commit; only the plan-metadata commit (SUMMARY.md + STATE.md + ROADMAP.md) was made"
  - "Per the plan's project-specific instruction, REQUIREMENTS.md is not edited by this plan — RESP-01..04 are marked complete by the phase verification step after the live D-14 check runs, not here"

requirements-completed: []  # RESP-01..04 intentionally NOT marked complete here — the phase verification step marks them after the live D-14 outage/recovery check runs against these rebuilt artifacts (project-specific-rules instruction)

coverage:
  - id: D1
    description: "The rebuilt VS Code VSIX and IntelliJ plugin zip, both built from the final tree (HEAD 3ca0bf51), each carry the phase's rebuilt language server: the breaker's short-circuit literal is present in main.cjs inside both bundles"
    requirement: "RESP-01"
    verification:
      - kind: other
        ref: "unzip -p /tmp/bbj-lang.vsix extension/out/language/main.cjs | grep -c \"Java interop service unavailable (circuit open)\" -> 1"
        status: pass
      - kind: other
        ref: "unzip -p bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip '*language-server/main.cjs' | grep -c \"Java interop service unavailable (circuit open)\" -> 1"
        status: pass
    human_judgment: false
  - id: D2
    description: "The whole plain suite (RUN_BBJ_TESTS=0, --maxWorkers=2) reports zero failed tests, and lint exits 0"
    requirement: "RESP-01"
    verification:
      - kind: unit
        ref: "RUN_BBJ_TESTS=0 npm --prefix bbj-vscode test -- --maxWorkers=2 -> Test Files 103 passed | 2 skipped (105); Tests 1824 passed | 29 skipped (1853)"
        status: pass
      - kind: other
        ref: "npm --prefix bbj-vscode run lint -> exit 0, no error lines"
        status: pass
    human_judgment: false
  - id: D3
    description: "The phase-wide register check, the gated-test check and the IntelliJ diff check all print nothing (no planning-register id leaked into source/test text, no phase test gated on the live interop service, no bbj-intellij file changed)"
    requirement: "RESP-01"
    verification:
      - kind: other
        ref: "git diff 174985f7 -- bbj-vscode/src bbj-vscode/test | grep '^+' | grep -nE register-id-pattern -> no output"
        status: pass
      - kind: other
        ref: "git diff 174985f7 -- bbj-vscode/test | grep '^+' | grep -nE 'shouldRunBBjTests|RUN_BBJ_TESTS' -> no output"
        status: pass
      - kind: other
        ref: "git diff 174985f7 --stat -- bbj-intellij -> no output"
        status: pass
    human_judgment: false
  - id: D4
    description: "D-14's live outage-and-recovery check (stop/restart a real BBjServices, observe exactly one popup and self-clearing diagnostics) is staged verbatim for phase-verification harvest into UAT, against artifacts rebuilt from the final tree"
    human_judgment: true
    rationale: "Stopping and restarting a real BBjServices, watching IDE popups, and judging editor responsiveness need a live IDE and a real interop peer; the automated suite uses a fake peer by design (D-13)."

duration: ~5min
completed: 2026-09-13
status: complete
---

# Phase 91 Plan 06: Distributable Rebuild and Whole-Phase Gate Evidence Summary

**Both the VS Code VSIX and the IntelliJ plugin zip, rebuilt from HEAD `3ca0bf51`, carry the phase's circuit-breaker language server (marker count 1 in each bundle), and the whole 1853-test suite plus lint plus all three register/gate checks are green with zero failures.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-09-13T01:13:40Z
- **Completed:** 2026-09-13T01:18:42Z
- **Tasks:** 2
- **Files modified:** 0 tracked source/test files (build outputs only)

## Accomplishments

- Rebuilt the VS Code extension (`npm run build` then `bbj-ext-install`), producing `/tmp/bbj-lang.vsix` (sha256 `9b964a1cc88a69995a326748a08c1f09fb1eb2376070b57fb58be5246cb2993c`) and confirmed the "Extension installed" install line.
- Rebuilt the IntelliJ plugin (`gradlew clean buildPlugin --offline --console=plain -q`, exit 0; the `buildSearchableOptions` Swing stack trace is expected headless noise), producing `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` (sha256 `47a9cbf63858be66e8fae8b8c07717a5172c5bcd12a5d45b467baa6c696e6d47`).
- Both bundle marker checks (`unzip -p ... | grep -c "Java interop service unavailable (circuit open)"`) printed `1`, proving both distributables carry the 91-03 breaker's rebuilt `main.cjs`.
- Ran the whole plain suite (`RUN_BBJ_TESTS=0`, `--maxWorkers=2`): `Test Files 103 passed | 2 skipped (105)`, `Tests 1824 passed | 29 skipped (1853)` — zero failed, no contention rerun needed. `npm run lint` exited 0 with no error lines.
- Ran the phase-wide register check, the gated-test check, and the IntelliJ diff check (all three `git diff 174985f7 ...` pipelines from the plan's `<verify>` block) — all three printed nothing, confirming no planning-register id leaked into source/test text, no phase test is gated on reaching the live interop service, and no `bbj-intellij` file changed across the whole phase.
- Confirmed `git status --porcelain -- bbj-vscode/src bbj-vscode/test bbj-intellij/src` prints nothing both before and after every build/test step in this plan.
- Staged D-14's live outage-and-recovery human check verbatim below, for the phase-verification workflow to harvest into `91-UAT.md`.

## Task Commits

Neither task modified a tracked file (frontmatter `files_modified: []`; both tasks are build/verification-only), so there is no per-task commit for this plan.

1. **Task 1: The rebuilt VS Code and IntelliJ distributables carry this phase's language server end to end** — no commit (build outputs only)
2. **Task 2: The whole suite, lint and register check are green across the phase, and the live outage-and-recovery check is staged against the rebuilt artifacts** — no commit (verification only)

**Plan metadata:** (this commit)

## Build Evidence

| Item | Value |
|---|---|
| `BASE` (HEAD at plan start) | `3ca0bf5124f40e1b88e7408781e7431a22b4e578` |
| VSIX path | `/tmp/bbj-lang.vsix` |
| VSIX sha256 | `9b964a1cc88a69995a326748a08c1f09fb1eb2376070b57fb58be5246cb2993c` |
| IntelliJ zip path | `/home/coder/repos/bbj-language-server/bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` |
| IntelliJ zip sha256 | `47a9cbf63858be66e8fae8b8c07717a5172c5bcd12a5d45b467baa6c696e6d47` |
| `main.cjs` entry timestamp (VSIX `unzip -l`) | `2026-09-13 01:14` (`extension/out/language/main.cjs`, 2371458 bytes) |
| `main.cjs` entry timestamp (IntelliJ zip `unzip -l`) | `2026-09-13 01:14` (`bbj-intellij/lib/language-server/main.cjs`, 2371458 bytes) |
| VSIX bundle marker count | 1 |
| IntelliJ zip bundle marker count | 1 |
| Whole-suite result | `Test Files 103 passed \| 2 skipped (105)`; `Tests 1824 passed \| 29 skipped (1853)`; 0 failed |
| Contention rerun | Not needed — the suite passed cleanly on the first `--maxWorkers=2` run |
| Lint | exit 0, no error lines |
| Register check | no output (pass) |
| Gated-test check | no output (pass) |
| IntelliJ diff check (`git diff 174985f7 --stat -- bbj-intellij`) | no output (pass) |
| `git status --porcelain -- bbj-vscode/src bbj-vscode/test bbj-intellij/src` | no output, both before and after all builds |

## Files Created/Modified

- None under `bbj-vscode/src`, `bbj-vscode/test` or `bbj-intellij` — this plan's only outputs are the two rebuilt distributables (untracked build artifacts under `/tmp` and `bbj-intellij/build/`) and this SUMMARY.md.

## Decisions Made

See key-decisions in frontmatter: no per-task commit was possible or needed since no tracked file changed, and `REQUIREMENTS.md` is deliberately not edited by this plan per its project-specific instruction — RESP-01..04 are marked complete by the phase verification step after the live D-14 check.

## Deviations from Plan

None - plan executed exactly as written. Every `<verify>` automated check in both tasks passed on the first attempt; no auto-fix, no architectural question, no auth gate.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Human verification (staged for phase-verification harvest into UAT)

Copied verbatim from the plan's Task 2 `<human-check>` block (91-06-PLAN.md), per D-14:

### Test

First rebuild both distributables from the final tree, after any code-review fixes:
- VS Code: `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run build`, then `bbj-ext-install` (writes `/tmp/bbj-lang.vsix` and installs it into VS Code (ext test)).
- IntelliJ: `/home/coder/repos/bbj-language-server/bbj-intellij/gradlew -p /home/coder/repos/bbj-language-server/bbj-intellij clean buildPlugin --console=plain -q` (writes `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`).

Then, in VS Code (ext test), reload the window and do the following:
1. With BBjServices running, open a `.bbj` file containing `use java.util.HashMap`, `declare HashMap m!` and `m! = new HashMap()`. Wait until diagnostics settle.
2. Stop BBjServices.
3. Add these lines: `use java.util.concurrent.ConcurrentSkipListMap`, `declare ConcurrentSkipListMap a!`, `use java.util.concurrent.LinkedTransferQueue`, `declare LinkedTransferQueue b!`, `use java.util.concurrent.Phaser`, `declare Phaser c!`. Keep typing and hovering normally for about ten seconds.
4. Start BBjServices and wait until it is fully up. Wait at least 30 more seconds.
5. Without typing anything and without running Refresh Java Classes, move the caret onto `ConcurrentSkipListMap` in the `declare` line. If nothing changes within a few seconds, move it off and back once more.

### Expected

- Steps 2-3: exactly one "Failed to connect to the Java interop service…" error popup appears during the whole outage. Typing, completion and hover stay responsive, with no multi-second freeze. The three new `declare` lines show unresolved-class diagnostics.
- Steps 4-5: within about 20 seconds the unresolved-class diagnostics on those lines clear by themselves. No popup or information message appears on recovery, and no edit or Refresh Java Classes was needed.

### Why human

Stopping and restarting a real BBjServices, watching IDE popups, and judging editor responsiveness need a live IDE and a real interop peer. The automated suite uses a fake peer by design (D-13).

### Flagged assumption (from the plan)

D-14 says the stale diagnostics clear "on their own, with no edit." Under D-01's request-driven recovery, some request must reach the server after the peer returns. The human check therefore allows a caret move (not an edit) onto an affected class name. If the tester expects recovery with no interaction at all, that needs a background timer, which D-01 rules out. Record the observed behaviour in UAT either way.

## Next Phase Readiness

- Every automated gate for RESP-01..04 is green on the final tree (`3ca0bf51` plus this plan's build/verify steps, no tracked file changed since).
- Both distributables carry the new server; sha256 digests and marker counts recorded above for phase-verification cross-check.
- D-14's live outage-and-recovery check is staged and ready for the phase-verification workflow to harvest into `91-UAT.md`.
- RESP-01..04 remain NOT marked complete in REQUIREMENTS.md, by design — the phase verification step marks them once the live check above is run and recorded.
- No blockers for phase closeout.

---
*Phase: 91-language-server-responsiveness*
*Completed: 2026-09-13*

## Self-Check: PASSED

- FOUND: .planning/phases/91-language-server-responsiveness/91-06-SUMMARY.md
- No task commits to verify (neither task modified a tracked file; only the plan-metadata commit follows this SUMMARY)
