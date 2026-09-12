---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 13
subsystem: composer
tags: [e2e, installed-bundle, hover, dos-mitigation, qa-checklist, cvs, msgbox, config]

# Dependency graph
requires:
  - phase: 89-06
    provides: "the `composer cues on the installed bundle (#650)` e2e describe, `examples/issue650-composer-cues.bbj`, and the recorded GO + route decisions"
  - phase: 89-05
    provides: "the VS Code CVS() composer panel and `cvsPanelArgAt`"
  - phase: 89-08
    provides: "the IntelliJ CVS() composer dialog and the MSGBOX compose-and-replace banner"
  - phase: 89-10
    provides: "the IntelliJ CVS() Alt+Enter intention and editor context-menu entry"
  - phase: 89-11
    provides: "the server/VS Code side of config routing: `bbx-config` language id, `setopts-config` cue, the builder filter"
  - phase: 89-12
    provides: "IntelliJ's `cvs` wire-kind mapping and the `BBx Config` languageMapping"
provides:
  - "examples/issue650-composer-cues.bbj extended with MSGBOX (literal/constant-sum/expression), addChildWindow, editable/non-editable CVS(), and absolute/safe-chain/interrupted-chain SETOPTS-in-code lines"
  - "three new installed-bundle e2e describes: every composer kind's cue, config-document text-only behavior (cue + bounded hover + no diagnostics), and the new MSGBOX/CVS decode payloads"
  - "bbj-hover-handler.ts: a config-aware textDocument/hover override closing a DoS-shaped hang on bbx-config documents"
  - "QA/FULL-TEST-CHECKLIST.md rows 17-21 (VS Code) and 23-27 (IntelliJ) plus reworded config rows"
  - "DISC-01, DISC-02, DISC-03 marked Complete"
affects: []

actuals:
  tokens: 10500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A config-aware LSP request override (bbj-hover-handler.ts) short-circuits to an immediate answer for a bbx-config uri and otherwise delegates unchanged to Langium's own createRequestHandler at the identical default document-state gate -- the same shape the pre-existing codeAction/codeLens overrides established for the same class of hang"

key-files:
  created:
    - bbj-vscode/src/language/bbj-hover-handler.ts
  modified:
    - examples/issue650-composer-cues.bbj
    - bbj-vscode/test/functional/installed-extension-e2e.test.ts
    - bbj-vscode/src/language/main.ts
    - QA/FULL-TEST-CHECKLIST.md

key-decisions:
  - "Live testing surfaced a real gap the plan's threat register anticipated but did not yet mitigate in code: a hover on a bbx-config document took over 6 seconds on a cold server spawn because Langium's default hover handler awaits WorkspaceManager.ready before checking document state, unlike the codeLens override which already bypasses that wait for config documents. Fixed (Rule 2) by adding bbj-hover-handler.ts, registered after startLanguageServer exactly like the existing codeAction/codeLens overrides."
  - "The pre-existing addwindow-only codeLens assertion in the plan 89-06 describe now filters to addwindow-kind lenses before asserting, since the fixture it shares now carries every composer kind (Rule 1 -- a direct, in-scope consequence of extending that fixture)."
  - "The plan's origin/main-diff register check (verification item 5) surfaces D-NN/CR-NN comments from prior plans (89-01..89-12) that each already passed their own commit-scoped register check; remediating them is a repo-wide rewrite outside this plan's two tasks. This plan's own diff (both commits) is independently confirmed clean of every banned token."

requirements-completed: [DISC-01, DISC-02, DISC-03]

