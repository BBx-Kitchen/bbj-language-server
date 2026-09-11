---
phase: 88-setopts-in-code-hovers-tri-state-composer
plan: 15
subsystem: vscode-client
tags: [stale-edit-guard, webview, workspace-edit, race-condition, setopts-composer]

requires:
  - phase: 88-setopts-in-code-hovers-tri-state-composer
    provides: >-
      Plans 88-06/88-10/88-11/88-14 built the two VS Code edit-in-place writers
      (setopts-tristate-webview.ts's chain path, setopts-composer-webview.ts's absolute-literal
      path) and the decodeInCode/composeTriState request pair this plan re-issues and compares.
provides:
  - "bbj-vscode/src/setopts-stale-edit-guard.ts — a new shared module (STALE_EDIT_REDECODE_TIMEOUT_MS, STALE_DOCUMENT_MESSAGE, STALE_CHECK_FAILED_MESSAGE, SetOptsStaleEditGuard, sameSetOptsInCodeDecode, applyIfUnchanged) porting IntelliJ's StaleEditGuard/DecodeEquality behavioural contract to VS Code"
  - "Both SETOPTS-in-code edit-in-place writers (chain and absolute-literal) now route their vscode.workspace.applyEdit call through applyIfUnchanged instead of calling it unconditionally"
  - "setopts-in-code-ui.ts hoists its decodeInCode params so the capture request and the guard's re-check share the identical uri/line/character, and builds a guard on both editable branches"
  - "A field-wise, order-sensitive comparator (sameSetOptsInCodeDecode) pinned in both directions: distinct-array-instance results compare equal, single-field differences and reordered tri-state entries compare unequal"
  - "A source-guard test proving every workspace-apply call in both writer files is preceded by a guard call"
affects: [setopts-composer, vs-code-webviews, phase-88-verification]

actuals:
  tokens: 12432
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Client-side stale-write guard: snapshot document version -> re-issue the identical decode request (bounded by a timeout) -> field-wise-compare the fresh decode against the captured one -> re-check the version immediately before the write -> apply. Fails closed on every branch."
    - "Params object hoisted out of the initial try/catch so a later re-check request can never drift from the original capture's position."

key-files:
  created:
    - bbj-vscode/src/setopts-stale-edit-guard.ts
    - bbj-vscode/test/setopts-stale-edit-guard.test.ts
  modified:
    - bbj-vscode/src/setopts-tristate-webview.ts
    - bbj-vscode/src/setopts-composer-webview.ts
    - bbj-vscode/src/setopts-in-code-ui.ts
    - bbj-vscode/test/setopts-in-code-ui.test.ts

key-decisions:
  - "applyIfUnchanged takes an injected timeoutMs (default STALE_EDIT_REDECODE_TIMEOUT_MS = 10_000) purely so the guard-level timeout test can pass 5ms instead of waiting out the real 10s bound."
  - "The guard field on SetOptsTriStatePanelArg/SetOptsPanelArg is read only when a `target` is present (`target !== undefined ? arg.guard : undefined`), so a guard mistakenly attached to a compose-new argument is still ignored — the create path structurally cannot be protected by, or accidentally blocked by, this check."
  - "sameSetOptsInCodeDecode and its helpers live in the guard module itself (not a separate comparator file), mirroring the plan's own naming but keeping the whole contract — timeout, messages, comparison, apply — in one auditable unit."

patterns-established:
  - "Any future VS Code composer writer with a captured document range should route its apply through applyIfUnchanged rather than re-implementing a bespoke staleness check."

requirements-completed: [DISC-06]

