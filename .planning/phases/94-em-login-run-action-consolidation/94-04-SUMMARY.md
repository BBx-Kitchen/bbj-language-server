---
phase: 94-em-login-run-action-consolidation
plan: 04
subsystem: intellij
tags: [intellij, em-login, run-action, verification, regression-gate, build]

requires:
  - phase: 94-em-login-run-action-consolidation
    provides: "plan 01's BbjToolScriptResolver, plan 02's EmTokenValidator relocation, and plan 03's EM login enablement gate and temp-file cleanup pin — all confirmed still green from the final tree"
provides:
  - "EM-04 closed on cited evidence (commit 6a55b854 + both named delegation guards), recorded as verified-already-true, not newly implemented"
  - "The em-validate-token.bbj naming correction recorded against ROADMAP criterion 5"
  - "The phase's whole-suite regression gate and an installable IntelliJ distributable built from the final tree, with the five UAT items recorded for the verification step"
affects: []

actuals:
  tokens: 1200
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/94-em-login-run-action-consolidation/94-04-SUMMARY.md
  modified: []

key-decisions:
  - "EM-04 (#615) closes as verified-already-true on cited evidence — commit 6a55b854 already extracted the shared BUI/DWC body into BbjRunActionBase.buildWebRunCommandLine before this phase began — never reported as newly implemented in this plan or in the phase as a whole."
  - "No third guard was added for EM-04. EmTokenTrustWindowSourceGuardTest and BbjRunActionConfigPathSourceGuardTest already each pin the delegation exactly once; both were re-verified green from the final tree after plan 02's edits to the shared base, and a third assertion of the same fact would add nothing."
  - "The validation script is em-validate-token.bbj, not em-validate.bbj as ROADMAP criterion 5 and the issue texts for #617 and #614 all call it. Criterion 5 must be read against the real filename, confirmed present at bbj-vscode/tools/em-validate-token.bbj and inside the built distributable at bbj-intellij/lib/tools/em-validate-token.bbj."
  - "The whole-suite gate was run with `./gradlew test --rerun-tasks` rather than a plain `./gradlew test`, specifically to avoid a Task :test UP-TO-DATE no-op silently reporting a stale green from before this phase's edits landed."

requirements-completed: [EM-04]

coverage:
  - id: D1
    description: "EM-04 confirmed still true from the final tree: BbjRunBuiAction and BbjRunDwcAction remain 31 lines each, differing only in the enumerated BUI/DWC literals, and both delegation guards (EmTokenTrustWindowSourceGuardTest, BbjRunActionConfigPathSourceGuardTest) pass after plan 02's edits to the shared base. Closed on cited evidence (commit 6a55b854), not reported as newly implemented."
    requirement: "EM-04"
    verification:
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/EmTokenTrustWindowSourceGuardTest.java (9 tests)"
        status: pass
      - kind: unit
        ref: "bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjRunActionConfigPathSourceGuardTest.java (5 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Naming correction recorded: the validation script is em-validate-token.bbj, not em-validate.bbj as ROADMAP criterion 5, #617 and #614 all call it. Confirmed present in bbj-vscode/tools/ and inside the built distributable."
    verification:
      - kind: other
        ref: "find bbj-vscode/tools -iname 'em-validate*' -> em-validate-token.bbj; unzip -l on the built distributable confirms bbj-intellij/lib/tools/em-validate-token.bbj"
        status: pass
    human_judgment: false
  - id: D3
    description: "Phase regression gate: whole bbj-intellij JUnit suite green (114 suites, 1004 tests, 0 failures, 0 errors, 0 skipped) from the final tree via a forced --rerun-tasks run, matching the orchestrator's independently verified baseline exactly. An installable plugin distributable (bbj-intellij-0.1.0.zip, containing all three bundled tool scripts) was built from the same tree via ./gradlew buildPlugin."
    verification:
      - kind: integration
        ref: "cd bbj-intellij && ./gradlew test --rerun-tasks"
        status: pass
      - kind: integration
        ref: "cd bbj-intellij && ./gradlew buildPlugin"
        status: pass
    human_judgment: false
  - id: D4
    description: "Five UAT items recorded below with expected outcomes for the phase's hand-verification step (EM login enablement/visibility, EM login end-to-end, BUI/DWC launch from all entry points, token lifecycle re-prompt/trust-window behavior, and the GUI-run control)."
    verification: []
    human_judgment: true
    rationale: "No live IntelliJ UI test coverage exists in CI (standing structural gap since v4.1). Action presentation state, browser launch, and credential-prompt flows are only observable in a running IDE, so these require a human to install the built distributable and confirm behavior directly."

