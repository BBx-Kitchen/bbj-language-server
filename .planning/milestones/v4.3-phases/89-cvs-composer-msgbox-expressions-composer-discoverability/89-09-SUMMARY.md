---
phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
plan: 09
subsystem: composer-discoverability
tags: [langium, codelens, lsp, vscode, composer, msgbox, addchildwindow, cvs, setopts]

# Dependency graph
requires:
  - phase: 89-cvs-composer-msgbox-expressions-composer-discoverability
    provides: "plan 89-01's composer-codelens.ts/composer-lens-command.ts/composer-lens-contract.ts (addWindow-only cue + bbj.openComposerAt), plan 89-02's decodeMsgboxCall/msgboxPanelArgFromDecode, plan 89-03's cvs-composer.ts (findCvsCalls/decodeCvsCall), plan 89-05's cvsPanelArgAt/openCvsComposerPanel, and plan 89-06's recorded Code Vision GO verdict and config-routing decision that gated this plan's start"
provides:
  - "collectComposerLensCandidates extended with msgbox/addchildwindow/cvs/setopts-in-code detectors, each delegating entirely to that composer's own existing find/decode function"
  - "ComposerLensScanContext.decodeSetoptsInCode -- the optional member BBjComposerCodeLensProvider fills from createDecodeInCodeHandler over its own document"
  - "addChildWindowPanelArgAt -- extracted from the addChildWindow Code Action, mirroring addWindowPanelArgAt, now shared by the Code Action and the cue dispatcher"
  - "composer-lens-command.ts dispatch branches for msgbox, addchildwindow, cvs and setopts-in-code"
affects: [89-11-setopts-config-single-source-migration, 89-12-intellij-cvs-kind-wiring, 89-13]

# Actuals (#2632)
actuals:
  tokens: 10300
  tasks: 2
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A per-kind detector loop over the same ComposerLensScanContext, each kind's applicability decided entirely by that composer's own existing find/decode function -- no cross-kind coordination needed beyond the shared isCode gate and the existing line/start sort in toComposerCodeLenses"
    - "A document-scoped decodeInCode instance built fresh per provideCodeLens call from createDecodeInCodeHandler, given a documents stand-in that resolves exactly the provider's own document -- reads the already-built AST only, no new document-access surface"

key-files:
  created: []
  modified:
    - bbj-vscode/src/language/composer-codelens.ts
    - bbj-vscode/test/composer-codelens.test.ts
    - bbj-vscode/test/composer-codelens-handler.test.ts
    - bbj-vscode/src/composer-lens-command.ts
    - bbj-vscode/test/composer-lens-command.test.ts
    - bbj-vscode/src/addchildwindow-composer-ui.ts

key-decisions:
  - "The in-code SETOPTS cue scans only for the case-insensitive whole-word SETOPTS keyword -- IOR(/AND( reassignment lines never get a cue of their own, only reached through the chain the SETOPTS keyword's own decode resolves."
  - "The setopts-in-code candidate's character is the first non-whitespace character after the SETOPTS keyword (or the keyword's own start when nothing follows), matching exactly the position setopts-in-code-request.test.ts already uses to drive decodeInCode."
  - "MSGBOX and addChildWindow cues are unconditional per findMsgboxCalls/findAddChildWindowCalls -- no decode veto -- since MSGBOX already has a compose-and-replace fallback for undecodable expressions and addChildWindow's own Code Action never required one either."
  - "CVS cues require decodeCvsCall's own found && editable verdict, so no cue is ever offered on a call the CVS composer would refuse to edit."
  - "The structural no-re-parse test (composer-codelens-handler.test.ts, not composer-codelens.test.ts where an earlier summary had placed it) was widened to mix all five composer kinds, since Roadmap Success Criterion 5 must cover every detector this plan adds, not just the original addWindow tracer -- documented as a deviation below."

patterns-established:
  - "addChildWindowPanelArgAt(uri, line, lineText, character) mirrors addWindowPanelArgAt's exact shape (decode -> build target+initial -> label), shared by its Code Action provider and the composer-cue dispatcher."