coverage:
  - id: D1
    description: "Chain edit-in-place: a document change between decode and Apply aborts the write with STALE_DOCUMENT_MESSAGE, no vscode.workspace.applyEdit call"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-stale-edit-guard.test.ts#openSetOptsTriStateComposerPanel with a guard — chain edit-in-place (Task 1) > document changed between panel open and Apply"
        status: pass
    human_judgment: false
  - id: D2
    description: "Absolute-literal edit-in-place: the same document-change refusal, no token replaced"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-stale-edit-guard.test.ts#openSetOptsComposerPanel with a guard — absolute-literal edit-in-place (Task 2) > document changed between open and Apply"
        status: pass
    human_judgment: false
  - id: D3
    description: "Against an unchanged document, both writers apply exactly the edit they applied before this plan (chain replaces [startLine,endLine) plus newline; absolute replaces the $…$ token range with a complete literal)"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-stale-edit-guard.test.ts (unchanged-document tests in both webview describe blocks) plus the pre-existing chain-replace/equal-line-insert/all-Leave tests in test/setopts-in-code-ui.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "The re-check re-issues the identical decodeInCode request (same uri/line/character) the panel was opened from, and compares the whole decode field-wise"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-stale-edit-guard.test.ts#command routing re-decode wiring (Task 1) and #absolute-path command routing re-decode wiring (Task 2)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every failure mode of the check itself is fail-closed: absent document, empty/rejected/timed-out re-decode, and an in-flight version mutation all abort the write"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-stale-edit-guard.test.ts#applyIfUnchanged (Task 1)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Compose-new and the config.bbx composer stay unguarded and behaviourally unchanged: no re-decode request, no new message"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-stale-edit-guard.test.ts (compose-new-with-a-guard-present test, and the config.bbx-target test) plus the pre-existing hexSyntax discriminator tests in test/setopts-in-code-ui.test.ts (unmodified)"
        status: pass
    human_judgment: false
  - id: D7
    description: "sameSetOptsInCodeDecode compares distinct array instances as equal and every single-field difference (including reordered tri-state entries) as unequal"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-stale-edit-guard.test.ts#sameSetOptsInCodeDecode (Task 2)"
        status: pass
    human_judgment: false
  - id: D8
    description: "Every workspace-apply call in both writer files is routed through the guard (wiring property, source-level)"
    requirement: "DISC-06"
    verification:
      - kind: unit
        ref: "bbj-vscode/test/setopts-stale-edit-guard.test.ts#source-guard: every apply in both writers is routed through the guard (Task 2)"
        status: pass
    human_judgment: false
  - id: D9
    description: "Live VS Code observation: editing the .bbj file while the composer panel is open, then pressing Apply, leaves the document unchanged and shows the document-changed warning"
    verification: []
    human_judgment: true
    rationale: "Requires a human editing a real .bbj file in a live VS Code session with the composer panel open and pressing Apply; the mocked-host tests above prove the mechanism (resolve-and-snapshot, re-decode-and-compare, re-check-version, apply) but not the end-user-visible effect. Staged in 88-LIVE-RETEST.md round two, alongside IntelliJ composer reachability and the live mask-width check, neither of which this plan touches."

duration: ~20min
completed: 2026-09-11
status: complete
---

# Phase 88 Plan 15: VS Code Stale-Edit Guard for SETOPTS Composer Summary

**Ports IntelliJ's StaleEditGuard/DecodeEquality behavioural contract to VS Code, closing the silent stale-write hole in both SETOPTS-in-code edit-in-place writers.**

## Performance
- **Duration:** ~20min
- **Started:** 2026-09-11T16:04:00Z
- **Completed:** 2026-09-11T16:22:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Created `bbj-vscode/src/setopts-stale-edit-guard.ts`, a new shared module with no dependency on
  either webview file, exporting the guard's constants, its `SetOptsStaleEditGuard` interface,
  the pure `sameSetOptsInCodeDecode` comparator and the `applyIfUnchanged` check itself.
- **Pre-write check, exact ordered body as implemented** (the order is the mitigation, and no
  step runs out of order):
  1. `guard === undefined` (compose-new, every config.bbx caller) — apply immediately, no
     request, no message.
  2. Snapshot the target document's current `version` from `vscode.workspace.textDocuments`.
     Absent (document no longer open) refuses immediately with **`STALE_DOCUMENT_MESSAGE`**, no
     request issued.
  3. Re-issue `guard.reDecode()` — the identical `decodeInCode` request the panel's launch used,
     closing over the same params object — bounded by `STALE_EDIT_REDECODE_TIMEOUT_MS` (10 s,
     injectable for tests). A throw, rejection, or timeout refuses with
     **`STALE_CHECK_FAILED_MESSAGE`**; the rejection never escapes `applyIfUnchanged`.
  4. Compare the fresh decode against `guard.capturedDecode` via `sameSetOptsInCodeDecode`. A
     missing or unequal fresh decode refuses with **`STALE_DOCUMENT_MESSAGE`**.
  5. Re-read the document's `version` and compare it to the step-2 snapshot — closing the async
     window between the re-decode resolving and the write starting. A change refuses with
     **`STALE_DOCUMENT_MESSAGE`**.
  6. Apply the edit and resolve `true`.
- **Full refusal-condition -> message map:**

  | Refusal condition | Message shown |
  |---|---|
  | Target document absent from `vscode.workspace.textDocuments` | `STALE_DOCUMENT_MESSAGE` |
  | Fresh re-decode differs field-wise from the captured one (including a version bump that lands during the re-decode) | `STALE_DOCUMENT_MESSAGE` |
  | Fresh re-decode resolves to `undefined` | `STALE_DOCUMENT_MESSAGE` |
  | Document version changed between the re-decode resolving and the write starting | `STALE_DOCUMENT_MESSAGE` |
  | `reDecode()` rejects | `STALE_CHECK_FAILED_MESSAGE` |
  | `reDecode()` exceeds the timeout | `STALE_CHECK_FAILED_MESSAGE` |

