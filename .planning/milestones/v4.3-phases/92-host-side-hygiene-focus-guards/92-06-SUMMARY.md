---
phase: 92-host-side-hygiene-focus-guards
plan: "06"
subsystem: build-verification
tags: [vsix, intellij-plugin, gradle-buildplugin, vitest, lint, register-gate]

# Dependency graph
requires:
  - phase: 92-host-side-hygiene-focus-guards
    provides: "RESP-05..RESP-09 behaviour landed by plans 92-01 through 92-05"
provides:
  - "Proof that a VSIX rebuilt from the final tree carries the shared no-active-file warning, and an IntelliJ zip rebuilt with clean buildPlugin carries BbjFileVisibility with the whole IntelliJ JUnit suite green"
  - "A green whole-suite vitest run, a green lint pass, and register/boundary gates with no output, all on the final phase-92 tree"
  - "The one D-13 live IntelliJ tab-switch check, staged and harvested into UAT, against a plugin rebuilt from the final tree"
affects: []

actuals:
  tokens: 3200
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Build-and-marker-check closeout: rebuild each distributable from the final tree, grep the shipped bundle for a phase-specific symbol/string, and record sha256 digests as tamper evidence rather than trusting a green unit-test run alone"

key-files:
  created: []
  modified: []

key-decisions:
  - "No tracked source or test file was touched in this plan — it only proves and stages, matching the plan's own files_modified: [] and the prohibition against changing bbj-vscode/src, bbj-vscode/test or bbj-intellij/src."
  - "The tracer feedback gate for Task 1 was satisfied by the already-passing automated <verify> chain (auto mode active per workflow._auto_chain_active/auto_advance): re-running it end-to-end confirmed the rebuilt artifacts carry this phase's code before proceeding to Task 2."

patterns-established: []

requirements-completed: [RESP-05, RESP-06, RESP-07, RESP-08, RESP-09]

coverage:
  - id: D1
    description: "The rebuilt VSIX carries the shared no-active-file warning in extension/out/extension.cjs, and the rebuilt IntelliJ zip carries BbjFileVisibility.class in its plugin jar, with the whole IntelliJ JUnit suite (865 tests) passing as part of buildPlugin"
    requirement: "RESP-05"
    verification:
      - kind: other
        ref: "unzip -p /tmp/bbj-lang.vsix extension/out/extension.cjs | grep -F -c \"No active BBj file. Open or select a BBj file and try again.\" => 1"
        status: pass
      - kind: other
        ref: "unzip -p bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip 'bbj-intellij/lib/bbj-intellij-0.1.0.jar' | grep -a -c 'com/basis/bbj/intellij/ui/BbjFileVisibility.class' => 2"
        status: pass
      - kind: integration
        ref: "gradlew clean buildPlugin (IntelliJ JUnit suite via test-results/test/*.xml) => 865 tests, 0 failures, 0 errors, 0 skipped"
        status: pass
    human_judgment: false
  - id: D2
    description: "The whole plain vitest suite, lint, the phase-wide register-id gate and the language-server boundary gate are all green on the final phase-92 tree"
    requirement: "RESP-06"
    verification:
      - kind: unit
        ref: "RUN_BBJ_TESTS=0 npm --prefix bbj-vscode test -- --maxWorkers=2 => Test Files 104 passed | 2 skipped (106); Tests 1873 passed | 29 skipped (1902)"
        status: pass
      - kind: other
        ref: "npm --prefix bbj-vscode run lint => exit 0"
        status: pass
      - kind: other
        ref: "git diff 3ec25f02 -- bbj-vscode/src bbj-vscode/test bbj-intellij/src | grep register-id-pattern => no lines printed"
        status: pass
      - kind: other
        ref: "git diff 3ec25f02 --stat -- bbj-vscode/src/language => no output"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-13's live IntelliJ tab-switch check (both status-bar widgets follow a bare tab switch immediately, with no server-status change) is staged for UAT harvest against a plugin rebuilt from the final tree"
    requirement: "RESP-09"
    verification: []
    human_judgment: true
    rationale: "Requires a running IntelliJ IDE with the rebuilt plugin installed; no IntelliJ sandbox exists in this devcontainer. Recorded verbatim below under Staged human verification for the phase verifier to harvest into 92-UAT.md."

# Metrics
duration: ~20min
completed: 2026-09-13
status: complete
---

# Phase 92 Plan 06: Build Verification and Phase Closeout Summary

**Rebuilt the VS Code VSIX and the IntelliJ plugin zip from the final Phase 92 tree, proved both carry this phase's fixes via marker checks and sha256 digests, confirmed the whole vitest suite (1873 passed, 0 failed), lint, register-id and language-server boundary gates are all green, and staged D-13's live IntelliJ tab-switch check for UAT.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-13T07:47Z
- **Completed:** 2026-09-13T08:05Z
- **Tasks:** 2
- **Files modified:** 0 tracked source/test files (build outputs and this SUMMARY only)

## Accomplishments
- Rebuilt `/tmp/bbj-lang.vsix` via `bbj-ext-install`; `extension/out/extension.cjs` contains the shared warning `No active BBj file. Open or select a BBj file and try again.` (count 1).
- Rebuilt `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` via `clean buildPlugin --offline`; the plugin jar contains `com/basis/bbj/intellij/ui/BbjFileVisibility.class` (count 2). `buildPlugin`'s dependency on `test` ran the whole IntelliJ JUnit suite: 865 tests, 0 failures, 0 errors, 0 skipped, across 101 test classes.
- Whole plain vitest suite (`RUN_BBJ_TESTS=0`, `--maxWorkers=2`): Test Files 104 passed | 2 skipped (106); Tests 1873 passed | 29 skipped (1902). No hook-timeout contention; no rerun needed.
- Lint (`npm run lint`) exited 0 with no reported errors.
- The phase-wide register-id gate (diff against `3ec25f02` over `bbj-vscode/src`, `bbj-vscode/test`, `bbj-intellij/src`) printed nothing — no planning register id in any line added since the phase base.
- The language-server boundary gate (`git diff 3ec25f02 --stat -- bbj-vscode/src/language`) printed nothing — no language-server file changed in this host-side phase.
- `git status --porcelain -- bbj-vscode/src bbj-vscode/test bbj-intellij/src` printed nothing at every checkpoint — this plan changed no tracked source or test file.