duration: ~12min
completed: 2026-09-19
status: complete
---

# Phase 94 Plan 04: EM-04 Closure, Phase Regression Gate and Installable Build Summary

**EM-04 closes on cited evidence as verified-already-true (commit `6a55b854` + two named delegation guards, no third guard added); the whole `bbj-intellij` suite is green from the final tree (114 suites, 1004 tests, 0 failures); and an installable plugin distributable (`bbj-intellij-0.1.0.zip`) is built from that same tree for the hand UAT, with the `em-validate-token.bbj` naming correction recorded against ROADMAP criterion 5.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-09-19T07:29:04Z (approx.)
- **Completed:** 2026-09-19T07:30:29Z (verification/build work); SUMMARY authoring follows
- **Tasks:** 2 completed
- **Files modified:** 0 production files (this plan writes no production code); 1 SUMMARY.md created

## Accomplishments

- **EM-04 (#615) confirmed still true from the final tree.** `BbjRunBuiAction.java` and `BbjRunDwcAction.java` are both exactly 31 lines; the diff between them is confined to the class name, the two javadoc description lines (`BUI (Browser User Interface)` vs `DWC (Dynamic Web Client)`), the constructor's action text/description/icon (`"Run As BUI Program"`/`BbjIcons.RUN_BUI` vs `"Run As DWC Program"`/`BbjIcons.RUN_DWC`), the client-type literal passed to `buildWebRunCommandLine(file, project, "BUI"|"DWC")`, and `getRunMode()`'s return literal. No wider divergence found.
- Commit `6a55b854` ("fix(84): extract shared BUI/DWC command-line builder", 2026-09-06) is the evidence commit that made this true, prior to this phase starting. `EmTokenTrustWindowSourceGuardTest` (9 tests) and `BbjRunActionConfigPathSourceGuardTest` (5 tests) both pin the delegation and both pass, run fresh against the final tree (including plan 02's edits to the shared base). No third guard was added — the invariant is already pinned twice.
- **EM-04 closes as verified-already-true, not as newly implemented.** This plan wrote no production code and modified no file under `bbj-intellij/src`.
- **Naming correction recorded:** the validation script is `em-validate-token.bbj`, confirmed present at `bbj-vscode/tools/em-validate-token.bbj` — not `em-validate.bbj` as ROADMAP success criterion 5, and the issue texts for #617 and #614, all call it. Criterion 5 must be read against the real filename.
- **Whole `bbj-intellij` suite green from the final tree:** `./gradlew test --rerun-tasks` (forced full re-run, not a cached `UP-TO-DATE` no-op) reports **114 suites, 1004 tests, 0 failures, 0 errors, 0 skipped**, aggregated directly from the JUnit XML reports — matching the orchestrator's independently verified baseline exactly.
- **Installable plugin distributable built from that same tree:** `./gradlew buildPlugin` succeeded, producing `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` (1,202,440 bytes). Confirmed by inspection (`unzip -l`) that the archive contains all three bundled tool scripts at `bbj-intellij/lib/tools/`: `web.bbj`, `em-login.bbj`, and `em-validate-token.bbj` — reaching the plugin only through the `prepareSandbox` distribution copy (`build.gradle.kts:206-221`), so this is what a user would actually install, not a dev sandbox.
- **Five UAT items recorded below** for the phase's hand-verification step, with expected outcomes, so that step does not need to re-derive them.

## UAT Items (for the phase verification step)

| # | Item | Steps | Expected Outcome |
|---|------|-------|-------------------|
| 1 | EM login enablement/visibility | Install the built distributable. With a project open, check Tools ▸ Login to Enterprise Manager. Close all projects and check again. | Item is present with a project open; **absent (hidden, not greyed)** with no project open. This is the phase's one intended user-visible change. |
| 2 | EM login end-to-end | Tools ▸ Login to Enterprise Manager → enter credentials. | Credential prompts appear, login succeeds with a success dialog, the token is stored, and no leftover temp file remains on disk afterward. |
| 3 | BUI/DWC launch, all entry points | Run a `.bbj` file as BUI and as DWC via the editor context menu, and again via the `alt B` / `alt D` keyboard shortcuts. | All four invocations launch the program in the browser. |
| 4 | Token lifecycle | Run BUI/DWC with no stored token; with an expired token; then run again within 5 minutes of a successful validation. | No token → login prompt. Expired token → re-prompt. Second run inside 5 minutes → trust-window hit, no `em-validate-token.bbj` subprocess spawned. |
| 5 | GUI run (control) | Run a `.bbj` file as GUI. | Behaves exactly as before — GUI run touches no EM code, so it is the regression control for this phase's base-class edits. |

**Note:** if code-review fixes land after this plan, the distributable must be rebuilt from the corrected tree before this UAT is performed — a UAT pass against a pre-fix build proves nothing about what ships.

## Task Commits

Each task was committed atomically:

1. **Task 1: Confirm and record the BUI/DWC consolidation evidence** - see commit hash in the final commit list below (docs)
2. **Task 2: Phase regression gate and an installable build for UAT** - see commit hash in the final commit list below (docs)

_This plan writes no production code — both task commits are documentation-only (`docs(94-04): ...`), each recording that task's verification/build evidence into this SUMMARY._

## Files Created/Modified

- `.planning/phases/94-em-login-run-action-consolidation/94-04-SUMMARY.md` - this file, recording EM-04's closure evidence, the naming correction, the whole-suite gate result, the built artefact's path, and the five UAT items

## Decisions Made

- EM-04 (#615) closes as verified-already-true on cited evidence (commit `6a55b854` + both named guards), never reported as newly implemented, per the plan's D-05 prohibition.
- No third guard added for EM-04 — a third assertion of an already-twice-pinned fact adds nothing.
- The `em-validate-token.bbj` naming correction is recorded against ROADMAP success criterion 5 rather than silently absorbed, so the criterion is not marked met against a filename that does not exist in the tree.
- The whole-suite gate used `--rerun-tasks` specifically to avoid a `Task :test UP-TO-DATE` no-op silently reporting a stale green — the project-specific gotcha this plan's own `<action>` text calls out.

## Deviations from Plan

None - plan executed exactly as written. No production file was touched, matching the plan's prohibition that the BUI/DWC subclasses are not edited and no third guard is added.

## Issues Encountered

None. Targeted guard runs (Task 1) and the forced whole-suite run plus `buildPlugin` (Task 2) all succeeded on the first attempt, consistent with the orchestrator's independently verified baseline of 114 suites / 1004 tests / 0 failures immediately before dispatch.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- EM-04 is closed on cited evidence; EM-01, EM-02, EM-03 closed in plans 02-03; EM-05 closed in plan 01. All five phase requirements (EM-01 through EM-05) are now complete.
- The phase's regression gate is green from the final tree (114 suites, 1004 tests, 0 failures, 0 errors) and an installable distributable (`bbj-intellij-0.1.0.zip`) exists, built from that same tree, containing all three bundled tool scripts.
- The five UAT items above are ready for the phase verification step (`/gsd-verify-work 94`). If code-review fixes land first, the distributable must be rebuilt before UAT is performed.
- The `em-validate-token.bbj` naming correction should be carried into the ROADMAP.md criterion 5 wording at the phase's close-out, so the criterion is not left describing a nonexistent filename.

---
*Phase: 94-em-login-run-action-consolidation*
*Completed: 2026-09-19*

## Self-Check: PASSED

- `[ -f /home/coder/repos/bbj-language-server/bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java ]` → FOUND (31 lines)
- `[ -f /home/coder/repos/bbj-language-server/bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunDwcAction.java ]` → FOUND (31 lines)
- `[ -f /home/coder/repos/bbj-language-server/bbj-vscode/tools/em-validate-token.bbj ]` → FOUND
- `git show --no-patch 6a55b854` → FOUND ("fix(84): extract shared BUI/DWC command-line builder", 2026-09-06)
- `./gradlew test --tests "*.EmTokenTrustWindowSourceGuardTest" --tests "*.BbjRunActionConfigPathSourceGuardTest"` → 9/9 and 5/5 pass, 0 failures, 0 errors
- `./gradlew test --rerun-tasks` (whole suite) → 114 suites, 1004 tests, 0 failures, 0 errors, 0 skipped
- `./gradlew buildPlugin` → BUILD SUCCESSFUL; `bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip` (1,202,440 bytes) contains `bbj-intellij/lib/tools/{web.bbj,em-login.bbj,em-validate-token.bbj}`
- No file under `bbj-intellij/src` modified by this plan — confirmed via `git status --short` scoped to that path showing no changes from this plan's work
- Register check: this SUMMARY's own body was scanned for bare planning identifiers (`D-0[0-9]`, `C-[0-9]+`, `CR-[0-9]+`, plan numbers standing alone) outside of the permitted `EM-0[0-9]` requirement IDs and `#[0-9]+` issue numbers — none found; `D-05` is quoted only in the Decisions Made section as a plan-reference in prose, consistent with 94-02/94-03's own SUMMARYs doing the same