- **Comparison field list** (`sameSetOptsInCodeDecode`): `found`, `editable`, `mode`, `reason`,
  `summary`, then the whole `absolute` payload (`line`, both `hexRange` elements, `hexDigits`),
  the whole `chain` payload (`variableName`, `startLine`, `endLine`, `indent`), and the whole
  `initial` tri-state selection (`entries` compared element-wise on `byte`/`mask`/`state`, in
  order — order-sensitive on purpose, since a reordered selection is itself evidence the document
  changed shape). Array-valued fields (`hexRange`, `entries`) are compared element-wise, never by
  reference, since a fresh re-decode never returns the same array instance as the captured one.
- Wired `applyIfUnchanged` into `setopts-tristate-webview.ts`'s chain apply (Task 1) and
  `setopts-composer-webview.ts`'s absolute-literal apply (Task 2), each via one new optional
  `guard?: SetOptsStaleEditGuard` field on the panel's argument type, read only when a `target` is
  present.
- `setopts-in-code-ui.ts`'s `handleComposeSetoptsInCode` hoists its `SetOptsInCodeDecodeParams`
  object out of the capture `try` block so it is the single source of truth both the capture
  request and, later, the guard's `reDecode` closure use — a re-check can never drift to a
  different position than the capture did — and builds a guard on both the `absolute` and `chain`
  editable branches.
- **Compose-new and the config.bbx composer are deliberately unguarded, and why:** neither has a
  captured *range* that can be silently overwritten by someone else's edit — compose-new inserts
  at the cursor's current position at Apply time, and every config.bbx caller in
  `setopts-composer-ui.ts` passes no `guard` at all — matching the reference `StaleEditGuard`'s
  own documented exclusion of the create flow ("has no captured range to go stale"). Both are
  pinned by tests asserting no re-decode request is issued and the writer's own current behaviour
  is otherwise unchanged.
- Added `bbj-vscode/test/setopts-stale-edit-guard.test.ts` (34 tests across guard-level checks,
  both webviews' guarded apply, the comparator in both directions, command-routing re-decode
  wiring for both shapes, and a source-guard over both writer files), and extended
  `test/setopts-in-code-ui.test.ts` with `textDocuments`/`showWarningMessage` mock surface plus an
  open-document fixture for the one existing test that now crosses the guard.

## Task Commits
1. **Tasks 1+2 (RED): failing tests for the guard, both writers' guarded apply, the comparator, and the wiring source-guard** - `6394d6ec` (test)
2. **Tasks 1+2 (GREEN): port the guard module and route both edit-in-place writers through it** - `33e09f41` (feat)
3. **Task 3: build/lint/targeted-suite/whole-suite verification** - no source changes required (0 failures beyond the documented baseline); folded into this closing commit.

**Plan metadata:** commit pending (this SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md)

## Files Created/Modified
- `bbj-vscode/src/setopts-stale-edit-guard.ts` - new module: constants, `SetOptsStaleEditGuard`, `sameSetOptsInCodeDecode`, `applyIfUnchanged`
- `bbj-vscode/src/setopts-tristate-webview.ts` - chain apply now routed through `applyIfUnchanged`; `guard?` field on `SetOptsTriStatePanelArg`
- `bbj-vscode/src/setopts-composer-webview.ts` - absolute-literal apply now routed through `applyIfUnchanged`; `guard?` field on `SetOptsPanelArg`
- `bbj-vscode/src/setopts-in-code-ui.ts` - hoisted decode params; builds and passes a guard on both editable branches
- `bbj-vscode/test/setopts-stale-edit-guard.test.ts` - new: 34 tests
- `bbj-vscode/test/setopts-in-code-ui.test.ts` - extended mocked `vscode` surface; one existing test updated to open its target document

## Decisions Made
- See `key-decisions` in frontmatter.

## Deviations from Plan