requirements-completed: []

coverage:
  - id: D1
    description: "Every .bbj composer family beyond addWindow (MSGBOX including expression-valued options, addChildWindow, editable CVS(), editable in-code SETOPTS) gets a server-side cue gated by that composer's own decode verdict, correctly ordered/numbered across kinds on one line, excluded from REM comments and string literals, still with zero parse/update/build calls"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "test/composer-codelens.test.ts#BBjComposerCodeLensProvider — MSGBOX, addChildWindow, CVS and in-code SETOPTS (#650)"
        status: pass
      - kind: unit
        ref: "test/composer-codelens-handler.test.ts#BBjComposerCodeLensProvider — no re-parse across repeated requests (#650)"
        status: pass
    human_judgment: false
  - id: D2
    description: "In VS Code, clicking a MSGBOX, addChildWindow or CVS cue opens that composer's panel with exactly the argument its own decode/lightbulb logic builds; clicking an in-code SETOPTS cue runs bbj.composeSetoptsInCode with the cue's position; a stale cue shows the gone message and writes nothing"
    requirement: "DISC-01"
    verification:
      - kind: unit
        ref: "test/composer-lens-command.test.ts#openComposerAt"
        status: pass
    human_judgment: false
  - id: D3
    description: "A VS Code user can actually see each cue rendered above the right call and click through to the right composer in a live editor"
    verification: []
    human_judgment: true
    rationale: "This plan proves cue detection and click dispatch entirely from source/unit tests against parsed documents and a mocked vscode module. No real VS Code extension host or live editor render was exercised here -- a visual check belongs to the phase's end-of-phase UAT, consistent with plan 89-01's own precedent."

duration: 25min
completed: 2026-09-12
status: complete
---

# Phase 89 Plan 09: Composer Cues for MSGBOX, addChildWindow, CVS() and In-Code SETOPTS Summary

**Extends the shared server-side composer CodeLens from addWindow-only to every `.bbj` composer family (MSGBOX, addChildWindow, editable CVS(), editable in-code SETOPTS), and teaches VS Code's `bbj.openComposerAt` to open each one from its cue.**

## Performance

- **Duration:** 25 min
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- `collectComposerLensCandidates` now detects `msgbox` and `addchildwindow` calls unconditionally (via `findMsgboxCalls`/`findAddChildWindowCalls`), `cvs` calls only when `decodeCvsCall` reports `found && editable`, and `setopts-in-code` shapes only when the provider's own `decodeSetoptsInCode` (built from `createDecodeInCodeHandler` over the already-built AST) reports `found && editable` at the first non-whitespace character after a whole-word `SETOPTS` keyword. Every kind is excluded inside `REM` comments and string literals by the existing `isCode` gate, and cross-kind/same-kind ordering and numbering fall out of `toComposerCodeLenses`'s existing line/start sort with no changes needed there.
- The structural no-re-parse test's synthetic document (in `composer-codelens-handler.test.ts`) now mixes addWindow, MSGBOX, addChildWindow, CVS() and a safe in-code SETOPTS chain, still answering 20 consecutive `provideCodeLens` calls with deep-equal lists and zero `parser.parse`/`DocumentBuilder.update`/`DocumentBuilder.build` calls — proving Roadmap Success Criterion 5 for every detector this plan adds, not just the original addWindow tracer.
- `addchildwindow-composer-ui.ts` gained `addChildWindowPanelArgAt(uri, line, lineText, character)`, extracted from `AddChildWindowCodeActionProvider` exactly as plan 89-01 did for addWindow — the Code Action's visible label/argument output is unchanged.
- `composer-lens-command.ts`'s `openComposerAt` gained dispatch branches: `msgbox` re-decodes via `decodeMsgboxCall` + `msgboxPanelArgFromDecode` and opens `openMsgboxComposerPanel` (an expression-options call correctly carries a `replace` payload); `addchildwindow` uses `addChildWindowPanelArgAt` + `openAddChildWindowComposerPanel`; `cvs` uses `cvsPanelArgAt` + `openCvsComposerPanel`; `setopts-in-code` delegates to `vscode.commands.executeCommand('bbj.composeSetoptsInCode', { uri, line, character })`, which re-decodes server-side and routes to the right panel or reason message itself. Every undefined argument (a stale or gone call) shows `LENS_TARGET_GONE_TEXT` and opens nothing; the still-unwired `setopts-config` kind keeps the default informational message.