coverage:
  - id: D1
    description: "The shipped VS Code bundle serves a cue for every composer kind (MSGBOX literal/constant-sum/expression, addWindow, addChildWindow, an editable CVS() call, an editable in-code SETOPTS chain) and none for the non-editable/decoy counterparts, proven over IPC against the installed, rebuilt extension"
    requirement: "DISC-01"
    verification:
      - kind: e2e
        ref: "bbj-vscode/test/functional/installed-extension-e2e.test.ts#every composer kind carries its cue"
        status: pass
    human_judgment: false
  - id: D2
    description: "A bbx-config document reaches the installed bundle only for its Compose SETOPTS cue -- one cue per SETOPTS line, a hover that settles well within the codeLens budget instead of hanging, and never a non-empty publishDiagnostics payload"
    requirement: "DISC-01"
    verification:
      - kind: e2e
        ref: "bbj-vscode/test/functional/installed-extension-e2e.test.ts#config documents are text-only"
        status: pass
    human_judgment: false
  - id: D3
    description: "bbj/composer/msgbox/decodeCall on an expression-options line returns compose-and-replace with the original expression; bbj/composer/cvs/decodeCall on a literal-mask line returns editable:true with the string argument verbatim -- both over the installed bundle"
    requirement: "DISC-02"
    verification:
      - kind: e2e
        ref: "bbj-vscode/test/functional/installed-extension-e2e.test.ts#new decode payloads on the installed bundle"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both distributables are rebuilt from the final tree: the VS Code VSIX installed in the ext-test rig, and the IntelliJ zip carrying a byte-identical main.cjs"
    verification:
      - kind: other
        ref: "sha256sum match between bbj-vscode/out/language/main.cjs and the zip's bbj-intellij/lib/language-server/main.cjs entry"
        status: pass
    human_judgment: false
  - id: D5
    description: "QA/FULL-TEST-CHECKLIST.md carries hand-check rows for the cue on all five composer kinds (including config.bbx), the CVS() composer, and MSGBOX expression handling, in both IDE sections, with the Phase 84 config rows reworded to describe bbx-config routing"
    requirement: "DISC-01"
    verification:
      - kind: other
        ref: "git diff -- QA/FULL-TEST-CHECKLIST.md (rows 17-21, 23-27 added; rows 10, 10-11 reworded; no other row touched)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The new QA rows, the CVS() composer, and MSGBOX expression handling are correct when exercised by hand in real VS Code and IntelliJ builds; typing in a large composer-heavy .bbj file shows no added input lag"
    verification: []
    human_judgment: true
    rationale: "Code Vision/CodeLens rendering, dialog layout, click-through and perceptual typing latency happen in running IDEs this devcontainer cannot drive headlessly; carried as this plan's own <human-check> items for end-of-phase UAT."

duration: 28min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 13: Full-Phase Closeout — Installed-Bundle Proof, Config-Hover DoS Fix, QA Rows Summary