**[Process deviation, non-blocking] Tasks 1 and 2 implemented and committed together as one RED/GREEN pair, not four separate task-scoped commits**
- **Found during:** Implementation planning for this plan.
- **Issue:** The plan's own commit-message examples suggest four commits (`test`, `feat` for Task 1, `feat` for Task 2, `test` for Task 2's additions). The guard module, both writers' wiring, and the full test matrix (guard-level, both webviews, comparator, wiring source-guard) were designed together as one coherent, mutually-verifying change — `setopts-in-code-ui.ts`'s single hoisted-params edit touches both the absolute and chain branches in one non-separable diff, and the new test file's Task 1 and Task 2 sections share the same harness and fixtures.
- **Fix:** Committed as two commits instead of four: a `test(88-15)` commit adding both test files (genuinely RED at that commit — `setopts-stale-edit-guard.ts` does not exist yet and the panel argument types lack `guard`), followed by a `feat(88-15)` commit adding the guard module and wiring all four source files to GREEN.
- **Files modified:** All six files in this plan's `files_modified` list.
- **Verification:** Full eight-file targeted suite (269 passed, 1 skipped, 0 failed) and whole-suite run (12 pre-existing failures only) both green after the `feat` commit.
- **Committed in:** `6394d6ec` (test), `33e09f41` (feat).
- **Total deviations:** 1. **Impact:** None on behaviour or test coverage — every acceptance criterion in both tasks is met and every listed test exists and passes; only the git commit granularity differs from the plan's literal per-task-commit suggestion.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Whole-Suite Verification

- `npm run build` — exit 0, `out/extension.cjs` rebuilt.
- `npm run lint` — exit 0.
- Eight-file targeted suite (`setopts-code-scanner.test.ts`, `setopts-in-code-request.test.ts`,
  `hover.test.ts`, `setopts-catalog.test.ts`, `setopts-in-code-ui.test.ts`,
  `functional/installed-extension-e2e.test.ts`, `bbj-code-action-handler.test.ts`,
  `setopts-stale-edit-guard.test.ts`): **8 files passed, 269 passed, 1 skipped, 0 failed**
  (exceeds the recorded 235-passed baseline).
- Whole suite (`--maxWorkers=2`): **2 test files failed, 90 passed (92 total)**; **12 tests
  failed, 1547 passed, 6 skipped (1565 total)** — exactly the documented pre-existing java-interop
  baseline, no thirteenth failure. Failing files, by name:
  - `test/linking.test.ts` — 11 failing tests, all under "Interop related tests" (`All BBj classes
    extends Object`, `Import and declare simple Java class without using FQNs`, `Import Java
    class`, `Declare with direct import`, `Class definition with direct import in extends`,
    `Class definition with direct import in implements`, `Unloaded Java FQN access - test for #6`,
    `Java FQN access - test for #6`, `Linked List is resolved`, `Resolve nested class in use
    statement`, `Resolve nested class FQN`).
  - `test/functional/issue447-real-interop.test.ts` — 1 failing test (`capability detection:
    current server lacks getAllClassNames and degrades gracefully`).
- Register-check grep over the working diff of `bbj-vscode/src` and `bbj-vscode/test`: no match
  (no leaked review-finding/gap/plan-number identifier).
- Exactly six tracked files under `bbj-vscode/` changed; nothing under
  `bbj-vscode/src/language/`, `bbj-intellij/`, `examples/` or `QA/` touched.
- `.planning/phases/88-setopts-in-code-hovers-tri-state-composer/COVERAGE.md` already existed
  from planning and needed no change (single line, under 200 characters, beginning "No external
  API integration:").

## Still Outside This Round's Reach (staged as human verification)

Unchanged from the plan's own `<verification>` section — no task in this plan addresses these,
and none should:

- **IntelliJ composer reachability** via Alt+Enter and the editor context menu (88-LIVE-RETEST.md
  round two, Check 2). No IntelliJ sandbox exists in this devcontainer, and this plan changes no
  IntelliJ or server file.
- **The live mask-width falsification** of 88-RESEARCH.md Assumption A2 (Check 3). Headless BBj
  execution is blocked in this devcontainer.
- **The live VS Code observation of this plan's own guard** (coverage item D9 above): editing the
  `.bbj` file while the composer panel is open, then pressing Apply, must leave the document
  unchanged and show the document-changed warning in a real editor session. The mocked-host tests
  in this plan prove the mechanism; only a human pressing Apply in a live VS Code window confirms
  the end-user-visible effect. Staged in `88-LIVE-RETEST.md` round two alongside the two items
  above.

## Next Phase Readiness
Phase 88 fully complete (all 15 plans summarized). DISC-06 is now met on the VS Code side for
both statically-safe edit-in-place shapes, including the safety of the *apply*, not just the
correctness of the computed range (which plan 88-14 already fixed). Ready for phase-level
verification / UAT, pending the three human-verification items named above.

---
*Phase: 88-setopts-in-code-hovers-tri-state-composer*
*Completed: 2026-09-11*