## Task Commits

Each task followed its own RED/GREEN cycle (`tdd="true"`):

1. **Task 1 (`type="tracer"`): Server cues for MSGBOX, addChildWindow, editable CVS and editable in-code SETOPTS**
   - `3852879a` test(89-09): add failing tests for MSGBOX, addChildWindow, CVS and in-code SETOPTS cues
   - `b84fd67b` feat(89-09): server cues for MSGBOX, addChildWindow, editable CVS and editable in-code SETOPTS
2. **Task 2: VS Code opens the MSGBOX, addChildWindow, CVS and in-code SETOPTS composers from their cues**
   - `4123c717` test(89-09): add failing tests for VS Code composer-cue dispatch of MSGBOX, addChildWindow, CVS and in-code SETOPTS
   - `e00d5586` feat(89-09): VS Code opens MSGBOX, addChildWindow, CVS and in-code SETOPTS composers from their cues

**Plan metadata:** captured in this SUMMARY's own commit.

_Task 1 is `type="tracer"`; its own `<verify>` (targeted tests + build) was re-run end-to-end after the commit per the auto-mode tracer feedback gate before Task 2 began, and passed._

## Files Created/Modified
- `bbj-vscode/src/language/composer-codelens.ts` - Extended `ComposerLensScanContext`/`collectComposerLensCandidates` with the four new detectors; `provideCodeLens` builds `decodeSetoptsInCode` from `createDecodeInCodeHandler`
- `bbj-vscode/test/composer-codelens.test.ts` - New describe block covering every new kind's behavior, exclusions, and cross-kind ordering
- `bbj-vscode/test/composer-codelens-handler.test.ts` - Widened the structural no-re-parse document to mix all five kinds
- `bbj-vscode/src/composer-lens-command.ts` - New dispatch branches for `msgbox`, `addchildwindow`, `cvs`, `setopts-in-code`
- `bbj-vscode/test/composer-lens-command.test.ts` - New dispatch/gone-target tests for each kind; rescoped the "any other kind" test onto `setopts-config`
- `bbj-vscode/src/addchildwindow-composer-ui.ts` - Extracted `addChildWindowPanelArgAt`, reused by the Code Action provider