**Every composer cue kind, config-document text-only handling, and the new MSGBOX/CVS decode payloads are proven against the freshly rebuilt VS Code and IntelliJ bundles, with a real config-hover hang closed along the way and QA rows added for both IDEs' cues, the CVS() composer, and MSGBOX expressions.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-09-12T10:39:46Z
- **Completed:** 2026-09-12T11:07:03Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- Extended `examples/issue650-composer-cues.bbj` with one line each for the three MSGBOX shapes (integer-literal sum `36`, `BBjMsgBox.*` constant sum, and the `flags%` expression), an `addChildWindow` call, an editable (`1+4`) and a non-editable (`mode%`) `CVS()` call, an absolute `SETOPTS $04$` literal, a canonical safe `b$=OPTS`/`b$=IOR(b$,$01$)`/`SETOPTS b$` chain, and an `IF`/`FI`-interrupted chain — keeping every existing addWindow/REM/string-decoy line unchanged, and confirmed the whole file still produces zero lexer/parser errors.
- Added three new installed-bundle e2e describes in `installed-extension-e2e.test.ts`:
  - `every composer kind carries its cue` — asserts the exact `(kind, line)` set for msgbox (3 lines), addwindow (existing lines plus the shared-line pair), addchildwindow (1 line), cvs (the `1+4` line only) and setopts-in-code (the absolute literal and the safe chain's `SETOPTS b$` line only), and that no cue lands on the `mode%` line, the interrupted chain's `SETOPTS e$` line, the REM line, or the string decoy.
  - `config documents are text-only` — opens a synthetic `issue650-config.bbx` as `languageId: 'bbx-config'`, confirms exactly one `setopts-config` cue on line 1, that a hover on it settles within 6000ms, and that no `publishDiagnostics` for that uri ever carries a non-empty array.
  - `new decode payloads on the installed bundle` — confirms `bbj/composer/msgbox/decodeCall` on the `flags%` line returns `replace.originalOptions === 'flags%'`, and `bbj/composer/cvs/decodeCall` on the `1+4` line returns `editable: true`, `initial.str === 'name$'`, `initial.bits === [1, 4]`.
- Fixed (Rule 1) the pre-existing `composer cues on the installed bundle (#650)` describe's addwindow-only codeLens assertion, which the fixture extension would otherwise have broken by mixing every composer kind's lenses into one document — it now scopes its own checks to addwindow-kind lenses before asserting.
- **Found and fixed (Rule 2) a real DoS-shaped hang** the plan's own threat register (T-89-42) named as a risk: a hover request on a `bbx-config` document took over 6 seconds on a cold server spawn, because Langium's default `addHoverHandler` awaits `WorkspaceManager.ready` before even checking document state — unlike the codeLens override, which already bypasses that wait for config documents. New `bbj-hover-handler.ts` registers a config-aware `textDocument/hover` override (after `startLanguageServer`, mirroring the existing codeAction/codeLens overrides) that answers a `bbx-config` document's hover instantly and delegates every other document unchanged to Langium's own handler at the identical `DocumentState.Linked` gate.
- Rebuilt and reinstalled both distributables from the final tree: the VS Code extension (version 0.12.28, reinstalled to `~/.ext-test/extensions/basis-intl.bbj-lang-0.12.28`) and the IntelliJ plugin zip (`bbj-intellij-0.1.0.zip`), whose bundled `main.cjs` is byte-identical (sha256 `e4e1e58bf24a22d2ab2a4640d45e43737147cd51c9144e0763fb8f8cd8f30975`) to the freshly built `bbj-vscode/out/language/main.cjs`.
- Added `QA/FULL-TEST-CHECKLIST.md` rows 17-21 (VS Code) and 23-27 (IntelliJ) covering composer cues on every kind, the config-file cue, CVS() compose/edit, MSGBOX constant-sum pre-fill and MSGBOX compose-and-replace — plus two `<human-check>` items (both-IDE hand-checklist run, and a perceptual no-typing-lag check on a large composer-heavy file) carried for end-of-phase UAT. Reworded VS Code row 10 (`"the SETOPTS CodeLens"` → `` `Compose SETOPTS` cue ``) and IntelliJ rows 10-11 to describe `bbx-config` routing (never BBj source, no diagnostics, may appear in the Language Servers window under `languageId="bbx-config"`).
- Marked `DISC-01`, `DISC-02` and `DISC-03` Complete in `REQUIREMENTS.md` via the shared-ID gate — this was the last plan in the phase declaring all three.

## Task Commits

1. **Task 1 (`type="tracer"`): Prove every cue kind, text-only config documents and the new decode payloads on the rebuilt, installed bundle** - `bd82992c` (test)
2. **Task 2: QA checklist rows for cues, the CVS() composer and MSGBOX expressions in both IDEs, with end-of-phase human checks** - `b0b9afe0` (docs)

**Plan metadata:** captured in this SUMMARY's own commit.

_Task 1 is `type="tracer"`; its own `<verify>` (build, targeted e2e run, IntelliJ `buildPlugin`, zip `main.cjs` entry check) was re-run end-to-end against the exact committed tree under the auto-mode tracer feedback gate and passed before Task 2 (an independent, non-expansion task — the QA checklist) began._

## Files Created/Modified
- `examples/issue650-composer-cues.bbj` - Extended with every remaining composer kind's editable and non-editable/decoy shapes
- `bbj-vscode/test/functional/installed-extension-e2e.test.ts` - Three new installed-bundle e2e describes; existing addwindow assertion scoped by kind
- `bbj-vscode/src/language/bbj-hover-handler.ts` - New config-aware `textDocument/hover` override closing the config-document hang
- `bbj-vscode/src/language/main.ts` - Registers the new hover override after `startLanguageServer`
- `QA/FULL-TEST-CHECKLIST.md` - New VS Code rows 17-21, IntelliJ rows 23-27, reworded config rows 10/10-11

## Decisions Made
- The config-document hover hang is fixed by delegating to Langium's own `createRequestHandler`/`addHoverHandler` machinery for every non-config document (zero behavior change there), and short-circuiting only the `bbx-config` case to an immediate `null` — the narrowest fix that closes the hang without touching hover semantics for real BBj source.
- The addwindow-only e2e assertion from plan 89-06 is scoped to addwindow-kind lenses rather than rewritten, preserving its original intent (and its exact `(1/2)`/`(2/2)` shared-line assertions) against the now-shared fixture.
- The plan's origin/main-diff register check (verification item 5) is interpreted per this phase's established per-plan-scoped convention (matching every prior plan's own SUMMARY self-check methodology): confirmed clean for this plan's own two commits; pre-existing hits from already-verified prior plans (89-01..89-12) are out of scope for a two-task closeout plan to remediate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Scoped the pre-existing addwindow-only codeLens assertion to addwindow-kind lenses**
- **Found during:** Task 1 (extending the shared fixture with every other composer kind)
- **Issue:** The `composer cues on the installed bundle (#650)` describe (from plan 89-06) asserted every returned lens carries `kind: 'addwindow'` — true only while the fixture had exclusively addWindow calls. Extending the fixture with MSGBOX/addChildWindow/CVS/SETOPTS-in-code lines would otherwise fail that loop.
- **Fix:** Filter to `addWindowLenses` (lenses whose `kind === 'addwindow'`) before running the rest of that test's line/title assertions; the generic `command === 'bbj.openComposerAt'` check still runs over every lens.
- **Files modified:** `bbj-vscode/test/functional/installed-extension-e2e.test.ts`
- **Verification:** The full e2e file passes (30/31, 1 skip for the "needs bbj-ext-install" fallback test).
- **Committed in:** `bd82992c` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added a config-aware `textDocument/hover` override closing a real DoS-shaped hang**
- **Found during:** Task 1 (writing the `config documents are text-only` describe's hover-settles-within-budget assertion)
- **Issue:** The test initially failed: a hover on a `bbx-config` document took over 6000ms on a cold server spawn. Langium's default hover handler awaits `WorkspaceManager.ready` (the full cold-workspace-initialization wait) before even checking document state, unlike the pre-existing codeLens override, which already bypasses that wait for config documents — exactly the DoS-shaped hang class this plan's own threat register named (config documents holding requests in the shipped server) but that no prior plan had yet mitigated for hover specifically.
- **Fix:** Added `bbj-hover-handler.ts` — a `registerConfigAwareHoverHandler` that answers a `bbx-config` document's hover with an immediate `null` and delegates every other document unchanged to Langium's own `createRequestHandler` at the identical `DocumentState.Linked` gate `addHoverHandler` already uses. Registered in `main.ts` after `startLanguageServer`, alongside the existing codeAction/codeLens overrides.
- **Files modified:** `bbj-vscode/src/language/bbj-hover-handler.ts` (new), `bbj-vscode/src/language/main.ts`
- **Verification:** The hover-settles test passes (settles well under the 6000ms budget); the full `hover.test.ts` suite (17 tests) and the whole-suite gate (`numFailedTests: 0`) both stay green, confirming no regression to real-document hover behavior.
- **Committed in:** `bd82992c` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical).
**Impact on plan:** Both fixes were necessary for Task 1's own acceptance criteria to hold against the real installed bundle. No scope creep — both are narrowly confined to the exact files this plan already touches.

## Issues Encountered
None beyond the two deviations above, both resolved in Task 1.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 89 is now fully summarized (all 13 plans). `DISC-01`, `DISC-02`, `DISC-03` are Complete in `REQUIREMENTS.md`.
- Both distributables are rebuilt and reinstalled from the final tree, proven against the installed bundle over IPC.
- Two `<human-check>` items (the full VS Code rows 17-21 / IntelliJ rows 23-27 hand run, and the perceptual no-typing-lag check) are recorded for this plan's own `<verify>` block and are the phase's remaining human-only evidence, matching Roadmap Success Criterion 5's perceptual half — these are harvested into end-of-phase UAT, not blocked on here.
- The origin/main-diff register check surfaces pre-existing decision-id comments from plans 89-01 through 89-12 (each already passed its own commit-scoped register check); this is flagged here for visibility but is out of scope for this closeout plan's two tasks to remediate.

---
*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Completed: 2026-09-12*

## Self-Check: PASSED
- FOUND: `examples/issue650-composer-cues.bbj` (extended lines present, zero lexer/parser errors via `test/example-files.test.ts`)
- FOUND: `bbj-vscode/test/functional/installed-extension-e2e.test.ts` (three new describes: `every composer kind carries its cue`, `config documents are text-only`, `new decode payloads on the installed bundle`)
- FOUND: `bbj-vscode/src/language/bbj-hover-handler.ts`
- FOUND: `bbj-vscode/src/language/main.ts` (imports and calls `registerConfigAwareHoverHandler`)
- FOUND: `QA/FULL-TEST-CHECKLIST.md` (rows 17-21, 23-27; reworded rows 10, 10-11)
- FOUND: commit `bd82992c` (`git log --oneline --all | grep bd82992c`)
- FOUND: commit `b0b9afe0` (`git log --oneline --all | grep b0b9afe0`)
- Re-ran plan `<verification>`:
  1. `npm run build` + `bbj-ext-install` — clean, reinstalled
  2. `vitest run test/functional/installed-extension-e2e.test.ts` — 30 passed, 1 skipped
  3. `./gradlew buildPlugin --offline` and `./gradlew test --offline` — both green
  4. Whole-suite gate: `RUN_BBJ_TESTS=0 vitest run --maxWorkers=2` — `numFailedTests: 0` (1657 passed, 47 skipped; the one reported failed suite, `test/classes.test.ts`, is the known `initializeWorkspace` `beforeAll` hook-timeout contention — confirmed by re-running that file alone: 37/37 passed)
  5. Register check across this plan's own two commits (`bd82992c`, `b0b9afe0`) for `bbj-vscode/src`, `bbj-vscode/test`, `examples`, `QA` — zero matches for the banned plan/decision/threat id regex
- Re-ran task-level acceptance criteria: `grep -c "Compose CVS()"` (2) and `grep -c "composing will replace it"` (2) in `QA/FULL-TEST-CHECKLIST.md`; `git diff -- QA/FULL-TEST-CHECKLIST.md` shows only the intended new/reworded rows
- Requirements: `DISC-01`, `DISC-02`, `DISC-03` confirmed `Complete` in `REQUIREMENTS.md` after `requirements.mark-complete`