## Build Evidence

- **BASE:** `146b452de1a3bac5725df25c46ebf4bc73afb613`
- **VSIX sha256:** `56f910c8cf6ae9b3c431327dfa5486d31ba911abcb965d0c5bf6902f0653a988` (`/tmp/bbj-lang.vsix`)
- **IntelliJ zip sha256:** `5e57a632443365f3002b00409ece82fa10a691ba6dae8086aa2a4b796094f89d` (`bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`)
- **VSIX marker count:** 1 (`No active BBj file. Open or select a BBj file and try again.` in `extension/out/extension.cjs`)
- **IntelliJ zip marker count:** 2 (`com/basis/bbj/intellij/ui/BbjFileVisibility.class` in the plugin jar)
- **IntelliJ JUnit totals (from `buildPlugin`'s `test` dependency):** 865 tests, 0 failures, 0 errors, 0 skipped (101 test classes, via `build/test-results/test/*.xml`)
- **Vitest totals:** Test Files 104 passed | 2 skipped (106); Tests 1873 passed | 29 skipped (1902)
- **Contention reruns:** None needed — the whole-suite run was clean on the first attempt.

## Task Commits

No tracked source, test, or config file was changed by either task in this plan (files_modified: [] per the plan's own frontmatter). No per-task commit was made.

**Plan metadata:** committed together with this SUMMARY, STATE.md and ROADMAP.md (`docs(92-06): complete build verification and phase closeout plan`).

## Files Created/Modified
None (build outputs `/tmp/bbj-lang.vsix` and `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` only; both are untracked/ignored build artifacts, not staged).

## Decisions Made
- No tracked source or test file was touched — this plan only proves and stages, per its own prohibition (resolved) and the plans 92-01 through 92-05 that already own every behaviour.
- The tracer feedback gate after Task 1 was satisfied via the auto-mode branch (`workflow._auto_chain_active`/`workflow.auto_advance` both `true`): the tracer's automated `<verify>` chain (build, install, both marker checks, `clean buildPlugin`) was run end-to-end and passed, so execution proceeded straight to Task 2 with no checkpoint synthesized.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Staged human verification

The following D-13 human check is staged and requires a running IntelliJ IDE (harvested by the phase verifier into `92-UAT.md`):

**Test:**
First rebuild the IntelliJ plugin from the final tree, after any code-review fixes:
`/home/coder/repos/bbj-language-server/bbj-intellij/gradlew -p /home/coder/repos/bbj-language-server/bbj-intellij clean buildPlugin --console=plain -q` writes `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`. Install it in IntelliJ (Settings → Plugins → gear → Install Plugin from Disk) and restart the IDE.

Then, in a project containing a `.bbj` program, a `.bbx` program, a non-BBj file (e.g. `README.md` or a `.java` file) and `config.bbx`:
1. Open all four files as tabs. Wait until the BBj status widget reads `BBj: Ready`, and do not stop or restart the server during the steps below.
2. Click the `.bbj` tab.
3. Click the non-BBj tab.
4. Click the `config.bbx` tab.
5. Click the `.bbx` program tab.
6. Click the `.bbj` tab again.

**Expected:**
- Step 2: both status-bar widgets (`BBj: …` and `Java: …`) are visible.
- Step 3: both disappear immediately, with no server-status change.
- Step 4: both stay hidden for `config.bbx` (the config file).
- Step 5: both appear for the `.bbx` program.
- Step 6: both are visible.
- Each change happens on the tab click itself, not later.

**Why human:** Platform `FILE_EDITOR_MANAGER` delivery, `FileTypeOverrider` resolution for the real `config.bbx` and status-bar repaint need a running IntelliJ; the automated seam test and source guard prove the decision and the wiring only (D-13).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All five ROADMAP success criteria for Phase 92 (RESP-05..RESP-09) are backed by green automated tests on the final tree, and both distributables carry the phase's code, proven with sha256-pinned evidence.
- REQUIREMENTS.md left unchanged by this plan — RESP-05..RESP-09 are marked complete by phase verification after the live check, per this plan's `<interfaces>` and the project's closing-plan convention (matching Phase 91).
- The one remaining live check (D-13's IntelliJ tab-switch behaviour) is staged above for UAT harvest; nothing else blocks Phase 92 closure.

---
*Phase: 92-host-side-hygiene-focus-guards*
*Completed: 2026-09-13*

## Self-Check: PASSED

- `.planning/phases/92-host-side-hygiene-focus-guards/92-06-SUMMARY.md` — FOUND (this file)
- `/tmp/bbj-lang.vsix` — FOUND, sha256 `56f910c8cf6ae9b3c431327dfa5486d31ba911abcb965d0c5bf6902f0653a988`
- `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` — FOUND, sha256 `5e57a632443365f3002b00409ece82fa10a691ba6dae8086aa2a4b796094f89d`
- VSIX marker count 1, IntelliJ zip marker count 2 — both re-checked, matching the recorded evidence above
- `git status --porcelain -- bbj-vscode/src bbj-vscode/test bbj-intellij/src` — empty, re-confirmed
- No commits to verify (no tracked source/test file changed by this plan's tasks)