## Decisions Made
- The `setopts-in-code` cue scans only for the `SETOPTS` keyword itself — `IOR(`/`AND(` reassignment lines are never scanned for a cue of their own, matching the plan's explicit instruction and the fixture's expectations.
- MSGBOX and addChildWindow cues carry no decode veto (unlike CVS and SETOPTS-in-code), since both composers already have their own fallback paths (MSGBOX's compose-and-replace mode; addChildWindow's existing "add flags" path) that make every detected call actionable.
- Bit-for-bit reuse of each composer's own decode/panel-arg function for every dispatch branch, so the cue click and the existing lightbulb can never disagree about how a call decodes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The structural no-re-parse test actually lives in `composer-codelens-handler.test.ts`, not `composer-codelens.test.ts`**
- **Found during:** Task 1 (extending "the structural test's synthetic document" per the plan's behavior list)
- **Issue:** The plan's `read_first`/behavior text (and plan 89-01's own SUMMARY) describe the Roadmap Success Criterion 5 structural test as living in `test/composer-codelens.test.ts`. Reading the actual file showed no such test there — the 20-consecutive-request, zero-parse/update/build-calls test is in `test/composer-codelens-handler.test.ts`'s `BBjComposerCodeLensProvider — no re-parse across repeated requests` describe block. `composer-codelens-handler.test.ts` was not listed in this plan's `files_modified`.
- **Fix:** Extended the actual structural test (in `composer-codelens-handler.test.ts`) to mix addWindow, MSGBOX, addChildWindow, CVS() and a safe SETOPTS chain into its 5000+-line synthetic document, added `initializeWorkspace` (needed for the chain's `traceOptsChain` resolution) and widened the test timeout to 30s to accommodate the added parse/initialization cost, and added an assertion that all five kinds are actually represented in the result. This is the file that actually proves Success Criterion 5 end-to-end through the real Langium services; extending the wrong (nonexistent) location in `composer-codelens.test.ts` would have left the roadmap criterion unproven for four of the five kinds this plan adds.
- **Files modified:** `bbj-vscode/test/composer-codelens-handler.test.ts`
- **Verification:** `test/composer-codelens-handler.test.ts` passes (10/10 tests), including the widened structural test asserting zero `parser.parse`/`DocumentBuilder.update`/`DocumentBuilder.build` calls across 20 requests and all five kinds present in the result.
- **Committed in:** `3852879a` (test commit, alongside the other Task 1 tests)

---

**Total deviations:** 1 auto-fixed (1 blocking — the plan named the wrong test file for an existing structural test).
**Impact on plan:** No scope creep. The fix locates and extends the test that actually implements Roadmap Success Criterion 5, which is exactly what the plan's behavior list asked for; the file-path correction is documented here for the verifier.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Requirement Traceability Note

`requirements: [DISC-01]` in this plan's frontmatter is intentionally **not** copied into `requirements-completed` above and `DISC-01` is **not** marked complete in `REQUIREMENTS.md`. DISC-01 is a shared requirement also declared by plans 89-11, 89-12 and 89-13 (none of which have a SUMMARY yet); `gsd-tools query requirements.ready-ids` confirms `0/1 requirement(s) ready to mark complete` for this plan. DISC-01 will flip to Complete only once the last of those sibling plans finishes.

## Next Phase Readiness
- Every `.bbj` composer family now carries a server-side cue gated by that composer's own decode verdict, and VS Code opens the right composer from each one.
- Plan 89-11 (config.bbx SETOPTS cue + retiring the client-side SETOPTS-only lens) and plan 89-12 (IntelliJ `cvs`/other kind wiring) can now build directly on this plan's `collectComposerLensCandidates` shape and `composer-lens-command.ts` dispatch pattern.
- The #475 fixture's shared-line and unsafe-chain shapes are proven to yield no SETOPTS cue in this plan's own tests; the canonical safe chain and the absolute literal both yield exactly one cue each.
- No blockers.

---
*Phase: 89-cvs-composer-msgbox-expressions-composer-discoverability*
*Completed: 2026-09-12*

## Self-Check: PASSED

- Modified files verified present on disk with the expected new content: `bbj-vscode/src/language/composer-codelens.ts`, `bbj-vscode/test/composer-codelens.test.ts`, `bbj-vscode/test/composer-codelens-handler.test.ts`, `bbj-vscode/src/composer-lens-command.ts`, `bbj-vscode/test/composer-lens-command.test.ts`, `bbj-vscode/src/addchildwindow-composer-ui.ts`.
- All 4 commit hashes (`3852879a`, `b84fd67b`, `4123c717`, `e00d5586`) verified present in `git log --oneline`.
- Plan-level `<verification>` re-run and passing: targeted tests (`composer-codelens.test.ts`, `composer-lens-command.test.ts`, `setopts-in-code-request.test.ts`, `setopts-in-code-ui.test.ts` — 103/103), `npm run build` (exit 0), `npm run lint` (exit 0), whole-suite gate `RUN_BBJ_TESTS=0 --maxWorkers=2` at `numFailedTests: 0` (1651 passed, 29 skipped), and the register check across the full plan diff range (`3852879a~1..HEAD`) with zero matches.
